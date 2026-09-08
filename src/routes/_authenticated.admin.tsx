import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { meuAcessoSuperAdmin } from "@/lib/api/super.functions";
import { getImpersonationTenantId } from "@/integrations/supabase/impersonation-state";
import { meuAcessoAdmin } from "@/lib/api/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  loader: async () => {
    // This redirect is navigation only; a selected tenant is still validated by meuAcessoAdmin.
    const isSuper = await meuAcessoSuperAdmin();
    if (isSuper && !getImpersonationTenantId()) throw redirect({ to: "/super", replace: true });
    const ok = await meuAcessoAdmin();
    if (!ok) {
      throw redirect({ to: "/auth" });
    }
    return { ok };
  },
  component: () => <Outlet />,
  errorComponent: AdminNavigationError,
});

function AdminNavigationError({ reset }: { reset: () => void }) {
  const router = useRouter();
  return <section className="rounded-xl border bg-card p-6 space-y-4" role="alert">
    <h1 className="font-display text-2xl">Não foi possível abrir a empresa</h1>
    <p>Não foi possível confirmar o acesso. Tente novamente ou volte ao acesso da plataforma.</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" className="rounded-lg border px-4 py-2" onClick={() => { void router.invalidate(); reset(); }}>Tentar novamente</button>
      <Link to="/auth" className="rounded-lg border px-4 py-2">Voltar ao acesso</Link>
    </div>
  </section>;
}
