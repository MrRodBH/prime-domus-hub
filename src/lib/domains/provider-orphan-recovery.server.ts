import { createClient } from "@supabase/supabase-js";
import { assertGlobalSuperAdmin } from "./domain-authority.server";
import { getGlobalProviderOrphanDiagnosticTarget } from "./domain-repository-provider.server";
import { DomainError, sanitizeDomainDetail } from "./domain-errors";
import { sha256 } from "./domain-repository-mappers.server";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER_OBJECT_ID_RE = /^[A-Za-z0-9_-]{8,128}$/;
const SECRET_REF_RE = /^env:([A-Z][A-Z0-9_]{2,127})$/;

export type ProviderOrphanDiagnosticStatus =
  | "no_candidate"
  | "orphan_candidate_single"
  | "ambiguous_candidates"
  | "already_bound"
  | "bound_object_missing"
  | "binding_candidate_conflict"
  | "binding_state_unresolved";

export interface ProviderOrphanCandidate {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string | null;
  version: string | null;
}

export interface ProviderOrphanDomainSnapshot {
  tenantId: string;
  domainId: string;
  generation: number;
  normalizedHostname: string;
  providerAccountId: string;
  zoneId: string;
  bindingState: "missing" | "claimed" | "bound" | "ambiguous";
  persistedProviderObjectId: string | null;
}

export interface ProviderOrphanDiagnosticResult {
  ok: true;
  dryRun: true;
  status: ProviderOrphanDiagnosticStatus;
  tenantId: string;
  domainId: string;
  generation: number;
  providerAccountId: string;
  zoneId: string;
  candidateCount: number;
  providerObjectIds: string[];
  persistedProviderObjectId: string | null;
  evidenceSha256: string;
  providerReadPerformed: true;
  providerWrites: 0;
  databaseWrites: 0;
  automaticAdoption: false;
  actionAuthorized: false;
  retryOriginalCreate: false;
  manualFallback: false;
  auditEvent: {
    eventType: "dca02_provider_orphan_dry_run";
    correlationId: string;
    actorUserId: string;
    authorityOrigin: "platform";
    tenantId: string;
    domainId: string;
    generation: number;
    detailSanitized: Record<string, unknown>;
    persisted: false;
  };
}

export class ProviderOrphanRecoveryError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
    this.name = "ProviderOrphanRecoveryError";
  }
}

type CloudflareEnvelope<T> = {
  success: boolean;
  result?: T;
  errors?: Array<{ code?: number | string; message?: string }>;
};

type CloudflareHostnameResult = {
  id?: unknown;
  hostname?: unknown;
  status?: unknown;
  ssl?: { status?: unknown };
  modified_at?: unknown;
  created_at?: unknown;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new ProviderOrphanRecoveryError("dca02_missing_server_dependency", `Missing server dependency: ${name}`, 503);
  return value;
}

function resolveCredential(reference: string, runtimeEnv: Record<string, unknown>): string {
  const match = reference.match(SECRET_REF_RE);
  if (!match) throw new ProviderOrphanRecoveryError("dca02_provider_configuration_invalid", "Provider credential reference is invalid", 503);
  const value = runtimeEnv[match[1]] ?? process.env[match[1]];
  if (typeof value !== "string" || value.length < 20) {
    throw new ProviderOrphanRecoveryError("dca02_provider_dependency_unavailable", "Provider credential is unavailable", 503);
  }
  return value;
}

export function parseProviderOrphanDiagnosticRequest(input: unknown): { domainId: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProviderOrphanRecoveryError("dca02_invalid_request", "Request body must be an object", 400);
  }
  const record = input as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !("domain_id" in record)) {
    throw new ProviderOrphanRecoveryError("dca02_authority_field_prohibited", "Only domain_id is accepted", 400);
  }
  if (typeof record.domain_id !== "string" || !UUID_RE.test(record.domain_id)) {
    throw new ProviderOrphanRecoveryError("dca02_invalid_domain_id", "domain_id is invalid", 400);
  }
  return { domainId: record.domain_id };
}

