import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {JSDOM,VirtualConsole}=await import(pathToFileURL(process.env.ROUND52_JSDOM_MODULE).href);
const bundle=await build({entryPoints:['tests/round52/fixture.tsx'],bundle:true,write:false,jsx:'automatic',plugins:[{name:'controlled',setup(b){b.onResolve({filter:/^@\/lib\/api\/(super-onboarding|initial-admin-setup).functions$/},()=>({path:resolve('tests/round52/backend.ts')}));}}]});
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/super',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document;
let store={plans:[],tenants:[{id:'00000000-0000-4000-8000-000000000002',nome:'Empresa isolada',dominio_principal:null,plano_codigo:null,metadata:{},updated_at:'2026-01-01T00:00:00Z'}]};
let fail=false,calls=0;
w.__fixture={load:async()=>{if(fail)throw Error('offline');return structuredClone(store);},savePlan:async data=>{calls++;if(fail)throw Error('Falha controlada');store.plans=[{...data,metadata:{onboarding:data},updated_at:'2026-01-02T00:00:00Z'}];},saveCompany:async data=>{store.tenants[0]={...store.tenants[0],nome:data.company.legalName,metadata:{company_profile:data.company},plano_codigo:store.plans[0].code};}};
w.fetch=()=>{throw Error('REMOTE_FORBIDDEN');};
const tick=()=>new Promise(r=>setTimeout(r,15));
const until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await tick();}throw Error(d.body.textContent);};
const button=t=>[...d.querySelectorAll('button')].find(b=>b.textContent===t&&!b.closest('[hidden]'));
async function fill(name,value){const field=d.querySelector(`[name="${name}"]`);assert.ok(field,name);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(field,value);field.dispatchEvent(new w.Event('input',{bubbles:true}));await tick();}
async function submit(){d.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();}
try {
 w.eval(bundle.outputFiles[0].text);
 await until(()=>button('Planos'));button('Planos').click();await tick();
 await until(()=>button('Criar plano'));button('Criar plano').click();await tick();
 assert.ok(!d.querySelector('[name="code"]'));assert.ok(!d.querySelector('[name="portal"]'));assert.ok(!d.querySelector('[name="productId"]')); await fill('name','Basic');await fill('price','1.234,56');assert.equal(d.querySelector('[name="price"]').value,'1.234,56');await fill('limit','20');
 fail=true;await submit();await until(()=>d.querySelector('[role="alert"]'));assert.equal(d.querySelector('[name="name"]').value,'Basic');assert.equal(store.plans.length,0);
 fail=false;await submit();await until(()=>!d.querySelector('form'));assert.equal(store.plans[0].monthlyPriceCents,123456);assert.match(store.plans[0].code,/^plan_[a-f0-9]{32}$/);store.plans[0].metadata.onboarding.portal='Assinaturas';store.plans[0].metadata.onboarding.productId='produto-preservado';assert.ok(button('Dashboard').getAttribute('aria-current'));assert.ok(!button('Criar plano'));
 w.unmount();w.mount();await until(()=>button('Planos'));button('Planos').click();await until(()=>button('Editar plano'));button('Editar plano').click();await tick();assert.equal(d.querySelector('[name="name"]').value,'Basic');assert.equal(d.querySelector('[name="price"]').value,'1.234,56');const savedCode=store.plans[0].code;await submit();await until(()=>!d.querySelector('form'));assert.equal(store.plans[0].code,savedCode);assert.equal(store.plans[0].portal,'Assinaturas');assert.equal(store.plans[0].productId,'produto-preservado');
 button('Tenants').click();await tick();
 const search=d.querySelector('input[placeholder="Digite o nome ou domínio"]');
 const searchFor=async value=>{Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(search,value);search.dispatchEvent(new w.Event('input',{bubbles:true}));await tick();};
 await searchFor('inexistente');assert.ok(d.body.textContent.includes('Nenhuma empresa encontrada'));assert.equal(store.tenants.length,1);
 await searchFor('Empresa isolada');assert.equal(button('Acessar empresa'),undefined);assert.ok(button('Editar tenant'));assert.ok(!d.querySelector('form'));button('Editar tenant').click();await tick();
 // Round58: the real masked input calls ViaCEP with digits only; editing another
 // field during the request neither cancels the lookup nor gets overwritten.
 let completePostal; const postalRequests=[];
 w.fetch=(url,options)=>{postalRequests.push({url,options});return new Promise(resolve=>{completePostal=resolve;});};
 await fill('address.zip','01001-000');button('Consultar CEP novamente').click();await tick();
 assert.equal(postalRequests[0].url,'https://viacep.com.br/ws/01001000/json/');
 assert.equal(postalRequests[0].options.credentials,'omit');
 await fill('address.number','42');await fill('address.street','Rua escolhida');
 completePostal({ok:true,json:async()=>({cep:'01001-000',logradouro:'Praça da Sé',bairro:'Sé',localidade:'São Paulo',uf:'SP'})});
 await until(()=>d.body.textContent.includes('Endereço consultado'));
 assert.equal(d.querySelector('[name="address.number"]').value,'42');
 assert.equal(d.querySelector('[name="address.street"]').value,'Rua escolhida');
 assert.equal(d.querySelector('[name="address.city"]').value,'São Paulo');
 // P0: edits BEFORE retry (including clearing a field) stay user-owned.
 await fill('address.district','Bairro manual'); await fill('address.region','');
 button('Consultar CEP novamente').click(); await tick();
 completePostal({ok:true,json:async()=>({cep:'01001-000',logradouro:'Não substituir',bairro:'Não substituir',localidade:'São Paulo',uf:'SP'})});
 await until(()=>d.body.textContent.includes('Endereço consultado'));
 assert.equal(d.querySelector('[name="address.street"]').value,'Rua escolhida');
 assert.equal(d.querySelector('[name="address.district"]').value,'Bairro manual');
 assert.equal(d.querySelector('[name="address.region"]').value,'');
 // An obsolete response cannot overwrite the newer request, even if fetch ignores abort.
 button('Consultar CEP novamente').click(); await tick(); const stale=completePostal;
 await fill('address.zip','30140-071'); button('Consultar CEP novamente').click(); await tick();
 assert.equal(postalRequests.at(-2).options.signal.aborted,true);
 completePostal({ok:true,json:async()=>({cep:'30140-071',logradouro:'Rua nova',bairro:'Novo',localidade:'Belo Horizonte',uf:'MG'})});
 await until(()=>d.querySelector('[name="address.city"]').value==='Belo Horizonte');
 stale({ok:true,json:async()=>({cep:'01001-000',logradouro:'Antiga',bairro:'Antigo',localidade:'São Paulo',uf:'SP'})}); await tick();
 assert.equal(d.querySelector('[name="address.city"]').value,'Belo Horizonte');
 assert.equal(d.querySelector('[name="address.street"]').value,'Rua escolhida');
 w.fetch=async()=>{throw Error('offline');};button('Consultar CEP novamente').click();
 await until(()=>d.body.textContent.includes('Consulta de CEP indisponível'));
 w.fetch=()=>{throw Error('REMOTE_FORBIDDEN');};
 for(const [k,v] of Object.entries({'address.zip':'12345678','address.street':'Rua Fixture','address.number':'1','address.district':'Bairro','address.city':'Cidade','address.region':'MG',legalName:'Empresa completa',cnpj:'00000000000000',responsible:'Fixture',cpf:'00000000000',whatsapp:'31999999999',email:'fixture@example.invalid'}))await fill(k,v);
 d.querySelector('[name="planId"]').value=store.plans[0].id;
 await submit();await until(()=>!d.querySelector('form'));
 w.unmount();w.mount();await until(()=>button('Tenants'));button('Tenants').click();await until(()=>button('Editar tenant'));button('Editar tenant').click();await tick();assert.equal(d.querySelector('[name="legalName"]').value,'Empresa completa');assert.equal(d.querySelector('[name="address.street"]').value,'Rua Fixture');
 await fill('legalName','Ainda editando');fail=true;button('Recarregar cadastros').click();await until(()=>d.querySelector('[role="alert"]'));assert.ok(!d.body.textContent.includes('Nenhum tenant cadastrado'));assert.equal(d.querySelector('[name="legalName"]').value,'Ainda editando');
 assert.deepEqual(errors,[]);assert.equal(calls,3);
 console.log('PASS controlled DOM: plan/company save, failed-save retention, remount with fresh query cache, read failure is not empty. No remote session proof.');
}finally{w.unmount?.();dom.window.close();}

