import assert from 'node:assert/strict';
import { PLATFORM_NAME, PLATFORM_FAVICON, publicTenantFavicon, tenantPresentationFavicon } from '../brand-assets';

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
