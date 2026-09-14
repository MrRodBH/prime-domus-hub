import { createFileRoute, notFound } from '@tanstack/react-router';
import { AuthPage } from '@/components/auth/AuthPage';
import { tenantReturnPath, validTenantLoginSlug } from '@/lib/auth/tenant-login-navigation';
import { obterIdentidadeAcessoEmpresa } from '@/lib/api/site.functions';
import { TENANT_FAVICON } from '@/lib/brand-assets';

export const Route = createFileRoute('/$tenantSlug/auth')({
  beforeLoad: ({ params }) => { if (!validTenantLoginSlug(params.tenantSlug)) throw notFound(); },
  loader: ({ params }) => obterIdentidadeAcessoEmpresa({ data: { slug: params.tenantSlug } }),
  validateSearch: (search: Record<string, unknown>): { next?: string } => ({
    next: typeof search.next === 'string' && search.next.length <= 2048 ? search.next : undefined,
  }),
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.name || 'Empresa'} — Acesso da empresa` },
    { name: 'robots', content: 'noindex' },
  ], links: [{ rel: 'icon', href: loaderData?.faviconUrl || TENANT_FAVICON }] }),
  component: TenantAuthPage,
});
function TenantAuthPage() {
  const { tenantSlug } = Route.useParams();
  const { next } = Route.useSearch();
  const branding = Route.useLoaderData();
  return <AuthPage key={tenantSlug} tenantSlug={tenantSlug} branding={branding} next={tenantReturnPath(tenantSlug, next)} />;
}
