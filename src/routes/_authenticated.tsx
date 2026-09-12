import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceShell } from "@/components/workspace";
import { meuAcessoSuperAdmin } from "@/lib/api/super.functions";
import { workspaceAccess } from "@/lib/auth/workspace-access";
import { useLogout } from "@/components/auth/useLogout";
import { Link } from "@tanstack/react-router";
import { loginNavigation } from '@/lib/auth/tenant-login-navigation';

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ ...loginNavigation(location.pathname, location.searchStr), replace: true });
    const isSuperAdmin = await meuAcessoSuperAdmin();
    const access = workspaceAccess(location.pathname, isSuperAdmin);
    if (access !== 'allowed') throw new Error(access);
    return { user: data.user, isSuperAdmin };
  },
  component: WorkspaceShell,
  errorComponent: WorkspaceAccessError,
});

export function WorkspaceAccessError({ error, reset }: { error: Error; reset: () => void }) {
  const exit = useLogout();
  const platformAccount = error.message === 'platform_account_on_tenant';
  const tenantAccount = error.message === 'tenant_account_on_platform';
  return <main className="min-h-screen bg-background flex items-center justify-center p-6">
    <section role="alert" className="max-w-lg space-y-4 rounded-xl border bg-card p-6">
      <h1 className="font-display text-2xl">{platformAccount ? 'Entre com a conta Admin da empresa' : tenantAccount ? 'Esta conta pertence ao ambiente da empresa' : 'Não foi possível verificar seu acesso'}</h1>
      <p>{platformAccount ? 'A sessão atual é de Super Admin da plataforma. Para abrir esta empresa, saia desta conta e entre com o e-mail e a senha do Admin do tenant.' : tenantAccount ? 'A administração da plataforma exige uma conta Super Admin.' : 'Seu painel não foi aberto. Tente novamente ou saia para entrar com outra conta.'}</p>
      <div className="flex flex-wrap gap-3">
        {platformAccount && <Link to="/super" className="rounded-lg border px-4 py-2">Abrir plataforma</Link>}
        {tenantAccount && <Link to="/admin" className="rounded-lg border px-4 py-2">Abrir minha empresa</Link>}
        {!platformAccount && !tenantAccount && <button onClick={reset} className="rounded-lg border px-4 py-2">Tentar novamente</button>}
        <button disabled={exit.busy} onClick={() => void exit.logout()} className="rounded-lg border px-4 py-2">{exit.busy ? 'Saindo…' : 'Sair e entrar com outra conta'}</button>
      </div>
      {exit.error && <p role="alert">{exit.error}</p>}
    </section>
  </main>;
}
