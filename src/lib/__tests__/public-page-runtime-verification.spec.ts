import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  loadPublicPageForRequest,
  parsePublicPageRows,
  PublicPageContractError,
  type PublicPageTenantIdentity,
} from "../public-page-contract";

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

function validRow(overrides: Record<string, unknown> = {}) {
  return {
    tenant_id: "tenant-a",
    id: "page-1",
    slug: "pagina-publica",
    titulo: "Página pública",
    descricao: "Descrição",
    seo: {
      meta_title: "Título SEO",
      meta_description: "Descrição SEO",
      canonical: "https://tenant.example/p/pagina-publica",
      noindex: false,
    },
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        data: { titulo: "Hero" },
      },
    ],
    published_at: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

async function expectError(
  run: () => Promise<unknown> | unknown,
  predicate: (error: unknown) => boolean,
  message: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    assert(predicate(error), message);
    return;
  }
  throw new Error(`ASSERT: ${message}`);
}

async function expectContractError(
  run: () => Promise<unknown> | unknown,
  code: PublicPageContractError["code"],
): Promise<void> {
  await expectError(
    run,
    (error) =>
      error instanceof PublicPageContractError && error.code === code,
    `expected PublicPageContractError(${code})`,
  );
}

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "tenant failure prevents the public page query",
    run: async () => {
      let queryCalled = false;
      await expectError(
        () =>
          loadPublicPageForRequest(
            async () => {
              throw new Error("tenant resolution failed");
            },
            async () => {
              queryCalled = true;
              return [];
            },
          ),
        (error) =>
          error instanceof Error &&
          error.message === "tenant resolution failed",
        "tenant resolution failure was not propagated",
      );
      assert(!queryCalled, "query ran after tenant resolution failure");
    },
  },
  {
    name: "query failure propagates without successful fallback",
    run: async () => {
      await expectError(
        () =>
          loadPublicPageForRequest(
            async () => ({ id: "tenant-a" }),
            async () => {
              throw new Error("database failure");
            },
          ),
        (error) =>
          error instanceof Error && error.message === "database failure",
        "query failure was not propagated",
      );
    },
  },
  {
    name: "accepted tenant object reaches the query unchanged",
    run: async () => {
      const tenant: PublicPageTenantIdentity = Object.freeze({
        id: "tenant-a",
      });
      let receivedTenant: PublicPageTenantIdentity | undefined;
      const dto = await loadPublicPageForRequest(
        async () => tenant,
        async (queryTenant) => {
          receivedTenant = queryTenant;
          return [validRow()];
        },
      );
      assert(receivedTenant === tenant, "query received a replaced tenant identity");
      assert(dto?.slug === "pagina-publica", "valid page DTO was not returned");
    },
  },
  {
    name: "zero rows returns null",
    run: async () => {
      assert(
        parsePublicPageRows("tenant-a", []) === null,
        "zero-row lookup did not return null",
      );
      assert(
        parsePublicPageRows("tenant-a", null) === null,
        "null row collection did not return null",
      );
    },
  },
  {
    name: "one valid row returns a serializable tenant-free DTO",
    run: async () => {
      const dto = parsePublicPageRows("tenant-a", [validRow()]);
      assert(dto !== null, "one valid row returned null");
      assert(!("tenant_id" in dto), "public DTO leaked tenant_id");
      const serialized = JSON.stringify(dto);
      assert(serialized.includes("pagina-publica"), "DTO did not serialize");
      assert(!serialized.includes("tenant_id"), "serialized DTO leaked tenant_id");
      assert(dto.blocks[0]?.type === "hero", "validated blocks were not returned");
      assert(dto.seo.canonical?.startsWith("https://") === true, "validated SEO was not returned");
    },
  },
  {
    name: "multiple rows fail closed as ambiguity",
    run: async () => {
      await expectContractError(
        () => parsePublicPageRows("tenant-a", [validRow(), validRow({ id: "page-2" })]),
        "ambiguous_page",
      );
    },
  },
  {
    name: "foreign tenant row fails closed",
    run: async () => {
      await expectContractError(
        () => parsePublicPageRows("tenant-a", [validRow({ tenant_id: "tenant-b" })]),
        "foreign_tenant_page",
      );
    },
  },
  {
    name: "row without tenant_id fails closed",
    run: async () => {
      const { tenant_id: _tenantId, ...row } = validRow();
      await expectContractError(
        () => parsePublicPageRows("tenant-a", [row]),
        "missing_tenant_id",
      );
    },
  },
  {
    name: "malformed block fails closed",
    run: async () => {
      await expectContractError(
        () =>
          parsePublicPageRows("tenant-a", [
            validRow({
              blocks: [
                {
                  id: "hero-1",
                  type: "hero",
                  data: { titulo: 123 },
                },
              ],
            }),
          ]),
        "invalid_page_row",
      );
    },
  },
  {
    name: "malformed SEO fails closed",
    run: async () => {
      await expectContractError(
        () =>
          parsePublicPageRows("tenant-a", [
            validRow({ seo: { noindex: "yes" } }),
          ]),
        "invalid_page_row",
      );
    },
  },
  {
    name: "production query preserves PTR tenant and strict-input shapes",
    run: async () => {
      const source = read("src/lib/api/pages.functions.ts");
      const block = section(source, "export const obterPaginaPublica");
      assert(block.includes("requirePublicTenantFromRequest"), "public page bypasses tenant authority");
      assert(block.includes('.eq("tenant_id", tenant.id)'), "PTR tenant equality shape changed");
      assert(block.includes(".strict().parse(d)"), "PTR strict input shape changed");
      assert(block.indexOf('.eq("tenant_id", tenant.id)') < block.indexOf('.eq("slug", data.slug)'), "tenant equality does not precede slug lookup");
      assert(block.includes('.eq("status", "published")'), "published status filter is missing");
      assert(block.includes(".limit(2)"), "0/1/N query does not read at most two rows");
      assert(!block.includes(".maybeSingle()"), "public query still uses maybeSingle");
      assert(!block.includes(".single()"), "public query still uses single");
      assert(!block.includes("tenant_id: z.string"), "public input accepts tenant authority");
      assert(block.includes("loadPublicPageForRequest"), "public query bypasses shared contract");
    },
  },
  {
    name: "strict input semantics reject extra tenant fields",
    run: async () => {
      const schema = z.object({ slug: z.string().min(1) }).strict();
      assert(
        !schema.safeParse({ slug: "pagina-publica", tenant_id: "tenant-b" }).success,
        "strict slug input accepted tenant_id",
      );
      assert(
        !schema.safeParse({ slug: "pagina-publica", tenantId: "tenant-b" }).success,
        "strict slug input accepted tenantId",
      );
    },
  },
  {
    name: "public route consumes the typed DTO without canonical fallback",
    run: async () => {
      const source = read("src/routes/p.$slug.tsx");
      assert(!source.includes(" as CmsBlock"), "route still casts blocks");
      assert(!source.includes("Record<string, unknown>"), "route still casts SEO");
      assert(!source.includes("loaderData?.page as"), "route still casts page data");
      assert(source.includes("<CmsPageRenderer blocks={page.blocks} />"), "route does not pass typed blocks directly");
      assert(!source.includes("rmprimeimoveis.com.br"), "route retains RM Prime canonical fallback");
      assert(source.includes("if (seo?.canonical)"), "canonical metadata is not conditional");
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
      console.error(
        `✗ ${spec.name}\n  ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  return { passed, failed };
}
