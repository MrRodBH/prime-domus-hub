import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { meuTenantWorkspace } from "@/lib/api/tenant.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  loader: async ({ params }) => {
    const tenant = await meuTenantWorkspace();
    if (params.tenantSlug !== tenant.slug) {
      throw redirect({ to: "/$tenantSlug/admin", params: { tenantSlug: tenant.slug }, replace: true });
    }
    return { tenant };
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
