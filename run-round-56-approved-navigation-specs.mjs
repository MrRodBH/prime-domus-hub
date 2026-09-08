import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const output=await build({entryPoints:['src/components/workspace/contexts.ts'],bundle:true,write:false,format:'esm'});
const {SUPER_NAVIGATION,workspaceContexts,workspaceItemActive}=await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
assert.deepEqual(SUPER_NAVIGATION.map(c=>c.label),['Dashboard','Tenants','Planos','Financeiro','Consumo','Observabilidade','DLQ','Suporte']);
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
