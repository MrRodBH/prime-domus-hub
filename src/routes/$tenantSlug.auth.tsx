import { createFileRoute, notFound } from '@tanstack/react-router';
import { AuthPage } from '@/components/auth/AuthPage';
import { tenantReturnPath, validTenantLoginSlug } from '@/lib/auth/tenant-login-navigation';

export const Route = createFileRoute('/$tenantSlug/auth')({
  beforeLoad: ({ params }) => { if (!validTenantLoginSlug(params.tenantSlug)) throw notFound(); },
  validateSearch: (search: Record<string, unknown>): { next?: string } => ({
    next: typeof search.next === 'string' && search.next.length <= 2048 ? search.next : undefined,
  }),
  head: () => ({ meta: [
    { title: 'Acesso da empresa — RM Prime SaaS' },
    { name: 'robots', content: 'noindex' },
  ] }),
  component: TenantAuthPage,
});
function TenantAuthPage() {
  const { tenantSlug } = Route.useParams();
  const { next } = Route.useSearch();
  return <AuthPage key={tenantSlug} tenantSlug={tenantSlug} next={tenantReturnPath(tenantSlug, next)} />;
}
