import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PCA11_SYNTHETIC_TENANT_SLUG } from "@/lib/cloudflare/managed-inactive-version-contract.server";
import { parseExactPreviewHostMap } from "@/lib/tenant.server";

export const PCA15R_CUSTODY_ENVIRONMENT_NAME = "PCA15R_SYNTHETIC_AUTH_CUSTODY_JSON";
export const PCA15R_ACCEPTED_SOURCE_ENVIRONMENT_NAME = "PCA15R_ACCEPTED_SOURCE_HEAD";
export const PCA15R_PROVISIONER_ENVIRONMENT_NAME = "CLOUDFLARE_API_TOKEN_PCA15R_PROVISIONER";

const SOURCE_HEAD_RE = /^[0-9a-f]{40}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TENANT_ROLES = [
  "owner",
  "admin",
  "manager",
  "broker",
  "captador",
  "secretaria",
  "viewer",
] as const;

type TenantRole = (typeof TENANT_ROLES)[number];
type SubjectKind = "super_admin" | "tenant_member";
type EnvironmentReader = (name: string) => string | undefined;

interface SyntheticSubject {
  kind: SubjectKind;
  userId: string;
  email: string;
  password: string;
  expectedTenantRole: TenantRole | null;
}

interface ManagedCustodyConfiguration {
  tenantId: string;
  tenantSlug: typeof PCA11_SYNTHETIC_TENANT_SLUG;
  subjects: [SyntheticSubject, SyntheticSubject];
}

export interface Pca15rAuthenticatedSession {
  userId: string;
  accessToken: string;
  revoke(): Promise<void>;
}

export interface Pca15rManagedCustodyGateway {
  authenticateOperator(bearerToken: string): Promise<string>;
  signIn(subject: SyntheticSubject): Promise<Pca15rAuthenticatedSession>;
  tenantRows(tenantId: string, tenantSlug: string): Promise<Array<{ id: string; slug: string }>>;
  globalSuperAdminRows(userId: string): Promise<Array<{ role: string }>>;
  activeMembershipRows(
    userId: string,
    tenantId: string,
  ): Promise<Array<{ membership_status: string; tenant_role: string }>>;
  resolveTenantContext(accessToken: string, tenantId: string): Promise<string | null>;
}

export interface Pca15rManagedCustodyDependencies {
  readEnvironment?: EnvironmentReader;
  gateway?: Pca15rManagedCustodyGateway;
}

export interface Pca15rManagedCustodyProof {
  operatorUserId: string;
  acceptedSourceHead: string;
  publicEvidence: {
    custody: "server_only";
    syntheticIdentityCount: 2;
    passwordGrantVerifiedCount: 2;
    activeMembershipVerifiedCount: 1;
    globalSuperAdminVerifiedCount: 1;
    explicitImpersonationVerified: true;
    memberTenantSelectionVerified: true;
    previewHostMapVerified: true;
    tenantSlug: typeof PCA11_SYNTHETIC_TENANT_SLUG;
    tenantFingerprint: string;
    subjectFingerprints: string[];
    exportedSecretNames: [];
    exportedPasswords: false;
    exportedServiceRole: false;
  };
}

export class Pca15rManagedCustodyError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
    this.name = "Pca15rManagedCustodyError";
  }
}

function fail(code: string, status = 400): never {
  throw new Pca15rManagedCustodyError(code, status);
}

function readRequiredEnvironment(readEnvironment: EnvironmentReader, name: string): string {
  const value = readEnvironment(name)?.trim();
  if (!value) fail("pca15r_missing_server_dependency", 503);
  return value;
}

function exactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function parseSubject(input: unknown): SyntheticSubject {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  const record = input as Record<string, unknown>;
  if (!exactKeys(record, ["kind", "user_id", "email", "password", "expected_tenant_role"])) {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  const kind = record.kind;
  const userId = record.user_id;
  const email = record.email;
  const password = record.password;
  const expectedTenantRole = record.expected_tenant_role;
  if (kind !== "super_admin" && kind !== "tenant_member") {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  if (typeof userId !== "string" || !UUID_RE.test(userId)) {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 254) {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  if (typeof password !== "string" || password.length < 16 || password.length > 1024) {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  if (
    (kind === "super_admin" && expectedTenantRole !== null) ||
    (kind === "tenant_member" &&
      (typeof expectedTenantRole !== "string" ||
        !(TENANT_ROLES as readonly string[]).includes(expectedTenantRole)))
  ) {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  return {
    kind,
    userId: userId.toLowerCase(),
    email: email.toLowerCase(),
    password,
    expectedTenantRole: expectedTenantRole as TenantRole | null,
  };
}

function parseManagedCustodyConfiguration(raw: string): ManagedCustodyConfiguration {
  if (raw.length > 16_384) fail("pca15r_invalid_custody_configuration", 503);
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  const record = input as Record<string, unknown>;
  if (!exactKeys(record, ["schema", "tenant_id", "tenant_slug", "subjects"])) {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  if (record.schema !== "rm-prime.pca15r.managed-custody.v1") {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  if (typeof record.tenant_id !== "string" || !UUID_RE.test(record.tenant_id)) {
    return fail("pca15r_invalid_custody_configuration", 503);
  }
  if (record.tenant_slug !== PCA11_SYNTHETIC_TENANT_SLUG) {
    return fail("pca15r_real_tenant_prohibited", 503);
  }
  if (!Array.isArray(record.subjects) || record.subjects.length !== 2) {
    return fail("pca15r_synthetic_identity_cardinality", 503);
  }
  const subjects = record.subjects.map(parseSubject) as [SyntheticSubject, SyntheticSubject];
  if (
    subjects.filter(({ kind }) => kind === "super_admin").length !== 1 ||
    subjects.filter(({ kind }) => kind === "tenant_member").length !== 1 ||
    new Set(subjects.map(({ userId }) => userId)).size !== 2 ||
    new Set(subjects.map(({ email }) => email)).size !== 2
  ) {
    return fail("pca15r_synthetic_identity_cardinality", 503);
  }
  return {
    tenantId: record.tenant_id.toLowerCase(),
    tenantSlug: PCA11_SYNTHETIC_TENANT_SLUG,
    subjects,
  };
}

function readSingleBearer(request: Request): string {
  const value = request.headers.get("authorization");
  if (!value || value.includes(",")) fail("pca15r_unauthorized", 401);
  const match = /^Bearer ([^\s]+)$/.exec(value);
  if (!match) fail("pca15r_unauthorized", 401);
  return match[1];
}

function fingerprint(namespace: string, value: string): string {
  return createHash("sha256").update(`${namespace}:${value}`, "utf8").digest("hex");
}

function createDefaultGateway(readEnvironment: EnvironmentReader): Pca15rManagedCustodyGateway {
  const supabaseUrl = readRequiredEnvironment(readEnvironment, "SUPABASE_URL");
  const publishableKey = readRequiredEnvironment(readEnvironment, "SUPABASE_PUBLISHABLE_KEY");
  const serviceRole = readRequiredEnvironment(readEnvironment, "SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient<Database>(supabaseUrl, serviceRole, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const authenticatedClient = (accessToken: string, tenantId?: string) =>
    createClient<Database>(supabaseUrl, publishableKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(tenantId ? { "x-tenant-id": tenantId } : {}),
        },
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

  return {
    async authenticateOperator(bearerToken) {
      const client = authenticatedClient(bearerToken);
      const { data, error } = await client.auth.getClaims(bearerToken);
      const userId = data?.claims?.sub;
      if (error || typeof userId !== "string" || !UUID_RE.test(userId)) {
        return fail("pca15r_unauthorized", 401);
      }
      const { data: roles, error: roleError } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "super_admin")
        .limit(2);
      if (roleError || roles?.length !== 1) return fail("pca15r_forbidden", 403);
      return userId;
    },
    async signIn(subject) {
      const client = createClient<Database>(supabaseUrl, publishableKey, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await client.auth.signInWithPassword({
        email: subject.email,
        password: subject.password,
      });
      const userId = data.user?.id;
      const accessToken = data.session?.access_token;
      if (error || typeof userId !== "string" || typeof accessToken !== "string") {
        return fail("pca15r_synthetic_auth_failed", 409);
      }
      return {
        userId,
        accessToken,
        async revoke() {
          const { error: signOutError } = await client.auth.signOut({ scope: "local" });
          if (signOutError) fail("pca15r_synthetic_session_revocation_failed", 502);
        },
      };
    },
    async tenantRows(tenantId, tenantSlug) {
      const { data, error } = await admin
        .from("tenants")
        .select("id, slug")
        .eq("id", tenantId)
        .eq("slug", tenantSlug)
        .limit(2);
      if (error) return fail("pca15r_custody_query_failed", 502);
      return data ?? [];
    },
    async globalSuperAdminRows(userId) {
      const { data, error } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "super_admin")
        .limit(2);
      if (error) return fail("pca15r_custody_query_failed", 502);
      return data ?? [];
    },
    async activeMembershipRows(userId, tenantId) {
      const { data, error } = await admin
        .from("tenant_members")
        .select("membership_status, tenant_role")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .eq("membership_status", "active")
        .limit(2);
      if (error) return fail("pca15r_custody_query_failed", 502);
      return data ?? [];
    },
    async resolveTenantContext(accessToken, tenantId) {
      const client = authenticatedClient(accessToken, tenantId);
      const { data, error } = await client.rpc("get_current_tenant_id");
      if (error || typeof data !== "string") return null;
      return data;
    },
  };
}

export function parsePca15rAcceptedSourceHead(value: unknown): string {
  if (typeof value !== "string" || !SOURCE_HEAD_RE.test(value)) {
    return fail("pca15r_invalid_source_head");
  }
  return value;
}

export async function verifyPca15rManagedCustody(
  request: Request,
  expectedSourceHead: string,
  dependencies: Pca15rManagedCustodyDependencies = {},
): Promise<Pca15rManagedCustodyProof> {
  if (request.headers.has("x-tenant-id")) fail("pca15r_tenant_header_prohibited");
  const readEnvironment = dependencies.readEnvironment ?? ((name) => process.env[name]);
  const acceptedSourceHead = readRequiredEnvironment(
    readEnvironment,
    PCA15R_ACCEPTED_SOURCE_ENVIRONMENT_NAME,
  );
  if (!SOURCE_HEAD_RE.test(acceptedSourceHead) || acceptedSourceHead !== expectedSourceHead) {
    fail("pca15r_source_head_mismatch", 409);
  }
  const configuration = parseManagedCustodyConfiguration(
    readRequiredEnvironment(readEnvironment, PCA15R_CUSTODY_ENVIRONMENT_NAME),
  );
  let previewHostMap: ReadonlyMap<string, string>;
  try {
    previewHostMap = parseExactPreviewHostMap(
      readRequiredEnvironment(readEnvironment, "PUBLIC_TENANT_PREVIEW_HOST_MAP"),
    );
  } catch {
    return fail("pca15r_preview_host_map_invalid", 503);
  }
  if (
    previewHostMap.size !== 1 ||
    [...previewHostMap.values()][0] !== PCA11_SYNTHETIC_TENANT_SLUG
  ) {
    fail("pca15r_preview_host_map_invalid", 503);
  }

  const gateway = dependencies.gateway ?? createDefaultGateway(readEnvironment);
  const operatorUserId = await gateway.authenticateOperator(readSingleBearer(request));
  const tenantRows = await gateway.tenantRows(configuration.tenantId, configuration.tenantSlug);
  if (
    tenantRows.length !== 1 ||
    tenantRows[0].id.toLowerCase() !== configuration.tenantId ||
    tenantRows[0].slug !== configuration.tenantSlug
  ) {
    fail("pca15r_synthetic_tenant_mismatch", 409);
  }

  const sessions: Pca15rAuthenticatedSession[] = [];
  let proofComplete = false;
  try {
    for (const subject of configuration.subjects) {
      const session = await gateway.signIn(subject);
      sessions.push(session);
      if (session.userId.toLowerCase() !== subject.userId) {
        fail("pca15r_synthetic_auth_subject_mismatch", 409);
      }
    }
    const superAdmin = configuration.subjects.find(({ kind }) => kind === "super_admin")!;
    const tenantMember = configuration.subjects.find(({ kind }) => kind === "tenant_member")!;
    const superSession = sessions.find(({ userId }) => userId.toLowerCase() === superAdmin.userId)!;
    const memberSession = sessions.find(
      ({ userId }) => userId.toLowerCase() === tenantMember.userId,
    )!;

    const roles = await gateway.globalSuperAdminRows(superAdmin.userId);
    if (roles.length !== 1 || roles[0].role !== "super_admin") {
      fail("pca15r_synthetic_super_admin_mismatch", 409);
    }
    const memberships = await gateway.activeMembershipRows(
      tenantMember.userId,
      configuration.tenantId,
    );
    if (
      memberships.length !== 1 ||
      memberships[0].membership_status !== "active" ||
      memberships[0].tenant_role !== tenantMember.expectedTenantRole
    ) {
      fail("pca15r_synthetic_membership_mismatch", 409);
    }
    const impersonatedTenant = await gateway.resolveTenantContext(
      superSession.accessToken,
      configuration.tenantId,
    );
    if (impersonatedTenant?.toLowerCase() !== configuration.tenantId) {
      fail("pca15r_explicit_impersonation_failed", 409);
    }
    const memberTenant = await gateway.resolveTenantContext(
      memberSession.accessToken,
      configuration.tenantId,
    );
    if (memberTenant?.toLowerCase() !== configuration.tenantId) {
      fail("pca15r_member_tenant_selection_failed", 409);
    }

    for (const session of sessions) await session.revoke();
    proofComplete = true;
    return {
      operatorUserId,
      acceptedSourceHead,
      publicEvidence: {
        custody: "server_only",
        syntheticIdentityCount: 2,
        passwordGrantVerifiedCount: 2,
        activeMembershipVerifiedCount: 1,
        globalSuperAdminVerifiedCount: 1,
        explicitImpersonationVerified: true,
        memberTenantSelectionVerified: true,
        previewHostMapVerified: true,
        tenantSlug: PCA11_SYNTHETIC_TENANT_SLUG,
        tenantFingerprint: fingerprint("tenant", configuration.tenantId),
        subjectFingerprints: configuration.subjects
          .map(({ kind, userId }) => fingerprint(kind, userId))
          .sort(),
        exportedSecretNames: [],
        exportedPasswords: false,
        exportedServiceRole: false,
      },
    };
  } finally {
    if (!proofComplete) {
      await Promise.allSettled(sessions.map((session) => session.revoke()));
    }
  }
}
