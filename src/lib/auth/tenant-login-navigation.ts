const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validTenantLoginSlug(slug: string) {
  return slug.length <= 63 && SLUG.test(slug);
}

/** Navigation only: the server must still validate session + active membership. */
export function tenantReturnPath(slug: string, candidate: unknown): string {
  if (!validTenantLoginSlug(slug)) return '/auth';
  const fallback = `/${slug}/admin`;
  if (typeof candidate !== 'string' || candidate.length > 2048
    || !candidate.startsWith('/') || candidate.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  try {
    const url = new URL(candidate, 'https://navigation.invalid');
    if (url.origin !== 'https://navigation.invalid' || url.pathname.includes('%')
      || !(url.pathname === fallback || url.pathname.startsWith(fallback + '/'))) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}

export function loginNavigation(pathname: string, search = '') {
  const match = /^\/([^/]+)\/(admin(?:\/.*)?|auth)\/?$/.exec(pathname);
  if (!match || !validTenantLoginSlug(match[1])) return { to: '/auth' as const };
  const tenantSlug = match[1];
  const candidate = match[2] === 'auth' ? new URLSearchParams(search).get('next') : pathname + search;
  const next = tenantReturnPath(tenantSlug, candidate);
  return { to: '/$tenantSlug/auth' as const, params: { tenantSlug }, search: { next } };
}
