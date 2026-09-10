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

const menuBundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {WebsiteMenuField,WebsiteFooterField} from './src/components/content/editors/SettingsContentEditor';function App(){const [value,setValue]=React.useState(window.menuSeed);const [readonly,setReadonly]=React.useState(false);window.replaceMenu=setValue;window.lockMenu=setReadonly;const Field=window.testFooter?WebsiteFooterField:WebsiteMenuField;return <Field id="menu" value={value} readonly={readonly} onChange={next=>{window.menuChanges.push(next);setValue(next)}}/>}const root=createRoot(document.getElementById('root'));root.render(<App/>);window.unmount=()=>root.unmount();`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',plugins:[{name:'menu-fixture',setup(b){
 b.onResolve({filter:/tenant-configuration.functions$|media.functions$|^\.\.\/session$|^@tanstack\/react-start$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.endsWith('/session')?'export const useContentSession=()=>({});':a.path==='@tanstack/react-start'?'export const useServerFn=x=>x;':'export const getTenantConfigurationDiagnostics=()=>{};export const previewTenantConfiguration=()=>{};export const listarMidias=()=>{};',loader:'js'}));
}}]});
const menuDom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/admin/site',runScripts:'outside-only',pretendToBeVisual:true});
try{
 const w=menuDom.window,d=w.document;w.fetch=()=>{throw Error('REMOTE_FORBIDDEN')};w.menuChanges=[];w.menuSeed=[{id:'existing-a',label:'Imóveis',url:'/imoveis',location:'header',ordem:20,visivel:true,target:'_self',tipo:'internal',custom:{preserved:true}},{id:'existing-b',label:'Contato',url:'/contato',location:'footer',order:30,visible:false}];
 w.eval(menuBundle.outputFiles[0].text);const button=text=>[...d.querySelectorAll('button')].find(x=>x.textContent===text);
 async function until(predicate){for(let i=0;i<150&&!predicate();i++)await tick();assert.ok(predicate())}
 const setInput=(label,value)=>{const el=[...d.querySelectorAll('label')].find(x=>x.textContent.startsWith(label))?.querySelector('input');assert.ok(el,label);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 await until(()=>button('Editar link'));button('Editar link').click();await tick();setInput('Destino','javascript:alert(1)');await tick();button('Aplicar ao rascunho').click();await until(()=>d.querySelector('[role="alert"]'));assert.equal(w.menuChanges.length,0);
 setInput('Destino','/catalogo');await tick();setInput('Título do link','Catálogo');await tick();button('Aplicar ao rascunho').click();await until(()=>w.menuChanges.length===1);assert.equal(w.menuChanges[0][0].id,'existing-a');assert.equal(w.menuChanges[0][0].custom.preserved,true);assert.equal(w.menuChanges[0][0].ordem,20);assert.equal(w.menuChanges[0][1].visible,false);
 button('Editar link').click();await tick();setInput('Título do link','Não salvar');await tick();button('Cancelar edição do link').click();await tick();assert.equal(w.menuChanges.length,1);
 d.querySelector('[aria-label="Mover Catálogo para baixo"]').click();await until(()=>w.menuChanges.length===2);assert.equal(w.menuChanges[1][1].id,'existing-a');assert.equal(w.menuChanges[1][1].order,w.menuChanges[1][1].ordem);
 button('Adicionar link').click();await tick();setInput('Título do link','Sobre');await tick();setInput('Destino','/sobre');await tick();button('Aplicar ao rascunho').click();await until(()=>w.menuChanges.length===3);assert.equal(w.menuChanges[2].length,3);assert.ok(w.menuChanges[2][2].id);
 button('Editar link').click();await tick();w.replaceMenu([...w.menuChanges[2],{id:'external',label:'Novo de outra revisão',url:'/novo',location:'header'}]);await tick();button('Aplicar ao rascunho').click();await until(()=>d.body.textContent.includes('O menu mudou'));assert.equal(w.menuChanges.length,3);button('Cancelar edição do link').click();await tick();
 button('Remover link').click();await tick();button('Manter link').click();await tick();assert.equal(w.menuChanges.length,3);
 w.lockMenu(true);await tick();assert.ok(button('Adicionar link').disabled);assert.ok(button('Editar link').disabled);
 console.log('PASS website menu DOM: add/edit/reorder/cancel, safe destinations, legacy order/visibility and unknown fields preserved, stale edit rejected, read-only enforced, no publication or network.');
}finally{menuDom.window.unmount?.();menuDom.window.close()}

const workspaceBundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {EntityWorkspace} from './src/components/workspace/entities/EntityWorkspace';const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});window.refetch=()=>qc.refetchQueries();const root=createRoot(document.getElementById('root'));root.render(<QueryClientProvider client={qc}><EntityWorkspace descriptor={{kind:'pagina',plural:'Páginas',singular:'Página',supportedActions:['criar'],route:'/admin/paginas'}} search={{item:'existing'}}/></QueryClientProvider>);window.unmount=()=>{root.unmount();qc.clear()};`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',plugins:[{name:'workspace-fixture',setup(b){
 b.onResolve({filter:/^@tanstack\/react-router$|^@\/components\/content\/(session|ContentEditor|adapters|recents)$|^@\/components\/workspace\/(runtime|bootstrap)$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='@tanstack/react-router'?'export const useNavigate=()=>x=>window.navigation.push(x);':a.path.endsWith('/session')?'export const ContentSessionProvider=({children})=>children;':a.path.endsWith('/ContentEditor')?`import React from 'react';export const ContentEditor=()=>{const [value,setValue]=React.useState('rascunho preservado');return <input aria-label="Editor preservado" value={value} onChange={e=>setValue(e.target.value)}/>};export const ContentEditorEmpty=()=>null;`:a.path.endsWith('/adapters')?'const adapter={fetchList:async()=>{if(window.failList)throw Error("controlled error");return [{id:"existing",titulo:"Página existente"}]}};export const getRegistration=()=>({useAdapter:()=>adapter});':a.path.endsWith('/recents')?'export const pushRecent=()=>{};':a.path.endsWith('/bootstrap')?'export const bootstrapWorkspaceRegistries=()=>{};':`import React from 'react';export const EntityViewRenderer=({items})=><div data-testid="records">{items.map(i=>i.titulo).join(',')}</div>;`,loader:'tsx',resolveDir:process.cwd()}));
}}]});
const workspaceDom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/admin/paginas',runScripts:'outside-only',pretendToBeVisual:true});
try{const w=workspaceDom.window,d=w.document;w.fetch=()=>{throw Error('REMOTE_FORBIDDEN')};w.failList=true;w.navigation=[];w.eval(workspaceBundle.outputFiles[0].text);async function until(predicate){for(let i=0;i<150&&!predicate();i++)await tick();assert.ok(predicate())}
 await until(()=>d.querySelector('[role="alert"]'));const editor=d.querySelector('[aria-label="Editor preservado"]');assert.ok(editor);assert.ok(!d.querySelector('[data-testid="records"]'));assert.equal(w.navigation.length,0);
 w.failList=false;[...d.querySelectorAll('button')].find(x=>x.textContent==='Tentar carregar novamente').click();await until(()=>d.querySelector('[data-testid="records"]'));assert.equal(d.querySelector('[aria-label="Editor preservado"]'),editor);assert.equal(editor.value,'rascunho preservado');
 w.failList=true;await w.refetch();await until(()=>d.querySelector('[role="alert"]'));assert.equal(d.querySelector('[aria-label="Editor preservado"]'),editor);assert.equal(w.navigation.length,0);
 console.log('PASS CMS workspace DOM: load error never masquerades as empty records; retry restores list; initial/refetch failures preserve the editor and selection.');
}finally{workspaceDom.window.unmount?.();workspaceDom.window.close()}

const headerBundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {Header} from './src/components/site/Header';const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});const root=createRoot(document.getElementById('root'));root.render(<QueryClientProvider client={qc}><Header/></QueryClientProvider>);window.unmount=()=>{root.unmount();qc.clear()};`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',loader:{'.png':'dataurl'},plugins:[{name:'public-menu-fixture',setup(b){
 b.onResolve({filter:/^@tanstack\/react-router$|site.functions$|menu.functions$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='@tanstack/react-router'?`import React from 'react';export const Link=({to,activeProps,children,...props})=><a {...props} href={to} data-router-link="true">{children}</a>;`:a.path.endsWith('site.functions')?'export const obterSiteSettings=async()=>({});':'export const listarMenuPublico=async()=>window.publicMenu;',loader:'tsx',resolveDir:process.cwd()}));
}}]});
const headerDom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
try{const w=headerDom.window,d=w.document;w.fetch=()=>{throw Error('REMOTE_FORBIDDEN')};w.publicMenu=[['Contato por e-mail','mailto:owner@example.invalid','_self'],['Telefone','tel:+553133333333','_self'],['Catálogo em nova aba','/imoveis','_blank'],['Página interna','/sobre','_self']].map(([label,url,target],i)=>({id:String(i),location:'header',label,url,target,tipo:'internal',ordem:i,visivel:true}));w.eval(headerBundle.outputFiles[0].text);for(let i=0;i<150&&!d.querySelector('a[href^="mailto:"]');i++)await tick();assert.ok(d.querySelector('a[href^="mailto:"]'));for(const href of ['mailto:owner@example.invalid','tel:+553133333333'])assert.equal(d.querySelector(`a[href="${href}"]`).getAttribute('data-router-link'),null);const blank=d.querySelector('a[href="/imoveis"]');assert.equal(blank.target,'_blank');assert.ok(blank.rel.includes('noopener'));assert.equal(d.querySelector('a[href="/sobre"]').getAttribute('data-router-link'),'true');console.log('PASS public website menu DOM: email/phone use native anchors, internal new-tab target honored, normal internal links retain router navigation.');
}finally{headerDom.window.unmount?.();headerDom.window.close()}


const footerDom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/admin/site',runScripts:'outside-only',pretendToBeVisual:true});
try{
 const w=footerDom.window,d=w.document;w.testFooter=true;w.fetch=()=>{throw Error('REMOTE_FORBIDDEN')};w.menuChanges=[];w.menuSeed=[{title:'Institucional',custom:'keep-first',links:[{label:'Sobre',url:'/sobre',metadata:'keep-link'}]},{title:'Atendimento',custom:'keep-second',links:[{label:'Contato',url:'/contato',metadata:'keep-other'}]}];w.eval(menuBundle.outputFiles[0].text);
 async function until(predicate){for(let i=0;i<150&&!predicate();i++)await tick();assert.ok(predicate())}
 const button=(text,scope=d)=>[...scope.querySelectorAll('button')].find(x=>x.textContent===text);
 function input(label,value,scope=d){const el=[...scope.querySelectorAll('label')].find(x=>x.textContent.startsWith(label))?.querySelector('input');assert.ok(el,label);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new w.Event('input',{bubbles:true}));}
 await until(()=>button('Remover coluna 1'));input('Título da coluna 1','Nossa empresa');await until(()=>w.menuChanges.length===1);assert.equal(w.menuChanges[0][0].custom,'keep-first');assert.equal(w.menuChanges[0][0].links[0].metadata,'keep-link');assert.ok(button('Adicionar coluna').disabled);
 const second=d.querySelectorAll('section')[1];button('Editar link',second).click();await tick();assert.ok(![...second.querySelectorAll('label')].some(x=>x.textContent.startsWith('Exibir em')));input('Título do link','Fale conosco',second);await tick();
 button('Remover coluna 1').click();await tick();button('Manter coluna').click();await tick();assert.equal(w.menuChanges.length,1);button('Remover coluna 1').click();await tick();button('Confirmar remoção da coluna').click();await until(()=>w.menuChanges.length===2);assert.equal(d.querySelector('section'),second);assert.equal(w.menuChanges[1][0].custom,'keep-second');button('Aplicar ao rascunho',second).click();await until(()=>w.menuChanges.length===3);assert.equal(w.menuChanges[2][0].links[0].label,'Fale conosco');assert.equal(w.menuChanges[2][0].links[0].metadata,'keep-other');assert.ok(!Object.hasOwn(w.menuChanges[2][0].links[0],'location'));
 button('Adicionar coluna').click();await until(()=>w.menuChanges.length===4);assert.equal(w.menuChanges[3].length,2);w.lockMenu(true);await tick();assert.ok(button('Remover coluna 1').disabled);
 console.log('PASS footer DOM: title and plain link edits preserve extra properties; confirmed removal preserves the other column active draft; cancellation, two-column layout limit and read-only controls.');
}finally{footerDom.window.unmount?.();footerDom.window.close()}

const legalFooterBundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {Footer} from './src/components/site/Footer';const qc=new QueryClient();const root=createRoot(document.getElementById('root'));root.render(<QueryClientProvider client={qc}><Footer/></QueryClientProvider>);window.unmount=()=>{root.unmount();qc.clear()};`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',loader:{'.png':'dataurl'},plugins:[{name:'legal-footer',setup(b){
 b.onResolve({filter:/^@tanstack\/react-router$|site.functions$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='@tanstack/react-router'?`import React from 'react';export const Link=({to,children,...props})=><a {...props} href={to} data-router-link="true">{children}</a>;`:`export const obterSiteSettings=async()=>({footer:{legal_links:[{label:'Privacidade',url:'/privacidade'},{label:'Contato legal',url:'mailto:privacy@example.invalid'}]}});`,loader:'tsx',resolveDir:process.cwd()}));
}}]});
const legalFooterDom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
try{const w=legalFooterDom.window,d=w.document;w.fetch=()=>{throw Error('REMOTE_FORBIDDEN')};w.eval(legalFooterBundle.outputFiles[0].text);for(let i=0;i<150&&!d.querySelector('[aria-label="Informações legais"]');i++)await tick();const nav=d.querySelector('[aria-label="Informações legais"]');assert.ok(nav);assert.equal(nav.querySelectorAll('a').length,2);assert.equal(nav.querySelector('a[href="/privacidade"]').getAttribute('data-router-link'),'true');const contact=nav.querySelector('a[href^="mailto:"]');assert.equal(contact.target,'_self');assert.equal(contact.getAttribute('data-router-link'),null);console.log('PASS public legal footer DOM: published legal links visible; internal route and native email destination rendered correctly.');}finally{legalFooterDom.window.unmount?.();legalFooterDom.window.close()}

