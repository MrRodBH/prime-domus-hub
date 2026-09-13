import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const initialDomain = { id: 'domain-a', tenantId: 'tenant-a', generation: 1, status: 'pending_ownership_verification' };
const initialChallenge = { id: 'proof-a', generation: 1, challengeVersion: 2, status: 'active', expiresAt: new Date(Date.now()+60000).toISOString(), recordName: '_rm-prime.fixture.invalid' };
const authority = { tenantId: 'tenant-a', userId: 'user-a', origin: 'selection', isSuperAdmin: false };
let domain, challenge, calls, values, fault;
const reset = () => { domain={...initialDomain}; challenge={...initialChallenge}; calls=[]; values=['observed-proof']; fault=null; };
globalThis.ownershipFixture = {
  async getTenantDomain(t,id) { assert.equal(t,'tenant-a'); assert.equal(id,'domain-a'); return {...domain}; },
  async getCurrentOwnershipChallenge() { return challenge ? {...challenge} : null; },
  async observeDnsTxt(name) { calls.push(['dns',name]); if(fault==='dns')throw Error('resolver failed'); return {recordName:name,values,observedAt:'fixture-time'}; },
  async verifyOwnershipObservation(input) {
    calls.push(['verify',input]);
    if(fault==='race') { domain.status='ownership_verified'; challenge.status='verified'; throw Error('state changed'); }
    if(fault==='generation') { domain.generation=2; challenge={...challenge,id:'proof-b',generation:2,status:'verified'}; throw Error('generation changed'); }
    if(fault==='rotated') { challenge={...challenge,id:'proof-b',status:'verified'}; throw Error('proof changed'); }
    if(fault==='db')throw Error('database failed');
    const verified=values.includes('observed-proof');
    if(verified) { domain.status='ownership_verified'; challenge.status='verified'; }
    return {verified,domain:{...domain},challenge:{...challenge}};
  },
  async enqueueDomainJob(input) { calls.push(['enqueue',input]); return {id:'next-job'}; },
};
const b=await build({entryPoints:['src/lib/domains/domain-ownership-verification.server.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'isolation',setup(b){
  b.onResolve({filter:/(domain-repository|dns-observation)\.server$/},a=>({path:a.path,namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const {getTenantDomain,getCurrentOwnershipChallenge,observeDnsTxt,verifyOwnershipObservation,enqueueDomainJob}=globalThis.ownershipFixture;',loader:'js'}));
}}]});
const {verifyDomainOwnership:verify}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const run=(a=authority)=>verify({authority:a,domain:initialDomain});
reset();const result=await run();assert.equal(result.verified,true);assert.equal(result.status,'ownership_verified');
assert.deepEqual(calls.map(x=>x[0]),['dns','verify','enqueue']);
assert.deepEqual(calls[1][1].authority,authority);assert.deepEqual(calls[1][1].observedValues,['observed-proof']);
assert.equal(calls[2][1].operationType,'prepare_dns_configuration');assert.deepEqual(calls[2][1].payload,{ownershipChallengeId:'proof-a',challengeVersion:2});
calls=[];assert.equal((await run()).alreadyVerified,true);assert.deepEqual(calls,[]);
reset();values=[];assert.equal((await run()).verified,false);assert.equal(domain.status,'pending_ownership_verification');assert.equal(calls.some(c=>c[0]==='enqueue'),false);
for(const a of [{...authority,tenantId:'tenant-b'},{...authority,isSuperAdmin:true},{...authority,origin:'impersonation'}]) { reset();await assert.rejects(run(a),{code:'domain_authority_denied'});assert.deepEqual(calls,[]); }
reset();domain.generation=2;await assert.rejects(run(),{code:'domain_generation_mismatch'});assert.deepEqual(calls,[]);
for(const state of ['missing','expired']) { reset();challenge=state==='missing'?null:{...challenge,expiresAt:'2000-01-01T00:00:00Z'};await assert.rejects(run(),{code:'domain_challenge_expired'});assert.deepEqual(calls,[]); }
reset();domain.status='revoked';await assert.rejects(run(),{code:'domain_transition_forbidden'});assert.deepEqual(calls,[]);
for(const error of ['dns','db','generation','rotated']) { reset();fault=error;await assert.rejects(run());assert.equal(calls.some(c=>c[0]==='enqueue'),false); }
reset();fault='race';assert.equal((await run()).alreadyVerified,true);assert.equal(calls.some(c=>c[0]==='enqueue'),false);

// Both real entry points must use this verifier; the manual request retains
// middleware and strict input validation and must not enqueue another TXT job.
const api=readFileSync('src/lib/api/tenant-domain.functions.ts','utf8');
const block=api.slice(api.indexOf('export const requestDomainVerificationCheck'),api.indexOf('export const requestDomainOperationRetry'));
assert.match(block,/middleware\(\[requireTenant\]\)/);assert.match(block,/domainIdSchema\.parse/);
assert.match(block,/authorizeTenantDomainOperation\(trusted\(context\), "operate"\)/);
assert.match(block,/verifyDomainOwnership\(\{ authority, domain \}\)/);assert.doesNotMatch(block,/enqueueDomainJob/);
assert.match(readFileSync('src/lib/domains/domain-jobs.server.ts','utf8'),/verifyDomainOwnership\(\{ authority: jobAuthority\(job\), domain \}\)/);
delete globalThis.ownershipFixture;
console.log('PASS shared ownership verifier: observed DNS, canonical authority, negative proof, expiry, actor/tenant isolation, repetition, concurrent verification, rotated proof/generation and failures. No network/writes.');
