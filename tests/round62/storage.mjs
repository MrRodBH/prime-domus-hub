import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.ROUND52_ISOLATED_CI,'true');
const imported=await import(pathToFileURL(process.env.ROUND52_PG_MODULE).href);
const {Client}=imported.default??imported;
const config={host:'127.0.0.1',port:55452,database:'round52',user:'postgres'};
const control=new Client(config);await control.connect();await control.query('CREATE DATABASE round62');await control.end();
const db=new Client({...config,database:'round62'});await db.connect();
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const other='00000000-0000-4000-8000-000000000003',superId='00000000-0000-4000-8000-000000000004';
try {
 await db.query(`CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE TABLE members(actor uuid,tenant uuid,active boolean,can_access boolean,actions text[] DEFAULT ARRAY['criar','visualizar','editar','excluir','gerenciar'],access_scope text DEFAULT 'global');
 CREATE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid()='${superId}'::uuid $$;
 CREATE FUNCTION public.get_current_tenant_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT tenant FROM members WHERE actor=auth.uid() AND active AND tenant::text=current_setting('request.tenant',true) AND NOT is_super_admin() LIMIT 1 $$;
 CREATE TYPE rbac_action AS ENUM ('criar','visualizar','editar','excluir','gerenciar');
 CREATE FUNCTION public.resolve_tenant_permission(u uuid,t uuid,o text,m text,a rbac_action) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('allowed',EXISTS(SELECT 1 FROM members WHERE actor=u AND tenant=t AND active AND can_access AND a::text=ANY(actions)),'scope',(SELECT access_scope FROM members WHERE actor=u AND tenant=t LIMIT 1)) $$;
 CREATE FUNCTION public.crm_scope_allows_lead(t uuid,u uuid,s text,e uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT s='global' $$;
 CREATE TABLE public.imoveis(id uuid,tenant_id uuid,imagem_capa text);
 CREATE TABLE public.imovel_imagens(tenant_id uuid,imovel_id uuid,url text);
 CREATE TABLE public.launch_projects(id uuid,tenant_id uuid,slug text,imagem_capa text,og_image text);
 CREATE TABLE public.launch_project_imagens(tenant_id uuid,project_id uuid,storage_path text);
 CREATE TABLE public.launch_pdfs(tenant_id uuid,project_id uuid,storage_path text);
 CREATE TABLE public.corretores(id uuid,tenant_id uuid,foto_url text);
 CREATE TABLE public.leads(id uuid,tenant_id uuid);
 CREATE TABLE public.crm_attachments(tenant_id uuid,lead_id uuid,bucket text,path text);
 CREATE TABLE public.media_library(tenant_id uuid,arquivo text,arquivo_medium text,arquivo_thumbnail text);
 CREATE TABLE public.blog_posts(tenant_id uuid,imagem_capa text,conteudo text);
 CREATE TABLE public.cms_pages(tenant_id uuid,blocks jsonb);
 CREATE TABLE public.site_settings(tenant_id uuid,value jsonb);
 CREATE TABLE public.tenant_upload_targets(tenant_id uuid,actor_user_id uuid,domain text,entity_id uuid,bucket text,path text,status text,expires_at timestamptz,consumed_at timestamptz,tenant_origin text,UNIQUE(tenant_id,bucket,path));
 CREATE TABLE storage.objects(bucket_id text,name text,metadata text,PRIMARY KEY(bucket_id,name));
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 CREATE POLICY legacy_prefix ON storage.objects FOR ALL TO authenticated USING(true) WITH CHECK(true);
 CREATE POLICY round57_no_super_storage ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated USING(NOT is_super_admin()) WITH CHECK(NOT is_super_admin());
 GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon,service_role;
 GRANT ALL ON storage.objects TO authenticated,service_role;`);
 await db.query('INSERT INTO members(actor,tenant,active,can_access) VALUES ($1,$1,true,true),($2,$2,true,true),($3,$1,true,true),($4,$1,true,true)',[a,b,other,superId]);
 for(const table of ['imoveis','corretores','leads']) await db.query(`INSERT INTO ${table}(id,tenant_id) VALUES ($1,$1),($2,$2)`,[a,b]);
 await db.query("INSERT INTO launch_projects VALUES ($1,$1,'launch',null,null)",[a]);
 const before=(await db.query("SELECT policyname,qual,with_check FROM pg_policies WHERE schemaname='storage' ORDER BY policyname")).rows;
 await db.query(readFileSync('database/round62-storage-authority.sql','utf8'));
 await db.query(readFileSync('database/round62-storage-authority.sql','utf8'));
 assert.equal((await db.query("SELECT has_function_privilege('anon','rm_storage_auth.allowed(text,text,text)','EXECUTE') v")).rows[0].v,false);
 assert.deepEqual((await db.query("SELECT policyname,qual,with_check FROM pg_policies WHERE schemaname='storage' AND policyname IN ('legacy_prefix','round57_no_super_storage') ORDER BY policyname")).rows,before);
 async function as(actor,tenant=a) {await db.query('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.tenant',$2,false)",[actor??'',tenant]);await db.query('SET ROLE authenticated');}
 async function target(bucket,path,domain,entity=null,actor=a,expiry='1 hour') {
  await db.query('RESET ROLE');await db.query("INSERT INTO tenant_upload_targets VALUES ($1,$2,$3,$4,$5,$6,'pending',now()+$7::interval,null,'selection')",[a,actor,domain,entity,bucket,path,expiry]);
 }
 const cases=[
 ['imoveis',`${a}/${a}/image.jpg`,'imoveis',a],
 ['lancamentos',`${a}/launch/capa/file.jpg`,'lancamento-capa',a],
 ['lancamentos',`${a}/launch/galeria/file.jpg`,'lancamento-galeria',a],
 ['lancamentos',`${a}/launch/manual/file.pdf`,'lancamento-pdf',a],
 ['site',`${a}/media/image.jpg`,'media',null],
 ['site',`${a}/corretores/${a}/photo.jpg`,'corretor-foto',a],
 ['site',`${a}/crm/${a}/file.pdf`,'crm-attachment',a],
 ['site',`${a}/blog/cover.jpg`,'blog-cover',null],
 ['site',`${a}/blog/inline/image.jpg`,'blog-inline',null],
 ['site',`${a}/sobre/image.jpg`,'cms-page',null],
 ];
 for(const [bucket,path,domain,entity] of cases) {
  await target(bucket,path,domain,entity);await as(a);
  await db.query('INSERT INTO storage.objects VALUES ($1,$2,$3)',[bucket,path,'first']);
  assert.equal((await db.query('SELECT name FROM storage.objects WHERE bucket_id=$1 AND name=$2',[bucket,path])).rowCount,1);
  // Real Storage upsert semantics require INSERT, SELECT and UPDATE checks.
  await db.query("INSERT INTO storage.objects VALUES ($1,$2,'retry') ON CONFLICT(bucket_id,name) DO UPDATE SET metadata=EXCLUDED.metadata",[bucket,path]);
  assert.equal((await db.query('SELECT metadata FROM storage.objects WHERE bucket_id=$1 AND name=$2',[bucket,path])).rows[0].metadata,'retry');
 }
 await as(a);
 await assert.rejects(db.query('INSERT INTO storage.objects VALUES ($1,$2,null)',['site',`${a}/media/arbitrary.jpg`]),/row-level security/);
 await assert.rejects(db.query('INSERT INTO storage.objects VALUES ($1,$2,null)',['site',`${b}/media/foreign.jpg`]),/row-level security/);
 await as(other);assert.equal((await db.query('SELECT * FROM storage.objects')).rowCount,0,'another actor cannot read unconsumed targets');
 await target('site',`${a}/media/expired.jpg`,'media',null,a,'-1 hour');await as(a);
 await assert.rejects(db.query('INSERT INTO storage.objects VALUES ($1,$2,null)',['site',`${a}/media/expired.jpg`]),/row-level security/);
 await target('site',`${a}/media/mismatch.jpg`,'cms-page');await as(a);
 await assert.rejects(db.query('INSERT INTO storage.objects VALUES ($1,$2,null)',['site',`${a}/media/mismatch.jpg`]),/row-level security/);
 await db.query('RESET ROLE');
 await db.query("INSERT INTO imovel_imagens VALUES ($1,$1,$2)",[a,cases[0][1]]);
 await db.query("UPDATE launch_projects SET imagem_capa=$1 WHERE id=$2",[cases[1][1],a]);
 await db.query("INSERT INTO launch_project_imagens VALUES ($1,$1,$2)",[a,cases[2][1]]);
 await db.query("INSERT INTO launch_pdfs VALUES ($1,$1,$2)",[a,cases[3][1]]);
 await db.query("INSERT INTO media_library VALUES ($1,$2,null,null)",[a,cases[4][1]]);
 await db.query("UPDATE corretores SET foto_url=$1 WHERE id=$2",[cases[5][1],a]);
 await db.query("INSERT INTO crm_attachments VALUES ($1,$1,'site',$2)",[a,cases[6][1]]);
 await db.query("INSERT INTO blog_posts VALUES ($1,$2,$3)",[a,cases[7][1],cases[8][1]]);
 await db.query("INSERT INTO cms_pages VALUES ($1,jsonb_build_object('image',$2::text))",[a,cases[9][1]]);
 await db.query("UPDATE tenant_upload_targets SET status='consumed',consumed_at=now(),expires_at=now()-interval '1 hour' WHERE path=ANY($1)",[cases.map(x=>x[1])]);
 await as(other);assert.equal((await db.query('SELECT * FROM storage.objects')).rowCount,cases.length,'registered objects remain readable after target consumption and expiry');
 for(const [bucket,path] of cases) {
  await db.query("INSERT INTO storage.objects VALUES ($1,$2,'replacement') ON CONFLICT(bucket_id,name) DO UPDATE SET metadata=EXCLUDED.metadata",[bucket,path]);
 }
 await assert.rejects(db.query('UPDATE storage.objects SET name=$1 WHERE name=$2',[cases[9][1],cases[4][1]]),/storage_destination_immutable/);
 await db.query('RESET ROLE');await db.query("UPDATE members SET actions=ARRAY['visualizar'] WHERE actor=$1",[other]);
 await as(other);assert.equal((await db.query('SELECT * FROM storage.objects')).rowCount,cases.length);
 assert.equal((await db.query("UPDATE storage.objects SET metadata='forbidden' WHERE name=$1 RETURNING name",[cases[4][1]])).rowCount,0,'read permission does not authorize update');
 await assert.rejects(db.query("INSERT INTO storage.objects VALUES ($1,$2,'forbidden') ON CONFLICT(bucket_id,name) DO UPDATE SET metadata=EXCLUDED.metadata",['site',cases[4][1]]),/row-level security/);
 await db.query('RESET ROLE');await db.query("UPDATE members SET actions=ARRAY['criar'] WHERE actor=$1",[other]);
 const createOnly=`${a}/media/create-only.jpg`;await target('site',createOnly,'media',null,other);await as(other);
 await db.query("INSERT INTO storage.objects VALUES ('site',$1,'initial')",[createOnly]);
 await assert.rejects(db.query("INSERT INTO storage.objects VALUES ('site',$1,'replace') ON CONFLICT(bucket_id,name) DO UPDATE SET metadata=EXCLUDED.metadata",[createOnly]),/row-level security/);
 await db.query('RESET ROLE');await db.query("DELETE FROM storage.objects WHERE name=$1",[createOnly]);
 await db.query("UPDATE members SET actions=ARRAY['criar','visualizar','editar','excluir','gerenciar'],access_scope='proprio' WHERE actor=$1",[other]);
 await as(other);assert.equal((await db.query("SELECT * FROM storage.objects WHERE name=$1",[cases[4][1]])).rowCount,0,'CMS own scope cannot become global');
 await db.query('RESET ROLE');await db.query("UPDATE members SET access_scope='global' WHERE actor=$1",[other]);
 await as(b,b);assert.equal((await db.query('SELECT * FROM storage.objects')).rowCount,0);
 await as(superId);assert.equal((await db.query('SELECT * FROM storage.objects')).rowCount,0);
 await as(null);assert.equal((await db.query('SELECT * FROM storage.objects')).rowCount,0);
 await db.query('RESET ROLE');await db.query('UPDATE members SET can_access=false WHERE actor=$1',[other]);
 await as(other);assert.equal((await db.query('SELECT * FROM storage.objects')).rowCount,0);
 await db.query('RESET ROLE');await db.query('UPDATE members SET active=false WHERE actor=$1',[a]);
 await as(a);assert.equal((await db.query('SELECT * FROM storage.objects')).rowCount,0);
 await db.query('RESET ROLE');await db.query('UPDATE members SET active=true WHERE actor=$1',[a]);
 await db.query('DELETE FROM imoveis WHERE id=$1',[a]);await as(a);
 assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='imoveis'")).rowCount,0,'deleted resource loses access');
 assert.equal((await db.query("DELETE FROM storage.objects WHERE name=$1 RETURNING name",[cases[4][1]])).rowCount,1);
 await db.query('RESET ROLE');await db.query('SET ROLE service_role');
 assert.equal((await db.query('SELECT * FROM storage.objects')).rowCount,cases.length-1,'service storage path preserved');
 console.log('PASS Round62 native Storage RLS: all upload domains, pending retries/upserts, consumed/expired reads and replacements, resource binding, cross-tenant/actor/permission/revoked/Super denial, immutable destination, delete and service preserved.');
} finally {await db.end();}
