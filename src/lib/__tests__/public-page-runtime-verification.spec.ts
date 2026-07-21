import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadPublicPageForRequest,
  parsePublicPageRows,
  publicPageInputSchema,
  PublicPageContractError,
  type PublicPageContractErrorCode,
} from "@/lib/public-page-contract";
import { PublicTenantResolutionError } from "@/lib/public-tenant-resolution-error";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

async function expectRejected(run: () => Promise<unknown>, expected: unknown, message: string) {
  let caught: unknown;
  try {
    await run();
  } catch (error) {
    caught = error;
  }
  assert(caught === expected, message);
}

function expectContractError(run: () => unknown, code: PublicPageContractErrorCode) {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof PublicPageContractError, `expected ${code} contract error`);
  assert(caught.code === code, `expected ${code}, received ${caught.code}`);
}

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

function validRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tenant_id: TENANT_A,
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    slug: "institucional",
    titulo: "Institucional",
    descricao: "Descrição pública",
    seo: {
      meta_title: "Institucional",
      meta_description: "Descrição pública",
      canonical: "https://tenant-a.example/p/institucional",
      noindex: false,
    },
    blocks: [
      { id: "hero-1", type: "hero", data: { titulo: "Tenant A", altura: "md" } },
      {
        id: "faq-1",
        type: "faq",
        data: { titulo: "Perguntas", itens: [{ pergunta: "Onde?", resposta: "BH" }] },
      },
    ],
    published_at: "2026-07-20T12:00:00.000Z",
    ...overrides,
  };
}

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "tenant authority failure propagates before query",
    run: async () => {
      const failure = new PublicTenantResolutionError();
      let queryCalled = false;
      await expectRejected(
        () =>
          loadPublicPageForRequest(
            async () => {
              throw failure;
            },
            async () => {
              queryCalled = true;
              return [];
            },
          ),
        failure,
        "tenant failure was not propagated",
      );
      assert(!queryCalled, "query ran after tenant failure");
    },
  },
  {
    name: "query failure propagates",
    run: async () => {
      const failure = new Error("query failed");
      await expectRejected(
        () =>
          loadPublicPageForRequest(
            async () => ({ id: TENANT_A }),
            async () => {
              throw failure;
            },
          ),
        failure,
        "query failure was not propagated",
      );
    },
  },
  {
    name: "accepted tenant identity is passed unchanged and reused for response validation",
    run: async () => {
      const acceptedTenant = { id: TENANT_A };
      let receivedTenant: { id: string } | undefined;
      let caught: unknown;

      try {
        await loadPublicPageForRequest(
          async () => acceptedTenant,
          async (tenant) => {
            receivedTenant = tenant;
            return [validRow({ tenant_id: TENANT_B })];
          },
        );
      } catch (error) {
        caught = error;
      }

      assert(receivedTenant === acceptedTenant, "query did not receive the accepted tenant identity object");
      assert(caught instanceof PublicPageContractError, "foreign response did not reach the page postcondition");
      assert(caught.code === "foreign_tenant_page", "parser did not reuse the accepted tenant id");

      const contractSource = readFileSync(
        resolve(process.cwd(), "src/lib/public-page-contract.ts"),
        "utf8",
      );
      assert(contractSource.includes("const rows = await fetchRows(tenant);"), "loader does not pass the accepted identity");
      assert(!contractSource.includes("fetchRows(tenant.id)"), "loader reduces identity to an unbound string");
    },
  },
  {
    name: "zero rows returns null",
    run: async () => {
      assert(parsePublicPageRows(TENANT_A, []) === null, "empty rows must return null");
      assert(parsePublicPageRows(TENANT_A, null) === null, "null rows must return null");
    },
  },
  {
    name: "one same-tenant row returns typed DTO",
    run: async () => {
      const page = parsePublicPageRows(TENANT_A, [validRow()]);
      assert(page?.slug === "institucional", "slug missing");
      assert(page.blocks[0]?.type === "hero", "typed hero missing");
      assert(page.seo.canonical === "https://tenant-a.example/p/institucional", "SEO missing");
    },
  },
  {
    name: "multiple rows fail closed",
    run: async () => {
      expectContractError(
        () => parsePublicPageRows(TENANT_A, [validRow(), validRow({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" })]),
        "ambiguous_page",
      );
    },
  },
  {
    name: "foreign tenant row fails closed",
    run: async () => {
      expectContractError(
        () => parsePublicPageRows(TENANT_A, [validRow({ tenant_id: TENANT_B })]),
        "foreign_tenant_page",
      );
    },
  },
  {
    name: "missing tenant id fails closed",
    run: async () => {
      const { tenant_id: _omitted, ...row } = validRow();
      expectContractError(() => parsePublicPageRows(TENANT_A, [row]), "invalid_page_row");
    },
  },
  {
    name: "malformed block fails closed",
    run: async () => {
      expectContractError(
        () => parsePublicPageRows(TENANT_A, [validRow({ blocks: [{ id: "hero-1", type: "hero", data: {} }] })]),
        "invalid_page_row",
      );
    },
  },
  {
    name: "malformed SEO fails closed",
    run: async () => {
      expectContractError(
        () => parsePublicPageRows(TENANT_A, [validRow({ seo: { noindex: "yes" } })]),
        "invalid_page_row",
      );
    },
  },
  {
    name: "DTO is serializable and excludes tenant id",
    run: async () => {
      const page = parsePublicPageRows(TENANT_A, [validRow()]);
      assert(page, "valid page missing");
      const reconstructed = JSON.parse(JSON.stringify(page)) as Record<string, unknown>;
      assert(reconstructed.slug === "institucional", "serialization lost slug");
      assert(!("tenant_id" in reconstructed), "tenant id leaked");
    },
  },
  {
    name: "strict input rejects tenant and unknown fields",
    run: async () => {
      assert(publicPageInputSchema.safeParse({ slug: "institucional" }).success, "valid input rejected");
      assert(!publicPageInputSchema.safeParse({ slug: "institucional", tenantId: TENANT_A }).success, "tenant input accepted");
      assert(!publicPageInputSchema.safeParse({ slug: "institucional", extra: true }).success, "unknown input accepted");
    },
  },
  {
    name: "production function wires explicit cardinality",
    run: async () => {
      const source = readFileSync(resolve(process.cwd(), "src/lib/api/pages.functions.ts"), "utf8");
      const publicBlock = source.slice(source.indexOf("export const obterPaginaPublica"));
      for (const required of [
        "loadPublicPageForRequest",
        "requirePublicTenantFromRequest",
        '.eq("tenant_id", tenant.id)',
        '.eq("slug", data.slug)',
        '.eq("status", "published")',
        ".limit(2)",
      ]) {
        assert(publicBlock.includes(required), `missing public page wiring: ${required}`);
      }
      assert(!publicBlock.includes("maybeSingle"), "public lookup still uses maybeSingle");
    },
  },
  {
    name: "route consumes typed DTO without hardcoded canonical fallback",
    run: async () => {
      const source = readFileSync(resolve(process.cwd(), "src/routes/p.$slug.tsx"), "utf8");
      assert(!source.includes("as CmsBlock[]"), "unsafe block cast remains");
      assert(!source.includes("as { titulo:"), "local page shape cast remains");
      assert(source.includes("<CmsPageRenderer blocks={page.blocks}"), "typed blocks not used directly");
      assert(!source.includes("rmprimeimoveis.com.br/p/"), "hardcoded canonical fallback remains");
      assert(source.includes("seo.canonical ?"), "validated canonical is not conditional");
    },
  },
];

export async function runPublicPageRuntimeVerificationSpecs(): Promise<{ passed: number; failed: number }> {
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
