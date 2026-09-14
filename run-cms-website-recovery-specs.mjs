import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
const pure = await build({stdin:{contents:`export * from './src/lib/website-preview-policy';export * from './src/lib/website-builder-state';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {websitePreviewTarget,websiteFramePolicy,updateWebsiteStarterMenu,websiteHeroTitle}=await import(`data:text/javascript;base64,${Buffer.from(pure.outputFiles[0].text).toString('base64')}`);
for(const tenant of ['alpha','beta','gamma']){
 const row={tenantId:tenant,normalizedHostname:`${tenant}.example.com`,hostnameKind:'canonical',status:'active',enabled:true};
 assert.equal(websitePreviewTarget(tenant,[row]),`https://${tenant}.example.com/?__preview=1`);
 assert.throws(()=>websitePreviewTarget('other',[row]),/tenant_mismatch/);
 assert.equal(websitePreviewTarget(tenant,[{...row,status:'ownership_verified'}]),null);
 assert.equal(websitePreviewTarget(tenant,[{...row,enabled:false}]),null);
 assert.throws(()=>websitePreviewTarget(tenant,[row,{...row,normalizedHostname:'second.example.com'}]),/ambiguous/);
 for(const host of ['evil.example.com/path','user@evil.example.com','evil.example.com:443','evil.example.com?x=1']) assert.throws(()=>websitePreviewTarget(tenant,[{...row,normalizedHostname:host}]));
}
assert.equal(websiteFramePolicy('https://a.example.com/?__preview=1').ancestors,"frame-ancestors 'self'");
assert.equal(websiteFramePolicy('https://a.example.com/admin').ancestors,"frame-ancestors 'none'");
assert.equal(websiteFramePolicy('https://a.example.com/').source,"frame-src 'none'");
const seed=[{id:'custom',location:'header',url:'/blog',label:'Blog',custom:{keep:true}},{id:'footer',location:'footer',url:'/sobre',label:'Sobre',visible:false},{id:'website-inicio',location:'header',url:'/anuncie',label:'Anuncie'}];
const copy=JSON.stringify(seed),menu=updateWebsiteStarterMenu(seed,['inicio','imoveis']);
assert.equal(JSON.stringify(seed),copy);
assert.deepEqual(menu.slice(0,3),seed);
assert.equal(new Set(menu.map(x=>x.id)).size,menu.length);
assert.deepEqual(updateWebsiteStarterMenu(menu,['inicio','imoveis']),menu);
assert.equal(menu.find(x=>x.url==='/imoveis').location,'header');
assert.equal(websiteHeroTitle({title_lines:['Título','da empresa'],titulo:'legacy'}),'Título\nda empresa');

// Actual private preview handler, with controlled authority/host boundaries and no network.
const server=await build({stdin:{contents:`export {getSavedWebsitePreview} from './src/lib/api/site-versions.functions';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'preview-authority-fixture',setup(b){
 b.onResolve({filter:/@tanstack\/react-start$|tenant-middleware$|tenant-configuration-authority.server$|tenant.server$|\.\/site.functions$|\.\/menu.functions$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.includes('react-start')?`export const createServerFn=()=>({middleware(m){if(m.length!==1)throw Error('middleware missing');return this},inputValidator(){return this},handler(fn){return fn}})`:
 a.path.includes('tenant-middleware')?`export const requireTenant={name:'authenticated-tenant'}`:
 a.path.includes('tenant-configuration-authority')?`export async function loadTenantConfigurationState(){if(globalThis.denied)throw Error('denied');return {tenantId:globalThis.sessionTenant,effectiveSnapshot:{menu_items:[]},draft:globalThis.hasDraft}};export const authorizeTenantConfigurationOperation=()=>{}`:
 a.path.includes('tenant.server')?`export const requirePublicTenantFromRequest=async()=>({id:globalThis.hostTenant})`:
 a.path.includes('site.functions')?`export const projectConfigurationToSiteSettings=async(id)=>({tenant:id})`:
 `export const normalizeMenuItems=()=>[]`,loader:'js'}));
}}]});
const {getSavedWebsitePreview}=await import(`data:text/javascript;base64,${Buffer.from(server.outputFiles[0].text).toString('base64')}`);
for(const tenant of ['alpha','beta','gamma']){
 globalThis.sessionTenant=tenant;globalThis.hostTenant=tenant;globalThis.hasDraft=true;
 assert.equal((await getSavedWebsitePreview({context:{}})).settings.tenant,tenant);
 globalThis.hostTenant='other';await assert.rejects(()=>getSavedWebsitePreview({context:{}}),/tenant_mismatch/);
}
globalThis.denied=true;await assert.rejects(()=>getSavedWebsitePreview({context:{}}),/denied/);globalThis.denied=false;
globalThis.hostTenant=globalThis.sessionTenant;globalThis.hasDraft=false;assert.equal((await getSavedWebsitePreview({context:{}})).source,'published');

// Actual wizard in DOM: initial load failure, retry, safe failed save, canonical hero and explicit publication.
const {JSDOM}=await import(pathToFileURL(process.env.ROUND52_JSDOM_MODULE).href);
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {WebsiteSetupWizard} from './src/components/site-builder/WebsiteSetupWizard';const root=createRoot(document.getElementById('root'));root.render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><WebsiteSetupWizard/></QueryClientProvider>);window.unmount=()=>root.unmount();`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',plugins:[{name:'wizard-fixture',setup(b){
 b.onResolve({filter:/@tanstack\/react-start$|@tanstack\/react-router$|tenant-configuration.functions$|tenant-cms.functions$|\/MediaPicker$|\.\/WebsitePreview$|^sonner$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.includes('react-start')?`export const useServerFn=fn=>fn`:
 a.path.includes('react-router')?`import React from 'react';export const Link=({to,search,children,...props})=><a href={to+'?item='+search?.item} {...props}>{children}</a>`:
 a.path.includes('tenant-configuration.functions')?`export const getTenantConfigurationDraft=async()=>{window.loads++;if(window.failLoad)throw Error('LOAD_FAILED');return {snapshot:window.seed,expectedRevision:1}};export const saveTenantConfigurationDraft=async({data})=>{window.saves.push(data);if(window.failSave)throw Error('CMS-42883');window.seed=data.snapshot;return {revision:2}}`:
 a.path.includes('tenant-cms.functions')?`export const provisionTenantWebsiteDrafts=async()=>{window.provisions++;return {}}`:
 a.path.includes('WebsitePreview')?`import React from 'react';export const WebsitePreview=props=><div data-testid="actual-preview" data-version={props.savedVersion}>{props.unsaved?'UNSAVED':'SAVED'}</div>`:
 a.path.includes('MediaPicker')?`export const MediaPicker=()=>null`:`export const toast={success(){},error(){}}`,loader:'tsx',resolveDir:process.cwd()}));
}}]});
const dom=new JSDOM('<div id="root"></div>',{url:'https://alpha.example.com/alpha/admin/site',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,tick=()=>new Promise(r=>setTimeout(r,20));
async function until(test){for(let i=0;i<150;i++){if(test())return;await tick()}throw Error('DOM condition timed out: '+d.body.textContent)}
try{
 w.ResizeObserver=class{observe(){}disconnect(){}};w.fetch=()=>{throw Error('REMOTE_FORBIDDEN')};w.loads=0;w.saves=[];w.provisions=0;w.failLoad=true;w.failSave=true;
 w.seed={website_setup_step:4,website_selected_pages:['imoveis'],home_hero:{title_lines:['Título existente','preservado'],subtitle:'Apoio existente',image_path:'approved.png'},menu_items:seed};
 w.eval(bundle.outputFiles[0].text);
 await until(()=>d.querySelector('[role="alert"]'));
 assert.match(d.body.textContent,/LOAD_FAILED/);assert.doesNotMatch(d.body.textContent,/Carregando construtor/);
 w.failLoad=false;[...d.querySelectorAll('button')].find(b=>b.textContent==='Tentar novamente').click();
 await until(()=>d.querySelector('textarea'));
 const title=d.querySelector('textarea');assert.equal(title.value,'Título existente\npreservado');
 const set=Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype,'value').set;set.call(title,'Novo título\nsegunda linha');title.dispatchEvent(new w.Event('input',{bubbles:true}));await tick();
 [...d.querySelectorAll('button')].find(b=>b.textContent.includes('Salvar e continuar')).click();
 await until(()=>d.querySelector('[role="alert"]')?.textContent.includes('CMS-42883'));
 assert.equal(d.querySelector('textarea').value,'Novo título\nsegunda linha');
 assert.deepEqual(JSON.parse(JSON.stringify(w.saves[0].snapshot.home_hero)),{title_lines:['Novo título','segunda linha'],subtitle:'Apoio existente',image_path:'approved.png'});
 assert.deepEqual(JSON.parse(JSON.stringify(w.saves[0].snapshot.menu_items)),seed);
 assert.equal(w.provisions,0);
 w.failSave=false;[...d.querySelectorAll('button')].find(b=>b.textContent.includes('Salvar e continuar')).click();
 await until(()=>d.querySelector('[data-version="1"]'));
 assert.match(d.body.textContent,/Contato e SEO/);assert.equal(w.provisions,0);assert.equal(w.saves.length,2);
 assert.ok(d.querySelector('a[href="/admin/site?item=legacy_content"]'));
 console.log('PASS CMS recovery: three-tenant preview authority, CSP, menu preservation/idempotence, canonical hero, initial load retry, failed save preserves edits, saved preview refresh, no implicit publish.');
}finally{w.unmount?.();dom.window.close()}