export async function authenticateProviderOrphanGlobalSuperAdmin(request: Request): Promise<string> {
  for (const header of ["x-tenant-id", "x-domain-id", "x-hostname", "x-provider-object-id", "x-custom-hostname-id"]) {
    if (request.headers.has(header)) {
      throw new ProviderOrphanRecoveryError("dca02_authority_header_prohibited", "Client authority headers are prohibited", 400);
    }
  }
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ") || !authorization.slice(7).trim()) {
    throw new ProviderOrphanRecoveryError("dca02_unauthorized", "Bearer authentication is required", 401);
  }
  const token = authorization.slice(7).trim();
  const client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_PUBLISHABLE_KEY"), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string" || !userId) {
    throw new ProviderOrphanRecoveryError("dca02_unauthorized", "Authenticated subject is invalid", 401);
  }
  try {
    await assertGlobalSuperAdmin({ userId, supabase: client });
  } catch {
    throw new ProviderOrphanRecoveryError("dca02_forbidden", "Exact global super_admin authority is required", 403);
  }
  return userId;
}

function normalizeHostname(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

async function listExactProviderCandidates(input: {
  accountIdentifier: string;
  zoneId: string;
  credentialReference: string;
  hostname: string;
  runtimeEnv: Record<string, unknown>;
}): Promise<ProviderOrphanCandidate[]> {
  const token = resolveCredential(input.credentialReference, input.runtimeEnv);
  const url = `${CLOUDFLARE_API_BASE}/zones/${encodeURIComponent(input.zoneId)}/custom_hostnames?hostname.exact=${encodeURIComponent(input.hostname)}&per_page=5`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ProviderOrphanRecoveryError("dca02_provider_read_failed", "Provider diagnostic read failed", 502);
  }
  let payload: CloudflareEnvelope<CloudflareHostnameResult[]>;
  try {
    payload = await response.json() as CloudflareEnvelope<CloudflareHostnameResult[]>;
  } catch {
    throw new ProviderOrphanRecoveryError("dca02_provider_response_invalid", "Provider diagnostic response is invalid", 502);
  }
  if (!response.ok || payload.success !== true || !Array.isArray(payload.result)) {
    const safeCodes = (payload.errors ?? []).map((item) => item.code ?? "unknown");
    throw new ProviderOrphanRecoveryError("dca02_provider_read_rejected", `Provider diagnostic read was rejected (${response.status}/${safeCodes.join(",")})`, 502);
  }
  const expectedHostname = normalizeHostname(input.hostname);
  return payload.result.flatMap((row): ProviderOrphanCandidate[] => {
    if (typeof row.id !== "string" || !PROVIDER_OBJECT_ID_RE.test(row.id) || typeof row.hostname !== "string") {
      throw new ProviderOrphanRecoveryError("dca02_provider_response_invalid", "Provider candidate identity is invalid", 502);
    }
    if (normalizeHostname(row.hostname) !== expectedHostname) return [];
    return [{
      id: row.id,
      hostname: expectedHostname,
      status: typeof row.status === "string" ? row.status : "unknown",
      sslStatus: typeof row.ssl?.status === "string" ? row.ssl.status : null,
      version: typeof row.modified_at === "string" ? row.modified_at : typeof row.created_at === "string" ? row.created_at : null,
    }];
  });
}

function determineStatus(snapshot: ProviderOrphanDomainSnapshot, providerObjectIds: string[]): ProviderOrphanDiagnosticStatus {
  if (providerObjectIds.length > 1) return "ambiguous_candidates";
  if (snapshot.bindingState === "ambiguous") return "binding_state_unresolved";
  if (snapshot.persistedProviderObjectId) {
    if (providerObjectIds.length === 0) return "bound_object_missing";
    return providerObjectIds[0] === snapshot.persistedProviderObjectId ? "already_bound" : "binding_candidate_conflict";
  }
  return providerObjectIds.length === 0 ? "no_candidate" : "orphan_candidate_single";
}

