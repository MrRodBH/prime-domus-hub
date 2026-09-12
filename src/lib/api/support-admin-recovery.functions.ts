import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supportRecoveryInput, requireRecentRecoveryAuthentication } from '@/lib/auth/support-recovery';

export const requestSupportAdminRecovery = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => supportRecoveryInput.parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.from('user_roles').select('role')
      .eq('user_id', context.userId).eq('role', 'super_admin').maybeSingle();
    if (role.error || !role.data) throw Error('Acesso exclusivo do Super Admin.');
    requireRecentRecoveryAuthentication(context.claims);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const db = supabaseAdmin as any;
    // Preserve enrolled MFA: password reauthentication alone must not bypass it.
    const factors = await db.auth.admin.mfa.listFactors({ userId: context.userId });
    if (factors.error) throw Error('Não foi possível verificar a segurança da sessão.');
    if (factors.data.factors.some((f: any) => f.status === 'verified') && context.claims.aal !== 'aal2')
      throw Error('Conclua a autenticação de dois fatores da plataforma antes de solicitar a recuperação.');
    const prepared = await db.rpc('reserve_support_admin_recovery', {
      p_actor: context.userId, p_session: context.claims.session_id,
      p_case: data.caseId, p_email: data.email, p_request: data.requestId,
    });
    if (prepared.error) {
      if (prepared.error.message?.includes('recovery_rate_limited'))
        throw Error('Aguarde cinco minutos entre solicitações para a mesma conta. Limite do operador: dez por hora.');
      throw Error('Não foi possível autorizar a recuperação. Verifique o atendimento de acesso e o e-mail confirmado do Admin ativo desta empresa.');
    }
    if (prepared.data?.send === false) return { status: 'already_requested' as const };
    if (prepared.data?.send !== true || typeof prepared.data.email !== 'string')
      throw Error('Resposta de recuperação inválida.');
    let outcome: 'accepted' | 'failed' | 'unknown' = 'unknown';
    try {
      // Fixed application destination; neither request host nor caller chooses it.
      const sent = await db.auth.resetPasswordForEmail(prepared.data.email, {
        redirectTo: 'https://realone.com.br/reset-password',
      });
      outcome = sent.error ? 'failed' : 'accepted';
    } catch { /* A transport failure can occur after delivery: never retry automatically. */ }
    const recorded = await db.rpc('finish_support_admin_recovery', {
      p_actor: context.userId, p_request: data.requestId, p_outcome: outcome,
    });
    if (recorded.error) return { status: 'unknown' as const };
    return { status: outcome };
  });
