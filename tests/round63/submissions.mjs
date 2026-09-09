import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.ROUND52_ISOLATED_CI,'true');
const imported=await import(pathToFileURL(process.env.ROUND52_PG_MODULE).href);
const {Client}=imported.default??imported;
const cfg={host:'127.0.0.1',port:55452,database:'round52',user:'postgres'};
const control=new Client(cfg);await control.connect();await control.query('CREATE DATABASE round63');await control.end();
const db=new Client({...cfg,database:'round63'});await db.connect();
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',superId='00000000-0000-4000-8000-000000000003';
try {
 await db.query(`CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE TABLE members(actor uuid,tenant uuid,active boolean,allowed boolean,scope text);
 CREATE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid()='${superId}'::uuid $$;
 CREATE FUNCTION public.get_current_tenant_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT tenant FROM members WHERE actor=auth.uid() AND active AND tenant::text=current_setting('request.tenant',true) LIMIT 1 $$;
 CREATE FUNCTION public.user_belongs_to_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM members WHERE actor=auth.uid() AND tenant=t AND active) $$;
 CREATE TYPE rbac_action AS ENUM ('visualizar');
 CREATE FUNCTION public.resolve_tenant_permission(u uuid,t uuid,o text,m text,a rbac_action) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('allowed',allowed AND active AND m='cms.formularios' AND a='visualizar' AND o='selection','scope',scope) FROM members WHERE actor=u AND tenant=t $$;
 CREATE TABLE cms_forms(id uuid PRIMARY KEY,tenant_id uuid,status text);
 CREATE TABLE form_submissions(id int,tenant_id uuid,form_id uuid,dados jsonb);
 ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
 CREATE POLICY form_submissions_tenant_read ON form_submissions FOR SELECT TO authenticated USING(user_belongs_to_tenant(tenant_id) OR is_super_admin());
 CREATE POLICY form_submissions_tenant_isolation ON form_submissions AS RESTRICTIVE FOR SELECT TO anon,authenticated USING(tenant_id=get_current_tenant_id());
 CREATE POLICY round57_no_super_operation ON form_submissions AS RESTRICTIVE FOR ALL TO authenticated USING(NOT is_super_admin()) WITH CHECK(NOT is_super_admin());
 CREATE POLICY form_submissions_public_insert ON form_submissions FOR INSERT TO anon WITH CHECK(EXISTS(SELECT 1 FROM cms_forms f WHERE f.id=form_id AND f.tenant_id=form_submissions.tenant_id AND f.status='published'));
 CREATE POLICY form_submissions_tenant_isolation_ins ON form_submissions AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(tenant_id IS NOT NULL AND (tenant_id=get_current_tenant_id() OR EXISTS(SELECT 1 FROM cms_forms f WHERE f.id=form_id AND f.tenant_id=form_submissions.tenant_id AND f.status='published')));
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
 GRANT SELECT ON cms_forms TO anon;
 GRANT ALL ON form_submissions TO authenticated,anon,service_role;
 INSERT INTO members VALUES ('${a}','${a}',true,true,'global'),('${b}','${b}',true,true,'global'),('${superId}','${a}',true,true,'global');
 INSERT INTO cms_forms VALUES ('${a}','${a}','published'),('${b}','${b}','draft');
 INSERT INTO form_submissions VALUES (1,'${a}','${a}','{"pii":"fixture"}'),(2,'${b}','${b}','{}');`);
 const unchanged=()=>db.query("SELECT policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE tablename='form_submissions' AND policyname<>'form_submissions_tenant_read' ORDER BY policyname");
 const before=(await unchanged()).rows;
 const sql=readFileSync('database/round63-submission-read.sql','utf8');
 await db.query(sql);await db.query(sql);
 assert.deepEqual((await unchanged()).rows,before);
 assert.equal((await db.query("SELECT has_function_privilege('anon','rm_submission_auth.can_read()','EXECUTE') v")).rows[0].v,false);
 async function as(actor,tenant=a,role='authenticated') {await db.query('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.tenant',$2,false)",[actor??'',tenant]);await db.query(`SET ROLE ${role}`);}
 const ids=async()=> (await db.query('SELECT id FROM form_submissions ORDER BY id')).rows.map(r=>r.id);
 for(const scope of ['global','equipe','proprio']) {await db.query('RESET ROLE');await db.query('UPDATE members SET scope=$1 WHERE actor=$2',[scope,a]);await as(a);assert.deepEqual(await ids(),[1]);}
 await as(b,b);assert.deepEqual(await ids(),[2]);
 await as(a,b);assert.deepEqual(await ids(),[]);
 await as(superId);assert.deepEqual(await ids(),[]);
 await as(null);assert.deepEqual(await ids(),[]);
 await as(a,'malformed');assert.deepEqual(await ids(),[]);
 for(const change of ["allowed=false","allowed=true,scope=null","allowed=true,scope='invalid'","allowed=true,scope='global',active=false"]) {await db.query('RESET ROLE');await db.query(`UPDATE members SET ${change} WHERE actor='${a}'`);await as(a);assert.deepEqual(await ids(),[]);}
 await as(null,'','anon');assert.deepEqual(await ids(),[]);
 await db.query('INSERT INTO form_submissions VALUES (3,$1,$1,$2)',[a,'{}']);
 await assert.rejects(db.query('INSERT INTO form_submissions VALUES (4,$1,$1,$2)',[b,'{}']),e=>e.code==='42501');
 await assert.rejects(db.query('INSERT INTO form_submissions VALUES (5,$1,$2,$3)',[b,a,'{}']),e=>e.code==='42501');
 await as(null,'','service_role');assert.deepEqual(await ids(),[1,2,3]);
 await db.query('RESET ROLE');
 assert.equal((await db.query('SELECT count(*)::int n FROM form_submissions')).rows[0].n,3);
 console.log(JSON.stringify({round:63,result:'PASS',evidence:'controlled native PostgreSQL; public insert and tenant read allow/deny; not live homologation',at:new Date().toISOString()}));
} finally {await db.end();}
