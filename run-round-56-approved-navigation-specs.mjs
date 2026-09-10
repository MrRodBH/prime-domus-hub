import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const output=await build({entryPoints:['src/components/workspace/contexts.ts'],bundle:true,write:false,format:'esm'});
const {SUPER_NAVIGATION,workspaceContexts,workspaceItemActive}=await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
assert.deepEqual(SUPER_NAVIGATION.map(c=>c.label),['Dashboard','Tenants','Planos','Financeiro','Consumo','Observabilidade','DLQ','Atendimento aos clientes']);
assert.ok(SUPER_NAVIGATION.every(c=>c.root.startsWith('/super')&&c.subs.length===0));
for(const item of SUPER_NAVIGATION){const active=SUPER_NAVIGATION.filter(c=>workspaceItemActive(c,item.root,item.search??{}));assert.deepEqual(active.map(c=>c.label),[item.label]);}
assert.deepEqual(SUPER_NAVIGATION.filter(c=>workspaceItemActive(c,'/super',{})).map(c=>c.label),['Dashboard']);
assert.ok(!workspaceContexts(false,null).some(c=>c.superOnly));
const read=p=>readFileSync(p,'utf8');
assert.ok(read('src/components/workspace/ContextTabs.tsx').includes('if (path === "/super" || path.startsWith("/super/")) return null;'));
assert.ok(read('src/components/onboarding/PersistentOnboarding.tsx').includes('{!onViewChange && <nav'));
assert.ok(read('src/routes/_authenticated.super.index.tsx').includes('currentView={view ?? "dashboard"}'));
assert.ok(read('src/components/workspace/NavigationRail.tsx').includes('railCollapsed && !globalNavigation'));
assert.ok(read('AGENTS.md').includes('OWNER_UI_APPROVALS.md'));
console.log('PASS Round56: eight approved direct lateral entries, unique active item, URL-backed forms, no horizontal global tabs, global expanded rail, owner approval instructions. Pixel acceptance remains separate.');

