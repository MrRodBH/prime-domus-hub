// LSV-01 · Lote A — Authorized test targets registry.
//
// Independent, human-curated source of truth for what counts as a
// non-production Supabase project ref for the LSV-01 live harness.
// The environment guard consults this file in addition to the caller-
// supplied LSV_ALLOWED_PROJECT_REF so that a production ref cannot be
// laundered through the guard merely by re-declaring it as "staging".

export const ALLOWLIST_PROJECT_REFS: ReadonlySet<string> = new Set<string>([
  // e.g. "abcdefghijklmnopqrst" — an ephemeral project explicitly
  // provisioned for LSV-01 verification.
]);

export const DENYLIST_PROJECT_REFS: ReadonlySet<string> = new Set<string>([
  // Prime Domus Hub production ref — the app's own Supabase project.
  "stmcnvzuzlyqammyycxj",
]);

export type LsvRefDecision =
  | { readonly kind: "denied"; readonly reason: "denylist" }
  | { readonly kind: "allowed"; readonly reason: "allowlist" }
  | { readonly kind: "unknown" };

export function classifyProjectRef(ref: string): LsvRefDecision {
  if (DENYLIST_PROJECT_REFS.has(ref)) return { kind: "denied", reason: "denylist" };
  if (ALLOWLIST_PROJECT_REFS.has(ref)) return { kind: "allowed", reason: "allowlist" };
  return { kind: "unknown" };
}

/**
 * Loopback / local hosts. `*.local` mDNS namespace is intentionally
 * NOT accepted — hosts must be one of the explicitly enumerated values.
 */
const LOCAL_HOSTS: ReadonlySet<string> = new Set<string>([
  "localhost",
  "127.0.0.1",
  "::1",
  "host.docker.internal",
]);

export function isLocalSupabaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.username !== "" || u.password !== "") return false;
    const h = u.hostname.toLowerCase();
    return LOCAL_HOSTS.has(h);
  } catch {
    return false;
  }
}

/**
 * Strict remote-target host validation. Accepts ONLY:
 *   protocol = https:
 *   hostname = <ref>.supabase.co
 *   port     = "" or "443"
 *   username = ""
 *   password = ""
 * Returns the extracted ref on success, or "" on failure.
 */
export function extractSupabaseRemoteRef(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return "";
    if (u.username !== "" || u.password !== "") return "";
    if (u.port !== "" && u.port !== "443") return "";
    const host = u.hostname.toLowerCase();
    // Exact "<ref>.supabase.co" — no subdomain nesting, no suffix.
    const m = /^([a-z0-9-]{6,})\.supabase\.co$/.exec(host);
    if (!m) return "";
    return m[1];
  } catch {
    return "";
  }
}
