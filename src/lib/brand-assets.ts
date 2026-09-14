export const PLATFORM_NAME = 'Real One';
export const PLATFORM_FAVICON = '/brand/realone-favicon.svg';
export const TENANT_FAVICON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#123f47"/><path d="M6 15L16 6l10 9v12h-8v-8h-4v8H6z" fill="#fff"/></svg>');

export interface TenantLoginBranding { name: string; faviconUrl: string; logoUrl: string | null }
export function tenantLoginBranding(
  tenant: { id: string; slug: string; nome: string } | null,
  requestedSlug: string,
  published?: { site_name?: string; favicon_url?: string | null; logo_url?: string | null },
): TenantLoginBranding {
  if (!tenant || tenant.slug !== requestedSlug) return { name: 'Empresa', faviconUrl: TENANT_FAVICON, logoUrl: null };
  return {
    name: published?.site_name || tenant.nome || 'Empresa',
    faviconUrl: publicTenantFavicon(tenant.id, published?.favicon_url) || TENANT_FAVICON,
    logoUrl: published?.logo_url || null,
  };
}

// Owner-supplied asset. The caller must supply a server-verified tenant identity;
// a hostname, URL slug or company name is never sufficient to select this mark.
export function tenantPresentationFavicon(tenantId?: string | null): string | null {
  return tenantId === '9664d189-4a12-4caa-8243-dc73383447e6'
    ? '/brand/rmprime-favicon.png' : null;
}

// Published CMS media retains precedence over the owner-approved fallback.
export function publicTenantFavicon(tenantId: string, publishedUrl?: string | null): string | null {
  return publishedUrl || tenantPresentationFavicon(tenantId);
}
