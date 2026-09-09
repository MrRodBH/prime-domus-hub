// One controlled journey: real login/logout UI, real onboarding UI, real server
// validators/auth middleware and real PostgreSQL save RPCs. Supabase Auth and
// HTTP transport are simulated; this is NOT production/session homologation.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.ROUND52_ISOLATED_CI,'true');
const {Client}=await import(pathToFileURL(process.env.ROUND52_PG_MODULE));
const {JSDOM,VirtualConsole}=await import(pathToFileURL(process.env.ROUND52_JSDOM_MODULE));
const config={host:'127.0.0.1',port:55452,user:'postgres'};
const admin=new Client({...config,database:'postgres'});await admin.connect();await admin.query('CREATE DATABASE round65_journey');await admin.end();
let db=new Client({...config,database:'round65_journey'});await db.connect();
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
await db.query(`CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid primary key);
 CREATE TABLE user_roles(user_id uuid,role text);
 CREATE TABLE commercial_plans(id uuid primary key,code text unique,name text,description text,status text,metadata jsonb default '{}',updated_at timestamptz default clock_timestamp(),sort_order int default 0);
 CREATE TABLE tenants(id uuid primary key,nome text,dominio_principal text,plano_codigo text,metadata jsonb default '{}',updated_at timestamptz default clock_timestamp(),operational_kind text default 'customer');
 CREATE TABLE audit_log(tenant_id uuid NOT NULL,user_id uuid,action text,entity text,entity_id text,after jsonb);
 GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
await db.query(readFileSync('supabase/migrations/20260908003058_round52_persistent_onboarding.sql','utf8'));
await db.query("INSERT INTO auth.users VALUES($1);",[id(1)]);await db.query("INSERT INTO user_roles VALUES($1,'super_admin')",[id(1)]);
await db.query("INSERT INTO tenants(id,nome) VALUES($1,'Empresa isolada')",[id(2)]);
await db.query("INSERT INTO tenants(id,nome,operational_kind) VALUES($1,'Technical fixture','technical')",[id(3)]);
// SQL adapter is deliberately limited to the tables/projections used by these handlers.
const from=table=>{
 assert.ok(['user_roles','commercial_plans','tenants'].includes(table));
 let columns='*',filters=[],args=[],orders=[],single=false;
 const q={select(c){assert.match(c,/^[a-z_, ]+$/);columns=c;return q;},eq(k,v){assert.match(k,/^[a-z_]+$/);args.push(v);filters.push(`${k}=$${args.length}`);return q;},in(k,v){assert.equal(k,'id');args.push(v);filters.push(`id=ANY($${args.length}::uuid[])`);return q;},order(k){assert.match(k,/^[a-z_]+$/);orders.push(k);return q;},maybeSingle(){single=true;return q;},then(ok,bad){return db.query(`SELECT ${columns} FROM ${table}${filters.length?' WHERE '+filters.join(' AND '):''}${orders.length?' ORDER BY '+orders.join(','):''}`,args).then(r=>({data:single?r.rows[0]??null:JSON.parse(JSON.stringify(r.rows)),error:null})).then(ok,bad);}};return q;
};
let token=null,issued=0;const sessions=new Set();let writes=0;
globalThis.__p0={get token(){return token;},client:{from,auth:{getClaims:async t=>sessions.has(t)?{data:{claims:{sub:id(1)}}}:{data:null,error:{message:'invalid'}}}},admin:{from,rpc:async(name,args)=>{
 assert.ok(['save_super_onboarding_plan','save_super_onboarding_company'].includes(name));
 try{await db.query('SET ROLE service_role');const result=await db.query(`SELECT ${name}($1,$2)`,[args.p_actor,args.p_data]);writes++;return{data:result.rows[0],error:null};}catch(e){return{data:null,error:{message:e.message}};}finally{await db.query('RESET ROLE');}
}}};
process.env.SUPABASE_URL='https://auth.fixture.invalid';process.env.SUPABASE_PUBLISHABLE_KEY='controlled-not-a-real-key';
const server=await build({entryPoints:['src/lib/api/super-onboarding.functions.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'transport-only',setup(b){
 b.onResolve({filter:/^(@tanstack\/react-start(?:\/server)?|@supabase\/supabase-js|@\/integrations\/supabase\/client.server)$/},a=>({path:a.path,namespace:'controlled'}));
 b.onLoad({filter:/.*/,namespace:'controlled'},a=>({loader:'js',contents:a.path==='@tanstack/react-start'?`export const createMiddleware=()=>({server:f=>f});export const createServerFn=()=>({middleware(m){this.m=m;return this},inputValidator(v){this.v=v;return this},handler(h){const m=this.m,v=this.v;return async data=>{const parsed=v?v(data):data;return m[0]({next:({context})=>h({data:parsed,context})});}}});`:a.path.endsWith('/server')?`export const getRequest=()=>({headers:new Headers(globalThis.__p0.token?{authorization:'Bearer '+globalThis.__p0.token}:{})});`:a.path==='@supabase/supabase-js'?`export const createClient=()=>globalThis.__p0.client;`:`export const supabaseAdmin=globalThis.__p0.admin;`}));
}}]});
const dir=mkdtempSync(join(tmpdir(),'p0-journey-'));const file=join(dir,'server.mjs');writeFileSync(file,server.outputFiles[0].text);const api=await import(pathToFileURL(file));
const authBundle=await build({entryPoints:['tests/round51/entry.tsx'],bundle:true,write:false,jsx:'automatic',loader:{'.png':'dataurl'},plugins:[{name:'auth-transport',setup(b){
 b.onResolve({filter:/^@tanstack\/react-router$/},()=>({path:resolve('tests/round51/router.tsx')}));
 b.onResolve({filter:/^@\/(integrations\/supabase\/(client|impersonation-state|tenant-selection-state)|lib\/(api\/super.functions|tenant-cache))$/},()=>({path:resolve('tests/round51/backend.ts')}));
}}]});
const ui=await build({entryPoints:['tests/round52/fixture.tsx'],bundle:true,write:false,jsx:'automatic',plugins:[{name:'server-bridge',setup(b){b.onResolve({filter:/^@\/lib\/api\/super-onboarding.functions$/},()=>({path:resolve('tests/round52/backend.ts')}));}}]});
const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid/auth?super=1',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window,d=w.document;
w.fetch=()=>{throw Error('REMOTE_FORBIDDEN');};
const tick=()=>new Promise(r=>setTimeout(r,15));
const until=async fn=>{for(let n=0;n<180;n++){if(fn())return;await tick();}throw Error(d.body.textContent);};
const button=t=>[...d.querySelectorAll('button')].find(b=>b.textContent===t);
const fill=async(selector,value)=>{const input=d.querySelector(selector);assert.ok(input,selector);Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new w.Event('input',{bubbles:true}));await tick();};
const submit=async()=>{d.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();};
w.__fixture={load:()=>api.loadSuperOnboarding(),savePlan:data=>api.saveSuperPlan(data),saveCompany:data=>api.saveSuperCompany(data)};
w.__authFixture={mode:'login',getUser:async()=>({data:{user:token?{id:id(1)}:null}}),signIn:async credentials=>{assert.equal(credentials.email,'super@example.invalid');assert.equal(credentials.password,'controlled-password');token=`controlled-session-${++issued}`;sessions.add(token);return{data:{user:{id:id(1)},session:{access_token:token}},error:null};},access:async()=>{await api.loadSuperOnboarding();return true;},signOut:async()=>{sessions.delete(token);token=null;return{error:null};},navigation:[],cleared:[]};
async function login(){w.__authFixture.mode='login';w.__authFixture.navigation=[];w.eval(authBundle.outputFiles[0].text);await until(()=>d.getElementById('email'));await fill('#email','super@example.invalid');await fill('#password','controlled-password');await submit();await until(()=>w.__authFixture.navigation.length>0);w.__authFixture.unmount();}
try{
 await assert.rejects(api.loadSuperOnboarding(),/Unauthorized/);await login();
 w.eval(ui.outputFiles[0].text);await until(()=>button('Planos'));assert.ok(!d.body.textContent.includes('Technical fixture'));
 button('Planos').click();await until(()=>button('Criar plano'));button('Criar plano').click();await tick();
 await fill('[name="name"]','Plano controlado');await fill('[name="price"]','123,45');await fill('[name="limit"]','20');await submit();await until(()=>!d.querySelector('form'));
 button('Planos').click();await until(()=>button('Editar plano'));button('Editar plano').click();await tick();await fill('[name="name"]','Plano controlado editado');await submit();await until(()=>!d.querySelector('form'));
 button('Tenants').click();await until(()=>button('Editar tenant'));button('Editar tenant').click();await tick();
 for(const[k,v]of Object.entries({legalName:'Empresa controlada editada',cnpj:'00000000000000',responsible:'Fixture',cpf:'00000000000',whatsapp:'31999999999',email:'company@example.invalid','address.zip':'01001-000','address.street':'Rua manual','address.number':'42','address.complement':'Sala 1','address.district':'Bairro','address.city':'Cidade','address.region':'SP'}))await fill(`[name="${k}"]`,v);
 const snapshot=await api.loadSuperOnboarding();assert.equal(snapshot.tenants.length,1);d.querySelector('[name="planId"]').value=snapshot.plans[0].id;await submit();await until(()=>!d.querySelector('form'));
 const oldToken=token;w.unmount();w.__authFixture.mode='logout';w.eval(authBundle.outputFiles[0].text);await until(()=>button('Sair'));button('Sair').click();await until(()=>token===null);await tick();assert.equal(w.__authFixture.client.getQueryCache().getAll().length,0);w.__authFixture.unmount();
 token=oldToken;await assert.rejects(api.loadSuperOnboarding(),/Unauthorized/);token=null;
 await db.end();db=new Client({...config,database:'round65_journey'});await db.connect();await login();assert.notEqual(token,oldToken);
 w.eval(ui.outputFiles[0].text);await until(()=>button('Planos'));button('Planos').click();await until(()=>button('Editar plano'));button('Editar plano').click();await tick();assert.equal(d.querySelector('[name="name"]').value,'Plano controlado editado');assert.equal(d.querySelector('[name="price"]').value,'123,45');button('Cancelar').click();await tick();button('Tenants').click();await until(()=>button('Editar tenant'));button('Editar tenant').click();await tick();assert.equal(d.querySelector('[name="legalName"]').value,'Empresa controlada editada');assert.equal(d.querySelector('[name="address.street"]').value,'Rua manual');assert.equal(d.querySelector('[name="address.complement"]').value,'Sala 1');
 assert.equal(writes,3);assert.equal((await db.query('SELECT count(*)::int n FROM commercial_plans')).rows[0].n,1);assert.equal((await db.query('SELECT nome FROM tenants WHERE id=$1',[id(3)])).rows[0].nome,'Technical fixture');assert.deepEqual(errors,[]);
 console.log('PASS integrated controlled P0: real login UI -> SQL plan create/edit -> existing tenant edit -> real logout hook/cache clear -> revoked session denied -> new login/new DB connection -> persisted UI values. Auth transport simulated; no public homologation.');
}finally{w.unmount?.();dom.window.close();await db.end();}
