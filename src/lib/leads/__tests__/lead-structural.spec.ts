// LSH-01 — Structural tests. Deterministic reads over repo files.
// Prove that migrations, RPC hardening, boundary and adapters carry the
// contract text. Operational proof against the live DB belongs to LSV-01.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

type Case = { name: string; run: () => void };

function must(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const ROOT = process.cwd();
const MIG_DIR = join(ROOT, "supabase/migrations");
function migrations(): string[] {
  return readdirSync(MIG_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIG_DIR, f), "utf8"));
}
function anyMigration(pattern: RegExp): boolean {
  return migrations().some((sql) => pattern.test(sql));
}
function read(p: string): string {
  return readFileSync(join(ROOT, p), "utf8");
}

const cases: Case[] = [
  {
    name: "migration revokes DML on lead_audit_events from all roles",
    run: () => {
      must(anyMigration(/REVOKE ALL ON TABLE public\.lead_audit_events FROM PUBLIC/i), "PUBLIC revoke missing");
      must(anyMigration(/REVOKE ALL ON TABLE public\.lead_audit_events FROM anon/i), "anon revoke missing");
      must(anyMigration(/REVOKE ALL ON TABLE public\.lead_audit_events FROM authenticated/i), "authenticated revoke missing");
      must(anyMigration(/REVOKE ALL ON TABLE public\.lead_audit_events FROM service_role/i), "service_role revoke missing");
    },
  },
  {
    name: "migration drops direct SELECT policy on lead_audit_events",
    run: () => must(anyMigration(/DROP POLICY IF EXISTS lead_audit_events_select ON public\.lead_audit_events/i), "drop policy missing"),
  },
  {
    name: "migration replaces ON DELETE CASCADE with ON DELETE RESTRICT on audit FK",
    run: () => must(anyMigration(/ON DELETE RESTRICT/i) && anyMigration(/lead_audit_events_lead_id_fkey/i), "restrict FK missing"),
  },
  {
    name: "migration removes tenant_id default on audit table",
    run: () => must(anyMigration(/ALTER TABLE public\.lead_audit_events\s+ALTER COLUMN tenant_id DROP DEFAULT/i), "drop default missing"),
  },
  {
    name: "migration adds event_type CHECK constraint",
    run: () => must(anyMigration(/lead_audit_events_event_type_check[\s\S]*manual_lead_created/i), "event_type check missing"),
  },
  {
    name: "create_manual_lead uses secure search_path",
    run: () => must(anyMigration(/SET search_path = 'public', 'pg_temp'/i), "safe search_path missing"),
  },
  {
    name: "create_manual_lead grants: authenticated only, revoked from PUBLIC/anon/service_role",
    run: () => {
      must(anyMigration(/REVOKE ALL ON FUNCTION public\.create_manual_lead[^;]+FROM PUBLIC/i), "PUBLIC revoke");
      must(anyMigration(/REVOKE ALL ON FUNCTION public\.create_manual_lead[^;]+FROM anon/i), "anon revoke");
      must(anyMigration(/REVOKE ALL ON FUNCTION public\.create_manual_lead[^;]+FROM service_role/i), "service_role revoke");
      must(anyMigration(/GRANT EXECUTE ON FUNCTION public\.create_manual_lead[^;]+TO authenticated/i), "authenticated grant");
    },
  },
  {
    name: "create_manual_lead validates inputs at database level",
    run: () => {
      const sql = migrations().join("\n");
      must(/input_invalid: nome/.test(sql), "nome validation");
      must(/input_invalid: nome_max/.test(sql), "nome_max validation");
      must(/input_invalid: email_max/.test(sql), "email_max validation");
      must(/input_invalid: telefone_max/.test(sql), "telefone_max validation");
      must(/input_invalid: observacoes_max/.test(sql), "observacoes_max validation");
    },
  },
  {
    name: "create_manual_lead passes tenant_id explicitly to audit event",
    run: () => must(anyMigration(/INSERT INTO public\.lead_audit_events[\s\S]{0,400}v_tenant, v_lead\.id, v_actor, 'manual_lead_created'/i), "audit tenant param"),
  },
  {
    name: "lead authorization boundary module exists and is typed",
    run: () => {
      const src = read("src/lib/leads/lead-authorization.server.ts");
      must(/LeadAuthorizationDecision/.test(src), "decision type missing");
      must(/LeadOperation/.test(src) && /LeadAccessScope/.test(src), "operation/scope types missing");
      must(!/\bas any\b/.test(src), "any leak in boundary");
      must(!/as never\b/.test(src), "as never leak in boundary");
      must(!/as unknown as/.test(src), "as unknown as leak in boundary");
    },
  },
  {
    name: "content workspace Lead adapter has runAction disabled and no legacy claim",
    run: () => {
      const src = read("src/components/content/adapters/useLeadAdapter.ts");
      must(/indisponível no Content Workspace/.test(src), "runAction must throw explicitly");
      must(!/runAction é o único ponto de execução/.test(src), "legacy comment claiming runAction is authority still present");
    },
  },
  {
    name: "no route mounts a Content Workspace Lead surface",
    run: () => {
      const routes = readdirSync(join(ROOT, "src/routes")).filter((f) => f.endsWith(".tsx"));
      for (const r of routes) {
        const src = read(`src/routes/${r}`);
        must(!/ContentWorkspace[^>]*kind\s*=\s*["']lead["']/.test(src), `route ${r} mounts lead workspace`);
      }
    },
  },
  {
    name: "criarLeadManual handler does not use supabaseAdmin",
    run: () => {
      const src = read("src/lib/api/admin.functions.ts");
      const idx = src.indexOf("criarLeadManual");
      must(idx > 0, "criarLeadManual not found");
      const region = src.slice(idx, idx + 1500);
      must(!/supabaseAdmin/.test(region), "supabaseAdmin present in criarLeadManual region");
    },
  },
  {
    name: "adminListarCorretores does not use select(\"*\")",
    run: () => {
      const src = read("src/lib/api/admin.functions.ts");
      const idx = src.indexOf("adminListarCorretores");
      must(idx > 0, "adminListarCorretores not found");
      const region = src.slice(idx, idx + 1000);
      must(!/\.select\(\s*['"]\*['"]\s*\)/.test(region), "select('*') leak");
    },
  },
  {
    name: "adminAtualizarLead does not cast payload via `as never`",
    run: () => {
      const src = read("src/lib/api/admin.functions.ts");
      const idx = src.indexOf("adminAtualizarLead");
      const region = src.slice(idx, idx + 1200);
      must(!/\bas never\b/.test(region), "`as never` cast leak in adminAtualizarLead");
    },
  },
  {
    name: "manualLeadReturnSchema tightened (status literal novo, version positive int, createdAt datetime)",
    run: () => {
      const src = read("src/lib/api/admin.functions.ts");
      must(/manualLeadReturnSchema[\s\S]{0,400}z\.literal\(\s*["']novo["']\s*\)/.test(src), "status literal novo missing");
      must(/version:\s*z\.number\(\)\.int\(\)\.positive\(\)/.test(src), "version .int().positive() missing");
      must(/createdAt:\s*z\.string\(\)\.datetime\(\)/.test(src), "createdAt .datetime() missing");
    },
  },
  // LSH-01 · Lote A — Runtime Authorization Integration structural proofs.
  {
    name: "admin.functions.ts consumes the operations module",
    run: () => {
      const src = read("src/lib/api/admin.functions.ts");
      must(/from ["']@\/lib\/leads\/lead-operations\.server["']/.test(src), "operations import missing");
      must(/createRuntimeLeadOperationsDeps/.test(src), "runtime deps builder not used");
    },
  },
  {
    name: "five Lead server functions call the boundary via operations module",
    run: () => {
      const src = read("src/lib/api/admin.functions.ts");
      const ops = [
        { fn: "adminListarLeads", call: "listLeadsAuthorized" },
        { fn: "adminListarImoveisLite", call: "listLeadPropertiesAuthorized" },
        { fn: "adminListarLeadAssignees", call: "listLeadAssigneesAuthorized" },
        { fn: "adminAtualizarLead", call: "updateLeadFieldsAuthorized" },
        { fn: "criarLeadManual", call: "createManualLeadAuthorized" },
      ];
      for (const { fn, call } of ops) {
        const idx = src.indexOf(`export const ${fn}`);
        must(idx > 0, `${fn} not found`);
        const region = src.slice(idx, idx + 1600);
        must(region.includes(call), `${fn} does not call ${call}`);
      }
    },
  },
  {
    name: "legacy guards absent from Lead runtime operations regions",
    run: () => {
      const src = read("src/lib/api/admin.functions.ts");
      const regions = ["adminListarLeads", "adminAtualizarLead", "adminListarImoveisLite", "adminListarLeadAssignees", "criarLeadManual"];
      for (const fn of regions) {
        const idx = src.indexOf(`export const ${fn}`);
        const end = src.indexOf("export const ", idx + 20);
        const region = src.slice(idx, end > 0 ? end : idx + 1600);
        must(!/ensureAdmin\s*\(/.test(region), `ensureAdmin leak in ${fn}`);
        must(!/ensureActiveTenantMembership\s*\(/.test(region), `ensureActiveTenantMembership leak in ${fn}`);
      }
    },
  },
  {
    name: "operations module applies own_assigned filters (tenant + actor) in update and list",
    run: () => {
      const src = read("src/lib/leads/lead-operations.server.ts");
      must(/updateLeadOwnAssigned\([^)]*tenantId[^)]*actorUserId/.test(src), "update own_assigned path missing actor");
      must(/listLeadsOwnAssigned\([^)]*tenantId[^)]*actorUserId/.test(src), "list own_assigned path missing actor");
      must(/\.eq\(["']assigned_to["'],\s*actorUserId\)/.test(src), "assigned_to filter not applied server-side");
    },
  },
  {
    name: "criarLeadManual authorizes before RPC (authorize call precedes gateway.createManualLead)",
    run: () => {
      const src = read("src/lib/leads/lead-operations.server.ts");
      const idx = src.indexOf("export async function createManualLeadAuthorized");
      must(idx > 0, "createManualLeadAuthorized missing");
      const region = src.slice(idx, idx + 800);
      const authIdx = region.indexOf("authorizeLeadOperation");
      const rpcIdx = region.indexOf("gateway.createManualLead");
      must(authIdx > 0 && rpcIdx > authIdx, "authorization must precede RPC");
    },
  },
  {
    name: "boundary does not accept caller-supplied impersonation input",
    run: () => {
      const src = read("src/lib/leads/lead-authorization.server.ts");
      must(!/impersonating\?\s*:\s*boolean/.test(src), "caller-supplied impersonation field present");
      // Rejects the anti-pattern `has_role(..., "admin")` as Super Admin.
      must(!/has_role[\s\S]{0,80}_role:\s*["']admin["']/.test(src), "has_role admin used as Super Admin");
    },
  },
  {
    name: "boundary consumes canonical Tenant Context (requireTenant contract)",
    run: () => {
      const src = read("src/lib/leads/lead-authorization.server.ts");
      must(/from ["']@\/integrations\/supabase\/tenant-middleware["']/.test(src), "tenant-middleware not imported");
      must(/mapTenantOrigin\s*\(/.test(src), "mapTenantOrigin helper missing");
      must(/deriveLeadTenantContext\s*\(/.test(src), "deriveLeadTenantContext helper missing");
      must(/tenant:\s*LeadTenantContext/.test(src), "LeadTenantContext not required in context");
    },
  },
  {
    name: "boundary derives impersonating from Super Admin AND impersonation origin (no constant false)",
    run: () => {
      const src = read("src/lib/leads/lead-authorization.server.ts");
      must(/isSuperAdmin:\s*boolean/.test(src), "isSuperAdmin missing from decision");
      must(/impersonating:\s*boolean/.test(src), "impersonating missing from decision");
      // The boundary must NOT keep `impersonating: false` as a constant literal
      // for authorized decisions; Super Admin impersonating returns true.
      must(!/impersonating:\s*false\s*,\s*\/\/ Fail-closed/.test(src), "legacy fail-closed constant still present");
      must(/impersonating:\s*true/.test(src), "impersonating=true path missing");
      // Super Admin path must be reachable and denied without impersonation.
      must(/super_admin_requires_impersonation/.test(src), "super_admin_requires_impersonation not used");
    },
  },
  {
    name: "wrappers compose requireTenant middleware (not requireSupabaseAuth alone) for Lead operations",
    run: () => {
      const src = read("src/lib/api/admin.functions.ts");
      const ops = ["adminListarLeads", "adminAtualizarLead", "adminListarImoveisLite", "adminListarLeadAssignees", "criarLeadManual"];
      for (const fn of ops) {
        const idx = src.indexOf(`export const ${fn}`);
        must(idx > 0, `${fn} not found`);
        const end = src.indexOf("export const ", idx + 20);
        const region = src.slice(idx, end > 0 ? end : idx + 2000);
        must(/\.middleware\(\[requireTenant\]\)/.test(region), `${fn} does not compose requireTenant`);
        must(/context\.tenant/.test(region), `${fn} does not forward context.tenant`);
      }
    },
  },
  {
    name: "Lead-domain adapter routes assignee reads via boundary (adminListarLeadAssignees)",
    run: () => {
      const adapter = read("src/components/content/adapters/useLeadAdapter.ts");
      must(/adminListarLeadAssignees/.test(adapter), "adapter must call adminListarLeadAssignees");
      must(!/adminListarCorretores/.test(adapter), "adapter must not import adminListarCorretores");
      const pipe = read("src/components/pipeline/hooks/usePipelineData.ts");
      must(/adminListarLeadAssignees/.test(pipe), "pipeline hook must call adminListarLeadAssignees");
      must(!/adminListarCorretores/.test(pipe), "pipeline hook must not call adminListarCorretores");
    },
  },
  {
    name: "workspace mutation surface remains absent (no ContentWorkspace lead route)",
    run: () => {
      const routes = readdirSync(join(ROOT, "src/routes")).filter((f) => f.endsWith(".tsx"));
      for (const r of routes) {
        const src = read(`src/routes/${r}`);
        must(!/ContentWorkspace[^>]*kind\s*=\s*["']lead["']/.test(src), `route ${r} mounts lead workspace`);
      }
    },
  },
];


export async function runLeadStructuralSpecs(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const c of cases) {
    try {
      c.run();
      passed++;
    } catch (e) {
      failed++;
      console.error(`FAIL ${c.name}:`, e instanceof Error ? e.message : e);
    }
  }
  return { passed, failed };
}
