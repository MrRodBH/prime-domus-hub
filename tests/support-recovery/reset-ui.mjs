import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.ROUND52_JSDOM_MODULE));
const b=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {Route} from './src/routes/reset-password';const root=createRoot(document.getElementById('root'));root.render(React.createElement(Route.component));window.unmount=()=>root.unmount();`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',loader:{'.png':'dataurl'},plugins:[{name:'reset-ui',setup(b){
 b.onResolve({filter:/^@tanstack\/react-router$|integrations\/supabase\/client$|initial-admin-setup.functions$|^sonner$/},a=>({path:a.path,namespace:'fake'}));
 b.onLoad({filter:/.*/,namespace:'fake'},a=>({contents:a.path==='@tanstack/react-router'?`export const createFileRoute=()=>x=>x;export const Link=({children})=>children;export const useNavigate=()=>async x=>window.navigation.push(x);`:a.path==='sonner'?`export const toast={error(){},success(){}};`:a.path.endsWith('initial-admin-setup.functions')?`export const listMyInitialAdminInvitations=async()=>window.pendingInvites;`:`export const supabase={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getUser:async()=>({data:{user:{id:'fixture'}}}),setSession:async()=>({error:window.invalidToken?{}:null}),updateUser:async input=>{window.passwordWrites++;return {error:null}},signOut:async input=>{window.signouts.push(input);return {error:null}}}};`,loader:'tsx',resolveDir:process.cwd()}));
}}]});
const tick=()=>new Promise(r=>setTimeout(r,15));
async function scenario(hash,invites,valid){
 const d=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/reset-password'+hash,runScripts:'outside-only',pretendToBeVisual:true});
 try {const w=d.window;w.pendingInvites=invites;w.passwordWrites=0;w.navigation=[];w.signouts=[];w.fetch=()=>{throw Error('NETWORK_FORBIDDEN')};w.eval(b.outputFiles[0].text);
 for(let i=0;i<100&&!w.document.body.textContent.match(/Link inválido|Defina sua senha/);i++)await tick();
 assert.equal(!!w.document.querySelector('form'),valid,hash||'plain session');
 assert.equal(w.passwordWrites,0);
 if(valid&&hash.includes('type=recovery')){
  for(const input of w.document.querySelectorAll('input')){Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(input,'SyntheticPass123!');input.dispatchEvent(new w.Event('input',{bubbles:true}));await tick();}
  w.document.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  for(let i=0;i<100&&!w.document.body.textContent.includes('Entrar com a nova senha');i++)await tick();
  assert.equal(w.passwordWrites,1);assert.equal(w.signouts.length,1);assert.equal(w.signouts[0].scope,'global');
  assert.equal(w.location.hash,'');assert.ok(w.document.body.textContent.includes('Entrar com a nova senha'));
 }
 }finally{d.window.unmount?.();d.window.close()}
}
await scenario('',[],false);
await scenario('#error_description=expired',[],false);
await scenario('#access_token=fixture&refresh_token=fixture',[],false);
await scenario('#access_token=fixture&refresh_token=fixture&type=recovery',[],true);
await scenario('',[{id:'pending-invite'}],true);
console.log('PASS real reset UI: unrelated login and expired/untyped links rejected; recovery clears URL, changes password only on submit and signs out globally; pending initial invitation preserved. Mock Auth only.');
