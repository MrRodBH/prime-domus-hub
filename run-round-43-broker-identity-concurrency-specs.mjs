import assert from 'node:assert/strict';
import { readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadCadastralHandler,nativeCadastralTransport } from './tests/round43/cadastral-handler.mjs';

// No backend URL, passwords, remote hosts or production environment are consumed.
assert.equal(process.env.GITHUB_ACTIONS,'true','requires ephemeral CI runner');
assert.equal(process.env.ROUND43_ISOLATED_CI,'true','isolated test service required');
const imported=await import(pathToFileURL(process.env.ROUND43_PG_MODULE).href);
const {Client}=imported.default??imported;
const base='715f9f9ca071fa0e48a03792d7fc33517027f17b';
assert.equal(execFileSync('git',['diff','--name-only',base,'HEAD','--','src/lib/api/tenant-broker-directory.functions.ts','supabase/migrations/20260907183824_round42_broker_identity_link.sql','supabase/migrations/20260828160617_pca_07r2_w1_forensic_forward_only_ledger_reconciliation.sql','supabase/migrations/20260713221723_857275c9-958d-46fc-b826-e0c7ae030a3d.sql'],{encoding:'utf8'}).trim(),'','Round43 broker and membership contract sources must remain byte-identical');
const read=p=>readFileSync(p,'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
const sources={};
function actualFunction(name,expectedPath){
  const pattern=new RegExp(`CREATE(?: OR REPLACE)? FUNCTION public\\.${name}\\(`);
  const found=readdirSync('supabase/migrations').filter(p=>p.endsWith('.sql')).sort().filter(p=>pattern.test(read('supabase/migrations/'+p)));
  assert.equal('supabase/migrations/'+found.at(-1),expectedPath,'latest production definition must be explicit');
  const source=read(expectedPath),start=source.search(pattern),end=source.indexOf('$fn$;',start);
  assert.ok(start>=0&&end>start);const sql=source.slice(start,end+5);sources[name]={path:expectedPath,sha256:hash(sql)};return sql;
}
const clients=[];const evidence={status:'RUNNING',base,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sources,cases:[],blocks:[],cadastral:[],remoteBackendAccess:false};
const oldFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('REMOTE_FETCH_FORBIDDEN');};
let observer,a,b;
const id=n=>`43000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const qid=n=>`'${id(n)}'`;
async function connect(name){const c=new Client({host:'127.0.0.1',port:55443,database:'round43',user:'postgres',password:'',ssl:false,application_name:'round43-'+name,connectionTimeoutMillis:5000,statement_timeout:15000,query_timeout:18000});await c.connect();clients.push(c);c.pid=(await c.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;return c;}
const link=(c,{tenant=1,actor=10,broker=30,user=20}={})=>c.query('SELECT public.link_tenant_broker_identity($1,$2,$3,$4,$5) AS result',[id(actor),id(tenant),'single-membership',id(broker),id(user)]).then(r=>r.rows[0].result);
const membership=(c,operation)=>c.query('SELECT public.mutate_tenant_membership($1,$2,$3,$4,$5,NULL) AS result',[id(10),id(1),'single-membership',operation,id(20)]).then(r=>r.rows[0].result);
const begin=c=>c.query('BEGIN ISOLATION LEVEL READ COMMITTED');
const commit=c=>c.query('COMMIT');
const rollback=c=>c.query('ROLLBACK');
function pending(p){const state={settled:false};state.promise=p.then(value=>{state.settled=true;return {value};},error=>{state.settled=true;return {error};});return state;}
async function blocked(waiter,holder,p,label){
  const end=Date.now()+7000;
  while(Date.now()<end){
    const r=(await observer.query('SELECT pg_blocking_pids($1) AS blockers,wait_event_type,wait_event FROM pg_stat_activity WHERE pid=$1',[waiter.pid])).rows[0];
    // pg_blocking_pids and wait_event can change between observations; require both in the same sample.
    if(r?.blockers.includes(holder.pid) && r.wait_event_type==='Lock'){assert.equal(p.settled,false);assert.equal(r.wait_event_type,'Lock');evidence.blocks.push({label,waiter:waiter.pid,holder:holder.pid,event:r.wait_event});return;}
    assert.equal(p.settled,false,`${label}: expected actual overlapping lock wait`);
    await new Promise(r=>setTimeout(r,25));
  }
  throw Error(`${label}: blocking relation not observed`);
}
async function finish(c,p,expected){const r=await p.promise;if(expected){assert.ok(r.error,expected);assert.equal(r.error.message,expected);await rollback(c);return r.error;}assert.ifError(r.error);await commit(c);return r.value;}
async function rows(){return (await observer.query('SELECT id,user_id,nome FROM public.corretores ORDER BY id')).rows;}
async function audit(){return (await observer.query('SELECT tenant_id,user_id,entity_id,action,before,after FROM public.audit_log ORDER BY entity_id')).rows;}
async function absent(){assert.ok((await rows()).every(r=>r.user_id===null));assert.equal((await audit()).length,0);}
async function seed(){
  await observer.query(`TRUNCATE public.audit_log,public.corretores,public.tenant_members,public.user_roles,public.user_profiles,public.rbac_permissions,public.rbac_profiles,public.rbac_modules,public.tenants,auth.users CASCADE;
    INSERT INTO auth.users VALUES ${[10,11,20,21].map(n=>`(${qid(n)})`).join(',')};
    INSERT INTO public.tenants VALUES (${qid(1)}),(${qid(2)});
    INSERT INTO public.tenant_members(tenant_id,user_id,tenant_role,membership_status,is_owner) VALUES
      (${qid(1)},${qid(10)},'owner','active',true),(${qid(2)},${qid(11)},'owner','active',true),
      (${qid(1)},${qid(20)},'broker','active',false),(${qid(1)},${qid(21)},'broker','active',false),(${qid(2)},${qid(20)},'broker','active',false);
    INSERT INTO public.corretores(id,tenant_id,nome,user_id,slug) VALUES
      (${qid(30)},${qid(1)},'Fictício A',NULL,'a'),(${qid(31)},${qid(1)},'Fictício B',NULL,'b'),(${qid(32)},${qid(2)},'Fictício externo',NULL,'c');`);
}
async function scenario(name,fn){await seed();const before=evidence.blocks.length;await fn();assert.ok(evidence.blocks.length>before,'each scenario must observe an actual wait');evidence.cases.push({name,status:'PASS'});console.log('PASS '+name);}

try {
  observer=await connect('observer');
  const version=(await observer.query('SELECT version(),current_database() AS db,current_setting(\'server_version_num\') AS version_num,to_regclass(\'public.tenants\') AS existing')).rows[0];
  assert.equal(version.db,'round43');assert.equal(version.existing,null,'fixture requires fresh database');assert.equal(Math.floor(Number(version.version_num)/10000),17);evidence.postgres=version.version;
  await observer.query(read('tests/round43/substrate.sql'));
  const authority='supabase/migrations/20260828160617_pca_07r2_w1_forensic_forward_only_ledger_reconciliation.sql';
  await observer.query(actualFunction('resolve_tenant_permission',authority));
  await observer.query(actualFunction('assert_tenant_access_manager',authority));
  await observer.query(actualFunction('mutate_tenant_membership','supabase/migrations/20260713221723_857275c9-958d-46fc-b826-e0c7ae030a3d.sql'));
  // No fake commercial resolver: suspend/revoke do not traverse positive-seat paths.
  await observer.query(`REVOKE ALL ON FUNCTION public.resolve_tenant_permission(uuid,uuid,text,text,public.rbac_action) FROM PUBLIC,anon,authenticated;
    REVOKE ALL ON FUNCTION public.assert_tenant_access_manager(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
    REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) FROM PUBLIC,anon,authenticated;
    GRANT EXECUTE ON FUNCTION public.resolve_tenant_permission(uuid,uuid,text,text,public.rbac_action),public.assert_tenant_access_manager(uuid,uuid,text),public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) TO service_role;`);
  const migrationPath='supabase/migrations/20260907183824_round42_broker_identity_link.sql';
  actualFunction('link_tenant_broker_identity',migrationPath);
  sources.migration={path:migrationPath,sha256:hash(read(migrationPath))};
  await observer.query(read(migrationPath));
  a=await connect('A');b=await connect('B');assert.equal(new Set(clients.map(c=>c.pid)).size,3);evidence.sessionPids=clients.map(c=>c.pid);
  await a.query("SET ROLE service_role; SET lock_timeout='12s'");await b.query("SET ROLE service_role; SET lock_timeout='12s'");
  for(const rollbackFirst of [false,true]){
    await scenario(`same pair / first ${rollbackFirst?'rolls back':'commits'}`,async()=>{
      await begin(a);assert.equal((await link(a)).status,'linked');await begin(b);const p=pending(link(b));
      await blocked(b,a,p,'same pair');await absent();await (rollbackFirst?rollback(a):commit(a));
      assert.equal((await finish(b,p)).status,rollbackFirst?'linked':'already_linked');
      assert.equal((await rows())[0].user_id,id(20));assert.equal((await audit()).length,1);
    });
    await scenario(`different targets / first ${rollbackFirst?'rolls back':'commits'}`,async()=>{
      await begin(a);await link(a);await begin(b);const p=pending(link(b,{user:21}));await blocked(b,a,p,'different targets');await absent();
      await (rollbackFirst?rollback(a):commit(a));const r=await finish(b,p,rollbackFirst?null:'broker_identity_conflict');
      if(!rollbackFirst)assert.equal(r.code,'23505');assert.equal((await rows())[0].user_id,id(rollbackFirst?21:20));assert.equal((await audit()).length,1);
    });
    await scenario(`global unique across tenants / first ${rollbackFirst?'rolls back':'commits'}`,async()=>{
      await begin(a);await link(a);await begin(b);const p=pending(link(b,{tenant:2,actor:11,broker:32}));await blocked(b,a,p,'global index');await absent();
      await (rollbackFirst?rollback(a):commit(a));const r=await finish(b,p,rollbackFirst?null:'broker_identity_conflict');
      if(!rollbackFirst){assert.equal(r.code,'23505');assert.equal(r.detail,undefined);}
      const linked=(await rows()).filter(r=>r.user_id!==null);assert.deepEqual(linked.map(r=>r.id),[id(rollbackFirst?32:30)]);assert.equal((await audit()).length,1);
    });
  }
  for(const operation of ['suspend','revoke']){
    const status=operation==='suspend'?'suspended':'revoked';
    for(const rollbackFirst of [false,true])await scenario(`${operation} before link / first ${rollbackFirst?'rolls back':'commits'}`,async()=>{
      await begin(a);assert.equal((await membership(a,operation)).status,status);await begin(b);const p=pending(link(b));await blocked(b,a,p,operation+' first');await absent();
      await (rollbackFirst?rollback(a):commit(a));await finish(b,p,rollbackFirst?null:'broker_identity_unavailable');
      const member=(await observer.query('SELECT membership_status FROM public.tenant_members WHERE tenant_id=$1 AND user_id=$2',[id(1),id(20)])).rows[0];
      assert.equal(member.membership_status,rollbackFirst?'active':status);assert.equal((await audit()).length,rollbackFirst?1:0);
      assert.equal((await rows())[0].user_id,rollbackFirst?id(20):null);
    });
    await scenario(`link before ${operation}`,async()=>{
      await begin(a);await link(a);await begin(b);const p=pending(membership(b,operation));await blocked(b,a,p,'link before '+operation);await absent();
      await commit(a);assert.equal((await finish(b,p)).status,status);assert.equal((await rows())[0].user_id,id(20));assert.equal((await audit()).length,1);
      await assert.rejects(link(a),/broker_identity_unavailable/,'repetition must revalidate now-inactive membership');
    });
  }
  const save=await loadCadastralHandler();
  const saveWith=c=>{globalThis.__round43Transport=nativeCadastralTransport(c,evidence.cadastral);return save({context:{userId:id(10),tenant:{tenantId:id(1),isSuperAdmin:false,impersonation:false,origin:'single-membership'}},data:{id:id(30),nome:'Cadastro concorrente fictício'}});};
  await scenario('link before actual cadastral handler',async()=>{
    await begin(a);await link(a);await begin(b);const p=pending(saveWith(b));await blocked(b,a,p,'cadastral update waits for link');await absent();await commit(a);await finish(b,p);
    assert.equal((await rows())[0].user_id,id(20));assert.equal((await rows())[0].nome,'Cadastro concorrente fictício');assert.equal((await audit()).length,1);
  });
  await scenario('actual cadastral handler before link',async()=>{
    await begin(a);await saveWith(a);await begin(b);const p=pending(link(b));await blocked(b,a,p,'link waits for cadastral update');await absent();await commit(a);await finish(b,p);
    assert.equal((await rows())[0].user_id,id(20));assert.equal((await rows())[0].nome,'Cadastro concorrente fictício');assert.equal((await audit()).length,1);
  });
  assert.equal(evidence.cadastral.length,2);assert.ok(evidence.cadastral.every(t=>!t.updateKeys.includes('user_id')));
  await observer.query(`CREATE FUNCTION public.round43_audit_barrier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF current_setting('round43.fail_audit',true)='on' THEN PERFORM pg_advisory_xact_lock(43001);RAISE EXCEPTION 'round43_synthetic_audit_failure';END IF;
    RETURN NEW;END $$;
    CREATE TRIGGER round43_audit_barrier BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.round43_audit_barrier();`);
  await scenario('audit failure rolls back link before blocked contender succeeds',async()=>{
    await observer.query('SELECT pg_advisory_lock(43001)');await begin(a);await a.query("SET LOCAL round43.fail_audit='on'");
    const pa=pending(link(a));await blocked(a,observer,pa,'audit failure barrier');await begin(b);const pb=pending(link(b));await blocked(b,a,pb,'contender waits for failed audit');await absent();
    await observer.query('SELECT pg_advisory_unlock(43001)');await finish(a,pa,'round43_synthetic_audit_failure');assert.equal((await audit()).length,0);
    await finish(b,pb);assert.equal((await rows())[0].user_id,id(20));const logs=await audit();assert.equal(logs.length,1);
    assert.deepEqual(logs[0],{tenant_id:id(1),user_id:id(10),entity_id:id(30),action:'broker_identity_linked',before:{user_id:null},after:{user_id:id(20)}});
  });
  assert.equal(evidence.cases.length,15);assert.equal(evidence.blocks.length,16);
  evidence.status='PASS';evidence.multiSessionConcurrencyProven=true;evidence.productionContractChanged=false;
  console.log(JSON.stringify({status:evidence.status,cases:evidence.cases.length,observedBlocks:evidence.blocks.length,postgres:evidence.postgres,multiSessionConcurrencyProven:true,remoteBackendAccess:false}));
} catch(error){evidence.status='FAIL';evidence.failure={message:error.message,code:error.code};throw error;}
finally {
  await Promise.allSettled(clients.map(c=>c.end()));globalThis.fetch=oldFetch;delete globalThis.__round43Transport;
  writeFileSync('round43-evidence.json',JSON.stringify(evidence,null,2)+'\n');
}
