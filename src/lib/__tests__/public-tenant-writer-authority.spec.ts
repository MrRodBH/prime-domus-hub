import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertTenantScopedCollection,
  assertTenantScopedRow,
  type PortalConnectorAuthority,
  PublicWriterError,
  requirePublicWriterTenantFromRequest,
  resolvePortalConnectorAuthority,
  selectExactlyOneRow,
  selectExactlyOneTenantScopedRow,
} from "../public-writers/public-writer-authority.server";
import { writePublicLead } from "../public-writers/public-lead-writer.server";
import {
  loadPublicMetaCredentials,
  recordPublicCampaignEvent,
} from "../public-writers/public-campaign-writer.server";
import {
  decidePortalFeedLinkSelection,
  loadPortalFeedSnapshot,
  resolvePortalProperty,
} from "../public-writers/portal-writer.server";

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

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
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

type MockCall = {
  table: string;
  method: string;
  url: URL;
  body: unknown;
};

type MockPlan = {
  table: string;
  method?: string;
  match?: (call: MockCall) => boolean;
  data?: unknown;
  status?: number;
  errorMessage?: string;
};

let plans: MockPlan[] = [];
let calls: MockCall[] = [];
let serverReady: Promise<void> | null = null;

async function ensureMockPostgrest(): Promise<void> {
  if (serverReady) return serverReady;
  serverReady = (async () => {
    const server = createServer(async (request, response) => {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const raw = Buffer.concat(chunks).toString("utf8");
        let body: unknown = null;
        if (raw) {
          try {
            body = JSON.parse(raw);
          } catch {
            body = raw;
          }
        }
        const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
        const table = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
        const call: MockCall = {
          table,
          method: request.method ?? "GET",
          url,
          body,
        };
        calls.push(call);
        const index = plans.findIndex(
          (plan) =>
            plan.table === call.table &&
            (!plan.method || plan.method === call.method) &&
            (!plan.match || plan.match(call)),
        );
        if (index < 0) {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify({ message: `Unexpected mock request: ${call.method} ${url.pathname}${url.search}` }));
          return;
        }
        const [plan] = plans.splice(index, 1);
        response.statusCode = plan.status ?? (call.method === "GET" ? 200 : 201);
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify(
            response.statusCode >= 400
              ? { message: plan.errorMessage ?? "mock database error" }
              : (plan.data ?? []),
          ),
        );
      } catch (error) {
        response.statusCode = 500;
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
      }
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    server.unref();
    const address = server.address();
    assert(address && typeof address === "object", "mock PostgREST address unavailable");
    process.env.SUPABASE_URL = `http://127.0.0.1:${(address as AddressInfo).port}`;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "ptw-01-test-service-role";
  })();
  return serverReady;
}

async function scenario(next: MockPlan[]): Promise<void> {
  await ensureMockPostgrest();
  plans = [...next];
  calls = [];
}

function callsFor(table: string, method?: string): MockCall[] {
  return calls.filter((call) => call.table === table && (!method || call.method === method));
}

function eq(call: MockCall, key: string, value: string): boolean {
  return call.url.searchParams.get(key) === `eq.${value}`;
}

function assertConsumed(): void {
  assert(plans.length === 0, `unconsumed plans: ${plans.map((p) => p.table).join(", ")}`);
}

const tenant = Object.freeze({ id: "tenant-a" });
const connector: PortalConnectorAuthority = Object.freeze({
  id: "connector-a",
  portalSlug: "zap",
  tenant,
  active: true,
});

function acceptedRow(id: string, extra: Record<string, unknown> = {}) {
  return { id, tenant_id: tenant.id, ...extra };
}

async function explicitTenantMatrix(resource: string): Promise<void> {
  await expectWriterError(() => selectExactlyOneTenantScopedRow(tenant, []), "resource_not_found");
  const row = acceptedRow(`${resource}-accepted`);
  assert(selectExactlyOneTenantScopedRow(tenant, [row]) === row, `${resource}: row identity changed`);
  await expectWriterError(
    () => selectExactlyOneTenantScopedRow(tenant, [acceptedRow(`${resource}-a`), acceptedRow(`${resource}-b`)]),
    "resource_ambiguous",
  );
  await expectWriterError(
    () => selectExactlyOneTenantScopedRow(tenant, [{ id: `${resource}-foreign`, tenant_id: "tenant-b" }]),
    "resource_foreign_tenant",
  );
  await expectWriterError(
    () => selectExactlyOneTenantScopedRow(tenant, [{ id: `${resource}-missing`, tenant_id: null }]),
    "resource_missing_tenant_id",
  );
}

