import assert from 'node:assert/strict';
import { build } from 'esbuild';

// All I/O is intercepted. A real provider/database request makes the suite fail.
const oldFetch = globalThis.fetch;
globalThis.fetch = async () => { throw Error('Network is prohibited in connection fixtures'); };
async function bundle(path, plugin) {
  const b = await build({entryPoints:[path], bundle:true, platform:'node', format:'esm', write:false, plugins:plugin ? [plugin] : []});
  return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
}
const domain = {id:'domain-a',tenantId:'tenant-a',generation:1,lockVersion:1,enabled:true,executionMode:'manual_assisted',status:'ownership_verified',normalizedHostname:'fixture.invalid',registrableDomain:'fixture.invalid',hostnameKind:'canonical',metadata:{}};
const authority = {tenantId:'tenant-a',userId:'admin-a',origin:'selection',isSuperAdmin:false};
const job = {id:'job-a',tenantId:'tenant-a',domainId:'domain-a',generation:1,executionMode:'manual_assisted',operationType:'prepare_dns_configuration',status:'leased',attemptCount:1,maxAttempts:5,payload:{},requestedBy:'admin-a',idempotencyKey:'fixture-key'};

// Immutable, exact-key upsert: concurrent callers cannot replace provenance or lease.
let rows = [], writes = 0, hideConflict = false;
globalThis.connectionDb = {from(name) {
  assert.equal(name,'domain_operation_jobs');
  return {
    upsert(row, options) { return {async select() {
      assert.equal(options.ignoreDuplicates,true);
      writes++;
      if(rows.some(r=>r.idempotency_key===row.idempotency_key))return {data:[],error:null};
      const saved={...row,id:'saved-'+rows.length,status:'pending',attempt_count:0};rows.push(saved);
      return {data:[saved],error:null};
    }};},
    select() {
      const filters=[];
      return {eq(k,v){filters.push([k,v]);return this;},then(resolve,reject){return Promise.resolve({data:hideConflict?[]:rows.filter(r=>filters.every(([k,v])=>r[k]===v)),error:null}).then(resolve,reject);}};
    },
  };
}};
const repo = await bundle('src/lib/domains/domain-repository-job.server.ts',{name:'db-fixture',setup(b){
  b.onResolve({filter:/integrations\/supabase\/client.server$/},()=>({path:'db',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const supabaseAdmin=globalThis.connectionDb;',loader:'js'}));
}});
const request=(payload={},d=domain,a=authority)=>repo.enqueueDomainJob({domain:d,authority:a,operationType:'prepare_dns_configuration',payload});
await request({ownershipChallengeId:'proof-v3',challengeVersion:3});
const results=await Promise.all(Array.from({length:8},(_,i)=>request({explicitRetryRequestedAt:String(i),recoveredFromFailed:true})));
assert.equal(rows.length,1);assert.equal(new Set(results.map(r=>r.id)).size,1);
assert.deepEqual(rows[0].payload,{ownershipChallengeId:'proof-v3',challengeVersion:3});
rows[0].status='leased';rows[0].lease_owner='executor-a';rows[0].attempt_count=2;
await request({explicitRetryRequestedAt:'later'});assert.equal(rows[0].status,'leased');assert.equal(rows[0].lease_owner,'executor-a');assert.equal(rows[0].attempt_count,2);
rows[0].status='succeeded';await request();assert.equal(rows[0].status,'succeeded');
const before=writes;await assert.rejects(request({},domain,{...authority,tenantId:'tenant-b'}),{code:'domain_authority_denied'});assert.equal(writes,before);
await request({}, {...domain,id:'domain-b'});
await request({}, {...domain,tenantId:'tenant-b'}, {...authority,tenantId:'tenant-b'});
await request({}, {...domain,generation:2});
await request({}, {...domain,executionMode:'api_automated'});
await request({}, {...domain,lockVersion:2});
assert.equal(rows.length,6);
hideConflict=true;await assert.rejects(request(),{code:'domain_ambiguous'});hideConflict=false;

const {obsoleteDomainJobReason,mayRecordDomainFailure}=await bundle('src/lib/domains/domain-job-lifecycle.ts');
assert.equal(obsoleteDomainJobReason(job,domain),null);
for(const [change,reason] of [[{generation:2},'generation_superseded'],[{executionMode:'api_automated'},'execution_mode_superseded'],[{status:'revoked'},'domain_revoked'],[{status:'pending_ssl'},'dns_preparation_phase_completed']])assert.equal(obsoleteDomainJobReason(job,{...domain,...change}),reason);
assert.equal(obsoleteDomainJobReason({...job,tenantId:'tenant-b'},domain),'identity_mismatch');
assert.equal(mayRecordDomainFailure(job,domain,domain,'domain_provider_configuration_invalid'),true);
for(const change of [{generation:2},{lockVersion:2},{status:'active'},{id:'domain-b'},{tenantId:'tenant-b'},{executionMode:'api_automated'}])assert.equal(mayRecordDomainFailure(job,domain,{...domain,...change},'domain_provider_configuration_invalid'),false);
assert.equal(mayRecordDomainFailure(job,domain,domain,'domain_version_conflict'),false);

// Exercise the actual consumer, not just the classification helper.
let current, pendingJobs, completions, transitions, continuations, fault, patches;
function reset(jobs=[job],d=domain) {current=structuredClone(d);pendingJobs=structuredClone(jobs);completions=[];transitions=[];continuations=[];fault=null;patches=0;}
globalThis.connectionWorker = {
  async enqueueScheduledDomainReconciliationJobs(){return 0;},
  async leaseDomainJobs(){return pendingJobs;},
  async getTenantDomain(t,id){assert.equal(t,'tenant-a');assert.equal(id,'domain-a');return structuredClone(current);},
  async completeDomainJob(data){completions.push(data);return data;},
  async enqueueDomainJob(data){continuations.push(data);return data;},
  async patchDomainMetadata({domain:d,patch}) {
    if(fault==='race') {current={...current,status:'pending_ssl',lockVersion:current.lockVersion+1};throw Error('concurrent progress');}
    assert.equal(d.lockVersion,current.lockVersion);patches++;current={...current,metadata:{...current.metadata,...patch},lockVersion:current.lockVersion+1};return structuredClone(current);
  },
  async transitionTenantDomain({domain:d,to}) {assert.equal(d.lockVersion,current.lockVersion);transitions.push(to);current={...current,status:to,lockVersion:current.lockVersion+1};return structuredClone(current);},
  async observeDnsCname(){return {targets:[],observedAt:'fixture-time',resolver:'fixture'};},
  async getCurrentOwnershipChallenge(){return {status:'verified',generation:1};},
  async getProviderAccountForDomain(){throw Error('Provider not configured');},
  createCloudflareAdapter(){throw Error('No provider calls permitted');},
};
const workerNames=['bindDomainProviderObjectIdentity','claimDomainProviderBinding','completeDomainJob','enqueueDomainJob','enqueueScheduledDomainReconciliationJobs','getCurrentOwnershipChallenge','getDomainProviderIdentityBinding','getProviderAccountForDomain','getTenantDomain','leaseDomainJobs','markDomainProviderClaimAmbiguous','patchDomainMetadata','releaseDomainProviderClaim','transitionTenantDomain','updateDomainProviderObservation','verifyOwnershipObservation','observeDnsTxt','observeDnsCname','createCloudflareAdapter','reconcileDomain'];
const worker=await bundle('src/lib/domains/domain-jobs.server.ts',{name:'worker-fixture',setup(b){
  b.onResolve({filter:/(domain-repository|dns-observation|cloudflare-adapter|domain-reconciliation)\.server$/},a=>({path:a.path,namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const {${workerNames.join(',')}}=globalThis.connectionWorker;`,loader:'js'}));
}});
const run=()=>worker.processScheduledDomainJobs({runtimeEnv:{DCA01_MANAGED_CNAME_TARGET:'sites.fixture.invalid'},leaseOwner:'fixture-executor'});
reset([job,{...job,id:'old-retry'}]);let result=await run();
assert.equal(result.succeeded,1);assert.equal(result.cancelled,1);assert.equal(patches,1);assert.deepEqual(transitions,['pending_dns_configuration']);assert.equal(continuations.length,1);assert.equal(current.status,'pending_dns_configuration');assert.equal(completions[1].outcome,'cancelled');
for(const d of [{...domain,generation:2},{...domain,status:'revoked'},{...domain,executionMode:'api_automated'}]){reset([job],d);assert.equal((await run()).cancelled,1);assert.deepEqual(transitions,[]);assert.equal(patches,0);}
reset();fault='race';await run();assert.equal(current.status,'pending_ssl');assert.deepEqual(transitions,[]);assert.equal(completions[0].outcome,'retry_wait');
reset([job],{...domain,tenantId:'other-tenant'});await run();assert.deepEqual(transitions,[]);assert.equal(completions[0].outcome,'failed');
// Direct A/AAAA/shared-IP assertions cannot satisfy the canonical CNAME contract.
reset([{...job,operationType:'observe_required_dns'}],{...domain,status:'pending_dns_configuration',metadata:{required_dns_plan:{targetHostname:'sites.fixture.invalid'}}});
await run();assert.equal(current.status,'pending_dns_configuration');assert.deepEqual(transitions,[]);assert.equal(completions[0].outcome,'retry_wait');
reset([{...job,operationType:'provision_provider_binding'}],{...domain,status:'pending_cloudflare_provisioning'});await run();assert.notEqual(current.status,'active');assert.equal(continuations.length,0);

const {domainProcessingSummary:summary}=await bundle('src/components/domains/presentation/domain-processing.ts');
assert.match(summary(domain,[{...job,status:'pending',attemptCount:0}]).message,/nenhuma tentativa/);
assert.equal(summary(domain,[{...job,status:'pending',tenantId:'other-tenant'}]).pending,false);
assert.equal(summary(domain,[{...job,status:'pending',generation:2}]).pending,false);
assert.match(summary(domain,[{...job,status:'leased'}]).message,/iniciou/);
assert.match(summary(domain,[]).message,/SSL ainda não/);
assert.match(summary({...domain,status:'active'},[]).message,/ativa/);
assert.doesNotMatch(summary({...domain,status:'active',enabled:false},[]).message,/Conexão ativa/);

// A dashboard "Live" claim, A/AAAA address match and successful HTTPS alone
// cannot replace the real adapter's persisted provider/SSL evidence.
const candidate={...domain,status:'pending_ssl',normalizedHostname:'tenant-a.example.com',registrableDomain:'example.com',metadata:{required_dns_generation:1,required_dns_observed:true,last_reconciliation_generation:1,last_reconciliation_success:true,lovableStatus:'Live',sharedIpMatches:true,httpsOk:true}};
let binding=null;
globalThis.connectionEvidence={
  async getCurrentOwnershipChallenge(){return {status:'verified',generation:1};},
  async getDomainProviderIdentityBinding(){return binding;},
  async listTenantDomains(){return [];},
  async isDomainHostnameReservationValid(){return true;},
};
const evidenceNames=['activateReplacement','getCurrentOwnershipChallenge','getDomainProviderIdentityBinding','getProviderAccountForDomain','getTenantDomain','isDomainHostnameReservationValid','listTenantDomains','patchDomainMetadata','transitionTenantDomain','updateDomainProviderObservation'];
const {buildCurrentGenerationEvidence}=await bundle('src/lib/domains/domain-reconciliation.server.ts',{name:'evidence-fixture',setup(b){
  b.onResolve({filter:/domain-repository\.server$/},()=>({path:'evidence',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const {${evidenceNames.join(',')}}=globalThis.connectionEvidence;`,loader:'js'}));
}});
const {assertActivePredicate}=await bundle('src/lib/domains/domain-state-machine.ts');
let evidence=await buildCurrentGenerationEvidence(candidate);
assert.equal(evidence.providerBindingConfirmed,false);assert.equal(evidence.sslStatusActive,false);
assert.throws(()=>assertActivePredicate(evidence));
binding={generation:1,bindingState:'bound',customHostnameId:'authoritative-provider-object',providerStatus:'active',sslStatus:'pending'};
evidence=await buildCurrentGenerationEvidence(candidate);assert.throws(()=>assertActivePredicate(evidence));
binding={...binding,sslStatus:'active'};
evidence=await buildCurrentGenerationEvidence({...candidate,hostnameKind:'alias'});assert.equal(evidence.canonicalOrAliasBindingValid,false);assert.throws(()=>assertActivePredicate(evidence));
binding={...binding,generation:2};evidence=await buildCurrentGenerationEvidence(candidate);assert.equal(evidence.providerBindingConfirmed,false);assert.throws(()=>assertActivePredicate(evidence));
globalThis.fetch=oldFetch;
delete globalThis.connectionDb;delete globalThis.connectionWorker;delete globalThis.connectionEvidence;
console.log('PASS domain connection execution: 8 concurrent retries, immutable leases/provenance, tenant/domain/generation/mode/version isolation, exact-key failure, obsolete jobs, concurrent progression, provider/DNS/TLS/alias rejection and honest processing messages. No network or live writes.');
