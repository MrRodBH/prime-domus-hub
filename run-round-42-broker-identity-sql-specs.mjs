import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
// Temporary test dependency only; no URL/database configuration accepted.
const { PGlite } = await import(pathToFileURL(process.env.ROUND42_PGLITE_MODULE).href);
const db = new PGlite();
const read = p => readFileSync(p,'utf8');
const id = n => `20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const sqlId = n => `'${id(n)}'`;
const tenant=1, other=2, owner=10, delegated=11, viewer=12, superAdmin=13, target=20, second=21, foreign=22, missing=99, broker=30, broker2=31, externalBroker=32;
const migration=read('supabase/migrations/20260907183824_round42_broker_identity_link.sql');
const canonical=read('supabase/migrations/20260828160617_pca_07r2_w1_forensic_forward_only_ledger_reconciliation.sql');
const extract = name => {
  const start=canonical.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  assert.ok(start>=0); const end=canonical.indexOf('$fn$;',start); assert.ok(end>start);
  return canonical.slice(start,end+5);
};
let cases=0;
try {
  // Minimal synthetic substrate, not a replay or homologation of the remote schema.
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TYPE public.tenant_role AS ENUM ('owner','admin','manager','broker','captador','secretaria','viewer');
    CREATE TYPE public.membership_status AS ENUM ('active','invited','suspended','revoked');
    CREATE TYPE public.rbac_action AS ENUM ('visualizar','criar','editar','excluir','exportar','importar','aprovar','gerenciar','publicar');
    CREATE TABLE public.tenants(id uuid PRIMARY KEY);
    CREATE TABLE public.user_roles(user_id uuid REFERENCES auth.users(id),role text);
    CREATE TABLE public.tenant_members(tenant_id uuid REFERENCES public.tenants(id),user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      tenant_role public.tenant_role,membership_status public.membership_status,is_owner boolean,PRIMARY KEY(tenant_id,user_id));
    CREATE TABLE public.rbac_profiles(id uuid PRIMARY KEY,tenant_id uuid,sistema boolean);
    CREATE TABLE public.rbac_modules(id uuid PRIMARY KEY,codigo text);
    CREATE TABLE public.rbac_permissions(profile_id uuid,module_id uuid,action public.rbac_action,scope text);
    CREATE TABLE public.user_profiles(tenant_id uuid,user_id uuid,profile_id uuid);
    CREATE TABLE public.corretores(id uuid PRIMARY KEY,tenant_id uuid REFERENCES public.tenants(id),nome text,
      user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL);
    CREATE UNIQUE INDEX corretores_user_id_uniq ON public.corretores(user_id) WHERE user_id IS NOT NULL;
    CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,user_id uuid REFERENCES auth.users(id),
      action text NOT NULL,entity text,entity_id text,before jsonb,after jsonb);
    ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.corretores ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA public TO service_role,anon,authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  `);
  await db.exec(extract('resolve_tenant_permission') + extract('assert_tenant_access_manager'));
  await db.exec(`REVOKE ALL ON FUNCTION public.resolve_tenant_permission(uuid,uuid,text,text,public.rbac_action) FROM PUBLIC,anon,authenticated;
    REVOKE ALL ON FUNCTION public.assert_tenant_access_manager(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
    GRANT EXECUTE ON FUNCTION public.resolve_tenant_permission(uuid,uuid,text,text,public.rbac_action) TO service_role;
    GRANT EXECUTE ON FUNCTION public.assert_tenant_access_manager(uuid,uuid,text) TO service_role;`);
  const substrateCatalog = () => db.query(`SELECT c.relname,c.relrowsecurity,c.relacl::text,
    (SELECT jsonb_agg(jsonb_build_array(a.attname,a.atttypid,a.attnotnull) ORDER BY a.attnum)
       FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS columns,
    (SELECT jsonb_agg(pg_get_indexdef(i.indexrelid) ORDER BY i.indexrelid)
       FROM pg_index i WHERE i.indrelid=c.oid) AS indexes
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','auth') AND c.relkind='r' ORDER BY n.nspname,c.relname`);
  const beforeCatalog=(await substrateCatalog()).rows;
  await db.exec(migration);
  assert.deepEqual((await substrateCatalog()).rows,beforeCatalog,'migration preserves table structure, RLS, grants and indexes');
  cases++;
  const signature="public.link_tenant_broker_identity(uuid,uuid,text,uuid,uuid)";
  for(const role of ['anon','authenticated','service_role']) {
    const r=await db.query(`SELECT has_function_privilege('${role}','${signature}','EXECUTE') AS allowed`);
    assert.equal(r.rows[0].allowed,role==='service_role'); cases++;
  }
  assert.equal((await db.query(`SELECT prosecdef FROM pg_proc WHERE oid='${signature}'::regprocedure`)).rows[0].prosecdef,false);
  async function seed() {
    await db.exec(`RESET ROLE; TRUNCATE public.audit_log,public.corretores,public.tenant_members,public.user_roles,public.user_profiles,public.rbac_permissions,public.rbac_profiles,public.rbac_modules,public.tenants,auth.users CASCADE;
      INSERT INTO auth.users VALUES ${[owner,delegated,viewer,superAdmin,target,second,foreign].map(n=>`(${sqlId(n)})`).join(',')};
      INSERT INTO public.tenants VALUES (${sqlId(tenant)}),(${sqlId(other)});
      INSERT INTO public.user_roles VALUES (${sqlId(superAdmin)},'super_admin');
      INSERT INTO public.tenant_members VALUES ${[owner,delegated,viewer,target,second].map(n=>`(${sqlId(tenant)},${sqlId(n)},'${n===owner?'owner':'broker'}','active',${n===owner})`).join(',')},
        (${sqlId(other)},${sqlId(foreign)},'owner','active',true);
      INSERT INTO public.corretores VALUES (${sqlId(broker)},${sqlId(tenant)},'Sintético',NULL),(${sqlId(broker2)},${sqlId(tenant)},'Sintético 2',NULL),(${sqlId(externalBroker)},${sqlId(other)},'Externo',NULL);
      INSERT INTO public.rbac_profiles VALUES (${sqlId(40)},${sqlId(tenant)},false);
      INSERT INTO public.rbac_modules VALUES (${sqlId(41)},'access_control');
      INSERT INTO public.rbac_permissions VALUES (${sqlId(40)},${sqlId(41)},'gerenciar','global');
      INSERT INTO public.user_profiles VALUES (${sqlId(tenant)},${sqlId(delegated)},${sqlId(40)});`);
  }
  async function link({actor=owner,t=tenant,origin='single-membership',b=broker,u=target,role='service_role'}={}) {
    await db.exec(`SET ROLE ${role}`);
    try { return (await db.query(`SELECT public.link_tenant_broker_identity($1,$2,$3,$4,$5) AS result`,[actor===null?null:id(actor),t===null?null:id(t),origin,b===null?null:id(b),u===null?null:id(u)])).rows[0].result; }
    finally { await db.exec('RESET ROLE'); }
  }
  const count = async () => Number((await db.query('SELECT count(*) AS n FROM public.audit_log')).rows[0].n);
  const linked = async (b=broker) => (await db.query('SELECT user_id FROM public.corretores WHERE id=$1',[id(b)])).rows[0].user_id;
  async function denied(args, pattern=/broker_identity|tenant_access_manager_required|super_admin_requires_impersonation|permission denied/) {
    await assert.rejects(link(args),pattern); assert.equal(await linked(),null); assert.equal(await count(),0); cases++;
  }
  await seed();
  for(const role of ['anon','authenticated','postgres']) await denied({role});
  for(const field of ['actor','t','origin','b','u']) await denied({[field]:null});
  await denied({origin:'forged'}); await denied({t:missing}); await denied({actor:missing});
  await denied({actor:viewer}); await denied({actor:superAdmin}); await denied({origin:'impersonation'});
  await denied({b:externalBroker}); await denied({b:missing}); await denied({u:foreign}); await denied({u:missing});
  for(const status of ['invited','suspended','revoked']) {
    await db.query('UPDATE public.tenant_members SET membership_status=$1 WHERE user_id=$2',[status,id(target)]);
    await denied({});
  }
  await seed();
  for(const scope of ['proprio','equipe']) {
    await db.query('UPDATE public.rbac_permissions SET scope=$1',[scope]); await denied({actor:delegated});
  }
  for(const args of [{},{actor:delegated},{actor:superAdmin,origin:'impersonation'}]) {
    await seed(); assert.deepEqual(await link(args),{corretorId:id(broker),userId:id(target),status:'linked'});
    assert.equal(await linked(),id(target)); assert.equal(await count(),1);
    const audit=(await db.query('SELECT user_id,tenant_id,action,before,after FROM public.audit_log')).rows[0];
    assert.deepEqual(audit,{user_id:id(args.actor??owner),tenant_id:id(tenant),action:'broker_identity_linked',before:{user_id:null},after:{user_id:id(target)}});
    assert.equal((await link(args)).status,'already_linked'); assert.equal(await count(),1); cases+=2;
  }
  await assert.rejects(link({u:second}),/broker_identity_conflict/); assert.equal(await linked(),id(target)); assert.equal(await count(),1); cases++;
  await assert.rejects(link({b:broker2}),/broker_identity_conflict/); assert.equal(await linked(broker2),null); assert.equal(await count(),1); cases++;
  await db.exec(`UPDATE public.tenant_members SET membership_status='suspended' WHERE user_id=${sqlId(target)}`);
  await assert.rejects(link(),/broker_identity_unavailable/); assert.equal(await count(),1); cases++;
  await seed();
  await db.exec(`UPDATE public.corretores SET user_id=${sqlId(target)} WHERE id=${sqlId(externalBroker)}`);
  await assert.rejects(link(),e=>e.message==='broker_identity_conflict' && !e.detail); assert.equal(await linked(),null); assert.equal(await count(),0); cases++;
  await seed();
  await db.exec(`CREATE FUNCTION public.reject_round42_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic_audit_failure'; END $$;
    CREATE TRIGGER reject_round42_audit BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.reject_round42_audit();`);
  await assert.rejects(link(),/synthetic_audit_failure/); assert.equal(await linked(),null); assert.equal(await count(),0); cases++;
  await db.exec('DROP TRIGGER reject_round42_audit ON public.audit_log');
  assert.equal((await link()).status,'linked'); assert.equal(await count(),1); cases++;
  await db.exec(`SET ROLE service_role; UPDATE public.corretores SET nome='Cadastro atualizado' WHERE id=${sqlId(broker)}; RESET ROLE;`);
  assert.equal(await linked(),id(target)); cases++;
  console.log(JSON.stringify({status:'PASS',cases,engine:'PGlite 0.3.14 / isolated PostgreSQL',atomicRollbackProven:true,multiSessionConcurrencyProven:false,remoteBackendAccess:false}));
} finally { await db.close(); }
