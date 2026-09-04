import {
  executePca11ManagedBindingProvisioning,
  type Pca11NodeProvisioningDependencies,
  type Spr03ProvisionResult,
} from "@/lib/spr-03/managed-secret-provisioning.server";
import {
  PCA15R_PROVISIONER_ENVIRONMENT_NAME,
  parsePca15rAcceptedSourceHead,
  verifyPca15rManagedCustody,
  type Pca15rManagedCustodyDependencies,
  type Pca15rManagedCustodyProof,
} from "@/lib/pca-15r/managed-custody.server";
import {
  reconcilePca15rTerminalStateGetOnly,
  type Pca15rTerminalEvidence,
} from "@/lib/pca-15r/cloudflare-terminal-reconciliation.server";

const LEGACY_PROVISIONER_ENVIRONMENT_NAME = "CLOUDFLARE_API_TOKEN_PCA11_PROVISIONER";
const ALLOWED_FIELDS = new Set([
  "ceremony_id",
  "expected_worker_id",
  "expected_bootstrap_version_id",
  "expected_source_fingerprint",
  "expected_source_head",
  "phase",
]);

type EnvironmentReader = (name: string) => string | undefined;

export interface Pca15rManagedCustodyProvisioningResult {
  ok: true;
  sourceAuthority: "GITHUB_MAIN_ACCEPTED_HEAD";
  expectedSourceHead: string;
  managedCustody: Pca15rManagedCustodyProof["publicEvidence"];
  provisioning: Spr03ProvisionResult;
  terminalReconciliation: Pca15rTerminalEvidence;
  reconciledExistingVersion: boolean;
  secretsExported: false;
  passwordsExported: false;
  serviceRoleExported: false;
}

export interface Pca15rManagedCustodyProvisioningDependencies extends Pca15rManagedCustodyDependencies {
  executeManagedBinding?: (
    request: Request,
    body: unknown,
    dependencies: Pca11NodeProvisioningDependencies,
  ) => Promise<Spr03ProvisionResult>;
  reconcileTerminal?: (
    provisioner: string,
    expectedVersionId: string,
  ) => Promise<Pca15rTerminalEvidence>;
}

export class Pca15rManagedCustodyProvisioningError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
    this.name = "Pca15rManagedCustodyProvisioningError";
  }
}

function fail(code: string, status = 400): never {
  throw new Pca15rManagedCustodyProvisioningError(code, status);
}

function readRequiredEnvironment(readEnvironment: EnvironmentReader, name: string): string {
  const value = readEnvironment(name)?.trim();
  if (!value) fail("pca15r_missing_server_dependency", 503);
  return value;
}

function parseRequest(rawBody: unknown): {
  expectedSourceHead: string;
  legacyBody: Record<string, unknown>;
} {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return fail("pca15r_invalid_request");
  }
  const record = rawBody as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!ALLOWED_FIELDS.has(key)) fail("pca15r_unknown_or_sensitive_field");
  }
  if (Object.keys(record).length !== ALLOWED_FIELDS.size) {
    fail("pca15r_invalid_request");
  }
  const expectedSourceHead = parsePca15rAcceptedSourceHead(record.expected_source_head);
  const legacyBody = { ...record };
  delete legacyBody.expected_source_head;
  return { expectedSourceHead, legacyBody };
}

export async function executePca15rManagedCustodyProvisioning(
  request: Request,
  rawBody: unknown,
  dependencies: Pca15rManagedCustodyProvisioningDependencies = {},
): Promise<Pca15rManagedCustodyProvisioningResult> {
  const { expectedSourceHead, legacyBody } = parseRequest(rawBody);
  const readEnvironment = dependencies.readEnvironment ?? ((name) => process.env[name]);

  // This proof performs both password grants and the real tenant-context RPC.
  // It must complete before the Cloudflare credential is even read.
  const custody = await verifyPca15rManagedCustody(request, expectedSourceHead, {
    readEnvironment,
    gateway: dependencies.gateway,
  });
  const provisioner = readRequiredEnvironment(readEnvironment, PCA15R_PROVISIONER_ENVIRONMENT_NAME);
  const executeManagedBinding =
    dependencies.executeManagedBinding ?? executePca11ManagedBindingProvisioning;
  const provisioning = await executeManagedBinding(request, legacyBody, {
    authenticateGlobalSuperAdmin: async () => custody.operatorUserId,
    readEnvironment: (name) =>
      name === LEGACY_PROVISIONER_ENVIRONMENT_NAME ? provisioner : readEnvironment(name),
  });
  const reconcileTerminal =
    dependencies.reconcileTerminal ??
    ((token, versionId) => reconcilePca15rTerminalStateGetOnly(token, versionId));
  const terminalReconciliation = await reconcileTerminal(
    provisioner,
    provisioning.createdVersionId,
  );

  return {
    ok: true,
    sourceAuthority: "GITHUB_MAIN_ACCEPTED_HEAD",
    expectedSourceHead,
    managedCustody: custody.publicEvidence,
    provisioning,
    terminalReconciliation,
    reconciledExistingVersion: provisioning.reconciledExistingVersion,
    secretsExported: false,
    passwordsExported: false,
    serviceRoleExported: false,
  };
}