// Actual navigation components in controlled DOM; no live authentication or network.
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.ROUND52_JSDOM_MODULE).href);
const routerMock=`import React from 'react';
const listeners=new Set();let location={pathname:'/super',search:{}};
export function useRouterState({select}){return select({location:React.useSyncExternalStore(cb=>{listeners.add(cb);return ()=>listeners.delete(cb)},()=>location)})}
export function Link({to,search,children,...props}){return <a {...props} href={to} onClick={e=>{e.preventDefault();location={pathname:to,search:search??{}};window.__location=location;listeners.forEach(cb=>cb())}}>{children}</a>}`;
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {NavigationRail} from './src/components/workspace/NavigationRail';import {ContextTabs} from './src/components/workspace/ContextTabs';const root=createRoot(document.getElementById('root'));root.render(<><NavigationRail isSuper={true}/><ContextTabs/></>);window.unmount=()=>root.unmount();`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',loader:{'.png':'dataurl'},plugins:[{name:'controlled-navigation',setup(b){b.onResolve({filter:/^@tanstack\/react-router$/},()=>({path:'router',namespace:'fixture'}));b.onResolve({filter:/use-impersonation$/},()=>({path:'imp',namespace:'fixture'}));b.onResolve({filter:/^\.\/ui-store$/},()=>({path:'ui',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='router'?routerMock:a.path==='imp'?'export const useImpersonation=()=>null':'export const useUI=()=>({railCollapsed:true,toggleRail(){}})',loader:'tsx',resolveDir:process.cwd()}));}}]});
const dom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/super',runScripts:'outside-only',pretendToBeVisual:true});
const tick=()=>new Promise(r=>setTimeout(r,20));
try{dom.window.fetch=()=>{throw Error('REMOTE_FORBIDDEN')};dom.window.eval(bundle.outputFiles[0].text);for(let i=0;i<100&&!dom.window.document.querySelector('nav');i++)await tick();
 const d=dom.window.document;assert.equal(d.querySelectorAll('nav').length,1);assert.ok(d.querySelector('aside').className.includes('w-[272px]'));
 const links=[...d.querySelectorAll('nav a')];assert.deepEqual(links.map(a=>a.textContent),SUPER_NAVIGATION.map(x=>x.label));
 for(let i=0;i<links.length;i++){links[i].click();await tick();assert.deepEqual(JSON.parse(JSON.stringify(dom.window.__location)),{pathname:SUPER_NAVIGATION[i].root,search:SUPER_NAVIGATION[i].search??{}});assert.equal(d.querySelectorAll('[aria-current="page"]').length,1);}
 console.log('PASS Round56 DOM: eight visible sidebar links, real Link clicks and unique active state, forced-expanded global menu, horizontal tabs absent.');
}finally{dom.window.unmount?.();dom.window.close()}

// Customer service: actual component and mutation lifecycle, isolated from production.
const serviceBundle = await build({ stdin: { contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {CustomerService} from './src/routes/_authenticated.super.control-plane';
const qc=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
const root=createRoot(document.getElementById('root'));
root.render(<QueryClientProvider client={qc}><CustomerService data={window.fixture}/></QueryClientProvider>);
window.unmount=()=>{root.unmount();qc.clear()};
`, resolveDir: process.cwd(), loader:'tsx' }, bundle:true,write:false,jsx:'automatic', plugins:[{name:'support-fixture',setup(b){
 b.onResolve({filter:/^@tanstack\/react-router$/},()=>({path:'router',namespace:'fixture'}));
 b.onResolve({filter:/super-control-plane.functions$/},()=>({path:'api',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='router'?`export const createFileRoute=()=>x=>x;export const Link=()=>null;`:`export const getSuperControlPlaneSnapshot=async()=>window.fixture;export const mutatePlatformSupportCase=async({data})=>{window.calls.push(data);if(window.fail)throw Error('fixture failure');return {id:'saved'}};`,loader:'tsx',resolveDir:process.cwd()}));
}}]});
const serviceDom = new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/super/control-plane',runScripts:'outside-only',pretendToBeVisual:true});
try {
 const w=serviceDom.window;const d=w.document;w.fetch=()=>{throw Error('REMOTE_FORBIDDEN')};w.calls=[];w.fail=false;
 w.fixture={tenants:[{id:'tenant-fixture',nome:'Empresa isolada'}],support:[{id:'case-fixture',case_key:'SUP-2026-0001',tenant_id:'tenant-fixture',requester_reference:'preserve-requester',assigned_user_id:'preserve-assignee',subject:'Domínio do cliente',summary:'Aguardando verificação',category:'domain_visibility',priority:'normal',status:'open'}]};
 w.eval(serviceBundle.outputFiles[0].text);
 async function until(predicate){for(let i=0;i<150&&!predicate();i++)await tick();assert.ok(predicate())}
 const button=text=>[...d.querySelectorAll('button')].find(x=>x.textContent===text);
 const field=text=>[...d.querySelectorAll('label')].find(x=>x.childNodes[0]?.textContent===text)?.querySelector('input,textarea,select');
 function setField(text,value){const el=field(text);assert.ok(el,text);const prototype=el.tagName==='TEXTAREA'?w.HTMLTextAreaElement.prototype:el.tagName==='SELECT'?w.HTMLSelectElement.prototype:w.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));}
 await until(()=>button('Editar atendimento'));button('Editar atendimento').click();await until(()=>d.querySelector('form'));
 setField('Situação','in_progress');await tick();w.fail=true;d.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>w.calls.length===1&&d.body.textContent.includes('Os dados foram mantidos'));
 assert.equal(field('Situação').value,'in_progress');assert.equal(w.calls[0].requesterReference,'preserve-requester');assert.equal(w.calls[0].assignedUserId,'preserve-assignee');assert.equal(w.calls[0].tenantId,'tenant-fixture');
 w.fail=false;d.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>!d.querySelector('form'));assert.equal(w.calls.length,2);assert.ok(d.body.textContent.includes('Atendimento salvo.'));
 button('Registrar atendimento').click();await until(()=>d.querySelector('form'));setField('Protocolo','SUP-2026-0002');await tick();setField('Assunto','Solicitação recebida');await tick();setField('Solicitação e acompanhamento','Pedido de configuração');await tick();d.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>w.calls.length===3&&!d.querySelector('form'));assert.equal(w.calls[2].operation,'create');assert.equal(w.calls[2].subject,'Solicitação recebida');assert.equal(w.calls[2].assignedUserId,null);
 console.log('PASS customer service DOM: create and update use server API; existing requester, assignment and tenant preserved; failed save retains draft; retry succeeds; no network or real records.');
} finally {serviceDom.window.unmount?.();serviceDom.window.close()}

