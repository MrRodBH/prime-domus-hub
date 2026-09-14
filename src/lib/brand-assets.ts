export const PLATFORM_NAME = 'Real One';
export const PLATFORM_FAVICON = '/brand/realone-favicon.svg';

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
