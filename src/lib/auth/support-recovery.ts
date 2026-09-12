import { z } from 'zod';
export const supportRecoveryInput = z.object({
  caseId: z.string().uuid(), email: z.string().trim().email().max(254),
  requestId: z.string().uuid(), confirmed: z.literal(true),
}).strict();
export function requireRecentRecoveryAuthentication(claims: Record<string, unknown>, now = Date.now()) {
  const amr = Array.isArray(claims.amr) ? claims.amr : [];
  const recentPassword = amr.some(a => a && typeof a === 'object' && a.method === 'password'
    && typeof a.timestamp === 'number' && a.timestamp * 1000 <= now
    && now - a.timestamp * 1000 <= 15 * 60_000);
  if (!recentPassword || !z.string().uuid().safeParse(claims.session_id).success)
    throw Error('Confirme sua senha da plataforma para solicitar a recuperação.');
}
