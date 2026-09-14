import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { buildDomainEdge } from '../../scripts/domains/build-edge.mjs';

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw Error('Real network prohibited'); };
async function moduleAt(path, mocks={}) {
  const result=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'isolated-boundaries',setup(b){
    b.onResolve({filter:/.*/},a=>Object.hasOwn(mocks,a.path)?{path:a.path,namespace:'fixture'}:undefined);
    b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'js'}));
  }}]});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const env={DOMAIN_PROCESSOR_SECRET:'s'.repeat(40),DOMAIN_PROCESSOR_ENABLED:'true',SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-only',DCA01_MANAGED_CNAME_TARGET:'sites.delivery.com',DOMAIN_ROUTING_PROOF_SECRET:'r'.repeat(40),CF_DELIVERY:'x'.repeat(40),CF_DNS:'d'.repeat(40)};
const {createDomainEdgeHandler}=await moduleAt('src/lib/domains/domain-edge-handler.ts');
let calls=0;
const handler=createDomainEdgeHandler(env,async input=>{calls++;assert.equal(input.limit,1);assert.equal(input.runtimeEnv,env);return {leased:1,succeeded:1};});
const request=(body,secret=env.DOMAIN_PROCESSOR_SECRET)=>new Request('https://fixture.supabase.co/functions/v1/domain-processor',{method:'POST',headers:{'x-domain-processor-secret':secret},body});
assert.equal((await handler(request(undefined,''))).status,401);
assert.equal((await handler(request(undefined,'browser-jwt'))).status,401);
assert.equal((await handler(request('{"tenant":"other"}'))).status,400);
assert.equal((await handler(request('null'))).status,400);
assert.equal((await handler(new Request('https://fixture.supabase.co'))).status,405);
assert.equal(calls,0);
assert.equal((await handler(request('{}'))).status,200);assert.equal(calls,1);
assert.equal((await handler(request())).status,200);assert.equal(calls,2);
assert.equal((await createDomainEdgeHandler({...env,DOMAIN_PROCESSOR_ENABLED:'false'},()=>{throw Error('must not execute');})(request())).status,503);
assert.equal((await createDomainEdgeHandler({...env,DOMAIN_ROUTING_PROOF_SECRET:''},()=>{throw Error('must not execute');})(request())).status,503);
const failure=await createDomainEdgeHandler(env,async()=>{throw Error('secret should not escape');})(request());
assert.equal(failure.status,503);assert.doesNotMatch(await failure.text(),/secret should/);

const domain=(i,alias=false)=>({id:`domain-${i}${alias?'-alias':''}`,tenantId:`tenant-${i}`,normalizedHostname:`${alias?'www.':''}fixture-${i}-realty.com`,registrableDomain:`fixture-${i}-realty.com`,hostnameKind:alias?'alias':'canonical',status:'pending_ssl',generation:1,lockVersion:3,enabled:true,executionMode:'api_automated',replacementOf:null,incumbentDomainId:null,metadata:{},requestedBy:'fixture-admin'});
// Exercise the real repository boundary: display sanitization must not destroy
// the server-owned env reference used by the flattened-DNS adapter.
globalThis.providerRows=[];
const providerRepo=await moduleAt('src/lib/domains/domain-repository-provider.server.ts',{
 '@/integrations/supabase/client.server':`export const supabaseAdmin={from(){return {select(){return {eq(){return {eq:async()=>({data:globalThis.providerRows,error:null})}}}}}}};`,
});
const {objectValue}=await moduleAt('src/lib/domains/domain-repository-mappers.server.ts');
for(let i=1;i<=3;i++) {
 const hostname=domain(i).registrableDomain;
 const capabilities={zones:{[hostname]:`delivery-zone-${i}`},customer_dns_zones:{[hostname]:{zone_id:`customer-zone-${i}`,credential_reference:`env:CF_DNS_${i}`}}};
 globalThis.providerRows=[{id:`account-${i}`,account_identifier:`account-fixture-${i}`,enabled:true,credential_reference:'env:CF_DELIVERY',capabilities}];
 const provider=await providerRepo.getProviderAccountForDomain(domain(i));
 assert.equal(provider.zoneId,`delivery-zone-${i}`);
 assert.equal(provider.customerDnsZoneId,`customer-zone-${i}`);
 assert.equal(provider.customerDnsCredentialReference,`env:CF_DNS_${i}`);
 assert.equal(objectValue(capabilities).customer_dns_zones[hostname].credential_reference,'[redacted]');
 await assert.rejects(()=>providerRepo.getProviderAccountForDomain(domain(i+10)),e=>e.code==='domain_provider_configuration_invalid');
 for(const invalid of ['[redacted]','literal-api-token','env:lowercase']) {
  capabilities.customer_dns_zones[hostname].credential_reference=invalid;
  assert.equal((await providerRepo.getProviderAccountForDomain(domain(i))).customerDnsCredentialReference,undefined);
 }
}
delete globalThis.providerRows;
const {routingSignature,canonicalForDomain,DOMAIN_PROBE_PATH}=await moduleAt('src/lib/domains/domain-routing-contract.ts');
const {observeDomainRouting}=await moduleAt('src/lib/domains/domain-https-observation.server.ts');
const addresses=async()=>({addresses:['104.16.1.1'],observedAt:new Date().toISOString()});
for(let i=1;i<=3;i++) {
  const d=domain(i),alias=domain(i,true),canonical={...d,status:'active'};
  const goodProbe=async(host,path,ip)=>{
    assert.equal(ip,'104.16.1.1');const record=host.startsWith('www.')?alias:d;
    const nonce=new URL('https://'+host+path).searchParams.get('nonce');
    return {status:record.hostnameKind==='alias'?308:204,location:record.hostnameKind==='alias'?'https://'+d.normalizedHostname+path:undefined,signature:await routingSignature(record,d.normalizedHostname,nonce,env.DOMAIN_ROUTING_PROOF_SECRET)};
  };
  assert.equal((await observeDomainRouting(d,[canonical],env,goodProbe,addresses)).canonicalHostname,d.normalizedHostname);
  assert.equal((await observeDomainRouting(alias,[canonical],env,goodProbe,addresses)).canonicalHostname,d.normalizedHostname);
  await assert.rejects(()=>observeDomainRouting(alias,[{...domain(i+10),status:'active'}],env,goodProbe,addresses));
  await assert.rejects(()=>observeDomainRouting(d,[canonical],env,async()=>({status:204,signature:'Live/shared-IP'}),addresses));
  await assert.rejects(()=>observeDomainRouting(d,[canonical],env,async()=>{throw Error('CERT_HAS_EXPIRED');},addresses));
  await assert.rejects(()=>observeDomainRouting(alias,[canonical],env,async(host,path,ip)=>({...await goodProbe(host,path,ip),location:'https://realone.com.br'+path}),addresses));
  await assert.rejects(()=>observeDomainRouting(d,[canonical],env,async(host,path,ip)=>({...await goodProbe(host,path,ip),status:302,location:'http://'+host+path}),addresses));
  const stale={...d,generation:2};
  await assert.rejects(()=>observeDomainRouting(stale,[canonical],env,goodProbe,addresses));
}
const {isPublicIpv4,pinnedHttpsProbe}= {...await moduleAt('src/lib/domains/dns-observation.server.ts'),...await moduleAt('src/lib/domains/domain-https-observation.server.ts')};
for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','100.64.0.1','192.168.1.1','0.0.0.0','::1','224.1.1.1','198.18.1.1']){
 assert.equal(isPublicIpv4(ip),false);await assert.rejects(()=>pinnedHttpsProbe('fixture.com',DOMAIN_PROBE_PATH+'?nonce='+'a'.repeat(64),ip));
}
// Inspect actual HTTPS transport options; it must pin DNS, preserve SNI, verify TLS and never follow redirects.
let observedOptions;
globalThis.httpsMock=(options,callback)=>{observedOptions=options;const events={};return {on(k,v){events[k]=v;return this;},end(){callback({statusCode:302,headers:{location:'https://other.com'},destroy(){}});events.close();},destroy(error){events.error?.(error);events.close?.();}};};
const transport=await moduleAt('src/lib/domains/domain-https-observation.server.ts',{'node:https':'export const request=globalThis.httpsMock;'});
assert.equal((await transport.pinnedHttpsProbe('fixture.com',DOMAIN_PROBE_PATH+'?nonce='+'a'.repeat(64),'104.16.1.1')).status,302);
assert.equal(observedOptions.rejectUnauthorized,true);assert.equal(observedOptions.servername,'fixture.com');assert.equal(observedOptions.agent,false);
observedOptions.lookup('fixture.com',{},(_,ip,family)=>{assert.equal(ip,'104.16.1.1');assert.equal(family,4);});

