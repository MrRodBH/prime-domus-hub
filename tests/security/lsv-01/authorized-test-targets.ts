// LSV-01 · Lote A — Authorized test targets registry.
//
// Independent, human-curated source of truth for what counts as a
// non-production Supabase project ref for the LSV-01 live harness.
// The environment guard consults this file in addition to the caller-
// supplied LSV_ALLOWED_PROJECT_REF so that a production ref cannot be
// laundered through the guard merely by re-declaring it as "staging".
//
// Rules:
//   * Only ephemeral / staging refs explicitly reviewed as non-prod
//     appear in ALLOWLIST_PROJECT_REFS.
//   * Any ref known to be production for this or a sibling app appears
//     in DENYLIST_PROJECT_REFS. Denylist wins over allowlist.
//   * `local` targets skip the ref allowlist but MUST resolve to a
//     loopback URL — enforced by the guard, not by this file.
//   * Unknown opaque refs (not on either list) fail closed, so a fresh
//     production project cannot pass by default.
//
// This file MUST NOT contain secrets: only opaque, non-sensitive refs.

/**
 * Known non-production project refs authorized for LSV-01 live runs.
 * Empty by default; operators add refs here as they provision isolated
 * ephemeral/staging Supabase projects reviewed for use with LSV-01.
 */
export const ALLOWLIST_PROJECT_REFS: ReadonlySet<string> = new Set<string>([
  // e.g. "abcdefghijklmnopqrst" — an ephemeral project explicitly
  // provisioned for LSV-01 verification.
]);

/**
 * Refs known to be production for this application or sibling apps.
 * The guard refuses these even when the operator declares them as
 * ephemeral or staging.
 */
export const DENYLIST_PROJECT_REFS: ReadonlySet<string> = new Set<string>([
  // Prime Domus Hub production ref — the app's own Supabase project.
  // Kept here so the LSV-01 harness cannot ever be pointed at it, even
  // by mistake or misdeclaration.
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
 * Loopback / local URL check for the `local` target. We accept
 * 127.0.0.1, localhost, and the standard Supabase CLI dev host.
 */
export function isLocalSupabaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "::1" ||
      h === "host.docker.internal" ||
      h.endsWith(".local")
    );
  } catch {
    return false;
  }
}
