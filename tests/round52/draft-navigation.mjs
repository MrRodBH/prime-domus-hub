import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { JSDOM } = await import(pathToFileURL(process.env.ROUND52_JSDOM_MODULE).href);
const bundle = await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {PersistentOnboarding} from './src/components/onboarding/PersistentOnboarding';
function App(){const [view,setView]=useState('tenants');return <><nav><button onClick={()=>setView('plans')}>Abrir planos</button><button onClick={()=>setView('tenants')}>Abrir empresas</button></nav><PersistentOnboarding currentView={view} onViewChange={setView}/></>}
const root=createRoot(document.getElementById('root'));root.render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><App/></QueryClientProvider>);window.cleanup=()=>root.unmount();
`},bundle:true,write:false,jsx:'automatic',plugins:[{name:'controlled-backend',setup(b){b.onResolve({filter:/^@\/lib\/api\/super-onboarding.functions$/},()=>({path:resolve('tests/round52/backend.ts')}));}}]});
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
