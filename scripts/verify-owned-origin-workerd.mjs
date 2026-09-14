/** Exercises the compiled application with synthetic bindings; never connects to a real backend. */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtemp, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, relative } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { request as httpRequest } from 'node:http';

const root = process.cwd();
const build = resolve(root, 'dist/server');
const directory = await mkdtemp(join(tmpdir(), 'owned-origin-'));
const secret = 'synthetic-origin-proof-key-never-for-production';
const nonce = 'a'.repeat(64);
const rows = ['alpha', 'bravo', 'charlie'].flatMap((name, i) => {
  const base = { tenant_id: `tenant-${i}`, generation: 1, lock_version: 1, enabled: true,
    status: 'pending_ssl', execution_mode: 'api_automated', metadata: {} };
  return [{ ...base, id: `root-${i}`, hostname_kind: 'canonical', normalized_hostname: `${name}.example.com` },
    { ...base, id: `alias-${i}`, hostname_kind: 'alias', normalized_hostname: `www.${name}.example.com` }];
});
rows.push({ ...rows[0], id: 'unverified', tenant_id: 'unverified-tenant', normalized_hostname: 'unverified.example.com' });
rows.push({ ...rows[1], id: 'orphan', tenant_id: 'orphan-tenant', normalized_hostname: 'orphan.example.com' });
const json = JSON.stringify;
let child;
let output = '';
try {
  // Workerd's outbound service is a fixture, not a network service. Any unexpected operation fails.
  await writeFile(join(directory, 'backend.mjs'), `
const rows = ${json(rows)};
export default { async fetch(request) {
 const url = new URL(request.url);
 if (request.method !== 'GET' || url.hostname !== 'backend.invalid') return Response.json({error:'forbidden'}, {status:403});
 const p = url.searchParams;
 if (url.pathname === '/rest/v1/tenant_domains') {
   if (p.get('normalized_hostname') === 'eq.failure.example.com') return Response.json({error:'synthetic_failure'}, {status:503});
   const filtered = rows.filter(row => [...p].every(([key,value]) =>
     ['select','order'].includes(key) || (value.startsWith('eq.') ? String(row[key]) === value.slice(3) :
       value.startsWith('in.(') ? value.slice(4,-1).split(',').includes(String(row[key])) : false)));
   return Response.json(filtered);
 }
 if (url.pathname === '/rest/v1/domain_verification_challenges') {
   const id = p.get('domain_id')?.slice(3);
   const row = rows.find(r => r.id === id);
   return Response.json(row ? [{id:'proof-'+id, domain_id:id, tenant_id:row.tenant_id,
     generation:1, status:id === 'unverified' ? 'active' : 'verified'}] : []);
 }
 return Response.json({error:'unexpected_read'}, {status:403});
}};`);
  await writeFile(join(directory, 'entry.mjs'), `
import app from './application/index.mjs';
export default { fetch(request, env, ctx) {
 const url = new URL(request.url); url.protocol = 'https:'; url.port = ''; url.hostname = request.headers.get('host').split(':')[0];
 // Local socket reconstructs the public HTTPS URL from Host; application host checks run unchanged.
 return app.fetch(new Request(url, request), env, ctx);
}};`);
  const files = await readdir(build, { recursive: true });
  const modules = files.filter(name => name.endsWith('.mjs')).map(name =>
    `(name=${json("application/"+name)},esModule=embed ${json(relative(directory,join(build,name)))})`);
  const bindings = { SUPABASE_URL:'https://backend.invalid', SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key',
    SUPABASE_PUBLISHABLE_KEY:'synthetic-publishable-key', DOMAIN_ROUTING_PROOF_SECRET:secret,
    RM_PRIME_DEPLOYMENT_ENVIRONMENT:'test' };
  const config = `using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (
 services=[(name="application",worker=(modules=[
 (name="entry.mjs",esModule=embed "entry.mjs"),${modules.join(',')}],
 compatibilityDate="2026-07-29",compatibilityFlags=["nodejs_compat"],
 bindings=[${Object.entries(bindings).map(([name,value])=>`(name=${json(name)},text=${json(value)})`).join(',')}],
 globalOutbound="backend")),
 (name="backend",worker=(modules=[(name="backend.mjs",esModule=embed "backend.mjs")],
 compatibilityDate="2026-07-29",globalOutbound="deny")),(name="deny",network=(allow=[]))],
 sockets=[(name="http",address="127.0.0.1:0",http=(),service="application")]);`;
  const configPath = join(directory,'config.capnp');
  await writeFile(configPath, config);
  const listener = createServer(); listener.listen(0,'127.0.0.1'); await once(listener,'listening');
  const port = listener.address().port; await new Promise(resolveClose => listener.close(resolveClose));
  child = spawn(resolve(root,'node_modules/.bin/workerd'),['serve',configPath,'--socket-addr',`http=127.0.0.1:${port}`],
    {env:{PATH:process.env.PATH},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',d=>output+=d); child.stderr.on('data',d=>output+=d);
  let ready = false;
  for (let i=0;i<100;i++) {
    if (child.exitCode !== null) throw new Error(`workerd exited: ${output}`);
    try { await fetch(`http://127.0.0.1:${port}/`, { signal:AbortSignal.timeout(500) }); ready=true; break; }
    catch { await new Promise(r=>setTimeout(r,100)); }
  }
  assert(ready,`workerd startup timed out: ${output}`);
  const request = (hostname, queryNonce=nonce, extra={}) => new Promise((resolveResponse,reject) => {
    const req=httpRequest({hostname:'127.0.0.1',port,
      path:`/.well-known/rm-prime-domain-routing?nonce=${queryNonce}`,
      headers:{host:hostname,...extra},timeout:30000}, response => {
      let body=''; response.on('data',part=>body+=part); response.on('end',()=>resolveResponse({
        status:response.statusCode,headers:new Headers(response.headers),text:async()=>body}));
    });
    req.on('timeout',()=>req.destroy(new Error('local request timeout'))); req.on('error',reject); req.end();
  });
  const checks = [];
  for (const row of rows.slice(0,6)) {
    const canonical = rows.find(r=>r.tenant_id===row.tenant_id && r.hostname_kind==='canonical').normalized_hostname;
    const expected = createHmac('sha256',secret).update(json(['domain-routing-v1',nonce,row.tenant_id,row.id,1,row.normalized_hostname,canonical])).digest('hex');
    for (let repeat=0;repeat<2;repeat++) {
      const response = await request(row.normalized_hostname);
      assert.equal(response.status,row.hostname_kind==='alias'?308:204,`${row.id}: ${await response.text()}\n${output}`);
      assert.equal(response.headers.get('x-rm-prime-routing-proof'),expected,row.id);
      assert.equal(response.headers.get('location'),row.hostname_kind==='alias'?`https://${canonical}/.well-known/rm-prime-domain-routing?nonce=${nonce}`:null);
      assert.equal(response.headers.get('cache-control'),'no-store');
    }
    checks.push(`${row.id}: signed proof and repetition`);
  }
  for (const host of ['unknown.example.com','unverified.example.com','orphan.example.com','failure.example.com']) {
    const response=await request(host);
    assert.equal(response.status,404,host); assert.equal(response.headers.get('x-rm-prime-routing-proof'),null);
    assert.equal(response.headers.get('location'),null); checks.push(`${host}: rejected`);
  }
  const malformed = await request(rows[0].normalized_hostname,'invalid'); assert.equal(malformed.status,404);
  const spoofed = await request('unknown.example.com',nonce,{'x-forwarded-host':rows[0].normalized_hostname,'x-tenant-id':rows[0].tenant_id});
  assert.equal(spoofed.status,404); checks.push('malformed nonce and spoofed authority: rejected');
  console.log(JSON.stringify({status:'passed',runtime:'workerd',compiledApplication:true,realBackendAccess:false,
    liveTlsValidated:false,checks},null,2));
} finally {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child,'exit'); }
  await rm(directory,{recursive:true,force:true});
}
