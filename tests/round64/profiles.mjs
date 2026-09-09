import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.ROUND52_ISOLATED_CI,'true');
const imp=await import(pathToFileURL(process.env.ROUND52_PG_MODULE).href);const {Client}=imp.default??imp;
const cfg={host:'127.0.0.1',port:55452,database:'round52',user:'postgres'};
const ctl=new Client(cfg);await ctl.connect();await ctl.query('CREATE DATABASE round64');await ctl.end();
const db=new Client({...cfg,database:'round64'});await db.connect();
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',s='00000000-0000-4000-8000-000000000003';
try {
await db.query(`CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.actor',true),'')::uuid $$;
CREATE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid()='${s}'::uuid $$;
CREATE TABLE members(actor uuid,tenant uuid,active boolean);
INSERT INTO members VALUES ('${a}','${a}',true),('${b}','${b}',true),('${s}','${a}',true);
CREATE FUNCTION public.get_current_tenant_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT tenant FROM members WHERE actor=auth.uid() AND active AND tenant::text=current_setting('request.tenant',true) LIMIT 1 $$;
CREATE TABLE rbac_profiles(id int,tenant_id uuid,sistema boolean,nome text);
ALTER TABLE rbac_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbac_profiles read auth" ON rbac_profiles FOR SELECT TO authenticated USING(true);
CREATE POLICY "rbac_profiles admin write" ON rbac_profiles FOR ALL TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY round57_no_super_operation ON rbac_profiles AS RESTRICTIVE FOR ALL TO authenticated USING(NOT is_super_admin()) WITH CHECK(NOT is_super_admin());
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
GRANT ALL ON rbac_profiles TO anon,authenticated,service_role;
INSERT INTO rbac_profiles VALUES (1,null,true,'system'),(2,'${a}',false,'own'),(3,'${b}',false,'foreign'),(4,null,false,'unclassified'),(5,'${b}',true,'foreign-marked-system');`);
const original=(await db.query("SELECT policyname,qual,with_check FROM pg_policies WHERE tablename='rbac_profiles' ORDER BY policyname")).rows;
const sql=readFileSync('database/round64-rbac-profile-read.sql','utf8');await db.query(sql);await db.query(sql);
assert.deepEqual((await db.query("SELECT policyname,qual,with_check FROM pg_policies WHERE tablename='rbac_profiles' AND policyname<>'round64_profile_read_scope' ORDER BY policyname")).rows,original);
async function as(actor,tenant=a,role='authenticated'){await db.query('RESET ROLE');await db.query("SELECT set_config('request.actor',$1,false),set_config('request.tenant',$2,false)",[actor??'',tenant]);await db.query(`SET ROLE ${role}`);}
const ids=async()=> (await db.query('SELECT id FROM rbac_profiles ORDER BY id')).rows.map(r=>r.id);
await as(a);assert.deepEqual(await ids(),[1,2]);await as(b,b);assert.deepEqual(await ids(),[1,3,5]);
await as(a,b);assert.deepEqual(await ids(),[]);await as(s);assert.deepEqual(await ids(),[]);await as(null);assert.deepEqual(await ids(),[]);await as(a,'bad');assert.deepEqual(await ids(),[]);
await db.query('RESET ROLE');await db.query('UPDATE members SET active=false WHERE actor=$1',[a]);await as(a);assert.deepEqual(await ids(),[]);
await as(null,'','anon');assert.deepEqual(await ids(),[]);await as(null,'','service_role');assert.deepEqual(await ids(),[1,2,3,4,5]);
console.log(JSON.stringify({round:64,result:'PASS',evidence:'controlled native PostgreSQL profile SELECT isolation',at:new Date().toISOString()}));
} finally {await db.end();}
