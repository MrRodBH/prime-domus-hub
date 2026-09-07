import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
// JSDOM is installed in a temporary test-only prefix; no product dependency change.
const {JSDOM,VirtualConsole}=await import(pathToFileURL(process.env.ROUND40_JSDOM_MODULE).href);
const repo=process.cwd(),temp=mkdtempSync(join(tmpdir(),'round40-'));
let dom;
try {
const result=await build({entryPoints:['tests/round40/entry.tsx'],bundle:true,write:false,metafile:true,jsx:'automatic',plugins:[{name:'controlled-only',setup(b){b.onResolve({filter:/^@tanstack\/react-router$/},()=>({path:resolve('tests/round40/router.tsx')}));b.onResolve({filter:/^@\//},a=>{if(a.path.startsWith('@/lib/api/')||a.path==='@/integrations/supabase/client')return {path:resolve('tests/round40/backend.ts')};let p=resolve('src',a.path.slice(2));if(a.path==='@/components/workspace')p=resolve('src/components/workspace/WorkspaceState');return {path:['.tsx','.ts','/index.ts'].map(s=>p+s).find(existsSync)};});}}]});
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
async function open(){await until(()=>text().includes('Inventário pronto'));const link=[...d.querySelectorAll('a')].find(a=>a.textContent==='Cadastrar imóvel');assert.ok(link);link.click();await tick();const ready=[...d.querySelectorAll('button')].find(b=>b.textContent.includes('Pronto para Morar'));assert.ok(ready);ready.click();await until(()=>d.querySelector('input[aria-label="Código"]'));}
function fill(){input('Código','SYN-40');input('Slug','rascunho-sintetico');input('Título','Imóvel sintético Round 40');}
async function reset(mode){input('Cenário',mode);await click('Reiniciar teste');await open();}
await until(()=>d.querySelector('select'));await open();await until(()=>text().includes('Corretores: nenhuma opção'));fill();await tick();await click('Salvar');await until(()=>d.querySelector('[data-property-route-mode="read-only"]')&&text().includes('Imóvel sintético Round 40'));let t=await trace();assert.equal(t.calls.length,1);assert.equal(t.calls[0].status,'rascunho');assert.equal(t.calls[0].corretor_id,null);assert.equal(t.calls[0].bairro_id,null);assert.equal(t.detailReads[0],t.rows[0].id);assert.equal(t.forbidden,0);
[...d.querySelectorAll('a')].find(a=>a.textContent.includes('Voltar ao inventário')).click();await until(()=>d.querySelector('[aria-label="Inventário de imóveis"]')&&text().includes('Imóvel sintético Round 40'));assert.equal((await trace()).reads,2,'previously loaded inventory must be invalidated');console.log('PASS draft creation, returned ID/detail, preloaded inventory refresh, optional null references');
await reset('loading');assert.ok(text().includes('carregando opções'));assert.ok(d.querySelector('[aria-label="Corretor"]').disabled);await until(()=>text().includes('Corretores: nenhuma opção'));console.log('PASS auxiliary loading and empty states');
for(const [mode,expected,label] of [['denied','Corretores: acesso negado','Corretor'],['unavailable','Bairros: consulta indisponível','Bairro'],['query-error','Cidades: falha ao consultar','Cidade de referência']]){await reset(mode);await until(()=>text().includes(expected));assert.ok(d.querySelector(`[aria-label="${label}"]`).disabled);assert.ok(!button('Salvar').disabled,'optional dependency must not block draft');assert.ok(!text().includes('PRIVATE_PROVIDER_DETAILS'));}console.log('PASS denied, unavailable and failed optional queries without permission expansion');
input('Cenário','success');await click('Consultar cidades novamente');await until(()=>text().includes('Cidades: nenhuma opção'));console.log('PASS explicit query retry');
await reset('write-denied');fill();await tick();await click('Salvar');await until(()=>text().includes('Acesso negado ao salvamento'));assert.equal(d.querySelector('[aria-label="Título"]').value,'Imóvel sintético Round 40');assert.equal((await trace()).rows.length,0);console.log('PASS write denial preserves fields');
await reset('ambiguous');fill();await tick();await click('Salvar');await until(()=>text().includes('Consulte o inventário antes de reenviar'));await new Promise(r=>setTimeout(r,250));t=await trace();assert.equal(t.calls.length,1);assert.equal(d.querySelector('[aria-label="Código"]').value,'SYN-40');assert.ok(!text().includes('PRIVATE_PROVIDER_DETAILS'));console.log('PASS ambiguous response: no automatic retry, preserved fields and explicit reconciliation message');
await reset('slow');fill();await tick();const form=d.querySelector('form');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.ok(button('Salvar').disabled);assert.equal((await trace()).calls.length,1);await until(()=>d.querySelector('[data-property-route-mode="read-only"]'));console.log('PASS same-tick duplicate submissions blocked');
await reset('detail-error');fill();await tick();await click('Salvar');await until(()=>text().includes('Não foi possível'));assert.equal((await trace()).calls.length,1);console.log('PASS detail read failure does not repeat creation');
assert.equal((await trace()).forbidden,0);assert.deepEqual(errors,[]);console.log('Round 40 controlled DOM interaction passed. No browser layout, persistent idempotency, tenant isolation or remote runtime claim.');
} finally {dom?.window.close();rmSync(temp,{recursive:true,force:true});}