function leadCommand(overrides: Record<string, unknown> = {}) {
  return {
    nome: "Pessoa Teste",
    email: "pessoa@example.com",
    origem: "ptw-01-test",
    notificationMode: "none" as const,
    ...overrides,
  };
}

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "authority primitives preserve identity and reject 0/N/foreign/missing tenant",
    run: async () => {
      const row = acceptedRow("resource-a");
      assert(selectExactlyOneRow([row]) === row, "accepted row identity changed");
      assert(selectExactlyOneTenantScopedRow(tenant, [row]) === row, "tenant row identity changed");
      await expectWriterError(() => selectExactlyOneRow([]), "resource_not_found");
      await expectWriterError(() => selectExactlyOneRow([{ id: "a" }, { id: "b" }]), "resource_ambiguous");
      await expectWriterError(() => assertTenantScopedRow(tenant, { tenant_id: "tenant-b" }), "resource_foreign_tenant");
      await expectWriterError(() => assertTenantScopedRow(tenant, { tenant_id: null }), "resource_missing_tenant_id");
      await expectWriterError(
        () => assertTenantScopedCollection(tenant, [{ tenant_id: tenant.id }, { tenant_id: "tenant-b" }]),
        "resource_foreign_tenant",
      );
    },
  },
  {
    name: "Host failure prevents service-role access",
    run: async () => {
      await scenario([]);
      await expectWriterError(() => requirePublicWriterTenantFromRequest(), "public_tenant_unresolved");
      assert(calls.length === 0, "Host failure reached PostgREST");
    },
  },
  {
    name: "direct lead property matrix is executable and tenant-bound",
    run: async () => {
      await scenario([{ table: "imoveis", method: "GET", data: [] }]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ imovelId: "missing" }) }),
        "resource_not_found",
      );
      assert(callsFor("leads", "POST").length === 0, "missing property reached insert");

      await scenario([{ table: "imoveis", method: "GET", data: [acceptedRow("a"), acceptedRow("b")] }]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ imovelId: "ambiguous" }) }),
        "resource_ambiguous",
      );

      await scenario([{ table: "imoveis", method: "GET", data: [{ id: "foreign", tenant_id: "tenant-b" }] }]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ imovelId: "foreign" }) }),
        "resource_foreign_tenant",
      );

      await scenario([{ table: "imoveis", method: "GET", data: [{ id: "missing-tenant", tenant_id: null }] }]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ imovelId: "missing-tenant" }) }),
        "resource_missing_tenant_id",
      );

      await scenario([
        {
          table: "imoveis",
          method: "GET",
          data: [{ id: "property-ok", tenant_id: tenant.id, corretor_id: null, codigo: "P-1", titulo: "Property" }],
        },
        { table: "leads", method: "POST", data: [] },
      ]);
      const result = await writePublicLead({ tenant, command: leadCommand({ imovelId: "property-ok" }) });
      const insert = callsFor("leads", "POST")[0].body as Record<string, unknown>;
      assert(result.tenantId === tenant.id && result.imovelId === "property-ok", "accepted property identity lost");
      assert(eq(callsFor("imoveis", "GET")[0], "tenant_id", tenant.id), "property query tenant mismatch");
      assert(insert.tenant_id === tenant.id && insert.imovel_id === "property-ok", "lead insert authority mismatch");
      assertConsumed();
    },
  },
  {
    name: "direct lead launch and broker matrices are executable and tenant-bound",
    run: async () => {
      await scenario([{ table: "launch_projects", method: "GET", data: [] }]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ launchProjectId: "missing" }) }),
        "resource_not_found",
      );
      await scenario([{ table: "launch_projects", method: "GET", data: [acceptedRow("a"), acceptedRow("b")] }]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ launchProjectId: "ambiguous" }) }),
        "resource_ambiguous",
      );
      await scenario([{ table: "launch_projects", method: "GET", data: [{ id: "foreign", tenant_id: "tenant-b" }] }]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ launchProjectId: "foreign" }) }),
        "resource_foreign_tenant",
      );
      await scenario([{ table: "launch_projects", method: "GET", data: [{ id: "missing-tenant", tenant_id: null }] }]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ launchProjectId: "missing-tenant" }) }),
        "resource_missing_tenant_id",
      );

      await scenario([
        {
          table: "imoveis",
          method: "GET",
          data: [{ id: "property-broker", tenant_id: tenant.id, corretor_id: "broker-1", codigo: "P", titulo: "P" }],
        },
        {
          table: "corretores",
          method: "GET",
          data: [{ id: "broker-1", tenant_id: "tenant-b", user_id: "user-b" }],
        },
      ]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ imovelId: "property-broker" }) }),
        "resource_foreign_tenant",
      );
      assert(callsFor("leads", "POST").length === 0, "foreign broker reached insert");

      await scenario([
        {
          table: "launch_projects",
          method: "GET",
          data: [{ id: "launch-ok", tenant_id: tenant.id, corretor_id: null, nome: "Launch" }],
        },
        { table: "leads", method: "POST", data: [] },
      ]);
      const accepted = await writePublicLead({ tenant, command: leadCommand({ launchProjectId: "launch-ok" }) });
      assert(accepted.launchProjectId === "launch-ok", "accepted launch identity lost");
      assertConsumed();
    },
  },
  {
    name: "lead adapter and recipient queries preserve server authority",
    run: async () => {
      const adapter = section(read("src/lib/api/catalogo.functions.ts"), "const publicLeadSchema");
      assert(adapter.includes(".strict()"), "public lead schema is not strict");
      assert(!adapter.includes("notificar_gestores"), "client controls manager policy");
      assert(!adapter.includes("tenantId") && !adapter.includes("tenant_id: z"), "client tenant input remains");
      assert(adapter.indexOf("requirePublicWriterTenantFromRequest") < adapter.indexOf("writePublicLead"), "Host authority ordering invalid");
      const writer = read("src/lib/public-writers/public-lead-writer.server.ts");
      assert(writer.includes('.eq("membership_status", "active")'), "active membership filter missing");
      assert(writer.includes('.in("tenant_role", ["owner", "admin"])'), "manager role filter missing");
      assert(writer.includes("tenant_id: tenant.id"), "explicit tenant insert missing");
      assert(!writer.includes("create_manual_lead") && !writer.includes("notificar_gestores"), "forbidden lead authority remains");
    },
  },
  {
    name: "form 0/1/N/foreign/missing matrix and field binding use accepted authority",
    run: async () => {
      await explicitTenantMatrix("form");
      const source = read("src/lib/api/forms.functions.ts");
      const publicBlock = section(source, "// PUBLIC — leitura de form publicado");
      assert(publicBlock.includes("requirePublicWriterTenantFromRequest"), "form Host authority missing");
      assert(publicBlock.includes('.eq("tenant_id", input.tenant.id)'), "form tenant filter missing");
      assert(publicBlock.includes('.eq("slug", input.slug)') && publicBlock.includes('.eq("status", "published")'), "form identity filter incomplete");
      assert(publicBlock.includes(".limit(2)") && !publicBlock.includes(".maybeSingle()"), "form cardinality implicit");
      const fields = section(source, "async function loadPublicFields", "export const obterFormPublicoPorSlug");
      assert(fields.includes('.eq("tenant_id", input.tenant.id)') && fields.includes('.eq("form_id", input.formId)'), "fields not tenant+form bound");
      const submit = section(source, "export const submeterFormulario");
      assert(submit.includes("tenant_id: tenant.id") && submit.includes("form_id: form.id"), "submission authority mismatch");
      assert(submit.includes("tenant,"), "form-derived lead does not reuse tenant object");
    },
  },
  {
    name: "campaign missing/inactive/foreign/ambiguous/accepted matrix is executable",
    run: async () => {
      await scenario([{ table: "cms_campaigns", method: "GET", data: [] }]);
      await expectWriterError(
        () => recordPublicCampaignEvent({ tenant, event: { campaign_id: "missing", tipo: "click" } }),
        "resource_not_found",
      );
      assert(eq(callsFor("cms_campaigns", "GET")[0], "status", "active"), "active campaign filter missing");
      assert(callsFor("cms_campaign_events", "POST").length === 0, "missing/inactive campaign reached insert");

      await scenario([{ table: "cms_campaigns", method: "GET", data: [{ id: "foreign", tenant_id: "tenant-b", status: "active" }] }]);
      await expectWriterError(
        () => recordPublicCampaignEvent({ tenant, event: { campaign_id: "foreign", tipo: "click" } }),
        "resource_foreign_tenant",
      );
      await scenario([
        {
          table: "cms_campaigns",
          method: "GET",
          data: [acceptedRow("campaign-a", { status: "active" }), acceptedRow("campaign-b", { status: "active" })],
        },
      ]);
      await expectWriterError(
        () => recordPublicCampaignEvent({ tenant, event: { campaign_id: "ambiguous", tipo: "click" } }),
        "resource_ambiguous",
      );
      await scenario([
        { table: "cms_campaigns", method: "GET", data: [acceptedRow("campaign-ok", { status: "active" })] },
        { table: "cms_campaign_events", method: "POST", data: [] },
      ]);
      await recordPublicCampaignEvent({ tenant, event: { campaign_id: "campaign-ok", tipo: "impression" } });
      const event = callsFor("cms_campaign_events", "POST")[0].body as Record<string, unknown>;
      assert(event.tenant_id === tenant.id && event.campaign_id === "campaign-ok", "campaign event authority mismatch");
      assertConsumed();
    },
  },
  {
    name: "campaign and Meta public adapters reject client tenant authority",
    run: async () => {
      const campaignSource = read("src/lib/api/campaigns.functions.ts");
      const campaignSchema = section(campaignSource, "const publicCampaignEventSchema", "export const registrarEventoCampanha");
      const campaignWriter = withoutComments(section(campaignSource, "export const registrarEventoCampanha"));
      assert(campaignSchema.includes(".strict()") && !campaignSchema.includes("tenantId"), "campaign schema accepts tenant");
      assert(!campaignWriter.includes("tenantId") && !campaignWriter.includes("publicClient") && !campaignWriter.includes("x-tenant-id"), "campaign executable tenant transport remains");
      const meta = section(read("src/lib/api/meta.functions.ts"), "export const enviarEventoMetaCAPI");
      assert(meta.indexOf("requirePublicWriterTenantFromRequest") < meta.indexOf("try {"), "Meta catches Host failure");
      assert(meta.includes("loadPublicMetaCredentials"), "Meta bypasses tenant credentials");
    },
  },
  {
    name: "Meta credentials execute 0/1/N/foreign/missing matrices",
    run: async () => {
      const integration = (call: MockCall) => eq(call, "key", "meta_integracao");
      const credentials = (call: MockCall) => eq(call, "key", "meta_credenciais");
      await scenario([
        { table: "site_settings", method: "GET", match: integration, data: [] },
        { table: "site_settings", method: "GET", match: credentials, data: [] },
      ]);
      const zero = await loadPublicMetaCredentials(tenant);
      assert(zero.pixelId === null && zero.token === null, "zero Meta rows not handled");

      await scenario([
        { table: "site_settings", method: "GET", match: integration, data: [{ tenant_id: tenant.id, key: "meta_integracao", value: { pixel_id: "pixel" } }] },
        { table: "site_settings", method: "GET", match: credentials, data: [{ tenant_id: tenant.id, key: "meta_credenciais", value: { conversions_api_token: "token" } }] },
      ]);
      const one = await loadPublicMetaCredentials(tenant);
      assert(one.pixelId === "pixel" && one.token === "token", "accepted Meta rows lost");

      await scenario([
        { table: "site_settings", method: "GET", match: integration, data: [acceptedRow("a", { key: "meta_integracao", value: {} }), acceptedRow("b", { key: "meta_integracao", value: {} })] },
        { table: "site_settings", method: "GET", match: credentials, data: [] },
      ]);
      await expectWriterError(() => loadPublicMetaCredentials(tenant), "resource_ambiguous");
      await scenario([
        { table: "site_settings", method: "GET", match: integration, data: [{ tenant_id: "tenant-b", key: "meta_integracao", value: {} }] },
        { table: "site_settings", method: "GET", match: credentials, data: [] },
      ]);
      await expectWriterError(() => loadPublicMetaCredentials(tenant), "resource_foreign_tenant");
      await scenario([
        { table: "site_settings", method: "GET", match: integration, data: [{ tenant_id: null, key: "meta_integracao", value: {} }] },
        { table: "site_settings", method: "GET", match: credentials, data: [] },
      ]);
      await expectWriterError(() => loadPublicMetaCredentials(tenant), "resource_missing_tenant_id");
    },
  },
  {
    name: "portal connector executes 0/active/inactive/N outcomes",
    run: async () => {
      const input = { portalSlug: "zap", token: "0123456789abcdef" };
      await scenario([{ table: "portal_connectors", method: "GET", data: [] }]);
      await expectWriterError(() => resolvePortalConnectorAuthority(input), "portal_connector_invalid");
      await scenario([{ table: "portal_connectors", method: "GET", data: [{ id: "ok", tenant_id: tenant.id, portal_slug: "zap", ativo: true }] }]);
      assert((await resolvePortalConnectorAuthority(input)).active, "active connector rejected");
      await scenario([{ table: "portal_connectors", method: "GET", data: [{ id: "off", tenant_id: tenant.id, portal_slug: "zap", ativo: false }] }]);
      await expectWriterError(() => resolvePortalConnectorAuthority(input), "portal_connector_inactive");
      await scenario([{ table: "portal_connectors", method: "GET", data: [{ id: "a", tenant_id: tenant.id, portal_slug: "zap", ativo: true }, { id: "b", tenant_id: tenant.id, portal_slug: "zap", ativo: true }] }]);
      await expectWriterError(() => resolvePortalConnectorAuthority(input), "portal_connector_ambiguous");
    },
  },
  {
    name: "portal property ID/code are tenant-bound and conflicting references fail",
    run: async () => {
      await scenario([{ table: "imoveis", method: "GET", match: (call) => eq(call, "id", "id-1"), data: [{ id: "id-1", tenant_id: tenant.id, codigo: "C-1", corretor_id: null }] }]);
      assert((await resolvePortalProperty({ connector, imovelId: "id-1" }))?.id === "id-1", "ID lookup failed");
      await scenario([{ table: "imoveis", method: "GET", match: (call) => eq(call, "codigo", "C-1"), data: [{ id: "id-1", tenant_id: tenant.id, codigo: "C-1", corretor_id: null }] }]);
      assert((await resolvePortalProperty({ connector, codigo: "C-1" }))?.id === "id-1", "code lookup failed");
      await scenario([{ table: "imoveis", method: "GET", data: [{ id: "foreign", tenant_id: "tenant-b", codigo: "F", corretor_id: null }] }]);
      await expectWriterError(() => resolvePortalProperty({ connector, imovelId: "foreign" }), "resource_foreign_tenant");
      await scenario([
        { table: "imoveis", method: "GET", match: (call) => eq(call, "id", "id-a"), data: [{ id: "id-a", tenant_id: tenant.id, codigo: "A", corretor_id: null }] },
        { table: "imoveis", method: "GET", match: (call) => eq(call, "codigo", "B"), data: [{ id: "id-b", tenant_id: tenant.id, codigo: "B", corretor_id: null }] },
      ]);
      await expectWriterError(() => resolvePortalProperty({ connector, imovelId: "id-a", codigo: "B" }), "writer_input_invalid");
    },
  },
  {
    name: "portal feed executes zero, explicit and no-property modes",
    run: async () => {
      assert(decidePortalFeedLinkSelection(connector, []).mode === "all_active_tenant_properties", "zero-link mode wrong");
      assert(
        decidePortalFeedLinkSelection(connector, [{ tenant_id: tenant.id, portal_slug: "zap", imovel_id: "p1", status: "ativo" }]).mode === "explicit_property_ids",
        "eligible-link mode wrong",
      );
      assert(
        decidePortalFeedLinkSelection(connector, [{ tenant_id: tenant.id, portal_slug: "zap", imovel_id: "p1", status: "inativo" }]).mode === "no_properties",
        "noneligible link triggered fallback",
      );

      const tenantRow = { id: tenant.id, nome: "Tenant" };
      const property = { id: "p1", tenant_id: tenant.id, status: "ativo", bairros: { nome: "Centro" } };
      await scenario([
        { table: "tenants", method: "GET", data: [tenantRow] },
        { table: "imovel_portais", method: "GET", data: [] },
        { table: "imoveis", method: "GET", data: [property] },
        { table: "imovel_imagens", method: "GET", data: [] },
      ]);
      assert((await loadPortalFeedSnapshot({ connector })).properties.length === 1, "zero total links did not load all active");
      assert(callsFor("imoveis", "GET")[0].url.searchParams.get("id") === null, "zero-link query constrained IDs");

      await scenario([
        { table: "tenants", method: "GET", data: [tenantRow] },
        { table: "imovel_portais", method: "GET", data: [{ tenant_id: tenant.id, portal_slug: "zap", imovel_id: "p1", status: "publicado" }] },
        { table: "imoveis", method: "GET", data: [property] },
        { table: "imovel_imagens", method: "GET", data: [] },
      ]);
      assert((await loadPortalFeedSnapshot({ connector })).properties.length === 1, "explicit link did not load property");
      assert(callsFor("imoveis", "GET")[0].url.searchParams.get("id")?.startsWith("in."), "explicit link did not constrain IDs");

      await scenario([
        { table: "tenants", method: "GET", data: [tenantRow] },
        { table: "imovel_portais", method: "GET", data: [{ tenant_id: tenant.id, portal_slug: "zap", imovel_id: "p1", status: "erro" }] },
      ]);
      assert((await loadPortalFeedSnapshot({ connector })).properties.length === 0, "noneligible links returned properties");
      assert(callsFor("imoveis", "GET").length === 0, "noneligible links triggered all-property query");
    },
  },
  {
    name: "portal feed rejects duplicate, foreign, unexpected, unsupported and unavailable links",
    run: async () => {
      await expectWriterError(
        () => decidePortalFeedLinkSelection(connector, [
          { tenant_id: tenant.id, portal_slug: "zap", imovel_id: "dup", status: "ativo" },
          { tenant_id: tenant.id, portal_slug: "zap", imovel_id: "dup", status: "publicado" },
        ]),
        "portal_link_state_ambiguous",
      );
      await expectWriterError(
        () => decidePortalFeedLinkSelection(connector, [{ tenant_id: "tenant-b", portal_slug: "zap", imovel_id: "f", status: "ativo" }]),
        "resource_foreign_tenant",
      );
      await expectWriterError(
        () => decidePortalFeedLinkSelection(connector, [{ tenant_id: tenant.id, portal_slug: "olx", imovel_id: "x", status: "ativo" }]),
        "resource_foreign_tenant",
      );
      await expectWriterError(
        () => decidePortalFeedLinkSelection(connector, [{ tenant_id: tenant.id, portal_slug: "zap", imovel_id: "x", status: "unknown" }]),
        "portal_link_state_ambiguous",
      );
      await scenario([
        { table: "tenants", method: "GET", data: [{ id: tenant.id, nome: "Tenant" }] },
        { table: "imovel_portais", method: "GET", data: [{ tenant_id: tenant.id, portal_slug: "zap", imovel_id: "missing", status: "ativo" }] },
        { table: "imoveis", method: "GET", data: [] },
      ]);
      await expectWriterError(() => loadPortalFeedSnapshot({ connector }), "portal_link_state_ambiguous");
    },
  },
  {
    name: "immediate and replay paths share one writer and preserve frozen auth",
    run: async () => {
      const immediate = read("src/routes/api/public/portal-leads.ts");
      const replay = read("src/routes/api/public/hooks/portal-dlq-retry.ts");
      assert(immediate.includes("ingestPortalLead") && replay.includes("ingestPortalLead"), "single writer path missing");
      assert(!immediate.includes('.from("leads")') && !replay.includes('.from("leads")'), "parallel lead writer remains");
      assert(replay.includes("resolvePortalConnectorForTenant"), "replay tenant revalidation missing");
      assert(replay.includes("portal_dlq_mark_retry") && replay.includes("portal_dlq_mark_resolved"), "DLQ item binding missing");
      assert(
        replay.includes("const authorized = (anon && apikey === anon) || (cronSecret && provided === cronSecret);"),
        "DLQ hook authentication changed",
      );
      const writer = read("src/lib/public-writers/portal-writer.server.ts");
      assert(writer.includes("tenant_id: input.connector.tenant.id"), "lead log tenant mismatch");
      assert(writer.includes("tenant_id: connector.tenant.id"), "feed write tenant mismatch");
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
