type PreviewDomain = { tenantId: string; normalizedHostname: string; hostnameKind: string; status: string; enabled: boolean };

export function websitePreviewTarget(tenantId: string, domains: PreviewDomain[]): string | null {
  if (!tenantId || domains.some(d => d.tenantId !== tenantId)) throw Error('website_preview_tenant_mismatch');
  const active = domains.filter(d => d.hostnameKind === 'canonical' && d.status === 'active' && d.enabled);
  if (active.length === 0) return null;
  if (active.length !== 1) throw Error('website_preview_canonical_ambiguous');
  const host = active[0].normalizedHostname;
  const url = new URL(`https://${host}/`);
  if (url.hostname !== host || url.port || url.username || url.password || !/^[a-z0-9.-]+$/.test(host)) throw Error('website_preview_host_invalid');
  url.searchParams.set('__preview', '1');
  return url.href;
}

export function websiteFramePolicy(requestUrl: string) {
  const url = new URL(requestUrl);
  const adminDocument = /^\/(?:[^/]+\/)?(?:admin|auth)(?:\/|$)/.test(url.pathname);
  const previewDocument = url.pathname === '/' && url.searchParams.get('__preview') === '1';
  return {
    source: adminDocument ? "frame-src 'self'" : "frame-src 'none'",
    ancestors: previewDocument ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
  };
}