// Actual proof responder resolves exact hostname from server DB, never incoming tenant/forwarded headers.
let proofDomain=domain(1),rows=[],proofVerified=true;
globalThis.proofRepo={
 async getCurrentOwnershipChallenge(){return {status:proofVerified?'verified':'active',generation:1};},
 async listTenantDomains(){return [{...domain(1),status:'active'}];},
};
globalThis.proofDb={from(){return {select(){return this;},eq(){return this;},in(){return {data:rows,error:null};}};}};
const proof=await moduleAt('src/lib/domains/domain-routing-proof.server.ts',{
 '@/integrations/supabase/client.server':'export const supabaseAdmin=globalThis.proofDb;',
 './domain-repository.server':'export const {getCurrentOwnershipChallenge,listTenantDomains}=globalThis.proofRepo;',
 './domain-repository-mappers.server':'export const mapDomain=x=>x;',
});
const nonce='a'.repeat(64);const proofReq=(host=proofDomain.normalizedHostname,extra={})=>new Request('https://'+host+DOMAIN_PROBE_PATH+'?nonce='+nonce,{headers:{host,...extra}});
rows=[proofDomain];let response=await proof.domainRoutingProofResponse(proofReq(undefined,{'x-tenant-id':'tenant-2','x-forwarded-host':'realone.com.br'}),env);
assert.equal(response.status,204);assert.equal(response.headers.get('cache-control'),'no-store');
assert.equal(response.headers.get('x-rm-prime-routing-proof'),await routingSignature(proofDomain,proofDomain.normalizedHostname,nonce,env.DOMAIN_ROUTING_PROOF_SECRET));
rows=[];assert.equal((await proof.domainRoutingProofResponse(proofReq(),env)).status,404);
rows=[proofDomain,proofDomain];assert.equal((await proof.domainRoutingProofResponse(proofReq(),env)).status,404);
rows=[proofDomain];proofVerified=false;assert.equal((await proof.domainRoutingProofResponse(proofReq(),env)).status,404);proofVerified=true;
assert.equal((await proof.domainRoutingProofResponse(proofReq(undefined,{host:'realone.com.br'}),env)).status,404);

