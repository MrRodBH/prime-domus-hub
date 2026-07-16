// LSV-01 · Lote A — Environment guard.
// Server-only. Fails closed unless the operator explicitly declares a
// non-production target. Never logs secrets, JWTs, or service role keys.

export type LsvAuthorizedTarget = "local" | "ephemeral" | "staging";

const AUTHORIZED_TARGETS: ReadonlySet<LsvAuthorizedTarget> = new Set([
  "local",
  "ephemeral",
  "staging",
]);

export class LsvEnvironmentGuardError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "LsvEnvironmentGuardError";
  }
}

export interface LsvAuthorizedEnvironment {
  readonly target: LsvAuthorizedTarget;
  readonly supabaseUrl: string;
  readonly anonKey: string;
  readonly serviceRoleKey: string;
  readonly projectRef: string;
}

export interface LsvGuardInput {
  readonly LSV_TEST_MODE?: string;
  readonly LSV_TEST_TARGET?: string;
  readonly LSV_ALLOWED_PROJECT_REF?: string;
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_ANON_KEY?: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
}

const PRODUCTION_HINT_PATTERNS: ReadonlyArray<RegExp> = [
  /prod\b/i,
  /production/i,
  /live/i,
];

/**
 * Extract the Supabase project ref from an URL like
 * `https://<ref>.supabase.co`. Returns empty string when it can't be parsed.
 * Never returns secrets or logs anything.
 */
export function extractProjectRef(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const dot = host.indexOf(".");
    if (dot <= 0) return "";
    const ref = host.slice(0, dot);
    if (!/^[a-z0-9-]{6,}$/i.test(ref)) return "";
    return ref;
  } catch {
    return "";
  }
}

/**
 * Fingerprints a project ref for structured output. Never call this on
 * secrets: it's designed for opaque, non-sensitive identifiers only.
 */
export function redactProjectRef(ref: string): string {
  if (!ref) return "<empty>";
  if (ref.length <= 6) return `${ref[0] ?? ""}***`;
  return `${ref.slice(0, 3)}***${ref.slice(-2)}`;
}

/**
 * Runs the environment guard. Throws LsvEnvironmentGuardError with code
 * `LSV_TEST_TARGET_NOT_AUTHORIZED` for any failure. On success returns
 * the resolved environment. Handlers must never render the returned
 * secret material in logs, reports, or errors.
 */
export function assertLsvTestEnvironment(
  input: LsvGuardInput,
): LsvAuthorizedEnvironment {
  const mode = input.LSV_TEST_MODE?.trim();
  if (mode !== "1") {
    throw new LsvEnvironmentGuardError(
      "LSV_TEST_TARGET_NOT_AUTHORIZED",
      "LSV_TEST_MODE must be set to '1' to run the live security harness.",
    );
  }

  const target = (input.LSV_TEST_TARGET ?? "").trim().toLowerCase();
  if (!AUTHORIZED_TARGETS.has(target as LsvAuthorizedTarget)) {
    throw new LsvEnvironmentGuardError(
      "LSV_TEST_TARGET_NOT_AUTHORIZED",
      `Unknown or missing LSV_TEST_TARGET. Allowed: local | ephemeral | staging.`,
    );
  }

  const supabaseUrl = (input.SUPABASE_URL ?? "").trim();
  const anonKey = (input.SUPABASE_ANON_KEY ?? "").trim();
  const serviceRoleKey = (input.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const allowedRef = (input.LSV_ALLOWED_PROJECT_REF ?? "").trim();

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !allowedRef) {
    throw new LsvEnvironmentGuardError(
      "LSV_TEST_TARGET_NOT_AUTHORIZED",
      "Missing required test-target configuration.",
    );
  }

  const projectRef = extractProjectRef(supabaseUrl);
  if (!projectRef) {
    throw new LsvEnvironmentGuardError(
      "LSV_TEST_TARGET_NOT_AUTHORIZED",
      "SUPABASE_URL does not resolve to a valid project ref.",
    );
  }

  if (projectRef !== allowedRef) {
    throw new LsvEnvironmentGuardError(
      "LSV_TEST_TARGET_NOT_AUTHORIZED",
      "Project ref of SUPABASE_URL does not match LSV_ALLOWED_PROJECT_REF.",
    );
  }

  for (const rx of PRODUCTION_HINT_PATTERNS) {
    if (rx.test(target)) {
      throw new LsvEnvironmentGuardError(
        "LSV_TEST_TARGET_NOT_AUTHORIZED",
        "Target label contains a production hint.",
      );
    }
    if (rx.test(allowedRef)) {
      throw new LsvEnvironmentGuardError(
        "LSV_TEST_TARGET_NOT_AUTHORIZED",
        "Allowed project ref contains a production hint.",
      );
    }
  }

  return {
    target: target as LsvAuthorizedTarget,
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    projectRef,
  };
}
