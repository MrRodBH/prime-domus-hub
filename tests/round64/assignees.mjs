import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const output=await build({entryPoints:['src/lib/api/tenant-crm.functions.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'controlled-boundaries',setup(b){
 b.onResolve({filter:/^(@tanstack\/react-start|@\/integrations\/supabase\/(tenant-middleware|client.server))$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',contents:a.path==='@tanstack/react-start'?`export const createServerFn=()=>({middleware(m){if(m.length!==1)throw Error('middleware');return this;},inputValidator(){return this;},handler(h){return ()=>h({context:globalThis.ctx});}});`:a.path.endsWith('tenant-middleware')?`export const requireTenant={};`:`export const supabaseAdmin={rpc:async(name,args)=>globalThis.rpc(name,args),from:table=>globalThis.from(table)};`}));
}}]});
const file=join(mkdtempSync(join(tmpdir(),'round64-')),'bundle.mjs');writeFileSync(file,output.outputFiles[0].text);const api=await import(pathToFileURL(file).href);
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
globalThis.ctx={userId:a,tenant:{tenantId:a,isSuperAdmin:false,impersonation:false,origin:'selection'}};
let scope='global',allowed=true,calls=[];
globalThis.rpc=(name,args)=>{calls.push({name,args});assert.equal(name,'resolve_tenant_permission');assert.equal(args._actor_user_id,a);assert.equal(args._tenant_id,a);assert.equal(args._module_code,'crm');assert.equal(args._action,'gerenciar');return {data:{allowed,scope,source:'assigned_profiles'},error:null};};
const rows=[{id:a,user_id:a,tenant_id:a,nome:null,sobrenome:null,email:'fallback@example.test',ativo:true,cpf:'SECRET',telefone:'SECRET'},{id:other,user_id:other,tenant_id:a,nome:'Other',sobrenome:'Member',ativo:true,email:null,cpf:'SECRET'},{id:b,user_id:b,tenant_id:b,nome:'Foreign',ativo:true,cpf:'SECRET'}];
globalThis.from=table=>{const q={table,filters:[],select(columns){this.columns=columns;return this;},eq(k,v){this.filters.push(r=>r[k]===v);return this;},in(k,v){this.filters.push(r=>v.includes(r[k]));return this;},order(){return this;},then(resolve){calls.push({table,columns:this.columns});let data=table==='corretores'?rows:table==='tenant_members'?rows.map(r=>({...r,membership_status:'active'})):[{tenant_id:a,team_id:a,user_id:a}];data=data.filter(r=>this.filters.every(f=>f(r)));return Promise.resolve({data,error:null}).then(resolve);}};return q;};
for(const [value,expected] of [['global',[a,other]],['equipe',[a]],['proprio',[a]]]){scope=value;calls=[];const result=await api.listTenantLeadAssignees();assert.deepEqual(result.map(r=>r.user_id),expected);for(const r of result)assert.deepEqual(Object.keys(r).sort(),['id','user_id','nome','sobrenome','email'].sort());assert.equal(result[0].email,'fallback@example.test');assert.ok(calls.some(c=>c.table==='corretores'&&c.columns==='id, user_id, nome, sobrenome, email'));}
allowed=false;calls=[];await assert.rejects(api.listTenantLeadAssignees(),/permission_denied/);assert.ok(!calls.some(c=>c.table));
allowed=true;ctx.tenant.isSuperAdmin=true;calls=[];await assert.rejects(api.listTenantLeadAssignees(),/Super Admin/);assert.equal(calls.length,0);
ctx.tenant.isSuperAdmin=false;ctx.tenant.impersonation=true;await assert.rejects(api.listTenantLeadAssignees(),/inconsistent/);assert.equal(calls.length,0);
console.log('PASS Round64: real handler and authority, controlled RPC/data; minimal DTO, email fallback, own/team/global, foreign exclusion, permission/Super/impersonation denial.');