// Real DNS adapter + plan verifier: separate delivery/customer zone, API failures and flattening.
let currentDnsDomain,apiMode='valid',cnameVisible=false;
globalThis.dnsProvider=async()=>({id:'provider',zoneId:'delivery-zone-123',accountIdentifier:'account-123',credentialReference:'env:CF_DELIVERY',customerDnsZoneId:'customer-zone-123',customerDnsCredentialReference:'env:CF_DNS'});
const dns=await moduleAt('src/lib/domains/domain-dns-plan.server.ts',{'./domain-repository.server':'export const getProviderAccountForDomain=globalThis.dnsProvider;'});
let apiCalls=[];
globalThis.fetch=async(input,options={})=>{
 const url=new URL(input);apiCalls.push(url.toString());
 if(url.hostname==='cloudflare-dns.com'){
  if(url.searchParams.get('type')==='CNAME')return Response.json({Status:0,Answer:cnameVisible?[{type:5,data:'sites.delivery.com.'}]:[]});
  return Response.json({Status:0,Answer:[{type:1,data:apiMode==='private'?'127.0.0.1':apiMode==='propagation'&&url.searchParams.get('name')===currentDnsDomain.normalizedHostname?'104.16.1.2':'104.16.1.1'}]});
 }
 assert.equal(url.hostname,'api.cloudflare.com');assert.match(url.pathname,/customer-zone-123/);assert.equal(options.headers.authorization,'Bearer '+env.CF_DNS);
 if(apiMode==='403'||apiMode==='429')return Response.json({success:false,errors:[{code:apiMode,message:'fixture error'}]},{status:Number(apiMode)});
 if(url.pathname.endsWith('/dns_records'))return Response.json({success:true,result:[{name:currentDnsDomain.normalizedHostname,type:'CNAME',content:apiMode==='wrong-target'?'other.delivery.com':'sites.delivery.com',proxied:apiMode==='proxied'}]});
 return Response.json({success:true,result:{id:'customer-zone-123',name:apiMode==='wrong-zone'?'another-tenant.com':currentDnsDomain.registrableDomain}});
};
for(let i=1;i<=3;i++){
 currentDnsDomain=domain(i);currentDnsDomain.metadata={required_dns_plan:{hostname:currentDnsDomain.normalizedHostname,generation:1,recordType:'CNAME',targetHostname:'sites.delivery.com'}};
 apiMode='valid';assert.equal((await dns.observeDomainDnsPlan(currentDnsDomain,env)).resolver,'cloudflare-api-and-public-dns');
 for(const mode of ['wrong-target','wrong-zone','private','propagation','403','429','proxied']){apiMode=mode;await assert.rejects(()=>dns.observeDomainDnsPlan(currentDnsDomain,env));}
 apiMode='valid';await assert.rejects(()=>dns.observeDomainDnsPlan({...currentDnsDomain,generation:2},env));
 cnameVisible=true;apiCalls=[];await dns.observeDomainDnsPlan(currentDnsDomain,env);assert.equal(apiCalls.length,1);cnameVisible=false;
}
// Execute the real reconciliation transition boundary for all three tenants.
let reconciled, bindingState, routingFailure=false, transitions=[];
globalThis.reconcileRepo={
 async getCurrentOwnershipChallenge(){return {status:'verified',generation:reconciled.generation};},
 async getDomainProviderIdentityBinding(){return bindingState;},
 async listTenantDomains(){return [reconciled];},
 async isDomainHostnameReservationValid(){return true;},
 async getProviderAccountForDomain(){return {id:'provider-a',zoneId:'delivery-zone',credentialReference:'env:CF_DELIVERY',accountIdentifier:'account-fixture'};},
 async updateDomainProviderObservation(){},
 async patchDomainMetadata({domain:d,patch}){assert.equal(d.tenantId,reconciled.tenantId);reconciled={...reconciled,lockVersion:reconciled.lockVersion+1,metadata:{...reconciled.metadata,...patch}};return reconciled;},
 async transitionTenantDomain({authority,domain:d,to,evidence}){assert.equal(authority.tenantId,reconciled.tenantId);assert.equal(d.tenantId,reconciled.tenantId);if(to==='active')assert.equal(Object.values(evidence).every(Boolean),true);transitions.push(to);reconciled={...reconciled,status:to};return reconciled;},
};
globalThis.reconcileAdapter=()=>({async observeCustomHostname(){return {id:bindingState.customHostnameId,hostname:reconciled.normalizedHostname,status:bindingState.providerStatus,sslStatus:bindingState.sslStatus,errors:[]};}});
globalThis.reconcileRouting=async()=>{if(routingFailure)throw Error('origin signature rejected');return {};};
const repoExports=['activateReplacement','getCurrentOwnershipChallenge','getDomainProviderIdentityBinding','getProviderAccountForDomain','getTenantDomain','isDomainHostnameReservationValid','listTenantDomains','patchDomainMetadata','transitionTenantDomain','updateDomainProviderObservation'];
const reconciler=await moduleAt('src/lib/domains/domain-reconciliation.server.ts',{
 './domain-repository.server':`export const {${repoExports.join(',')}}=globalThis.reconcileRepo;`,
 './cloudflare-adapter.server':'export const createCloudflareAdapter=globalThis.reconcileAdapter;',
 './domain-dns-plan.server':'export const observeDomainDnsPlan=async()=>({});',
 './domain-https-observation.server':'export const observeDomainRouting=globalThis.reconcileRouting;',
});
for(let i=1;i<=3;i++){
 const reset=()=>{reconciled={...domain(i),metadata:{required_dns_generation:1,required_dns_observed:true}};bindingState={generation:1,bindingState:'bound',customHostnameId:'object-'+i,providerAccountId:'provider-a',zoneId:'delivery-zone',providerStatus:'active',sslStatus:'active'};transitions=[];routingFailure=false;};
 const run=()=>reconciler.reconcileDomain({authority:{tenantId:reconciled.tenantId,userId:'admin-'+i},domain:reconciled,runtimeEnv:env});
 reset();await run();assert.deepEqual(transitions,['active']);assert.equal(reconciled.metadata.routing_verified_generation,1);
 reset();bindingState.sslStatus='pending';await run();assert.deepEqual(transitions,[]);assert.equal(reconciled.status,'pending_ssl');
 reset();routingFailure=true;await assert.rejects(run);assert.deepEqual(transitions,[]);assert.equal(reconciled.metadata.last_reconciliation_success,false);
 reset();reconciled.status='active';routingFailure=true;await assert.rejects(run);assert.deepEqual(transitions,['degraded']);
 reset();bindingState.providerAccountId='another-provider';await assert.rejects(run);assert.deepEqual(transitions,[]);
}
const outputs=await Promise.all([buildDomainEdge(),buildDomainEdge()]);
assert.equal(outputs[0].outputFiles[0].text,outputs[1].outputFiles[0].text);
assert.equal(await readFile('supabase/functions/domain-processor/processor.generated.mjs','utf8'),outputs[0].outputFiles[0].text,'Deployable artifact must match the canonical processor; run node scripts/domains/build-edge.mjs');
assert.match(outputs[0].outputFiles[0].text,/npm:@supabase\/supabase-js@2\.108\.2/);
assert.doesNotMatch(outputs[0].outputFiles[0].text,/tanstack|\.\/src\/lib/);
assert.doesNotMatch(await readFile('src/server.ts','utf8'),/processScheduledDomainJobs|async scheduled/);
assert.doesNotMatch(await readFile('src/lib/runtime/wri-01-cloudflare-nitro-plugin.server.ts','utf8'),/cloudflare:scheduled/);
globalThis.fetch=originalFetch;
console.log('PASS Supabase domain automation: authenticated sole entry, pre-I/O rejection, bounded lease, deterministic canonical bundle, three tenants, signed origin/alias proof, stale evidence, TLS/redirect failure, pinned public IP/SNI, distinct DNS zone, API 403/429 and flattening. No live writes.');
