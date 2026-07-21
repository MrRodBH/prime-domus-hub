import { z } from "zod";

const heroBlockSchema = z.object({
  id: z.string(),
  type: z.literal("hero"),
  data: z.object({
    eyebrow: z.string().optional(),
    titulo: z.string(),
    subtitulo: z.string().optional(),
    imagem_url: z.string().optional(),
    cta_label: z.string().optional(),
    cta_href: z.string().optional(),
    altura: z.enum(["sm", "md", "lg"]).optional(),
  }),
});

const richtextBlockSchema = z.object({
  id: z.string(),
  type: z.literal("richtext"),
  data: z.object({
    html: z.string(),
    align: z.enum(["left", "center"]).optional(),
  }),
});

const imageBlockSchema = z.object({
  id: z.string(),
  type: z.literal("image"),
  data: z.object({
    url: z.string(),
    alt: z.string().optional(),
    legenda: z.string().optional(),
  }),
});

const galleryBlockSchema = z.object({
  id: z.string(),
  type: z.literal("gallery"),
  data: z.object({
    imagens: z.array(z.object({ url: z.string(), alt: z.string().optional() })),
    colunas: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  }),
});

const videoBlockSchema = z.object({
  id: z.string(),
  type: z.literal("video"),
  data: z.object({
    embed_url: z.string(),
    titulo: z.string().optional(),
  }),
});

const ctaBlockSchema = z.object({
  id: z.string(),
  type: z.literal("cta"),
  data: z.object({
    titulo: z.string(),
    descricao: z.string().optional(),
    botao_label: z.string(),
    botao_href: z.string(),
    variante: z.enum(["default", "outline"]).optional(),
  }),
});

const formBlockSchema = z.object({
  id: z.string(),
  type: z.literal("form"),
  data: z.object({
    form_slug: z.string(),
    titulo: z.string().optional(),
  }),
});

const featuresBlockSchema = z.object({
  id: z.string(),
  type: z.literal("features"),
  data: z.object({
    titulo: z.string().optional(),
    itens: z.array(
      z.object({
        titulo: z.string(),
        descricao: z.string().optional(),
        icone: z.string().optional(),
      }),
    ),
  }),
});

const faqBlockSchema = z.object({
  id: z.string(),
  type: z.literal("faq"),
  data: z.object({
    titulo: z.string().optional(),
    itens: z.array(z.object({ pergunta: z.string(), resposta: z.string() })),
  }),
});

const spacerBlockSchema = z.object({
  id: z.string(),
  type: z.literal("spacer"),
  data: z.object({ altura: z.enum(["sm", "md", "lg", "xl"]) }),
});

export const cmsBlockSchema = z.discriminatedUnion("type", [
  heroBlockSchema,
  richtextBlockSchema,
  imageBlockSchema,
  galleryBlockSchema,
  videoBlockSchema,
  ctaBlockSchema,
  formBlockSchema,
  featuresBlockSchema,
  faqBlockSchema,
  spacerBlockSchema,
]);

export type CmsBlock = z.infer<typeof cmsBlockSchema>;

export const publicPageSeoSchema = z.object({
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  og_image: z.string().optional(),
  canonical: z.string().optional(),
  noindex: z.boolean().optional(),
});

export type PublicPageSeo = z.infer<typeof publicPageSeoSchema>;

export const publicPageInputSchema = z
  .object({ slug: z.string().min(1) })
  .strict();

const publicPageRowSchema = z.object({
  tenant_id: z.string().uuid(),
  id: z.string().uuid(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string().nullable(),
  seo: z.preprocess((value) => value ?? {}, publicPageSeoSchema),
  blocks: z.preprocess((value) => value ?? [], z.array(cmsBlockSchema)),
  published_at: z.string().nullable(),
});

export type PublicPageRow = z.input<typeof publicPageRowSchema>;
export type PublicPageDto = Omit<z.output<typeof publicPageRowSchema>, "tenant_id">;

export type PublicPageContractErrorCode =
  | "ambiguous_page"
  | "invalid_page_row"
  | "foreign_tenant_page";

export class PublicPageContractError extends Error {
  readonly code: PublicPageContractErrorCode;

  constructor(code: PublicPageContractErrorCode, message: string) {
    super(message);
    this.name = "PublicPageContractError";
    this.code = code;
  }
}

export function parsePublicPageRows(
  tenantId: string,
  rows: readonly unknown[] | null | undefined,
): PublicPageDto | null {
  const normalized = rows ?? [];

  if (normalized.length === 0) return null;
  if (normalized.length !== 1) {
    throw new PublicPageContractError(
      "ambiguous_page",
      "Public page lookup returned an ambiguous cardinality.",
    );
  }

  const parsed = publicPageRowSchema.safeParse(normalized[0]);
  if (!parsed.success) {
    throw new PublicPageContractError(
      "invalid_page_row",
      "Public page row does not satisfy the public contract.",
    );
  }

  if (parsed.data.tenant_id !== tenantId) {
    throw new PublicPageContractError(
      "foreign_tenant_page",
      "Public page row belongs to a different tenant.",
    );
  }

  const { tenant_id: _tenantId, ...dto } = parsed.data;
  return dto;
}

export type PublicPageTenantIdentity = {
  id: string;
};

export async function loadPublicPageForRequest(
  requireTenant: () => Promise<PublicPageTenantIdentity>,
  fetchRows: (
    tenant: PublicPageTenantIdentity,
  ) => Promise<readonly unknown[] | null | undefined>,
): Promise<PublicPageDto | null> {
  const tenant = await requireTenant();
  const rows = await fetchRows(tenant);
  return parsePublicPageRows(tenant.id, rows);
}
