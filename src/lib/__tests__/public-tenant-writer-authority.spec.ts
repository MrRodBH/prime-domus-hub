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
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
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

let mockPlans: MockPlan[] = [];
let mockCalls: MockCall[] = [];
let mockServerReady: Promise<void> | null = null;

function tableFromPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  return decodeURIComponent(parts.at(-1) ?? "");
}

async function ensureMockPostgrest(): Promise<void> {
  if (mockServerReady) return mockServerReady;

  mockServerReady = (async () => {
    const server = createServer(async (request, response) => {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const rawBody = Buffer.concat(chunks).toString("utf8");
        let body: unknown = null;
        if (rawBody) {
          try {
            body = JSON.parse(rawBody);
          } catch {
            body = rawBody;
          }
        }

        const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
        const call: MockCall = {
          table: tableFromPath(url.pathname),
          method: request.method ?? "GET",
          url,
          body,
        };
        mockCalls.push(call);

        const planIndex = mockPlans.findIndex(
          (plan) =>
            plan.table === call.table &&
            (!plan.method || plan.method === call.method) &&
            (!plan.match || plan.match(call)),
        );
        if (planIndex < 0) {
          response.statusCode = 500;
          response.setHeader("content-type", "application/json");
          response.end(
            JSON.stringify({
              message: `Unexpected mock request: ${call.method} ${call.url.pathname}${call.url.search}`,
            }),
          );
          return;
        }

        const [plan] = mockPlans.splice(planIndex, 1);
        response.statusCode = plan.status ?? (call.method === "GET" ? 200 : 201);
        response.setHeader("content-type", "application/json");
        if (response.statusCode >= 400) {
          response.end(JSON.stringify({ message: plan.errorMessage ?? "mock database error" }));
          return;
        }
        response.end(JSON.stringify(plan.data ?? []));
      } catch (error) {
        response.statusCode = 500;
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({ message: error instanceof Error ? error.message : String(error) }),
        );
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

  return mockServerReady;
}

async function setScenario(plans: MockPlan[]): Promise<void> {
  await ensureMockPostgrest();
  mockPlans = [...plans];
  mockCalls = [];
}

function callsFor(table: string, method?: string): MockCall[] {
  return mockCalls.filter(
    (call) => call.table === table && (!method || call.method === method),
  );
}

function assertScenarioConsumed(): void {
  assert(
    mockPlans.length === 0,
    `unconsumed mock plans: ${mockPlans.map((plan) => `${plan.method ?? "*"} ${plan.table}`).join(", ")}`,
  );
}

function eq(call: MockCall, key: string, value: string): boolean {
  return call.url.searchParams.get(key) === `eq.${value}`;
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

async function runExplicitTenantMatrix(resource: string): Promise<void> {
  await expectWriterError(
    () => selectExactlyOneTenantScopedRow(tenant, []),
    "resource_not_found",
  );
  const row = acceptedRow(`${resource}-accepted`);
  assert(
    selectExactlyOneTenantScopedRow(tenant, [row]) === row,
    `${resource}: accepted row identity changed`,
  );
  await expectWriterError(
    () =>
      selectExactlyOneTenantScopedRow(tenant, [
        acceptedRow(`${resource}-a`),
        acceptedRow(`${resource}-b`),
      ]),
    "resource_ambiguous",
  );
  await expectWriterError(
    () =>
      selectExactlyOneTenantScopedRow(tenant, [
        { id: `${resource}-foreign`, tenant_id: "tenant-b" },
      ]),
    "resource_foreign_tenant",
  );
  await expectWriterError(
    () =>
      selectExactlyOneTenantScopedRow(tenant, [
        { id: `${resource}-missing", tenant_id: null },
      ]),
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
    name: "zero and multiple authority rows fail closed",
    run: async () => {
      await expectWriterError(() => selectExactlyOneRow([]), "resource_not_found");
      assert(selectExactlyOneRow([], { allowZero: true }) === null, "optional zero did not return null");
      await expectWriterError(
        () => selectExactlyOneRow([{ id: "a" }, { id: "b" }]),
        "resource_ambiguous",
      );
    },
  },
  {
    name: "foreign and missing tenant identities fail closed",
    run: async () => {
      await expectWriterError(
        () => assertTenantScopedRow(tenant, { tenant_id: "tenant-b" }),
        "resource_foreign_tenant",
      );
      await expectWriterError(
        () => assertTenantScopedRow(tenant, { tenant_id: null }),
        "resource_missing_tenant_id",
      );
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
    name: "Host authority failure prevents every service-role request",
    run: async () => {
      await setScenario([]);
      await expectWriterError(
        () => requirePublicWriterTenantFromRequest(),
        "public_tenant_unresolved",
      );
      assert(mockCalls.length === 0, "Host failure reached PostgREST/service-role dependency");
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
      const authorityIndex = block.indexOf("requirePublicWriterTenantFromRequest");
      const writerIndex = block.indexOf("writePublicLead");
      assert(authorityIndex >= 0 && writerIndex > authorityIndex, "Host authority does not precede lead writer");
    },
  },
  {
    name: "property writer executes 0/1/N/foreign/missing-tenant outcomes",
    run: async () => {
      await setScenario([{ table: "imoveis", method: "GET", data: [] }]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ imovelId: "property-missing" }) }),
        "resource_not_found",
      );
      assert(callsFor("leads", "POST").length === 0, "missing property reached lead insert");

      await setScenario([
        {
          table: "imoveis",
          method: "GET",
          data: [acceptedRow("property-a"), acceptedRow("property-b")],
        },
      ]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ imovelId: "property-ambiguous" }) }),
        "resource_ambiguous",
      );

      await setScenario([
        {
          table: "imoveis",
          method: "GET",
          data: [{ id: "property-foreign", tenant_id: "tenant-b", corretor_id: null, codigo: null, titulo: null }],
        },
      ]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ imovelId: "property-foreign" }) }),
        "resource_foreign_tenant",
      );

      await setScenario([
        {
          table: "imoveis",
          method: "GET",
          data: [{ id: "property-no-tenant", tenant_id: null, corretor_id: null, codigo: null, titulo: null }],
        },
      ]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ imovelId: "property-no-tenant" }) }),
        "resource_missing_tenant_id",
      );

      await setScenario([
        {
          table: "imoveis",
          method: "GET",
          data: [{ id: "property-ok", tenant_id: tenant.id, corretor_id: null, codigo: "P-1", titulo: "Property" }],
        },
        { table: "leads", method: "POST", data: [] },
      ]);
      const result = await writePublicLead({
        tenant,
        command: leadCommand({ imovelId: "property-ok" }),
      });
      assert(result.tenantId === tenant.id, "accepted tenant was not preserved in lead result");
      assert(result.imovelId === "property-ok", "accepted property was not preserved");
      const propertyQuery = callsFor("imoveis", "GET")[0];
      assert(eq(propertyQuery, "tenant_id", tenant.id), "property query used another tenant");
      const insertBody = callsFor("leads", "POST")[0]?.body as Record<string, unknown>;
      assert(insertBody.tenant_id === tenant.id, "lead insert omitted accepted tenant");
      assert(insertBody.imovel_id === "property-ok", "lead insert omitted accepted property");
      assertScenarioConsumed();
    },
  },
  {
    name: "launch writer executes 0/1/N/foreign/missing-tenant outcomes",
    run: async () => {
      await setScenario([{ table: "launch_projects", method: "GET", data: [] }]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ launchProjectId: "launch-missing" }) }),
        "resource_not_found",
      );

      await setScenario([
        {
          table: "launch_projects",
          method: "GET",
          data: [acceptedRow("launch-a"), acceptedRow("launch-b")],
        },
      ]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ launchProjectId: "launch-ambiguous" }) }),
        "resource_ambiguous",
      );

      await setScenario([
        {
          table: "launch_projects",
          method: "GET",
          data: [{ id: "launch-foreign", tenant_id: "tenant-b", corretor_id: null, nome: "Foreign" }],
        },
      ]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ launchProjectId: "launch-foreign" }) }),
        "resource_foreign_tenant",
      );

      await setScenario([
        {
          table: "launch_projects",
          method: "GET",
          data: [{ id: "launch-no-tenant", tenant_id: null, corretor_id: null, nome: "Missing" }],
        },
      ]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ launchProjectId: "launch-no-tenant" }) }),
        "resource_missing_tenant_id",
      );

      await setScenario([
        {
          table: "launch_projects",
          method: "GET",
          data: [{ id: "launch-ok", tenant_id: tenant.id, corretor_id: null, nome: "Launch" }],
        },
        { table: "leads", method: "POST", data: [] },
      ]);
      const result = await writePublicLead({
        tenant,
        command: leadCommand({ launchProjectId: "launch-ok" }),
      });
      assert(result.launchProjectId === "launch-ok", "accepted launch was not preserved");
      const insertBody = callsFor("leads", "POST")[0]?.body as Record<string, unknown>;
      assert(insertBody.tenant_id === tenant.id, "launch lead insert used another tenant");
      assert(insertBody.launch_project_id === "launch-ok", "launch lead insert omitted launch identity");
      assertScenarioConsumed();
    },
  },
  {
    name: "broker assignment is resolved only inside the accepted tenant",
    run: async () => {
      await setScenario([
        {
          table: "imoveis",
          method: "GET",
          data: [{ id: "property-broker", tenant_id: tenant.id, corretor_id: "broker-1", codigo: "P", titulo: "P" }],
        },
        {
          table: "corretores",
          method: "GET",
          data: [{ id: "broker-1", tenant_id: "tenant-b", user_id: "user-b", nome: "Foreign", email: "b@example.com" }],
        },
      ]);
      await expectWriterError(
        () => writePublicLead({ tenant, command: leadCommand({ imovelId: "property-broker" }) }),
        "resource_foreign_tenant",
      );
      assert(callsFor("leads", "POST").length === 0, "foreign broker reached lead insert");

      await setScenario([
        {
          table: "imoveis",
          method: "GET",
          data: [{ id: "property-broker", tenant_id: tenant.id, corretor_id: "broker-1", codigo: "P", titulo: "P" }],
        },
        {
          table: "corretores",
          method: "GET",
          data: [{ id: "broker-1", tenant_id: tenant.id, user_id: "user-a", nome: "Accepted", email: "a@example.com" }],
        },
        { table: "leads", method: "POST", data: [] },
      ]);
      const result = await writePublicLead({ tenant, command: leadCommand({ imovelId: "property-broker" }) });
      assert(result.corretorId === "broker-1", "accepted broker not assigned");
      assert(result.assignedTo === "user-a", "accepted broker user not assigned");
      const brokerQuery = callsFor("corretores", "GET")[0];
      assert(eq(brokerQuery, "tenant_id", tenant.id), "broker query used another tenant");
      assertScenarioConsumed();
    },
  },
  {
    name: "shared lead writer scopes recipients and writes explicit tenant",
    run: async () => {
      const source = read("src/lib/public-writers/public-lead-writer.server.ts");
      assert(source.includes('.eq("tenant_id", tenant.id)'), "lead resource queries are not tenant-bound");
      assert(source.includes('.eq("membership_status", "active")'), "inactive managers can be selected");
      assert(source.includes('.in("tenant_role", ["owner", "admin"])'), "manager role filter missing");
      assert(source.includes("tenant_id: tenant.id"), "lead insert omits explicit tenant_id");
      assert(!source.includes("create_manual_lead"), "public writer calls authenticated Lead RPC");
      assert(!source.includes("notificar_gestores"), "shared writer accepts client notification policy");
    },
  },
  {
    name: "form authority primitive executes 0/1/N/foreign/missing-tenant matrix",
    run: async () => {
      await runExplicitTenantMatrix("form");
      const source = read("src/lib/api/forms.functions.ts");
      const publicBlock = section(source, "// PUBLIC — leitura de form publicado");
      assert(publicBlock.includes("requirePublicWriterTenantFromRequest"), "form surface bypasses Host authority");
      assert(publicBlock.includes('.eq("tenant_id", input.tenant.id)'), "form query is not tenant-bound");
      assert(publicBlock.includes('.eq("slug", input.slug)'), "form slug filter missing");
      assert(publicBlock.includes('.eq("status", "published")'), "published form filter missing");
      assert(publicBlock.includes(".limit(2)"), "form cardinality does not read at most two rows");
      assert(!publicBlock.includes(".maybeSingle()"), "public form still uses maybeSingle");
    },
  },
  {
    name: "public form fields, lead and submission preserve tenant plus form authority",
    run: async () => {
      const source = read("src/lib/api/forms.functions.ts");
      const fields = section(source, "async function loadPublicFields", "export const obterFormPublicoPorSlug");
      assert(fields.includes('.eq("tenant_id", input.tenant.id)'), "field query omits accepted tenant");
      assert(fields.includes('.eq("form_id", input.formId)'), "field query omits accepted form");
      assert(fields.includes("assertTenantScopedCollection"), "field rows are not post-validated");
      const submit = section(source, "export const submeterFormulario");
      assert(submit.includes("tenant_id: tenant.id"), "submission omits accepted tenant");
      assert(submit.includes("form_id: form.id"), "submission omits accepted form");
      assert(submit.includes("tenant,"), "form-derived lead does not receive accepted tenant object");
    },
  },
  {
    name: "campaign writer executes missing/foreign/ambiguous/accepted outcomes",
    run: async () => {
      await setScenario([{ table: "cms_campaigns", method: "GET", data: [] }]);
      await expectWriterError(
        () => recordPublicCampaignEvent({ tenant, event: { campaign_id: "missing", tipo: "click" } }),
        "resource_not_found",
      );
      const missingQuery = callsFor("cms_campaigns", "GET")[0];
      assert(eq(missingQuery, "status", "active"), "inactive campaign filter missing at runtime");
      assert(callsFor("cms_campaign_events", "POST").length === 0, "inactive/missing campaign reached event insert");

      await setScenario([
        { table: "cms_campaigns", method: "GET", data: [{ id: "foreign", tenant_id: "tenant-b", status: "active" }] },
      ]);
      await expectWriterError(
        () => recordPublicCampaignEvent({ tenant, event: { campaign_id: "foreign", tipo: "click" } }),
        "resource_foreign_tenant",
      );

      await setScenario([
        {
          table: "cms_campaigns",
          method: "GET",
          data: [
            { id: "campaign-a", tenant_id: tenant.id, status: "active" },
            { id: "campaign-b", tenant_id: tenant.id, status: "active" },
          ],
        },
      ]);
      await expectWriterError(
        () => recordPublicCampaignEvent({ tenant, event: { campaign_id: "ambiguous", tipo: "click" } }),
        "resource_ambiguous",
      );

      await setScenario([
        { table: "cms_campaigns", method: "GET", data: [{ id: "campaign-ok", tenant_id: tenant.id, status: "active" }] },
        { table: "cms_campaign_events", method: "POST", data: [] },
      ]);
      await recordPublicCampaignEvent({
        tenant,
        event: { campaign_id: "campaign-ok", tipo: "impression", rota: "/p" },
      });
      const eventBody = callsFor("cms_campaign_events", "POST")[0]?.body as Record<string, unknown>;
      assert(eventBody.tenant_id === tenant.id, "campaign event omitted accepted tenant");
      assert(eventBody.campaign_id === "campaign-ok", "campaign event omitted accepted campaign");
      assertScenarioConsumed();
    },
  },
  {
    name: "campaign public adapter rejects client tenant transport",
    run: async () => {
      const source = read("src/lib/api/campaigns.functions.ts");
      const schemaBlock = section(source, "const publicCampaignEventSchema", "export const registrarEventoCampanha");
      const writerBlock = withoutComments(section(source, "export const registrarEventoCampanha"));
      assert(schemaBlock.includes(".strict()"), "campaign event schema is not strict");
      assert(!schemaBlock.includes("tenantId"), "campaign event schema accepts tenantId");
      assert(!writerBlock.includes("tenantId"), "campaign executable writer accepts tenantId");
      assert(!writerBlock.includes("publicClient"), "campaign executable writer creates public client");
      assert(!writerBlock.includes("x-tenant-id"), "campaign executable writer creates tenant header");
    },
  },
  {
    name: "Meta settings execute 0/1/N/foreign/missing-tenant matrices",
    run: async () => {
      const integrationMatch = (call: MockCall) => eq(call, "key", "meta_integracao");
      const credentialsMatch = (call: MockCall) => eq(call, "key", "meta_credenciais");

      await setScenario([
        { table: "site_settings", method: "GET", match: integrationMatch, data: [] },
        { table: "site_settings", method: "GET", match: credentialsMatch, data: [] },
      ]);
      assert(
        JSON.stringify(await loadPublicMetaCredentials(tenant)) === JSON.stringify({ pixelId: null, token: null }),
        "zero Meta settings did not return null credentials",
      );

      await setScenario([
        {
          table: "site_settings",
          method: "GET",
          match: integrationMatch,
          data: [{ tenant_id: tenant.id, key: "meta_integracao", value: { pixel_id: "pixel-1" } }],
        },
        {
          table: "site_settings",
          method: "GET",
          match: credentialsMatch,
          data: [{ tenant_id: tenant.id, key: "meta_credenciais", value: { conversions_api_token: "token-1" } }],
        },
      ]);
      const accepted = await loadPublicMetaCredentials(tenant);
      assert(accepted.pixelId === "pixel-1" && accepted.token === "token-1", "accepted Meta settings were not returned");

      await setScenario([
        {
          table: "site_settings",
          method: "GET",
          match: integrationMatch,
          data: [
            { tenant_id: tenant.id, key: "meta_integracao", value: {} },
            { tenant_id: tenant.id, key: "meta_integracao", value: {} },
          ],
        },
        { table: "site_settings", method: "GET", match: credentialsMatch, data: [] },
      ]);
      await expectWriterError(() => loadPublicMetaCredentials(tenant), "resource_ambiguous");

      await setScenario([
        {
          table: "site_settings",
          method: "GET",
          match: integrationMatch,
          data: [{ tenant_id: "tenant-b", key: "meta_integracao", value: {} }],
        },
        { table: "site_settings", method: "GET", match: credentialsMatch, data: [] },
      ]);
      await expectWriterError(() => loadPublicMetaCredentials(tenant), "resource_foreign_tenant");

      await setScenario([
        {
          table: "site_settings",
          method: "GET",
          match: integrationMatch,
          data: [{ tenant_id: null, key: "meta_integracao", value: {} }],
        },
        { table: "site_settings", method: "GET", match: credentialsMatch, data: [] },
      ]);
      await expectWriterError(() => loadPublicMetaCredentials(tenant), "resource_missing_tenant_id");
    },
  },
  {
    name: "Meta CAPI resolves Host before non-blocking transport handling",
    run: async () => {
      const source = read("src/lib/api/meta.functions.ts");
      const block = section(source, "export const enviarEventoMetaCAPI");
      const authorityIndex = block.indexOf("requirePublicWriterTenantFromRequest");
      const tryIndex = block.indexOf("try {");
      assert(authorityIndex >= 0, "Meta CAPI lacks Host authority");
      assert(tryIndex > authorityIndex, "Meta CAPI catches Host authority failure");
      assert(block.includes("loadPublicMetaCredentials"), "Meta CAPI bypasses tenant-bound credentials");
    },
  },
  {
    name: "portal connector executes 0/active/inactive/N outcomes",
    run: async () => {
      const input = { portalSlug: "zap", token: "0123456789abcdef" };

      await setScenario([{ table: "portal_connectors", method: "GET", data: [] }]);
      await expectWriterError(() => resolvePortalConnectorAuthority(input), "portal_connector_invalid");

      await setScenario([
        {
          table: "portal_connectors",
          method: "GET",
          data: [{ id: "connector-ok", tenant_id: tenant.id, portal_slug: "zap", ativo: true }],
        },
      ]);
      const accepted = await resolvePortalConnectorAuthority(input);
      assert(accepted.tenant.id === tenant.id && accepted.active, "active connector was not accepted");

      await setScenario([
        {
          table: "portal_connectors",
          method: "GET",
          data: [{ id: "connector-off", tenant_id: tenant.id, portal_slug: "zap", ativo: false }],
        },
      ]);
      await expectWriterError(() => resolvePortalConnectorAuthority(input), "portal_connector_inactive");

      await setScenario([
        {
          table: "portal_connectors",
          method: "GET",
          data: [
            { id: "connector-a", tenant_id: tenant.id, portal_slug: "zap", ativo: true },
            { id: "connector-b", tenant_id: tenant.id, portal_slug: "zap", ativo: true },
          ],
        },
      ]);
      await expectWriterError(() => resolvePortalConnectorAuthority(input), "portal_connector_ambiguous");
    },
  },
  {
    name: "portal property ID/code execute tenant-bound and conflict outcomes",
    run: async () => {
      await setScenario([
        {
          table: "imoveis",
          method: "GET",
          match: (call) => eq(call, "id", "property-id"),
          data: [{ id: "property-id", tenant_id: tenant.id, codigo: "CODE", corretor_id: null }],
        },
      ]);
      assert(
        (await resolvePortalProperty({ connector, imovelId: "property-id" }))?.id === "property-id",
        "tenant-bound property ID was not resolved",
      );

      await setScenario([
        {
          table: "imoveis",
          method: "GET",
          match: (call) => eq(call, "codigo", "CODE"),
          data: [{ id: "property-code", tenant_id: tenant.id, codigo: "CODE", corretor_id: null }],
        },
      ]);
      assert(
        (await resolvePortalProperty({ connector, codigo: "CODE" }))?.id === "property-code",
        "tenant-bound property code was not resolved",
      );

      await setScenario([
        {
          table: "imoveis",
          method: "GET",
          match: (call) => eq(call, "id", "foreign"),
          data: [{ id: "foreign", tenant_id: "tenant-b", codigo: "FOREIGN", corretor_id: null }],
        },
      ]);
      await expectWriterError(
        () => resolvePortalProperty({ connector, imovelId: "foreign" }),
        "resource_foreign_tenant",
      );

      await setScenario([
        {
          table: "imoveis",
          method: "GET",
          match: (call) => eq(call, "id", "id-a"),
          data: [{ id: "id-a", tenant_id: tenant.id, codigo: "A", corretor_id: null }],
        },
        {
          table: "imoveis",
          method: "GET",
          match: (call) => eq(call, "codigo", "B"),
          data: [{ id: "id-b", tenant_id: tenant.id, codigo: "B", corretor_id: null }],
        },
      ]);
      await expectWriterError(
        () => resolvePortalProperty({ connector, imovelId: "id-a", codigo: "B" }),
        "writer_input_invalid",
      );
    },
  },
  {
    name: "portal feed pure decision distinguishes zero, explicit and no-property modes",
    run: async () => {
      const zero = decidePortalFeedLinkSelection(connector, []);
      assert(zero.mode === "all_active_tenant_properties", "zero total links did not select all-active mode");

      const explicit = decidePortalFeedLinkSelection(connector, [
        { tenant_id: tenant.id, portal_slug: "zap", imovel_id: "property-1", status: "ativo" },
      ]);
      assert(
        explicit.mode === "explicit_property_ids" && explicit.propertyIds[0] === "property-1",
        "eligible link did not select explicit property mode",
      );

      const none = decidePortalFeedLinkSelection(connector, [
        { tenant_id: tenant.id, portal_slug: "zap", imovel_id: "property-1", status: "inativo" },
      ]);
      assert(none.mode === "no_properties", "existing noneligible link triggered zero-link fallback");
    },
  },
  {
    name: "portal feed executes zero-link, explicit-link and noneligible-link behavior",
    run: async () => {
      const tenantRow = { id: tenant.id, nome: "Tenant" };
      const propertyRow = { id: "property-1", tenant_id: tenant.id, status: "ativo", bairros: { nome: "Centro" } };

      await setScenario([
        { table: "tenants", method: "GET", data: [tenantRow] },
        { table: "imovel_portais", method: "GET", data: [] },
        { table: "imoveis", method: "GET", data: [propertyRow] },
        { table: "imovel_imagens", method: "GET", data: [] },
      ]);
      const allActive = await loadPortalFeedSnapshot({ connector });
      assert(allActive.properties.length === 1, "zero total links did not load active tenant properties");
      assert(callsFor("imoveis", "GET")[0].url.searchParams.get("id") === null, "zero-link query unexpectedly constrained IDs");

      await setScenario([
        { table: "tenants", method: "GET", data: [tenantRow] },
        {
          table: "imovel_portais",
          method: "GET",
          data: [{ tenant_id: tenant.id, portal_slug: "zap", imovel_id: "property-1", status: "publicado" }],
        },
        { table: "imoveis", method: "GET", data: [propertyRow] },
        { table: "imovel_imagens", method: "GET", data: [] },
      ]);
      const linked = await loadPortalFeedSnapshot({ connector });
      assert(linked.properties.length === 1, "eligible link did not load linked property");
      assert(
        callsFor("imoveis", "GET")[0].url.searchParams.get("id")?.startsWith("in."),
        "eligible link did not constrain property IDs",
      );

      await setScenario([
        { table: "tenants", method: "GET", data: [tenantRow] },
        {
          table: "imovel_portais",
          method: "GET",
          data: [{ tenant_id: tenant.id, portal_slug: "zap", imovel_id: "property-1", status: "erro" }],
        },
      ]);
      const none = await loadPortalFeedSnapshot({ connector });
      assert(none.properties.length === 0, "noneligible links returned properties");
      assert(callsFor("imoveis", "GET").length === 0, "noneligible links triggered all-property fallback");
    },
  },
  {
    name: "portal feed fails closed on duplicate, foreign, unexpected and unavailable links",
    run: async () => {
      await expectWriterError(
        () =>
          decidePortalFeedLinkSelection(connector, [
            { tenant_id: tenant.id, portal_slug: "zap", imovel_id: "dup", status: "ativo" },
            { tenant_id: tenant.id, portal_slug: "zap", imovel_id: "dup", status: "publicado" },
          ]),
        "portal_link_state_ambiguous",
      );
      await expectWriterError(
        () =>
          decidePortalFeedLinkSelection(connector, [
            { tenant_id: "tenant-b", portal_slug: "zap", imovel_id: "foreign", status: "ativo" },
          ]),
        "resource_foreign_tenant",
      );
      await expectWriterError(
        () =>
          decidePortalFeedLinkSelection(connector, [
            { tenant_id: tenant.id, portal_slug: "olx", imovel_id: "unexpected", status: "ativo" },
          ]),
        "resource_foreign_tenant",
      );
      await expectWriterError(
        () =>
          decidePortalFeedLinkSelection(connector, [
            { tenant_id: tenant.id, portal_slug: "zap", imovel_id: "unknown", status: "misterioso" },
          ]),
        "portal_link_state_ambiguous",
      );

      await setScenario([
        { table: "tenants", method: "GET", data: [{ id: tenant.id, nome: "Tenant" }] },
        {
          table: "imovel_portais",
          method: "GET",
          data: [{ tenant_id: tenant.id, portal_slug: "zap", imovel_id: "unavailable", status: "ativo" }],
        },
        { table: "imoveis", method: "GET", data: [] },
      ]);
      await expectWriterError(
        () => loadPortalFeedSnapshot({ connector }),
        "portal_link_state_ambiguous",
      );
    },
  },
  {
    name: "portal immediate and replay paths use one writer and preserve tenant identity",
    run: async () => {
      const immediate = read("src/routes/api/public/portal-leads.ts");
      const replay = read("src/routes/api/public/hooks/portal-dlq-retry.ts");
      assert(immediate.includes("ingestPortalLead"), "immediate portal path bypasses shared writer");
      assert(replay.includes("ingestPortalLead"), "DLQ replay bypasses shared writer");
      assert(!immediate.includes('.from("leads")'), "immediate path retains direct lead insert");
      assert(!replay.includes('.from("leads")'), "replay path retains direct lead insert");
      assert(replay.includes("resolvePortalConnectorForTenant"), "replay does not revalidate persisted connector tenant");
      assert(replay.includes("portal_dlq_mark_retry"), "DLQ retry item binding missing");
      assert(replay.includes("portal_dlq_mark_resolved"), "DLQ resolution item binding missing");
      const writer = read("src/lib/public-writers/portal-writer.server.ts");
      assert(writer.includes("tenant_id: input.connector.tenant.id"), "portal log does not use connector tenant");
      assert(writer.includes("tenant_id: connector.tenant.id"), "feed writes do not use connector tenant");
    },
  },
  {
    name: "DLQ hook authentication and public consumers remain frozen",
    run: async () => {
      const replay = read("src/routes/api/public/hooks/portal-dlq-retry.ts");
      assert(
        replay.includes("const authorized = (anon && apikey === anon) || (cronSecret && provided === cronSecret);"),
        "DLQ hook authentication changed",
      );
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
