import "./tests/round64/contract.mjs";
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
// JSDOM is installed in a temporary test-only prefix; no product dependency change.
const {JSDOM,VirtualConsole}=await import(pathToFileURL(process.env.ROUND44_JSDOM_MODULE).href);
const repo=process.cwd(),temp=mkdtempSync(join(tmpdir(),'round44-'));
// Evolve FVS6 presentation regressions while its original exact-12-path delivery test remains historical.
const projection = await build({entryPoints:['src/components/directory/broker-team-directory-read-model.ts'],bundle:true,write:false,format:'esm'});
const modelApi = await import('data:text/javascript;base64,'+Buffer.from(projection.outputFiles[0].text).toString('base64'));
const model = modelApi.toBrokerTeamDirectoryReadModel({brokers:[{id:'synthetic',nome:'Ana',user_id:'PRIVATE_UUID',tenant_id:'PRIVATE_TENANT',cpf:'PRIVATE_CPF',team_id:'team',ativo:true}],teams:[{id:'team',nome:'Equipe',total_membros:2}]});
assert.equal(model.brokers[0].identityLinked,true);
assert.equal(model.brokers[0].teamName,'Equipe');
assert.equal(model.activeBrokerCount,1);assert.equal(model.totalTeamMembers,2);
assert.equal(modelApi.filterBrokerDirectory(model.brokers,'ana','team').length,1);
assert.equal(modelApi.filterBrokerDirectory(model.brokers,'ana','other').length,0);
assert.ok(!JSON.stringify(model).includes('PRIVATE_'),'private identity, tenant and CPF remain absent');
assert.equal(modelApi.toBrokerTeamDirectoryReadModel({brokers:[{id:'synthetic',user_id:null}],teams:[]}).brokers[0].identityLinked,false);
assert.equal(execFileSync('git',['diff','033a80eb47e3704183420de1453f309441dd62a6','--','src/lib/api','src/integrations','supabase','bun.lock','package.json','tests/round43',':(exclude)src/lib/api/super-onboarding.functions.ts', ':(exclude)src/integrations/supabase/__tests__/tenant-middleware.spec.ts', ':(exclude)src/integrations/supabase/tenant-middleware.ts', ':(exclude)src/lib/api/operational-tenants.server.ts', ':(exclude)src/lib/api/super-control-plane.functions.ts', ':(exclude)src/lib/api/super.functions.ts', ':(exclude)src/lib/api/tenant-scoped-authority.ts', ':(exclude)src/lib/api/tenant-crm.functions.ts',':(exclude)supabase/migrations/20260908003058_round52_persistent_onboarding.sql'],{encoding:'utf8'}),'','Round 42–43 production contracts and native evidence runners must be unchanged');
console.log('PASS evolved FVS6 projection/filter/privacy and frozen Round 42–43 contracts');
let dom;
try {
const result=await build({entryPoints:['tests/round44/entry.tsx'],bundle:true,write:false,metafile:true,jsx:'automatic',plugins:[{name:'controlled-only',setup(b){b.onResolve({filter:/^@tanstack\/react-router$/},()=>({path:resolve('tests/round44/router.tsx')}));b.onResolve({filter:/^@\//},a=>{if(a.path.startsWith('@/lib/api/')||a.path==='@/integrations/supabase/client')return {path:resolve('tests/round44/backend.ts')};let p=resolve('src',a.path.slice(2));if(a.path==='@/components/workspace')p=resolve('src/components/workspace/WorkspaceState');return {path:['.tsx','.ts','/index.ts'].map(s=>p+s).find(existsSync)};});}}]});
assert.ok(!Object.keys(result.metafile.inputs).some(p=>p.includes('supabase-js')||p.includes('client.server')||p.includes('src/lib/api/')),'production backend must be absent from bundle');
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',(...args)=>errors.push(args.map(String).join(' ')));
dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document;w.structuredClone=structuredClone;w.fetch=()=>{throw Error('NETWORK_FORBIDDEN');};w.ResizeObserver=class{observe(){} unobserve(){} disconnect(){}};w.HTMLElement.prototype.scrollIntoView=function(){};w.eval(result.outputFiles[0].text);
const tick=()=>new Promise(r=>setTimeout(r,10));
async function until(fn){for(let i=0;i<500;i++){if(fn())return;await tick();}throw Error('Timed out: '+d.body.textContent.slice(-2000)+'; errors='+errors.join('|'));}
const text=()=>d.body.textContent;
function button(name){const b=[...d.querySelectorAll('button')].find(b=>b.textContent.trim()===name);assert.ok(b,'button '+name);return b;}
async function click(name){button(name).click();await tick();}
function input(label,value){const e=d.querySelector(`[aria-label="${label}"]`);assert.ok(e,label);const proto=e.tagName==='SELECT'?w.HTMLSelectElement.prototype:w.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,value);e.dispatchEvent(new w.Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));}
async function trace(){await click('Evidência');return JSON.parse(d.querySelector('pre').textContent);}
const target='44000000-0000-4000-8000-000000000002';
const select=()=>d.querySelector('[aria-label="Identidade existente"]');
async function reset(mode){input('Cenário',mode);await click('Reiniciar teste');await until(()=>text().includes('Identidade de acesso')||text().includes('Diretório não autorizado'));}
async function open(){await click('Selecionar identidade');await until(()=>select()&&!select().disabled);}
async function review(){input('Identidade existente',target);await tick();await click('Revisar vínculo');assert.ok(d.querySelector('[aria-label="Confirmar vínculo"]'));assert.ok(text().includes('identidade@example.invalid'));}
async function send(){await review();await click('Confirmar vínculo');}
await until(()=>text().includes('Identidade de acesso'));
assert.equal((await trace()).lists,0,'membership lookup is explicit, never preloaded');
await open();assert.equal(select().options.length,2,'only active membership selectable');assert.ok(button('Revisar vínculo').disabled);
await review();assert.equal((await trace()).calls.length,0,'confirmation has not submitted');await click('Voltar à seleção');assert.equal(select().value,target);
await send();await until(()=>text().includes('Identidade vinculada com sucesso.'));let t=await trace();assert.deepEqual(t.calls,[{data:{corretorId:'44000000-0000-4000-8000-000000000001',userId:target}}]);assert.equal(t.reads,2,'successful link refreshes actual directory query');assert.ok(!select());console.log('PASS selection, active-only options, confirmation/cancel, exact two-field command, success and directory refresh');
await reset('loading');await click('Selecionar identidade');assert.ok(text().includes('Carregando identidades'));assert.ok(select().disabled);await until(()=>!select().disabled);console.log('PASS loading blocks selection');
for(const [mode,expected] of [['empty','Nenhuma identidade com participação ativa'],['denied','Consulta de identidades não autorizada'],['missing-manager','Consulta de identidades não autorizada'],['no-tenant','Seleção de identidades indisponível'],['query-error','Consulta de identidades indisponível']]){
  await reset(mode);await click('Selecionar identidade');await until(()=>text().includes(expected));assert.ok(select().disabled);assert.ok(button('Revisar vínculo').disabled);assert.equal((await trace()).calls.length,0);assert.ok(!text().includes('PRIVATE_PROVIDER_DETAILS'));
}
input('Cenário','success');await click('Consultar identidades novamente');await until(()=>!select().disabled);console.log('PASS empty, authorization denial, missing manager, absent tenant, safe query error, explicit retry');
for(const [mode,expected] of [['write-denied','Vínculo não autorizado'],['conflict','Conflito de vínculo'],['write-error','Não foi possível confirmar o vínculo']]){
  await reset(mode);await open();await send();await until(()=>text().includes(expected));assert.equal(select().value,target,'failed command preserves selection');assert.ok(!text().includes('PRIVATE_PROVIDER_DETAILS'));await new Promise(r=>setTimeout(r,220));assert.equal((await trace()).calls.length,1,'no automatic mutation retry');assert.equal((await trace()).reads,1,'failure must not claim refresh success');
}
input('Cenário','already');await send();await until(()=>text().includes('Esta identidade já estava vinculada'));assert.equal((await trace()).reads,2);assert.ok(!select());console.log('PASS safe command denial/error/conflict, preserved inputs, manual retry and already_linked');
await reset('slow');await open();await review();const confirm=button('Confirmar vínculo');confirm.click();confirm.click();await tick();assert.ok(button('Vinculando…').disabled);assert.ok(button('Voltar à seleção').disabled);assert.ok(select().disabled);assert.equal((await trace()).calls.length,1);await until(()=>text().includes('Identidade vinculada com sucesso.'));console.log('PASS same-tick duplicate prevention and pending controls');
await reset('linked');assert.ok(text().includes('Este corretor possui identidade vinculada'));assert.ok(![...d.querySelectorAll('button')].some(b=>b.textContent==='Selecionar identidade'));assert.equal((await trace()).lists,0);console.log('PASS existing link offers no replacement or unlink');
await reset('directory-denied');assert.ok(!d.querySelector('[aria-label="Vínculo de identidade"]'));assert.equal((await trace()).lists,0);console.log('PASS directory authorization denial exposes no command');
await reset('refresh-failed');await open();await send();await until(()=>text().includes('Não foi possível carregar o diretório'));assert.equal((await trace()).calls.length,1);assert.ok(!text().includes('PRIVATE_PROVIDER_DETAILS'));console.log('PASS refresh failure is visible and never repeats link');
assert.deepEqual(errors,[]);
console.log('Round 44 controlled DOM passed: actual page, hook and panel; mocked server responses, no remote or persistent-runtime claim.');
} finally {dom?.window.close();rmSync(temp,{recursive:true,force:true});}
