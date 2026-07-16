// LSV-01 · Lote A — Session factory (skeleton).
// Emits real Supabase sessions via signInWithPassword against the
// authorized target. Never fabricates JWTs, never reuses the service
// role as an operational user, never logs raw tokens.

import type { Session, SupabaseClient } from "@supabase/supabase-js";

export interface LsvSessionResult {
  readonly acquired: boolean;
  readonly session: Session | null;
  readonly tokenFingerprint: string; // irreversible short hash for reports
}

export async function acquireSession(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<LsvSessionResult> {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    return { acquired: false, session: null, tokenFingerprint: "" };
  }
  return {
    acquired: true,
    session: data.session,
    tokenFingerprint: fingerprintToken(data.session.access_token),
  };
}

/**
 * Deterministic 8-char fingerprint of a token, salted by a fixed
 * non-secret label. Never call with anything other than a JWT-shaped
 * string. The fingerprint is irreversible: it can only be used to
 * compare presence / distinctness across clients within a run.
 */
export function fingerprintToken(token: string): string {
  const SALT = "lsv01-fingerprint-v1";
  let h = 0;
  const s = `${SALT}:${token}`;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return `fp_${(h >>> 0).toString(16).padStart(8, "0")}`;
}
