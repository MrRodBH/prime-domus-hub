import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadPublicPageForRequest,
  parsePublicPageRows,
  publicPageInputSchema,
  PublicPageContractError,
} from "@/lib/public-page-contract";
import { PublicTenantResolutionError } from "@/lib/public-tenant-resolution-error";

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

function assertContractError(
  run: () => unknown,
  code: PublicPageContractError["code"],
  message: string,
) {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof PublicPageContractError, `${message}: expected contract error`);
  assert(caught.code === code, `${message}: unexpected error code ${caught.code}`);
}

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

function validRow(overrides: Record<string, unknown> = {}) {
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
      {
        id: "hero-1",
        type: "hero",
        data: { titulo: "Tenant A", altura: "md" },
      },
      {
        id: "faq-1",
        type: "faq",
        data: {
          titulo: "Perguntas",
          itens: [{ pergunta: "Onde?", resposta: "Belo Horizonte" }],
        },
      },
    ],
    published_at: "2026-07-20T12:00:00.000Z",
    ...overrides,
  };
}

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "unknown Host authority failure propagates before page query",
    run: async () => {
      const failure = new PublicTenantResolutionError();
      let queryCalled = false;
      await assertRejects(
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
        "tenant authority failure must propagate",
      );
      assert(queryCalled === false, "page query executed after tenant authority failure");
    },
  },
  {
    name: "page query failure propagates",
    run: async () => {
      const failure = new Error("page query failed");
      await assertRejects(
        () =>
          loadPublicPageForRequest(
            async () => ({ id: TENANT_A }),
            async () => {
              throw failure;
            },
          ),
        failure,
        "page query failure must propagate",
      );
    },
  },
  {
    name: "zero rows returns null",
    run: async () => {
      assert(parsePublicPageRows(TENANT_A, []) === null, "zero rows must return null");
      assert(parsePublicPageRows(TENANT_A, null) === null, "null rows must return null");
    },
  },
  {
    name: "one valid same-tenant row returns a typed DTO",
    run: async () => {
      const page = parsePublicPageRows(TENANT_A, [validRow()]);
      assert(page !== null, "valid page missing");
      assert(page.slug === "institucional", "slug not preserved");
      assert(page.blocks[0]?.type === "hero", "typed block not preserved");
      assert(page.seo.canonical === "https://tenant-a.example/p/institucional", "SEO not preserved");
    },
  },
  {
    name: "N rows fail closed as ambiguous",
    run: async () => {
      assertContractError(
        () => parsePublicPageRows(TENANT_A, [validRow(), validRow({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" })]),
        "ambiguous_page",
        "duplicate public page",
      );
    },
  },
  {
    name: "foreign-tenant row fails closed",
    run: async () => {
      assertContractError(
        () => parsePublicPageRows(TENANT_A, [validRow({ tenant_id: TENANT_B })]),
        "foreign_tenant_page",
        "foreign tenant page",
      );
    },
  },
  {
    name: "missing tenant_id fails closed",
    run: async () => {
      const row = validRow();
      delete row.tenant_id;
      assertContractError(
        () => parsePublicPageRows(TENANT_A, [row]),
        "invalid_page_row",
        "missing tenant id",
      );
    },
  },
  {
    name: "malformed block data fails closed",
    run: async () => {
      assertContractError(
        () =>
          parsePublicPageRows(TENANT_A, [
            validRow({ blocks: [{ id: "hero-1", type: "hero", data: {} }] }),
          ]),
        "invalid_page_row",
        "malformed block",
      );
    },
  },
  {
    name: "malformed SEO fails closed",
    run: async () => {
      assertContractError(
        () => parsePublicPageRows(TENANT_A, [validRow({ seo: { noindex: "yes" } })]),
        "invalid_page_row",
        "malformed SEO",
      );
    },
  },
  {
    name: "public DTO is serializable and excludes tenant_id",
    run: async () => {
      const page = parsePublicPageRows(TENANT_A, [validRow()]);
      assert(page !== null, "valid page missing");
      const reconstructed = JSON.parse(JSON.stringify(page)) as Record<string, unknown>;
      assert(reconstructed.slug === "institucional", "serialized DTO lost slug");
      assert(!("tenant_id" in reconstructed), "tenant_id leaked into public DTO");
    },
  },
  {
    name: "strict input rejects tenant authority and unknown fields",
    run: async () => {
      assert(publicPageInputSchema.safeParse({ slug: "institucional" }).success, "valid slug rejected");
      assert(
        !publicPageInputSchema.safeParse({ slug: "institucional", tenantId: TENANT_A }).success,
        "client tenant input accepted",
      );
      assert(
        !publicPageInputSchema.safeParse({ slug: "institucional", extra: true }).success,
        "unknown field accepted",
      );
    },
  },
  {
    name: "production page function uses explicit cardinality and shared contract",
    run: async () => {
      const source = readFileSync(resolve(process.cwd(), "src/lib/api/pages.functions.ts"), "utf8");
      const publicBlock = source.slice(source.indexOf("export const obterPaginaPublica"));
      assert(publicBlock.includes("loadPublicPageForRequest"), "shared page loader not used");
      assert(publicBlock.includes("requirePublicTenantFromRequest"), "request tenant authority not required");
      assert(publicBlock.includes('.eq("tenant_id", tenantId)'), "tenant equality missing");
      assert(publicBlock.includes('.eq("slug", data.slug)'), "slug equality missing");
      assert(publicBlock.includes('.eq("status", "published")'), "published filter missing");
      assert(publicBlock.includes(".limit(2)"), "explicit 0/1/N cardinality read missing");
      assert(!publicBlock.includes("maybeSingle"), "public page still delegates cardinality to maybeSingle");
    },
  },
  {
    name: "public page route consumes typed DTO without hardcoded canonical fallback",
    run: async () => {
      const source = readFileSync(resolve(process.cwd(), "src/routes/p.$slug.tsx"), "utf8");
      assert(!source.includes("as CmsBlock[]"), "route retains unsafe CmsBlock cast");
      assert(!source.includes("as { titulo:"), "route retains local page shape cast");
      assert(source.includes("<CmsPageRenderer blocks={page.blocks}"), "typed blocks are not passed directly");
      assert(!source.includes("rmprimeimoveis.com.br/p/"), "hardcoded RM Prime canonical fallback remains");
      assert(source.includes("seo.canonical ?"), "canonical link is not conditional on validated page SEO");
    },
  },
];

export async function runPublicPageRuntimeVerificationSpecs(): Promise<{
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
