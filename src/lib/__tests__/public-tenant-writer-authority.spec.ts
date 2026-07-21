import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertTenantScopedCollection,
  assertTenantScopedRow,
  PublicWriterError,
  selectExactlyOneRow,
  selectExactlyOneTenantScopedRow,
} from "../public-writers/public-writer-authority.server";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function section(source: string, start: string, end?: string): string {
  const startIndex = source.indexOf(start);
  assert(startIndex >= 0, `missing section start: ${start}`);
  if (!end) return source.slice(startIndex);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(endIndex > startIndex, `missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

async function expectWriterError(
  run: () => unknown | Promise<unknown>,
  code: PublicWriterError["code"],
): Promise<void> {
  try {
    await run();
  } catch (error) {
    assert(error instanceof PublicWriterError, `expected PublicWriterError(${code})`);
    assert(error.code === code, `expected ${code}, got ${error.code}`);
    return;
  }
  throw new Error(`ASSERT: expected PublicWriterError(${code})`);
}

const tenant = Object.freeze({ id: "tenant-a" });

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "exactly one authority row is accepted by identity",
    run: async () => {
      const row = { id: "resource-a", tenant_id: tenant.id };
      assert(selectExactlyOneRow([row]) === row, "accepted row identity was replaced");
      assert(
        selectExactlyOneTenantScopedRow(tenant, [row]) === row,
        "tenant-scoped row identity was replaced",
      );
    },
  },
  {
    name: "zero authority rows fail closed unless explicitly optional",
    run: async () => {
      await expectWriterError(() => selectExactlyOneRow([]), "resource_not_found");
      assert(
        selectExactlyOneRow([], { allowZero: true }) === null,
        "optional zero-row lookup did not return null",
      );
    },
  },
  {
    name: "multiple authority rows fail closed",
    run: async () => {
      await expectWriterError(
        () => selectExactlyOneRow([{ id: "a" }, { id: "b" }]),
        "resource_ambiguous",
      );
    },
  },
  {
    name: "foreign tenant row is denied",
    run: async () => {
      await expectWriterError(
        () => assertTenantScopedRow(tenant, { tenant_id: "tenant-b" }),
        "resource_foreign_tenant",
      );
    },
  },
  {
    name: "missing tenant identity is denied",
    run: async () => {
      await expectWriterError(
        () => assertTenantScopedRow(tenant, { tenant_id: null }),
        "resource_missing_tenant_id",
      );
    },
  },
  {
    name: "tenant-scoped collections reject one foreign row",
    run: async () => {
      await expectWriterError(
        () =>
          assertTenantScopedCollection(tenant, [
            { tenant_id: tenant.id },
            { tenant_id: "tenant-b" },
          ]),
        "resource_foreign_tenant",
      );
    },
  },
  {
    name: "direct public lead input is strict and has no tenant or manager authority",
    run: async () => {
      const source = read("src/lib/api/catalogo.functions.ts");
      const block = section(source, "const publicLeadSchema");
      assert(block.includes(".strict()"), "public lead schema is not strict");
      assert(!block.includes("notificar_gestores"), "client still controls manager notification");
      assert(!block.includes("tenantId"), "public lead accepts tenantId");
      assert(!block.includes("tenant_id: z"), "public lead accepts tenant_id");
      assert(block.includes("requirePublicWriterTenantFromRequest"), "Host authority is missing");
      assert(block.includes("writePublicLead"), "direct lead bypasses shared writer");
    },
  },
  {
    name: "shared lead writer scopes every resource and writes explicit tenant",
    run: async () => {
      const source = read("src/lib/public-writers/public-lead-writer.server.ts");
      assert(source.includes('.eq("tenant_id", tenant.id)'), "lead resource queries are not tenant-bound");
      assert(source.includes(".limit(2)"), "lead resource cardinality is not explicit");
      assert(source.includes("tenant_id: tenant.id"), "lead insert omits explicit tenant_id");
      assert(!source.includes("create_manual_lead"), "public writer calls authenticated Lead RPC");
      assert(!source.includes("notificar_gestores"), "shared writer accepts client notification policy");
    },
  },
  {
    name: "public form read and submission are Host-bound with explicit cardinality",
    run: async () => {
      const source = read("src/lib/api/forms.functions.ts");
      const publicBlock = section(source, "// PUBLIC — leitura de form publicado");
      assert(publicBlock.includes("requirePublicWriterTenantFromRequest"), "form surface bypasses Host authority");
      assert(publicBlock.includes('.eq("tenant_id", input.tenant.id)'), "form query is not tenant-bound");
      assert(publicBlock.includes('.eq("slug", input.slug)'), "form slug filter missing");
      assert(publicBlock.includes('.eq("status", "published")'), "published form filter missing");
      assert(publicBlock.includes(".limit(2)"), "form cardinality does not read at most two rows");
      assert(!publicBlock.includes(".maybeSingle()"), "public form still uses maybeSingle");
      assert(!publicBlock.includes(".single()"), "public form still uses single");
    },
  },
  {
    name: "public form fields use accepted tenant and form identities",
    run: async () => {
      const source = read("src/lib/api/forms.functions.ts");
      const block = section(source, "async function loadPublicFields", "export const obterFormPublicoPorSlug");
      assert(block.includes('.eq("tenant_id", input.tenant.id)'), "field query omits accepted tenant");
      assert(block.includes('.eq("form_id", input.formId)'), "field query omits accepted form");
      assert(block.includes("assertTenantScopedCollection"), "field rows are not post-validated");
    },
  },
  {
    name: "campaign event writer rejects client tenant transport",
    run: async () => {
      const source = read("src/lib/api/campaigns.functions.ts");
      const block = section(source, "const publicCampaignEventSchema");
      assert(block.includes(".strict()"), "campaign event schema is not strict");
      assert(!block.includes("tenantId"), "campaign event accepts tenantId");
      assert(!block.includes("x-tenant-id"), "campaign event creates tenant header");
      assert(block.includes("requirePublicWriterTenantFromRequest"), "campaign event lacks Host authority");
      assert(block.includes("recordPublicCampaignEvent"), "campaign event bypasses shared writer");
      const writer = read("src/lib/public-writers/public-campaign-writer.server.ts");
      assert(writer.includes('.eq("tenant_id", tenant.id)'), "campaign lookup is not tenant-bound");
      assert(writer.includes('.eq("status", "active")'), "inactive campaign can be accepted");
      assert(writer.includes("tenant_id: tenant.id"), "campaign event insert omits tenant_id");
    },
  },
  {
    name: "Meta CAPI resolves Host before credential lookup or transport handling",
    run: async () => {
      const source = read("src/lib/api/meta.functions.ts");
      const block = section(source, "export const enviarEventoMetaCAPI");
      const authorityIndex = block.indexOf("requirePublicWriterTenantFromRequest");
      const tryIndex = block.indexOf("try {");
      assert(authorityIndex >= 0, "Meta CAPI lacks Host authority");
      assert(tryIndex > authorityIndex, "Meta CAPI catches or bypasses Host authority failure");
      assert(block.includes("loadPublicMetaCredentials"), "Meta CAPI bypasses tenant-bound credentials");
      assert(!block.includes('.eq("key", "meta_integracao").maybeSingle'), "Meta CAPI retains global credential lookup");
    },
  },
  {
    name: "portal connector authority is exact and fail-closed",
    run: async () => {
      const source = read("src/lib/public-writers/public-writer-authority.server.ts");
      const block = section(source, "export async function resolvePortalConnectorAuthority", "export async function resolvePortalConnectorForTenant");
      assert(block.includes('.eq("feed_token", input.token)'), "portal token filter missing");
      assert(block.includes('.eq("portal_slug", portalSlug)'), "portal slug filter missing");
      assert(block.includes(".limit(2)"), "connector query does not read at most two rows");
      assert(!block.includes(".maybeSingle()"), "connector authority still uses maybeSingle");
      assert(!block.includes(".single()"), "connector authority still uses single");
    },
  },
  {
    name: "portal immediate ingestion contains no second lead writer",
    run: async () => {
      const source = read("src/routes/api/public/portal-leads.ts");
      assert(source.includes("resolvePortalConnectorAuthority"), "portal route bypasses connector authority");
      assert(source.includes("ingestPortalLead"), "portal route bypasses shared portal writer");
      assert(!source.includes('.from("leads")'), "portal route retains direct lead insertion");
      assert(!source.includes(".maybeSingle()"), "portal route retains implicit singleton authority");
    },
  },
  {
    name: "portal property id and code are both tenant-bound",
    run: async () => {
      const source = read("src/lib/public-writers/portal-writer.server.ts");
      const idBlock = section(source, "async function resolvePropertyById", "async function resolvePropertyByCode");
      const codeBlock = section(source, "async function resolvePropertyByCode", "export async function resolvePortalProperty");
      assert(idBlock.includes('.eq("tenant_id", connector.tenant.id)'), "property id lookup is not tenant-bound");
      assert(idBlock.includes('.eq("id", id)'), "property id filter missing");
      assert(idBlock.includes(".limit(2)"), "property id cardinality missing");
      assert(codeBlock.includes('.eq("tenant_id", connector.tenant.id)'), "property code lookup is not tenant-bound");
      assert(codeBlock.includes('.eq("codigo", codigo)'), "property code filter missing");
      assert(codeBlock.includes(".limit(2)"), "property code cardinality missing");
      assert(source.includes("byId.id !== byCode.id"), "conflicting id/code is not rejected");
    },
  },
  {
    name: "portal feed uses accepted connector for business and operational writes",
    run: async () => {
      const route = read("src/routes/api/public/feeds.$portal.$token.ts");
      assert(route.includes("resolvePortalConnectorAuthority"), "feed bypasses connector authority");
      assert(route.includes("loadPortalFeedSnapshot"), "feed bypasses shared read boundary");
      assert(route.includes("recordPortalFeedSuccess"), "feed bypasses shared operational writer");
      assert(!route.includes(".maybeSingle()"), "feed route retains implicit connector singleton");
      const writer = read("src/lib/public-writers/portal-writer.server.ts");
      assert(writer.includes('.eq("tenant_id", connector.tenant.id)'), "feed queries are not tenant-bound");
      assert(writer.includes("portal_link_state_ambiguous"), "ambiguous link state has no fail-closed branch");
    },
  },
  {
    name: "DLQ replay preserves hook auth and uses the immediate writer",
    run: async () => {
      const source = read("src/routes/api/public/hooks/portal-dlq-retry.ts");
      assert(source.includes("const authorized = (anon && apikey === anon) || (cronSecret && provided === cronSecret);"), "DLQ hook authentication changed");
      assert(source.includes("resolvePortalConnectorForTenant"), "DLQ does not revalidate persisted connector authority");
      assert(source.includes("ingestPortalLead"), "DLQ replay bypasses immediate writer");
      assert(!source.includes('.from("leads")'), "DLQ retains direct lead insertion");
      assert(source.includes("portal_dlq_mark_retry"), "DLQ retry binding was removed");
      assert(source.includes("portal_dlq_mark_resolved"), "DLQ resolution binding was removed");
    },
  },
  {
    name: "public site consumers no longer send manager authority",
    run: async () => {
      assert(!read("src/routes/contato.tsx").includes("notificar_gestores"), "contact route sends manager policy");
      assert(!read("src/routes/anuncie.tsx").includes("notificar_gestores"), "advertise route sends manager policy");
    },
  },
];

export async function runPublicTenantWriterAuthoritySpecs(): Promise<{
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
