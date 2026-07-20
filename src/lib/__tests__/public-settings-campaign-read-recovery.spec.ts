import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertOptionalTenantScopedRow,
  assertTenantScopedRows,
  loadRequiredPublicRootData,
  withoutTenantId,
} from "@/lib/public-tenant-read-guards";
import {
  isPublicTenantResolutionError,
  PublicTenantResolutionError,
} from "@/lib/public-tenant-resolution-error";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

async function assertRejects(
  run: () => Promise<unknown>,
  expected: unknown,
  message: string,
) {
  let caught: unknown;
  try {
    await run();
  } catch (error) {
    caught = error;
  }
  assert(caught === expected, message);
}

function assertThrows(run: () => unknown, message: string) {
  let threw = false;
  try {
    run();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "same-tenant collection rows are accepted",
    run: async () => {
      const rows = assertTenantScopedRows(TENANT_A, [
        { tenant_id: TENANT_A, key: "branding", value: { site_name: "Tenant A" } },
        { tenant_id: TENANT_A, key: "seo_global", value: {} },
      ]);
      assert(rows.length === 2, "same-tenant rows accepted");
      const publicRows = rows.map(withoutTenantId);
      assert(!("tenant_id" in publicRows[0]), "tenant_id stripped from public DTO");
    },
  },
  {
    name: "foreign collection row fails closed",
    run: async () => {
      assertThrows(
        () =>
          assertTenantScopedRows(TENANT_A, [
            { tenant_id: TENANT_A, id: "a" },
            { tenant_id: TENANT_B, id: "b" },
          ]),
        "foreign collection row must throw",
      );
    },
  },
  {
    name: "empty tenant-scoped collection is a valid empty result",
    run: async () => {
      assert(assertTenantScopedRows(TENANT_A, []).length === 0, "empty collection accepted");
      assert(assertTenantScopedRows(TENANT_A, null).length === 0, "null data normalized to empty");
    },
  },
  {
    name: "missing tenant-bound Meta row returns null",
    run: async () => {
      assert(assertOptionalTenantScopedRow(TENANT_A, null) === null, "missing Meta row is null");
    },
  },
  {
    name: "foreign Meta row fails closed",
    run: async () => {
      assertThrows(
        () => assertOptionalTenantScopedRow(TENANT_A, { tenant_id: TENANT_B, value: {} }),
        "foreign Meta row must throw",
      );
    },
  },
  {
    name: "tenant-resolution error survives serialization-compatible reconstruction",
    run: async () => {
      const error = new PublicTenantResolutionError();
      assert(isPublicTenantResolutionError(error), "native error recognized");
      assert(
        isPublicTenantResolutionError({ code: error.code, message: error.message }),
        "reconstructed error recognized",
      );
      assert(!isPublicTenantResolutionError(new Error("other")), "unrelated error rejected");
    },
  },
  {
    name: "root data loader propagates settings failure",
    run: async () => {
      const failure = new PublicTenantResolutionError();
      let metaCalled = false;
      await assertRejects(
        () =>
          loadRequiredPublicRootData(
            async () => {
              throw failure;
            },
            async () => {
              metaCalled = true;
              return { pixel_id: null };
            },
          ),
        failure,
        "settings failure propagated",
      );
      assert(metaCalled === false, "Meta load not attempted after settings authority failure");
    },
  },
  {
    name: "root data loader propagates Meta failure",
    run: async () => {
      const failure = new Error("meta query failed");
      await assertRejects(
        () =>
          loadRequiredPublicRootData(
            async () => ({ branding: { site_name: "Tenant A" } }),
            async () => {
              throw failure;
            },
          ),
        failure,
        "Meta failure propagated",
      );
    },
  },
  {
    name: "root data loader returns both successful tenant-bound values",
    run: async () => {
      const result = await loadRequiredPublicRootData(
        async () => ({ branding: { site_name: "Tenant A" } }),
        async () => ({ pixel_id: "123" }),
      );
      assert(result.settings.branding.site_name === "Tenant A", "settings preserved");
      assert(result.meta.pixel_id === "123", "Meta preserved");
    },
  },
  {
    name: "production readers use executable tenant response guards",
    run: async () => {
      const site = readFileSync(resolve(process.cwd(), "src/lib/api/site.functions.ts"), "utf8");
      const meta = readFileSync(resolve(process.cwd(), "src/lib/api/meta.functions.ts"), "utf8");
      const campaigns = readFileSync(resolve(process.cwd(), "src/lib/api/campaigns.functions.ts"), "utf8");
      const root = readFileSync(resolve(process.cwd(), "src/routes/__root.tsx"), "utf8");

      const siteRead = site.slice(
        site.indexOf("export const obterSiteSettings"),
        site.indexOf("export const atualizarSiteSettings"),
      );
      const metaRead = meta.slice(
        meta.indexOf("export const obterMetaPixelId"),
        meta.indexOf("export const obterMetaConfigAdmin"),
      );
      const campaignRead = campaigns.slice(
        campaigns.indexOf("export const listarCampanhasAtivas"),
        campaigns.indexOf("export const registrarEventoCampanha"),
      );

      assert(siteRead.includes('select("tenant_id, key, value")'), "settings selects tenant_id");
      assert(siteRead.includes("assertTenantScopedRows"), "settings response guard");
      assert(metaRead.includes('select("tenant_id, value")'), "Meta selects tenant_id");
      assert(metaRead.includes("if (error) throw"), "Meta query error propagated");
      assert(metaRead.includes("assertOptionalTenantScopedRow"), "Meta response guard");
      assert(campaignRead.includes("assertTenantScopedRows"), "campaign response guard");
      assert(!campaignRead.includes("tenantId"), "campaign read has no client tenant input");
      assert(root.includes("loadRequiredPublicRootData"), "root uses fail-closed loader");
      assert(!root.includes("// ignore\n    }\n    try"), "root no longer chains ignored public reads");
    },
  },
  {
    name: "campaign event writer remains reserved for PTW-01",
    run: async () => {
      const campaigns = readFileSync(resolve(process.cwd(), "src/lib/api/campaigns.functions.ts"), "utf8");
      const writer = campaigns.slice(campaigns.indexOf("export const registrarEventoCampanha"));
      assert(writer.includes("tenantId?: string | null"), "writer contract preserved");
      assert(writer.includes("publicClient(data.tenantId ?? null)"), "writer transport preserved");
      assert(writer.includes('.from("cms_campaign_events").insert'), "writer mutation preserved");
    },
  },
];

export async function runPublicSettingsCampaignReadRecoverySpecs(): Promise<{
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
