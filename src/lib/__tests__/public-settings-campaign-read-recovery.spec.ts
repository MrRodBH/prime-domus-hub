import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertOptionalTenantScopedRow,
  assertTenantScopedRows,
  isTenantIndependentRootPath,
  loadRequiredPublicRootData,
  loadRequiredPublicRootDataForPath,
  withoutTenantId,
} from "@/lib/public-tenant-read-guards";
import {
  isPublicTenantResolutionError,
  PublicTenantResolutionError,
} from "@/lib/public-tenant-resolution-error";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

async function assertRejects(run: () => Promise<unknown>, expected: unknown, message: string) {
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
    name: "authenticated control-plane paths bypass public tenant readers without weakening public fail-closed behavior",
    run: async () => {
      assert(isTenantIndependentRootPath("/auth"), "auth path is tenant-independent");
      assert(isTenantIndependentRootPath("/auth/"), "auth trailing slash is normalized");
      assert(
        isTenantIndependentRootPath("/demonstracao"),
        "synthetic demonstration is tenant-independent",
      );
      assert(
        isTenantIndependentRootPath("/design-system"),
        "visual standards are tenant-independent",
      );
      assert(isTenantIndependentRootPath("/admin"), "admin entry is tenant-independent");
      assert(
        isTenantIndependentRootPath("/admin/memberships"),
        "admin descendants are tenant-independent",
      );
      assert(isTenantIndependentRootPath("/super"), "super-admin entry is tenant-independent");
      assert(
        isTenantIndependentRootPath("/super/control-plane"),
        "super-admin descendants are tenant-independent",
      );
      assert(isTenantIndependentRootPath("/invitations"), "invitation entry is tenant-independent");
      assert(!isTenantIndependentRootPath("/"), "public root remains tenant-bound");
      assert(
        !isTenantIndependentRootPath("/administrator"),
        "near-match public path remains tenant-bound",
      );

      let settingsCalls = 0;
      let trackingCalls = 0;
      const authResult = await loadRequiredPublicRootDataForPath(
        "/auth",
        async () => {
          settingsCalls++;
          throw new Error("settings reader must not run for auth");
        },
        async () => {
          trackingCalls++;
          throw new Error("tracking reader must not run for auth");
        },
      );
      assert(authResult === null, "auth receives tenant-independent root data authority");
      assert(settingsCalls === 0, "auth performs zero public settings reads");
      assert(trackingCalls === 0, "auth performs zero public tracking reads");

      const demonstrationResult = await loadRequiredPublicRootDataForPath(
        "/demonstracao",
        async () => {
          settingsCalls++;
          throw new Error("settings reader must not run for synthetic demonstration");
        },
        async () => {
          trackingCalls++;
          throw new Error("tracking reader must not run for synthetic demonstration");
        },
      );
      assert(
        demonstrationResult === null,
        "synthetic demonstration receives tenant-independent root data authority",
      );
      assert(settingsCalls === 0, "synthetic demonstration performs zero public settings reads");
      assert(trackingCalls === 0, "synthetic demonstration performs zero tracking reads");

      const superResult = await loadRequiredPublicRootDataForPath(
        "/super",
        async () => {
          settingsCalls++;
          throw new Error("settings reader must not run for super-admin control plane");
        },
        async () => {
          trackingCalls++;
          throw new Error("tracking reader must not run for super-admin control plane");
        },
      );
      assert(
        superResult === null,
        "super-admin entry receives tenant-independent root data authority",
      );
      assert(settingsCalls === 0, "super-admin entry performs zero public settings reads");
      assert(trackingCalls === 0, "super-admin entry performs zero public tracking reads");

      const publicFailure = new PublicTenantResolutionError();
      await assertRejects(
        () =>
          loadRequiredPublicRootDataForPath(
            "/imoveis",
            async () => {
              throw publicFailure;
            },
            async () => ({ connectors: [] }),
          ),
        publicFailure,
        "public path still propagates missing tenant authority",
      );
    },
  },
  {
    name: "auth UI isolation preserves Supabase login and PCA-11 global super-admin authority",
    run: async () => {
      const root = readFileSync(resolve(process.cwd(), "src/routes/__root.tsx"), "utf8");
      const auth = readFileSync(resolve(process.cwd(), "src/routes/auth.tsx"), "utf8");
      const route = readFileSync(
        resolve(process.cwd(), "src/routes/api/internal/pca-11-managed-binding-provision.ts"),
        "utf8",
      );
      const provisioning = readFileSync(
        resolve(process.cwd(), "src/lib/spr-03/managed-secret-provisioning.server.ts"),
        "utf8",
      );

      assert(root.includes("loader: async ({ location })"), "root loader receives exact pathname");
      assert(
        root.includes("loadRequiredPublicRootDataForPath(\n      location.pathname"),
        "root delegates pathname policy",
      );
      assert(
        root.includes("tenantIndependent: true as const"),
        "auth root data is explicitly tagged",
      );
      assert(
        root.includes("loaderData.tenantIndependent ? null : <CampaignRenderer />"),
        "campaign runtime excluded from auth",
      );
      assert(
        root.includes("<PublicTrackingRuntime snapshot={loaderData.tracking} />"),
        "public tracking remains available on tenant-bound routes",
      );
      assert(auth.includes("supabase.auth.getUser()"), "existing Supabase session check preserved");
      assert(
        auth.includes("supabase.auth.signInWithPassword({ email, password })"),
        "password login preserved",
      );
      assert(
        !/SERVICE_ROLE|CLOUDFLARE_API_TOKEN|super_admin/i.test(auth),
        "browser auth receives no privileged secret or role bypass",
      );
      assert(
        route.includes('request.headers.has("x-tenant-id")'),
        "tenant override remains prohibited",
      );
      assert(
        route.includes('authorization.startsWith("Bearer ")'),
        "Bearer transport remains mandatory",
      );
      assert(
        provisioning.includes('authenticateGlobalSuperAdmin(candidate, "pca11", readEnvironment)'),
        "PCA-11 global super-admin verification preserved",
      );
      assert(
        provisioning.includes('.eq("role", "super_admin")'),
        "exact super-admin role remains mandatory",
      );
    },
  },
  {
    name: "production readers use executable tenant response guards",
    run: async () => {
      const site = readFileSync(resolve(process.cwd(), "src/lib/api/site.functions.ts"), "utf8");
      const authority = readFileSync(
        resolve(process.cwd(), "src/lib/api/tenant-configuration-authority.server.ts"),
        "utf8",
      );
      const meta = readFileSync(resolve(process.cwd(), "src/lib/api/meta.functions.ts"), "utf8");
      const campaigns = readFileSync(
        resolve(process.cwd(), "src/lib/api/campaigns.functions.ts"),
        "utf8",
      );
      const root = readFileSync(resolve(process.cwd(), "src/routes/__root.tsx"), "utf8");

      const siteRead = site.slice(
        site.indexOf("export const obterSiteSettings"),
        site.indexOf("export const atualizarSiteSettings"),
      );
      const ledgerRead = authority.slice(
        authority.indexOf("async function querySingleConfigurationVersion"),
        authority.indexOf("export async function loadTenantConfigurationState"),
      );
      const mediaRead = site.slice(
        site.indexOf("async function resolveConfigurationMedia"),
        site.indexOf("function normalizeLinkArray"),
      );
      const metaRead = meta.slice(
        meta.indexOf("export const obterMetaPixelId"),
        meta.indexOf("export const obterMetaConfigAdmin"),
      );
      const campaignRead = campaigns.slice(
        campaigns.indexOf("export const listarCampanhasAtivas"),
        campaigns.indexOf("export const registrarEventoCampanha"),
      );

      assert(siteRead.includes("requirePublicTenantFromRequest"), "settings require Host tenant");
      assert(
        siteRead.includes("loadPublishedConfigurationForTenant(tenant.id)"),
        "settings use published ledger boundary",
      );
      assert(ledgerRead.includes('select("id, tenant_id, revision'), "ledger selects tenant_id");
      assert(ledgerRead.includes('.eq("tenant_id", tenantId)'), "ledger query has tenant equality");
      assert(ledgerRead.includes('.eq("key", "configuration")'), "ledger query has canonical key");
      assert(ledgerRead.includes('.eq("status", status)'), "ledger query has publication status");
      assert(ledgerRead.includes(".maybeSingle()"), "ledger enforces strict cardinality");
      assert(
        mediaRead.includes('select("id, tenant_id, arquivo")'),
        "configuration media selects tenant_id",
      );
      assert(
        mediaRead.includes('.eq("tenant_id", tenantId)'),
        "configuration media is tenant-bound",
      );
      assert(
        mediaRead.includes("row.tenant_id !== tenantId"),
        "configuration media response guard",
      );
      assert(metaRead.includes('select("tenant_id, value")'), "Meta selects tenant_id");
      assert(metaRead.includes("if (error) throw"), "Meta query error propagated");
      assert(metaRead.includes("assertOptionalTenantScopedRow"), "Meta response guard");
      assert(campaignRead.includes("assertTenantScopedRows"), "campaign response guard");
      assert(!campaignRead.includes("tenantId"), "campaign read has no client tenant input");
      assert(root.includes("loadRequiredPublicRootData"), "root uses fail-closed loader");
      assert(
        !root.includes("// ignore\n    }\n    try"),
        "root no longer chains ignored public reads",
      );
    },
  },
  {
    name: "campaign event writer remains reserved for PTW-01",
    run: async () => {
      const campaigns = readFileSync(
        resolve(process.cwd(), "src/lib/api/campaigns.functions.ts"),
        "utf8",
      );
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
