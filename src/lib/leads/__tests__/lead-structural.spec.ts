// LSH-01 / PR-M2 — Lead structural regressions against the canonical CRM runtime.
// Historical implementation files may remain in the repository as evidence, but
// they are not active authority and are not imported by this specification.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

type Case = { name: string; run: () => void };

function must(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const ROOT = process.cwd();
const MIG_DIR = join(ROOT, "supabase/migrations");

function migrations(): string[] {
  return readdirSync(MIG_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(MIG_DIR, file), "utf8"));
}

function anyMigration(pattern: RegExp): boolean {
  return migrations().some((sql) => pattern.test(sql));
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

const ADMIN_BARREL_PATH = "src/lib/api/admin.functions.ts";
const CRM_COMPAT_PATH = "src/lib/api/tenant-crm-compat.functions.ts";
const CRM_AUTHORITY_PATH = "src/lib/api/tenant-crm-authority.server.ts";

const cases: Case[] = [
  {
    name: "lead audit table direct access remains revoked",
    run: () => {
      must(anyMigration(/REVOKE ALL ON TABLE public\.lead_audit_events FROM PUBLIC/i), "PUBLIC revoke missing");
      must(anyMigration(/REVOKE ALL ON TABLE public\.lead_audit_events FROM anon/i), "anon revoke missing");
      must(anyMigration(/REVOKE ALL ON TABLE public\.lead_audit_events FROM authenticated/i), "authenticated revoke missing");
    },
  },
  {
    name: "lead audit FK and event domain remain hardened",
    run: () => {
      must(anyMigration(/ON DELETE RESTRICT/i) && anyMigration(/lead_audit_events_lead_id_fkey/i), "restrict FK missing");
      must(anyMigration(/lead_audit_events_event_type_check[\s\S]*manual_lead_created/i), "event type check missing");
      must(anyMigration(/ALTER TABLE public\.lead_audit_events\s+ALTER COLUMN tenant_id DROP DEFAULT/i), "tenant default removal missing");
    },
  },
  {
    name: "historical manual lead primitive validates bounded input",
    run: () => {
      const sql = migrations().join("\n");
      for (const token of ["input_invalid: nome", "input_invalid: nome_max", "input_invalid: email_max", "input_invalid: telefone_max", "input_invalid: observacoes_max"]) {
        must(sql.includes(token), `${token} validation missing`);
      }
    },
  },
  {
    name: "lead authorization boundary is typed and consumes canonical tenant context",
    run: () => {
      const source = read("src/lib/leads/lead-authorization.server.ts");
      must(/LeadAuthorizationDecision/.test(source), "decision type missing");
      must(/LeadOperation/.test(source) && /LeadAccessScope/.test(source), "operation or scope type missing");
      must(/from ["']@\/integrations\/supabase\/tenant-middleware["']/.test(source), "tenant middleware import missing");
      must(/tenant:\s*LeadTenantContext/.test(source), "LeadTenantContext missing");
      must(!/impersonating\?\s*:\s*boolean/.test(source), "caller supplied impersonation present");
      must(/super_admin_requires_impersonation/.test(source), "Super Admin impersonation denial missing");
    },
  },
  {
    name: "Content Workspace does not mount a parallel Lead mutation surface",
    run: () => {
      const routes = readdirSync(join(ROOT, "src/routes")).filter((file) => file.endsWith(".tsx"));
      for (const route of routes) {
        const source = read(`src/routes/${route}`);
        must(!/ContentWorkspace[^>]*kind\s*=\s*["']lead["']/.test(source), `route ${route} mounts parallel Lead workspace`);
      }
    },
  },
  {
    name: "administrative barrel exposes only explicit canonical CRM aliases",
    run: () => {
      const barrel = read(ADMIN_BARREL_PATH);
      must(!/export\s+\*\s+from\s+["'][^"']*legacy["']/.test(barrel), "legacy wildcard export present");
      must(/from ["']\.\/tenant-crm-compat\.functions["']/.test(barrel), "canonical CRM compatibility export missing");
      for (const name of ["adminListarLeads", "adminListarLeadAssignees", "adminListarImoveisLite", "adminAtualizarLead", "criarLeadManual"]) {
        must(barrel.includes(name), `${name} missing from explicit barrel`);
      }
    },
  },
  {
    name: "canonical CRM compatibility mappers use requireTenant and no global role authority",
    run: () => {
      const source = read(CRM_COMPAT_PATH);
      must(source.includes('import { requireTenant }'), "requireTenant import missing");
      must((source.match(/\.middleware\(\[requireTenant\]\)/g) ?? []).length === 2, "canonical mutations must use requireTenant");
      must(!source.includes('.rpc("has_role"'), "has_role authority present");
      must(!source.includes('.from("user_roles")'), "user_roles authority present");
      must(!/\.(insert|update|delete)\(/.test(source), "direct table mutation present in compatibility mapper");
    },
  },
  {
    name: "manual Lead compatibility result contract remains strict",
    run: () => {
      const source = read(CRM_COMPAT_PATH);
      must(/status:\s*z\.literal\(["']novo["']\)/.test(source), "status literal missing");
      must(/version:\s*z\.number\(\)\.int\(\)\.positive\(\)/.test(source), "positive version missing");
      must(/createdAt:\s*z\.string\(\)\.datetime\(\)/.test(source), "createdAt datetime missing");
      must(/\.strict\(\)/.test(source), "strict result contract missing");
    },
  },
  {
    name: "CRM compatibility mutations authorize before invoking service-role primitives",
    run: () => {
      const source = read(CRM_COMPAT_PATH);
      const helper = source.indexOf("async function crmRpc");
      const authorization = source.indexOf("authorizeTenantCrmOperation", helper);
      const adminClient = source.indexOf("supabaseAdmin", authorization);
      const rpc = source.indexOf(".rpc(name", adminClient);
      must(helper >= 0 && authorization > helper && adminClient > authorization && rpc > adminClient, "authorization chain is not ordered");
      must(source.includes('"get_tenant_crm_lead_aggregate"'), "aggregate read missing");
      must(source.includes('"update_tenant_crm_lead"'), "canonical update primitive missing");
      must(source.includes('"create_tenant_crm_lead"'), "canonical create primitive missing");
    },
  },
  {
    name: "canonical Tenant CRM authority uses Tenant Access Control without role fallback",
    run: () => {
      const source = read(CRM_AUTHORITY_PATH);
      must(source.includes("resolveEffectiveTenantPermission"), "effective permission resolver missing");
      must(source.includes("requireTenantScopedAuthority"), "tenant scoped authority missing");
      must(source.includes('CRM_MODULE_CODE = "crm"'), "catalogued CRM module missing");
      must(!source.includes('.rpc("has_role"'), "has_role fallback present");
      must(!source.includes('.from("user_roles")'), "user_roles fallback present");
      must(source.includes("super_admin_impersonation"), "Super Admin impersonation source missing");
    },
  },
  {
    name: "legacy Lead operations retain explicit tenant and own-assigned filters",
    run: () => {
      const source = read("src/lib/leads/lead-operations.server.ts");
      must(/listLeadsOwnAssigned\([^)]*tenantId[^)]*actorUserId/.test(source), "own assigned list contract missing");
      must(/updateLeadOwnAssigned\([^)]*tenantId[^)]*actorUserId/.test(source), "own assigned update contract missing");
      must(/\.eq\(["']tenant_id["'],\s*tenantId\)/.test(source), "tenant filter missing");
      must(/\.eq\(["']assigned_to["'],\s*actorUserId\)/.test(source), "actor assignment filter missing");
    },
  },
  {
    name: "Lead adapters route assignee reads through the canonical exported alias",
    run: () => {
      const adapter = read("src/components/content/adapters/useLeadAdapter.ts");
      const pipeline = read("src/components/pipeline/hooks/usePipelineData.ts");
      for (const [name, source] of [["adapter", adapter], ["pipeline", pipeline]]) {
        must(source.includes("adminListarLeadAssignees"), `${name} canonical assignee alias missing`);
        must(!source.includes("adminListarCorretores"), `${name} bypasses CRM assignee authority`);
      }
    },
  },
  {
    name: "CRM compatibility input cannot provide tenant, actor, role or scope",
    run: () => {
      const source = read(CRM_COMPAT_PATH);
      const inputValidators = [...source.matchAll(
        /\.inputValidator\(\(input: unknown\) => z\.object\(\{([\s\S]*?)\}\)\.strict\(\)\.parse\(input\)\)/g,
      )].map((match) => match[1]).join("\n");
      must(inputValidators.length > 0, "compatibility input validators not found");
      for (const pattern of [
        /\btenant_id\s*:/,
        /\btenantId\s*:/,
        /\bactorUserId\s*:/,
        /\bactor_user_id\s*:/,
        /\brole\s*:/,
        /\bscope\s*:/,
      ]) {
        must(!pattern.test(inputValidators), `caller authority field present: ${pattern}`);
      }
      must(source.includes("_tenant_id: decision.tenantId"), "server-derived tenant is not forwarded");
      must(source.includes("_actor_user_id: decision.actorUserId"), "server-derived actor is not forwarded");
      must(source.includes("context.tenant.origin"), "trusted tenant origin is not forwarded");
    },
  },
];

export async function runLeadStructuralSpecs(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const testCase of cases) {
    try {
      testCase.run();
      passed += 1;
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${testCase.name}:`, error instanceof Error ? error.message : error);
    }
  }
  return { passed, failed };
}
