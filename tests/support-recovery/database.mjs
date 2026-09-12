import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.ROUND52_ISOLATED_CI,'true');
const pg=await import(pathToFileURL(process.env.ROUND52_PG_MODULE));const {Client}=pg.default??pg;
const config={host:'127.0.0.1',port:55452,user:'postgres'};
const root=new Client({...config,database:'postgres'});await root.connect();await root.query('CREATE DATABASE support_recovery_test');await root.end();
const db=new Client({...config,database:'support_recovery_test'});await db.connect();
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
 await db.query(`CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
 CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,not_after timestamptz);
 CREATE TABLE public.user_roles(user_id uuid,role text);
 CREATE TABLE public.tenants(id uuid PRIMARY KEY,status text,operational_kind text);
 CREATE TABLE public.tenant_members(tenant_id uuid,user_id uuid,tenant_role text,membership_status text,is_owner boolean);
 CREATE TABLE public.platform_support_cases(id uuid PRIMARY KEY,tenant_id uuid,category text,status text,requester_reference text);
 CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,tenant_id uuid NOT NULL,action text,entity text,entity_id text,after jsonb,created_at timestamptz DEFAULT now());
 CREATE FUNCTION public.assert_global_super_admin(a uuid) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=a AND role='super_admin') THEN RAISE EXCEPTION 'denied'; END IF; END;$$;`);
 await db.query(readFileSync('supabase/migrations/20260912172053_support_admin_recovery.sql','utf8'));
 for(let n=1;n<=15;n++)await db.query('INSERT INTO auth.users VALUES($1,$2,now(),null,null)',[id(n),`u${n}@fixture.invalid`]);
 await db.query("INSERT INTO user_roles VALUES($1,'super_admin');",[id(1)]);
 await db.query('INSERT INTO auth.sessions VALUES($1,$2,null)',[id(50),id(1)]);
 for(const n of [20,21])await db.query("INSERT INTO tenants VALUES($1,'ativo','customer')",[id(n)]);
 for(let n=2;n<=15;n++)await db.query("INSERT INTO tenant_members VALUES($1,$2,'admin','active',false)",[id(n===3?21:20),id(n)]);
 for(const n of [30,31])await db.query("INSERT INTO platform_support_cases VALUES($1,$2,'access','open','ticket requester')",[id(n),id(n===30?20:21)]);
 const reserve=(email='u2@fixture.invalid',request=60,actor=1,caseId=30,session=50)=>db.query('SELECT public.reserve_support_admin_recovery($1,$2,$3,$4,$5) r',[id(actor),id(session),id(caseId),email,id(request)]);
 const denied=async(fn,regex)=>assert.rejects(fn,regex);
 await denied(()=>reserve('u2@fixture.invalid',60,2),/denied/);
 await denied(()=>reserve('u2@fixture.invalid',60,1,30,51),/session_invalid/);
 await denied(()=>reserve('u3@fixture.invalid'),/target_ineligible/);
 await denied(()=>reserve('missing@fixture.invalid'),/target_ineligible/);
 await db.query("UPDATE platform_support_cases SET status='closed' WHERE id=$1",[id(30)]);await denied(()=>reserve(),/case_ineligible/);
 await db.query("UPDATE platform_support_cases SET status='open' WHERE id=$1",[id(30)]);
 for(const field of ["membership_status='suspended'","is_owner=true","tenant_role='viewer'"]){
  await db.query('UPDATE tenant_members SET '+field+' WHERE user_id=$1',[id(2)]);await denied(()=>reserve(),/target_ineligible/);
  await db.query("UPDATE tenant_members SET membership_status='active',is_owner=false,tenant_role='admin' WHERE user_id=$1",[id(2)]);
 }
 for(const field of ['email_confirmed_at=null','banned_until=now()+interval \'1 day\'','deleted_at=now()']){
  await db.query('UPDATE auth.users SET '+field+' WHERE id=$1',[id(2)]);await denied(()=>reserve(),/target_ineligible/);
  await db.query('UPDATE auth.users SET email_confirmed_at=now(),banned_until=null,deleted_at=null WHERE id=$1',[id(2)]);
 }
 for(const role of ['anon','authenticated','service_role']){
  await db.query('SET ROLE '+role);
  await denied(()=>db.query('SELECT * FROM support_recovery_private.requests'),/permission denied/);
  if(role!=='service_role')await denied(()=>reserve(),/permission denied/);
  await db.query('RESET ROLE');
 }
 await db.query('SET ROLE service_role');
 assert.equal((await reserve()).rows[0].r.send,true);assert.equal((await reserve()).rows[0].r.send,false);
 await denied(()=>reserve('u2@fixture.invalid',61),/rate_limited/);
 await denied(()=>reserve('u4@fixture.invalid',60),/request_conflict/);
 await db.query("SELECT finish_support_admin_recovery($1,$2,'accepted')",[id(1),id(60)]);
 await db.query("SELECT finish_support_admin_recovery($1,$2,'failed')",[id(1),id(60)]);
 await db.query('RESET ROLE');
 assert.equal((await db.query('SELECT outcome FROM support_recovery_private.requests WHERE id=$1',[id(60)])).rows[0].outcome,'accepted');
 // Two separate connections racing the same target: exactly one reservation.
 const other=new Client({...config,database:'support_recovery_test'});await other.connect();
 const concurrent=await Promise.allSettled([reserve('u4@fixture.invalid',62),other.query('SELECT reserve_support_admin_recovery($1,$2,$3,$4,$5)',[id(1),id(50),id(30),'u4@fixture.invalid',id(63)])]);await other.end();
 assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
 // Tenant-writable audit cannot defeat the private ledger cooldown.
 await db.query('DELETE FROM audit_log');await denied(()=>reserve('u4@fixture.invalid',64),/rate_limited/);
 for(let n=5;n<=12;n++)await reserve(`u${n}@fixture.invalid`,70+n);
 await denied(()=>reserve('u13@fixture.invalid',90),/rate_limited/);
 assert.equal((await db.query('SELECT count(*) n FROM support_recovery_private.requests')).rows[0].n,'10');
 console.log('PASS PostgreSQL: tenant/role/case/session validation, private ledger ACL, duplicate suppression, cooldown, actor limit, concurrent requests, audit tampering cannot bypass limits. Synthetic isolated database only.');
}finally{await db.end()}