// Regression: external sidebar navigation must preserve drafts without blocking plans.
{
const {default:assert}=await import('node:assert/strict');
const {build}=await import('esbuild');
const {resolve}=await import('node:path');
const {pathToFileURL}=await import('node:url');
const { JSDOM } = await import(pathToFileURL(process.env.ROUND52_JSDOM_MODULE).href);
const bundle = await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {PersistentOnboarding} from './src/components/onboarding/PersistentOnboarding';
function App(){const [view,setView]=useState('tenants');return <><nav><button onClick={()=>setView('plans')}>Abrir planos</button><button onClick={()=>setView('tenants')}>Abrir empresas</button></nav><PersistentOnboarding currentView={view} onViewChange={setView}/></>}
const root=createRoot(document.getElementById('root'));root.render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><App/></QueryClientProvider>);window.cleanup=()=>root.unmount();
`},bundle:true,write:false,jsx:'automatic',plugins:[{name:'controlled-backend',setup(b){b.onResolve({filter:/^@\/lib\/api\/(super-onboarding|initial-admin-setup).functions$/},()=>({path:resolve('tests/round52/backend.ts')}));}}]});
const dom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/super',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
let store={plans:[],tenants:[{id:'00000000-0000-4000-8000-000000000002',nome:'Empresa isolada',dominio_principal:null,plano_codigo:null,metadata:{},updated_at:'2026-01-01T00:00:00Z'}]};
let planSaves=0,companySaves=0;
w.__fixture={load:async()=>structuredClone(store),savePlan:async data=>{planSaves++;store.plans=[{...data,metadata:{onboarding:data},updated_at:'2026-01-02T00:00:00Z'}];},saveCompany:async()=>{companySaves++;}};
w.fetch=()=>{throw Error('REMOTE_FORBIDDEN');};
const tick=()=>new Promise(r=>setTimeout(r,15));
async function until(fn){for(let i=0;i<150;i++){if(fn())return;await tick();}throw Error('condition not reached');}
const button=text=>[...d.querySelectorAll('button')].find(b=>b.textContent===text&&!b.closest('[hidden]'));
async function fill(name,value){const input=d.querySelector(`[name="${name}"]`);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new w.Event('input',{bubbles:true}));await tick();}
try{
 w.eval(bundle.outputFiles[0].text);
 await until(()=>button('Editar tenant'));button('Editar tenant').click();await tick();
 await fill('legalName','Rascunho preservado');await fill('address.street','Rua manual');await fill('address.number','42');
 const companyForm=d.querySelector('form[aria-label="Cadastro empresarial"]');
 button('Abrir planos').click();await tick();
 assert.equal(button('Criar plano').disabled,false,'hidden company draft cannot disable plan creation');
 button('Criar plano').click();await tick();await fill('name','Plano isolado');await fill('price','99,90');await fill('limit','30');
 const planForm=d.querySelector('form[aria-label="Salvar plano"]');
 button('Abrir empresas').click();await tick();assert.equal(d.querySelector('[name="name"]').value,'Plano isolado');
 assert.equal(d.querySelector('form[aria-label="Cadastro empresarial"]'),companyForm,'uncontrolled fields must retain their DOM');
 assert.equal(d.querySelector('[name="legalName"]').value,'Rascunho preservado');
 button('Retomar edição do plano').click();await tick();assert.equal(d.querySelector('form[aria-label="Salvar plano"]'),planForm);
 planForm.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>planSaves===1&&!d.querySelector('form[aria-label="Salvar plano"]'));
 assert.equal(companySaves,0,'creating a plan must not save the company implicitly');
 button('Retomar edição da empresa').click();await tick();
 assert.equal(d.querySelector('[name="address.street"]').value,'Rua manual');assert.equal(d.querySelector('[name="address.number"]').value,'42');
 await until(()=>[...d.querySelector('[name="planId"]').options].some(o=>o.textContent==='Plano isolado'));
 assert.equal(companyForm.closest('[hidden]'),null);assert.equal(planSaves,1);
 button('Cancelar').click();await tick();assert.equal(d.querySelector('form[aria-label="Cadastro empresarial"]'),null);
 console.log('PASS controlled external navigation: company draft → first plan creation/save → resume unchanged company and select new plan; no implicit company save, no real data');
}finally{w.cleanup?.();dom.window.close();}

}