export async function classifyProviderOrphanSnapshot(input: {
  actorUserId: string;
  snapshot: ProviderOrphanDomainSnapshot;
  candidates: ProviderOrphanCandidate[];
}): Promise<ProviderOrphanDiagnosticResult> {
  const providerObjectIds = input.candidates.map((candidate) => {
    if (!PROVIDER_OBJECT_ID_RE.test(candidate.id) || normalizeHostname(candidate.hostname) !== input.snapshot.normalizedHostname) {
      throw new ProviderOrphanRecoveryError("dca02_provider_response_invalid", "Provider candidate evidence is invalid", 502);
    }
    return candidate.id;
  }).sort();
  const status = determineStatus(input.snapshot, providerObjectIds);
  const evidence = {
    tenantId: input.snapshot.tenantId,
    domainId: input.snapshot.domainId,
    generation: input.snapshot.generation,
    providerAccountId: input.snapshot.providerAccountId,
    zoneId: input.snapshot.zoneId,
    bindingState: input.snapshot.bindingState,
    persistedProviderObjectId: input.snapshot.persistedProviderObjectId,
    providerObjectIds,
    status,
  };
  const evidenceSha256 = await sha256(JSON.stringify(evidence));
  const detailSanitized = sanitizeDomainDetail({
    status,
    candidateCount: providerObjectIds.length,
    providerObjectIds,
    persistedProviderObjectId: input.snapshot.persistedProviderObjectId,
    evidenceSha256,
    actionAuthorized: false,
  }) as Record<string, unknown>;
  return {
    ok: true,
    dryRun: true,
    status,
    tenantId: input.snapshot.tenantId,
    domainId: input.snapshot.domainId,
    generation: input.snapshot.generation,
    providerAccountId: input.snapshot.providerAccountId,
    zoneId: input.snapshot.zoneId,
    candidateCount: providerObjectIds.length,
    providerObjectIds,
    persistedProviderObjectId: input.snapshot.persistedProviderObjectId,
    evidenceSha256,
    providerReadPerformed: true,
    providerWrites: 0,
    databaseWrites: 0,
    automaticAdoption: false,
    actionAuthorized: false,
    retryOriginalCreate: false,
    manualFallback: false,
    auditEvent: {
      eventType: "dca02_provider_orphan_dry_run",
      correlationId: `dca02-bl1-${evidenceSha256.slice(0, 32)}`,
      actorUserId: input.actorUserId,
      authorityOrigin: "platform",
      tenantId: input.snapshot.tenantId,
      domainId: input.snapshot.domainId,
      generation: input.snapshot.generation,
      detailSanitized,
      persisted: false,
    },
  };
}

export async function executeProviderOrphanDiagnostic(
  request: Request,
  body: unknown,
  runtimeEnv: Record<string, unknown> = {},
): Promise<ProviderOrphanDiagnosticResult> {
  const actorUserId = await authenticateProviderOrphanGlobalSuperAdmin(request);
  const parsed = parseProviderOrphanDiagnosticRequest(body);
  const target = await getGlobalProviderOrphanDiagnosticTarget(parsed.domainId);
  const candidates = await listExactProviderCandidates({
    accountIdentifier: target.provider.accountIdentifier,
    zoneId: target.provider.zoneId,
    credentialReference: target.provider.credentialReference,
    hostname: target.domain.normalizedHostname,
    runtimeEnv,
  });
  const result = await classifyProviderOrphanSnapshot({
    actorUserId,
    snapshot: {
      tenantId: target.domain.tenantId,
      domainId: target.domain.id,
      generation: target.domain.generation,
      normalizedHostname: target.domain.normalizedHostname,
      providerAccountId: target.provider.id,
      zoneId: target.provider.zoneId,
      bindingState: target.binding?.bindingState ?? "missing",
      persistedProviderObjectId: target.binding?.customHostnameId ?? null,
    },
    candidates,
  });
  console.info(JSON.stringify({ level: "info", event: result.auditEvent.eventType, ...result.auditEvent }));
  return result;
}

export function toProviderOrphanRecoveryError(error: unknown): ProviderOrphanRecoveryError {
  if (error instanceof ProviderOrphanRecoveryError) return error;
  if (error instanceof DomainError) {
    const status = error.code === "domain_not_found" ? 404 : error.code === "domain_authority_denied" ? 403 : 409;
    return new ProviderOrphanRecoveryError(error.code, error.message, status);
  }
  return new ProviderOrphanRecoveryError("dca02_diagnostic_failed", "Provider orphan diagnostic failed closed", 500);
}
