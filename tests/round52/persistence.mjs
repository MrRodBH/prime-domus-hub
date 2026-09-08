import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.ROUND52_ISOLATED_CI, 'true');
const imported = await import(pathToFileURL(process.env.ROUND52_PG_MODULE).href);
const { Client } = imported.default ?? imported;
const config = { host: '127.0.0.1', port: 55452, database: 'round52', user: 'postgres' };
async function connect() { const c = new Client(config); await c.connect(); return c; }
const db = await connect();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const migration = readFileSync('supabase/migrations/20260908003058_round52_persistent_onboarding.sql','utf8');
const cases = [];
try {
 assert.equal((await db.query('select current_database() db, to_regclass(\'public.tenants\') existing')).rows[0].existing,null);
 await db.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid primary key);
 CREATE TABLE user_roles(user_id uuid, role text);
 CREATE TABLE commercial_plans(id uuid primary key,code text unique,name text,description text,status text,metadata jsonb default '{}',updated_at timestamptz default clock_timestamp());
 CREATE TABLE tenants(id uuid primary key,nome text,plano_codigo text,metadata jsonb default '{}',updated_at timestamptz default clock_timestamp());
 CREATE TABLE audit_log(tenant_id uuid NOT NULL,user_id uuid,action text,entity text,entity_id text,after jsonb);
 GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
 await db.query(migration);
 await db.query('INSERT INTO auth.users VALUES ($1)',[id(1)]);
 await db.query('INSERT INTO user_roles VALUES ($1,\'super_admin\');',[id(1)]);
 await db.query('INSERT INTO tenants(id,nome,metadata) VALUES ($1,\'Empresa A\',\'{"preserved":true}\'),($2,\'Empresa B\',\'{}\')',[id(2),id(3)]);
 const plan = {id:id(4),expectedUpdatedAt:null,code:'basic',name:'Basic',description:'Isolated fixture',status:'active',monthlyPriceCents:10000,propertyLimit:20,features:['Website','CMS'],portal:'',productId:''};
 await db.query('SET ROLE service_role');
 await db.query('SELECT save_super_onboarding_plan($1,$2)',[id(1),plan]);
 const version = (await db.query('SELECT updated_at::text FROM tenants WHERE id=$1',[id(2)])).rows[0].updated_at;
 const profile = {tenantId:id(2),expectedUpdatedAt:version,planId:id(4),company:{legalName:'Empresa A Completa',cnpj:'00000000000000',cpf:'00000000000',responsible:'Fixture',email:'fixture@example.invalid',whatsapp:'31999999999',phone:'',address:{zip:'00000000',street:'Fixture',number:'1',complement:'',district:'Fixture',city:'Fixture',region:'MG'},billingSame:true,billingAddress:null}};
 await db.query('SELECT save_super_onboarding_company($1,$2)',[id(1),profile]);
 await db.end();
 // New PostgreSQL connection has no browser cache/session state.
 const fresh = await connect();
 try {
  const row=(await fresh.query('SELECT nome,metadata,plano_codigo FROM tenants WHERE id=$1',[id(2)])).rows[0];
  assert.equal(row.nome,'Empresa A Completa'); assert.equal(row.metadata.preserved,true); assert.equal(row.metadata.company_profile.email,'fixture@example.invalid'); assert.equal(row.plano_codigo,'basic');
  assert.equal((await fresh.query('SELECT name FROM commercial_plans WHERE id=$1',[id(4)])).rows[0].name,'Basic');
  assert.equal((await fresh.query('SELECT nome FROM tenants WHERE id=$1',[id(3)])).rows[0].nome,'Empresa B');
  cases.push('commit survives connection termination and independent reconnect; other tenant preserved');
  await assert.rejects(fresh.query('SELECT save_super_onboarding_company($1,$2)',[id(99),profile]),/onboarding_forbidden/);
  await assert.rejects(fresh.query('SELECT save_super_onboarding_company($1,$2)',[id(1),profile]),/onboarding_conflict/);
  await assert.rejects(fresh.query('SELECT save_super_onboarding_plan($1,$2)',[id(1),plan]),/onboarding_conflict/);
  await fresh.query('SET ROLE authenticated');
  await assert.rejects(fresh.query('SELECT save_super_onboarding_plan($1,$2)',[id(1),plan]),/permission denied/);
  await fresh.query('RESET ROLE');
  cases.push('unauthorized actor, direct client execution, stale version and duplicate rejected');
  const before=(await fresh.query('SELECT updated_at::text,metadata FROM tenants WHERE id=$1',[id(2)])).rows[0];
  profile.expectedUpdatedAt=before.updated_at; profile.company.legalName='Must roll back';
  await fresh.query(`CREATE FUNCTION reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_failed'; END $$; CREATE TRIGGER audit_failure BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION reject_audit();`);
  await assert.rejects(fresh.query('SELECT save_super_onboarding_company($1,$2)',[id(1),profile]),/audit_failed/);
  assert.equal((await fresh.query('SELECT nome FROM tenants WHERE id=$1',[id(2)])).rows[0].nome,'Empresa A Completa');
  assert.equal((await fresh.query('SELECT ((SELECT count(*) FROM audit_log)+(SELECT count(*) FROM commercial_plan_audit))::int n')).rows[0].n,2);
  cases.push('business record and audit are atomic');
  await fresh.query('CREATE TRIGGER plan_audit_failure BEFORE INSERT ON commercial_plan_audit FOR EACH ROW EXECUTE FUNCTION reject_audit()');
  const planVersion=(await fresh.query('SELECT updated_at::text FROM commercial_plans WHERE id=$1',[id(4)])).rows[0].updated_at;
  await assert.rejects(fresh.query('SELECT save_super_onboarding_plan($1,$2)',[id(1),{...plan,expectedUpdatedAt:planVersion,name:'Must roll back'}]),/audit_failed/);
  assert.equal((await fresh.query('SELECT name FROM commercial_plans WHERE id=$1',[id(4)])).rows[0].name,'Basic');
  await fresh.query('DROP TRIGGER plan_audit_failure ON commercial_plan_audit');
  cases.push('global plan audit is atomic without attributing it to a tenant');
  await fresh.query('DROP TRIGGER audit_failure ON audit_log');
  await fresh.query("UPDATE commercial_plans SET status='archived' WHERE id=$1",[id(4)]);
  await assert.rejects(fresh.query('SELECT save_super_onboarding_company($1,$2)',[id(1),profile]),/onboarding_plan_unavailable/);
  cases.push('inactive plan rejected');
 } finally {await fresh.end();}
 writeFileSync('round52-persistence-evidence.json',JSON.stringify({status:'PASS',cases,limits:['Isolated PostgreSQL fixture with effective migration; not complete production schema','Independent DB reconnect, not a real Supabase login/browser session','No remote backend or real tenant data used']},null,2));
 console.log(cases);
} finally { if (!db._ending) await db.end(); }
