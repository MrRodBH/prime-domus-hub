import type { DomainJsonObject, DomainJsonValue } from "./domain-contracts";

export type DomainErrorCode =
  | "domain_invalid_hostname"
  | "domain_reserved_hostname"
  | "domain_public_suffix_only"
  | "domain_hostname_conflict"
  | "domain_not_found"
  | "domain_ambiguous"
  | "domain_transition_forbidden"
  | "domain_version_conflict"
  | "domain_authority_denied"
  | "domain_generation_mismatch"
  | "domain_active_predicate_incomplete"
  | "domain_challenge_expired"
  | "domain_challenge_replay"
  | "domain_provider_unavailable"
  | "domain_provider_configuration_invalid"
  | "domain_secret_reference_missing"
  | "domain_retry_exhausted"
  | "domain_cutover_blocked"
  | "domain_external_prerequisite_missing";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly retryable: boolean;
  readonly safeDetail: DomainJsonObject;

  constructor(
    code: DomainErrorCode,
    message: string,
    options: { retryable?: boolean; safeDetail?: DomainJsonObject; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "DomainError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.safeDetail = options.safeDetail ?? {};
  }
}

const SECRET_KEY_RE = /(secret|token|credential|authorization|cookie|password|api[-_]?key)/i;

export function sanitizeDomainDetail(value: unknown, depth = 0): DomainJsonValue {
  if (depth > 6) return "[depth-limit]";
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeDomainDetail(item, depth + 1));
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value);
  const output: DomainJsonObject = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SECRET_KEY_RE.test(key) ? "[redacted]" : sanitizeDomainDetail(item, depth + 1);
  }
  return output;
}

export function sanitizeDomainObject(value: unknown): DomainJsonObject {
  const sanitized = sanitizeDomainDetail(value);
  return typeof sanitized === "object" && sanitized !== null && !Array.isArray(sanitized)
    ? sanitized
    : {};
}

export function toSafeDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  const message = error instanceof Error ? error.message : "Unknown domain operation error";
  return new DomainError("domain_provider_unavailable", message, {
    retryable: true,
    safeDetail: {
      error: sanitizeDomainDetail(error instanceof Error ? { name: error.name, message } : error),
    },
    cause: error,
  });
}