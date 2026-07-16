// LSV-01 · Lote A — Environment guard.
// Server-only. Fails closed unless the operator explicitly declares a
// non-production target AND the resolved project ref is either an
// approved loopback host (local) or on the trusted allowlist (remote).
// Never logs secrets, JWTs, or service role keys.

import {
  classifyProjectRef,
  extractSupabaseRemoteRef,
  isLocalSupabaseUrl,
} from "./authorized-test-targets";

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

const CODE = "LSV_TEST_TARGET_NOT_AUTHORIZED";

/**
 * Legacy helper kept for backwards compat with the smoke tests. Parses
 * the ref from a bare host — DOES NOT validate protocol / credentials /
 * port. Use extractSupabaseRemoteRef() for gating decisions.
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

export function redactProjectRef(ref: string): string {
  if (!ref) return "<empty>";
  if (ref.length <= 6) return `${ref[0] ?? ""}***`;
  return `${ref.slice(0, 3)}***${ref.slice(-2)}`;
}

export function assertLsvTestEnvironment(
  input: LsvGuardInput,
): LsvAuthorizedEnvironment {
  const mode = input.LSV_TEST_MODE?.trim();
  if (mode !== "1") {
    throw new LsvEnvironmentGuardError(
      CODE,
      "LSV_TEST_MODE must be set to '1' to run the live security harness.",
    );
  }

  const target = (input.LSV_TEST_TARGET ?? "").trim().toLowerCase();
  if (!AUTHORIZED_TARGETS.has(target as LsvAuthorizedTarget)) {
    throw new LsvEnvironmentGuardError(
      CODE,
      `Unknown or missing LSV_TEST_TARGET. Allowed: local | ephemeral | staging.`,
    );
  }

  const supabaseUrl = (input.SUPABASE_URL ?? "").trim();
  const anonKey = (input.SUPABASE_ANON_KEY ?? "").trim();
  const serviceRoleKey = (input.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const allowedRef = (input.LSV_ALLOWED_PROJECT_REF ?? "").trim();

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !allowedRef) {
    throw new LsvEnvironmentGuardError(
      CODE,
      "Missing required test-target configuration.",
    );
  }

  for (const rx of PRODUCTION_HINT_PATTERNS) {
    if (rx.test(target) || rx.test(allowedRef)) {
      throw new LsvEnvironmentGuardError(
        CODE,
        "Production hint present in target label or ref.",
      );
    }
  }

  // ── local target: strictly enumerated loopback hosts. ──
  if (target === "local") {
    if (!isLocalSupabaseUrl(supabaseUrl)) {
      throw new LsvEnvironmentGuardError(
        CODE,
        "LSV_TEST_TARGET=local requires an approved loopback SUPABASE_URL (localhost, 127.0.0.1, ::1, host.docker.internal).",
      );
    }
    const projectRef = "local";
    return { target, supabaseUrl, anonKey, serviceRoleKey, projectRef };
  }

  // ── ephemeral / staging: strict https://<ref>.supabase.co host. ──
  const projectRef = extractSupabaseRemoteRef(supabaseUrl);
  if (!projectRef) {
    throw new LsvEnvironmentGuardError(
      CODE,
      "SUPABASE_URL must be https://<ref>.supabase.co with no port/credentials.",
    );
  }

  if (projectRef !== allowedRef) {
    throw new LsvEnvironmentGuardError(
      CODE,
      "Project ref of SUPABASE_URL does not match LSV_ALLOWED_PROJECT_REF.",
    );
  }

  const classification = classifyProjectRef(projectRef);
  if (classification.kind === "denied") {
    throw new LsvEnvironmentGuardError(
      CODE,
      "Project ref is on the LSV-01 denylist (known production ref).",
    );
  }
  if (classification.kind !== "allowed") {
    throw new LsvEnvironmentGuardError(
      CODE,
      "Project ref is not on the trusted LSV-01 allowlist.",
    );
  }

  return {
    target: target as LsvAuthorizedTarget,
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    projectRef,
  };
}