// Actual CMS session + page adapter: revision handshake and publication failure recovery.
const cmsSessionBundle=await build({stdin:{contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {ContentSessionProvider,useContentSession} from './src/components/content/session';
import {usePageAdapter} from './src/components/content/adapters/usePageAdapter';
import {ENTITIES} from './src/components/content/entity-registry';
const qc=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
function Probe(){window.session=useContentSession();return <div>{window.session.draft.titulo}</div>}
function App(){const adapter=usePageAdapter();return <ContentSessionProvider descriptor={ENTITIES.pagina} adapter={adapter} entityId="page"><Probe/></ContentSessionProvider>}
const root=createRoot(document.getElementById('root'));root.render(<QueryClientProvider client={qc}><App/></QueryClientProvider>);
window.refresh=()=>qc.refetchQueries({queryKey:['content-detail','pagina','page']});window.unmount=()=>{root.unmount();qc.clear()};
`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,jsx:'automatic',plugins:[{name:'cms-session',setup(b){
 b.onResolve({filter:/^@tanstack\/react-start$/},()=>({path:'start',namespace:'cms-fixture'}));
 b.onResolve({filter:/tenant-cms.functions$/},()=>({path:'api',namespace:'cms-fixture'}));
 b.onResolve({filter:/^sonner$/},()=>({path:'toast',namespace:'cms-fixture'}));
 b.onLoad({filter:/.*/,namespace:'cms-fixture'},a=>({contents:a.path==='start'?'export const useServerFn=fn=>fn':a.path==='toast'?`export const toast={success:m=>window.messages.push(['success',m]),error:m=>window.messages.push(['error',m])}`:`
export const getTenantPage=async()=>{if(window.failLoad)throw Error("load denied");return structuredClone(window.record)};
export const listTenantPages=async()=>[];export const listTenantPageVersions=async()=>{if(window.failVersions)throw Error("versions denied");return []};export const rollbackTenantPage=async()=>{};
export const saveTenantPageDraft=async({data})=>{
 window.saves.push(structuredClone(data));if(window.hold)await new Promise(r=>window.release=r);
 if(window.failSave)throw Error('save denied');
 if(data.expectedRevision!==window.record.revision)throw Error('revision conflict');
 window.record.revision++;window.record.title=data.snapshot.title;window.record.effectiveSnapshot=data.snapshot;window.record.draft={id:'draft-'+window.record.revision,schemaVersion:1};
 return {pageId:'page',versionId:window.record.draft.id,revision:window.record.revision};
};
export const publishTenantPage=async({data})=>{window.publishes.push(data);if(data.expectedRevision!==window.record.revision)throw Error('publish conflict');if(window.failPublish)throw Error('publish denied');window.record.status='published';window.record.published=window.record.draft;window.record.draft=null;};
export const unpublishTenantPage=async({data})=>{window.unpublishes.push(data);if(data.expectedRevision!==window.record.revision)throw Error('unpublish conflict');window.record.status='draft';window.record.published=null;};
`,loader:'tsx',resolveDir:process.cwd()}));
}}]});
const cmsDom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/admin/paginas',runScripts:'outside-only',pretendToBeVisual:true});
try{
 const w=cmsDom.window;w.structuredClone=x=>JSON.parse(JSON.stringify(x));w.fetch=()=>{throw Error('REMOTE_FORBIDDEN')};w.saves=[];w.publishes=[];w.unpublishes=[];w.messages=[];
 w.record={id:'page',title:'Original',slug:'pagina',description:'Descrição',status:'draft',revision:0,pageType:'standard',layoutType:'sidebar_right',schemaVersion:1,draft:{id:'draft-0',schemaVersion:1},published:null,effectiveSnapshot:{seo:{},navigation_references:[{location:'footer',label:'Página'}],campaign_references:['campaign-existing'],configuration_references:['primary_color'],layout:{sections:[{id:'block-existing',type:'richtext',region:'sidebar',data:{html:'<p>Preservar</p>'}}]}}};
 w.failLoad=true;w.eval(cmsSessionBundle.outputFiles[0].text);async function until(p){for(let i=0;i<150&&!p();i++)await tick();assert.ok(p())}
 await until(()=>w.session?.loadError);assert.equal(w.saves.length,0);w.failLoad=false;await w.session.retryLoad();
 await until(()=>w.session?.draft.titulo==='Original');await new Promise(r=>setTimeout(r,1000));assert.equal(w.saves.length,0,'opening an existing record must not create a version');
 w.session.patch({titulo:'Primeiro'});await w.session.flush();await tick();assert.equal(w.session.draft.data.revision,1);
 assert.equal(w.saves[0].snapshot.layout.sections[0].region,'sidebar');assert.deepEqual(w.saves[0].snapshot.campaign_references,['campaign-existing']);assert.deepEqual(w.saves[0].snapshot.configuration_references,['primary_color']);assert.equal(w.saves[0].snapshot.navigation_references.length,1);
 w.hold=true;w.session.patch({titulo:'Segundo'});const saving=w.session.flush();await until(()=>w.release);w.session.patch({titulo:'Terceiro durante gravação'});w.hold=false;w.release();await saving;await tick();assert.equal(w.session.draft.titulo,'Terceiro durante gravação');assert.equal(w.session.draft.data.revision,2);await w.session.flush();assert.equal(w.record.title,'Terceiro durante gravação');assert.equal(w.record.revision,3);
 w.session.patch({titulo:'Preservar em refetch'});await w.refresh();await tick();assert.equal(w.session.draft.titulo,'Preservar em refetch');
 w.failSave=true;await assert.rejects(w.session.flush(),/save denied/);await w.session.publish();assert.equal(w.publishes.length,0,'failed save prevents publication');assert.equal(w.messages.filter(x=>x[0]==='success').length,0);assert.equal(w.session.draft.titulo,'Preservar em refetch');
 w.failSave=false;w.failPublish=true;await w.session.publish();assert.equal(w.record.revision,4);await tick();assert.equal(w.session.draft.data.revision,4,'save acknowledgment survives a denied publish');assert.equal(w.messages.filter(x=>x[0]==='success').length,0);
 w.failPublish=false;await w.session.publish();await tick();assert.equal(w.record.status,'published');assert.equal(w.record.revision,4,'retry publishes acknowledged draft without another save');assert.equal(w.session.draft.status,'published');
 await w.session.unpublish();await tick();assert.equal(w.unpublishes.length,1);assert.equal(w.record.published,null);assert.equal(w.session.draft.status,'draft');
 w.failVersions=true;await w.session.refreshVersions();await tick();assert.equal(w.session.versions,null);assert.match(w.session.versionsError,/versions denied/);w.failVersions=false;await w.session.refreshVersions();await tick();assert.equal(w.session.versionsError,null);
 const prior=w.saves.length;await w.session.archive();assert.equal(w.saves.length,prior,'unsupported archive cannot masquerade as draft save');assert.ok(w.messages.at(-1)[0]==='error');
 console.log('PASS CMS session: no save on open; sequential acknowledged revisions; edits in flight and on refetch preserved; failed save blocks publication; denied publication retry uses saved revision; actual unpublish; unsupported archive cannot report success.');
}finally{cmsDom.window.unmount?.();cmsDom.window.close()}
