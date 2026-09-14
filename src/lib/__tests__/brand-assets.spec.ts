import assert from 'node:assert/strict';
import { PLATFORM_NAME, PLATFORM_FAVICON, TENANT_FAVICON, tenantLoginBranding, publicTenantFavicon, tenantPresentationFavicon } from '../brand-assets';

assert.equal(PLATFORM_NAME, 'Real One');
assert.equal(PLATFORM_FAVICON, '/brand/realone-favicon.svg');
const rmPrimeId = '9664d189-4a12-4caa-8243-dc73383447e6';
assert.equal(publicTenantFavicon(rmPrimeId, null), '/brand/rmprime-favicon.png');
assert.equal(publicTenantFavicon(rmPrimeId, '/published/new-mark.png'), '/published/new-mark.png');
for (const tenant of ['fixture-company-a', 'fixture-company-b', 'fixture-company-c']) {
  assert.equal(publicTenantFavicon(tenant, null), null);
  assert.equal(publicTenantFavicon(tenant, `/published/${tenant}.png`), `/published/${tenant}.png`);
}
for (const unverified of [null, undefined, 'rmprime', 'RM Prime Imóveis', 'rmprimeimoveis.com.br']) {
  assert.equal(tenantPresentationFavicon(unverified), null);
}
console.log('PASS browser identity: separate platform, original tenant asset, published CMS precedence, three isolated companies, no identity from names/hostnames/slugs.');

const rm = { id: rmPrimeId, slug: 'rmprime', nome: 'RM Prime Imóveis' };
assert.deepEqual(tenantLoginBranding(rm, 'rmprime'), { name: rm.nome, faviconUrl: '/brand/rmprime-favicon.png', logoUrl: null });
assert.equal(tenantLoginBranding(rm, 'rmprime', { favicon_url: '/published/custom.png' }).faviconUrl, '/published/custom.png');
for (const slug of ['xyz', 'abcd', 'deltaon']) {
  const tenant = { id: `fixture-${slug}`, slug, nome: `Empresa ${slug}` };
  assert.equal(tenantLoginBranding(tenant, slug).faviconUrl, TENANT_FAVICON);
  assert.equal(tenantLoginBranding(tenant, slug).name, tenant.nome);
  assert.deepEqual(tenantLoginBranding(tenant, 'rmprime', {site_name: 'must-not-leak', favicon_url: '/private-brand.png'}), tenantLoginBranding(null, 'rmprime'));
  assert.equal(tenantLoginBranding(tenant, slug, {favicon_url: `/${slug}.png`}).faviconUrl, `/${slug}.png`);
}
assert.equal(tenantLoginBranding(null, 'rmprime').faviconUrl, TENANT_FAVICON);
assert.notEqual(TENANT_FAVICON, PLATFORM_FAVICON);
console.log('PASS tenant login metadata: verified company name, CMS priority, three companies, mismatch/absent neutral identity.');
