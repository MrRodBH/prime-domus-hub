import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertTenantScopedRows,
  isPublicTenantResolutionError,
  PublicTenantResolutionError,
  requireResolvedPublicTenant,
  selectExactlyOneTenantScopedRow,
  withoutTenantId,
} from "@/lib/public-tenant-read.server";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

function assertThrows(run: () => unknown, message: string) {
  let error: unknown;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  assert(error !== undefined, message);
  return error;
}

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "unresolved tenant throws a typed fail-closed error",
    run: async () => {
      const error = assertThrows(() => requireResolvedPublicTenant(null), "tenant resolution must fail");
      assert(error instanceof PublicTenantResolutionError, "typed error");
      assert(isPublicTenantResolutionError(error), "error recognized");
      assert(
        isPublicTenantResolutionError({ code: "PUBLIC_TENANT_NOT_RESOLVED" }),
        "serialized error recognized",
      );
    },
  },
  {
    name: "same-tenant rows pass and cross-tenant rows fail closed",
    run: async () => {
      const rows = assertTenantScopedRows(TENANT_A, [
        { tenant_id: TENANT_A, id: "a" },
        { tenant_id: TENANT_A, id: "b" },
      ]);
      assert(rows.length === 2, "same tenant rows accepted");
      assertThrows(
        () =>
          assertTenantScopedRows(TENANT_A, [
            { tenant_id: TENANT_A, id: "a" },
            { tenant_id: TENANT_B, id: "b" },
          ]),
        "cross-tenant row denied",
      );
    },
  },
  {
    name: "single-row reads preserve explicit zero-one-N cardinality",
    run: async () => {
      assert(selectExactlyOneTenantScopedRow(TENANT_A, []) === null, "zero is null");
      assert(
        selectExactlyOneTenantScopedRow(TENANT_A, [{ tenant_id: TENANT_A, id: "a" }])?.id === "a",
        "one accepted",
      );
      assert(
        selectExactlyOneTenantScopedRow(TENANT_A, [
          { tenant_id: TENANT_A, id: "a" },
          { tenant_id: TENANT_A, id: "b" },
        ]) === null,
        "ambiguous rows denied",
      );
    },
  },
  {
    name: "tenant_id is removed before returning public payload",
    run: async () => {
      const value = withoutTenantId({ tenant_id: TENANT_A, id: "a", title: "Example" });
      assert(!("tenant_id" in value), "tenant id not leaked");
      assert(value.id === "a" && value.title === "Example", "payload preserved");
    },
  },
  {
    name: "site settings read is server-resolved and tenant-scoped",
    run: async () => {
      const source = readFileSync(resolve(process.cwd(), "src/lib/api/site.functions.ts"), "utf8");
      const publicRead = source.slice(
        source.indexOf("export const obterSiteSettings"),
        source.indexOf("export const atualizarSiteSettings"),
      );
      assert(publicRead.includes("resolvePublicTenantFromRequest"), "server resolver used");
      assert(publicRead.includes("publicSupabaseForTenant(tenant.id)"), "tenant client used");
      assert(publicRead.includes('.eq("tenant_id", tenant.id)'), "tenant predicate present");
      assert(publicRead.includes("assertTenantScopedRows"), "cross-tenant response guard present");
      assert(!publicRead.includes("publicClient("), "unscoped public client absent");
    },
  },
  {
    name: "public page input cannot carry tenant authority",
    run: async () => {
      const source = readFileSync(resolve(process.cwd(), "src/lib/api/pages.functions.ts"), "utf8");
      const publicRead = source.slice(source.indexOf("export const obterPaginaPublica"));
      assert(publicRead.includes("resolvePublicTenantFromRequest"), "server resolver used");
      assert(publicRead.includes('.eq("tenant_id", tenant.id)'), "tenant predicate present");
      assert(publicRead.includes("selectExactlyOneTenantScopedRow"), "cardinality guard present");
      assert(publicRead.includes(".limit(2)"), "ambiguity detection bound present");
      assert(!publicRead.includes("tenant_id: z.string"), "tenant payload removed");
      assert(!publicRead.includes("maybeSingle"), "ambiguous read not collapsed");
    },
  },
  {
    name: "public campaign listing cannot carry tenant authority or hide errors",
    run: async () => {
      const source = readFileSync(resolve(process.cwd(), "src/lib/api/campaigns.functions.ts"), "utf8");
      const publicRead = source.slice(
        source.indexOf("export const listarCampanhasAtivas"),
        source.indexOf("export const registrarEventoCampanha"),
      );
      assert(publicRead.includes("resolvePublicTenantFromRequest"), "server resolver used");
      assert(publicRead.includes('.eq("tenant_id", tenant.id)'), "tenant predicate present");
      assert(publicRead.includes("assertTenantScopedRows"), "cross-tenant response guard present");
      assert(!publicRead.includes("tenantId"), "client tenant input removed from read");
      assert(!publicRead.includes("return []"), "query errors are not hidden as empty success");
    },
  },
  {
    name: "root loader propagates public tenant resolution failure",
    run: async () => {
      const source = readFileSync(resolve(process.cwd(), "src/routes/__root.tsx"), "utf8");
      assert(source.includes("isPublicTenantResolutionError(error)"), "typed tenant error checked");
      assert(source.includes("throw error"), "tenant error propagated");
    },
  },
];

export async function runPublicTenantReadBindingSpecs(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  for (const spec of specs) {
    try {
      await spec.run();
      passed++;
    } catch (error) {
      failed++;
      console.error(`✗ ${spec.name}\n  ${error instanceof Error ? error.message : error}`);
    }
  }
  return { passed, failed };
}