// Real domain workspace with controlled API: no provider requests or real mutations.
const domainBundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {TenantDomainWorkspace} from './src/components/domains/TenantDomainWorkspace';const qc=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});const root=createRoot(document.getElementById('root'));root.render(<QueryClientProvider client={qc}><TenantDomainWorkspace/></QueryClientProvider>);window.unmount=()=>{root.unmount();qc.clear()};`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',plugins:[{name:'domain-fixture',setup(b){
 b.onResolve({filter:/tenant-domain.functions$/},()=>({path:'api',namespace:'fixture'}));
 b.onResolve({filter:/^sonner$/},()=>({path:'toast',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='toast'?`export const toast={success:x=>window.notices.push(x),error:x=>window.notices.push(x),warning:x=>window.notices.push(x)};`:`export const getTenantDomainState=async()=>window.domainState;export const requestTenantDomain=async({data})=>{window.domainCalls.push({kind:'create',data});return {challenge:{recordName:'_proof.example.invalid',proofValue:'fixture-proof',expiresAt:'2026-12-01T00:00:00Z',challengeVersion:1}}};export const requestDomainRemoval=async({data})=>{window.domainCalls.push({kind:'remove',data});return {}};export const changeDomainExecutionMode=async()=>({});export const requestDomainOperationRetry=async()=>({});export const requestDomainReplacement=async()=>({});export const requestDomainVerificationCheck=async()=>({});export const rotateDomainOwnershipChallenge=async()=>({});`,loader:'tsx',resolveDir:process.cwd()}));
}}]});
const domainDom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/admin/domains',runScripts:'outside-only',pretendToBeVisual:true});
try{
 const w=domainDom.window,d=w.document;w.fetch=()=>{throw Error('REMOTE_FORBIDDEN')};w.domainCalls=[];w.notices=[];
 w.domainState={domains:[{id:'domain-fixture',normalizedHostname:'example.invalid',status:'active',enabled:true,hostnameKind:'canonical',generation:1,executionMode:'manual_assisted',lockVersion:1,registrableDomain:'example.invalid'}],challenges:{}};
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied')}}});
 w.eval(domainBundle.outputFiles[0].text);
 const button=text=>[...d.querySelectorAll('button')].find(x=>x.textContent===text);
 async function until(predicate){for(let i=0;i<150&&!predicate();i++)await tick();assert.ok(predicate())}
 await until(()=>button('Remover'));button('Remover').click();await until(()=>d.querySelector('[role="alertdialog"]'));assert.equal(w.domainCalls.length,0);button('Manter domínio').click();await until(()=>!d.querySelector('[role="alertdialog"]'));assert.equal(w.domainCalls.length,0);
 button('Remover').click();await until(()=>button('Confirmar remoção'));button('Confirmar remoção').click();await until(()=>w.domainCalls.length===1);assert.equal(w.domainCalls[0].data.domainId,'domain-fixture');
 const input=d.querySelector('#domain-hostname');Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(input,'new.example.invalid');input.dispatchEvent(new w.Event('input',{bubbles:true}));await tick();button('Criar solicitação').click();await until(()=>d.querySelector('[aria-label="Copiar Valor"]'));assert.equal(w.domainCalls[1].data.hostname,'new.example.invalid');assert.equal(w.domainCalls[1].data.executionMode,'manual_assisted');
 d.querySelector('[aria-label="Copiar Valor"]').click();await until(()=>w.notices.some(x=>x.includes('Não foi possível copiar')));assert.ok(!w.notices.some(x=>x==='Valor copiado.'));
 console.log('PASS domains DOM: request retains chosen mode, TXT displayed, removal requires explicit confirmation, cancel has no mutation, clipboard failure never reports success.');
}finally{domainDom.window.unmount?.();domainDom.window.close()}

const tenantNavigation=workspaceContexts(false,null);
for(const path of ['/admin/domains','/admin/memberships']) assert.equal(tenantNavigation.filter(c=>c.matches.includes(path)).length,1);
assert.ok(!workspaceContexts(true,null).some(c=>c.root.startsWith('/admin')));
assert.ok(read('src/routes/_authenticated.admin.site.tsx').includes('search={{ new: "1" }}'));
assert.ok(read('src/routes/_authenticated.super.index.tsx').includes('to="/super/domains"'));
