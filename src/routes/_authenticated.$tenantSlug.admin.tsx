import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { meuTenantWorkspace } from "@/lib/api/tenant.functions";
import { supabase } from "@/integrations/supabase/client";
import { loginNavigation } from '@/lib/auth/tenant-login-navigation';

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ ...loginNavigation(location.pathname, location.searchStr), replace: true });
  },
  loader: async ({ params }) => {
    const tenant = await meuTenantWorkspace();
    if (params.tenantSlug !== tenant.slug) {
      throw new Error('tenant_address_mismatch');
    }
    return { tenant };
  },
  component: () => <Outlet />,
  errorComponent: AdminNavigationError,
});

function AdminNavigationError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const { tenantSlug } = Route.useParams();
  return <section className="rounded-xl border bg-card p-6 space-y-4" role="alert">
    <h1 className="font-display text-2xl">Não foi possível abrir a empresa</h1>
    <p>Não foi possível confirmar o acesso. Tente novamente ou volte ao acesso da empresa.</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" className="rounded-lg border px-4 py-2" onClick={() => { void router.invalidate(); reset(); }}>Tentar novamente</button>
      <Link to="/$tenantSlug/auth" params={{ tenantSlug }} search={{ next: `/${tenantSlug}/admin` }} className="rounded-lg border px-4 py-2">Voltar ao acesso da empresa</Link>
    </div>
  </section>;
}
