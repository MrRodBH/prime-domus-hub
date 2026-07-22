import { z } from "zod";
import {
  normalizePublicEmbedUrl,
  normalizePublicMediaUrl,
  normalizePublicNavigationUrl,
} from "@/lib/public-content-security";
import { sanitizePublicHtml } from "@/lib/public-html-sanitizer.server";

const heroBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("hero"),
    data: z
      .object({
        eyebrow: z.string().optional(),
        titulo: z.string(),
        subtitulo: z.string().optional(),
        imagem_url: z.string().optional(),
        cta_label: z.string().optional(),
        cta_href: z.string().optional(),
        altura: z.enum(["sm", "md", "lg"]).optional(),
      })
      .strict(),
  })
  .strict();

const richtextBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("richtext"),
    data: z
      .object({
        html: z.string(),
        align: z.enum(["left", "center"]).optional(),
      })
      .strict(),
  })
  .strict();

const imageBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("image"),
    data: z
      .object({
        url: z.string(),
        alt: z.string().optional(),
        legenda: z.string().optional(),
      })
      .strict(),
  })
  .strict();

const galleryBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("gallery"),
    data: z
      .object({
        imagens: z.array(
          z
            .object({
              url: z.string(),
              alt: z.string().optional(),
            })
            .strict(),
        ),
        colunas: z
          .union([z.literal(2), z.literal(3), z.literal(4)])
          .optional(),
      })
      .strict(),
  })
  .strict();

const videoBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("video"),
    data: z
      .object({
        embed_url: z.string(),
        titulo: z.string().optional(),
      })
      .strict(),
  })
  .strict();

const ctaBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("cta"),
    data: z
      .object({
        titulo: z.string(),
        descricao: z.string().optional(),
        botao_label: z.string(),
        botao_href: z.string(),
        variante: z.enum(["default", "outline"]).optional(),
      })
      .strict(),
  })
  .strict();

const formBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("form"),
    data: z
      .object({
        form_slug: z.string(),
        titulo: z.string().optional(),
      })
      .strict(),
  })
  .strict();

const featuresBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("features"),
    data: z
      .object({
        titulo: z.string().optional(),
        itens: z.array(
          z
            .object({
              titulo: z.string(),
              descricao: z.string().optional(),
              icone: z.string().optional(),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();

const faqBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("faq"),
    data: z
      .object({
        titulo: z.string().optional(),
        itens: z.array(
          z
            .object({
              pergunta: z.string(),
              resposta: z.string(),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();

const spacerBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("spacer"),
    data: z
      .object({
        altura: z.enum(["sm", "md", "lg", "xl"]),
      })
      .strict(),
  })
  .strict();

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

export const publicPageSeoSchema = z
  .object({
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
    og_image: z.string().optional(),
    canonical: z.string().optional(),
    noindex: z.boolean().optional(),
  })
  .strict();

export type PublicPageSeo = z.infer<typeof publicPageSeoSchema>;

const publicPageRowSchema = z
  .object({
    tenant_id: z.string().min(1),
    id: z.string().min(1),
    slug: z.string().min(1),
    titulo: z.string(),
    descricao: z.string().nullable(),
    seo: z.preprocess(
      (value) => value ?? {},
      publicPageSeoSchema,
    ),
    blocks: z.preprocess(
      (value) => value ?? [],
      z.array(cmsBlockSchema),
    ),
    published_at: z.string().nullable(),
  })
  .strict();

export type PublicPageRow = z.input<typeof publicPageRowSchema>;

export type PublicPageDto = Omit<
  z.output<typeof publicPageRowSchema>,
  "tenant_id"
>;

export type PublicPageTenantIdentity = {
  readonly id: string;
};

export type PublicPageContractErrorCode =
  | "ambiguous_page"
  | "foreign_tenant_page"
  | "invalid_page_row"
  | "missing_tenant_id";

export class PublicPageContractError extends Error {
  readonly code: PublicPageContractErrorCode;

  constructor(code: PublicPageContractErrorCode, message: string) {
    super(message);
    this.name = "PublicPageContractError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePublicPageRows(
  acceptedTenantId: string,
  rows: readonly unknown[] | null | undefined,
): PublicPageDto | null {
  const normalizedRows = rows ?? [];

  if (normalizedRows.length === 0) return null;
  if (normalizedRows.length > 1) {
    throw new PublicPageContractError(
      "ambiguous_page",
      "Public page lookup returned more than one row",
    );
  }

  const candidate = normalizedRows[0];
  if (
    !isRecord(candidate) ||
    !Object.prototype.hasOwnProperty.call(candidate, "tenant_id") ||
    typeof candidate.tenant_id !== "string" ||
    candidate.tenant_id.length === 0
  ) {
    throw new PublicPageContractError(
      "missing_tenant_id",
      "Public page row is missing tenant_id",
    );
  }

  if (candidate.tenant_id !== acceptedTenantId) {
    throw new PublicPageContractError(
      "foreign_tenant_page",
      "Public page row belongs to a different tenant",
    );
  }

  const parsed = publicPageRowSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new PublicPageContractError(
      "invalid_page_row",
      `Public page row is invalid: ${parsed.error.message}`,
    );
  }

  const { tenant_id: _tenantId, ...dto } = parsed.data;
  return dto;
}


function requireSafeDestination(value: string | null, label: string): string {
  if (!value) {
    throw new PublicPageContractError(
      "invalid_page_row",
      `Public page contains an unsafe ${label} destination`,
    );
  }
  return value;
}

function sanitizePublicPageDto(dto: PublicPageDto): PublicPageDto {
  const seo: PublicPageSeo = {
    ...dto.seo,
    ...(dto.seo.og_image
      ? { og_image: normalizePublicMediaUrl(dto.seo.og_image) ?? undefined }
      : {}),
    ...(dto.seo.canonical
      ? { canonical: normalizePublicNavigationUrl(dto.seo.canonical) ?? undefined }
      : {}),
  };

  const blocks = dto.blocks.map((block): CmsBlock => {
    switch (block.type) {
      case "hero":
        return {
          ...block,
          data: {
            ...block.data,
            ...(block.data.imagem_url
              ? { imagem_url: normalizePublicMediaUrl(block.data.imagem_url) ?? undefined }
              : {}),
            ...(block.data.cta_href
              ? {
                  cta_href: requireSafeDestination(
                    normalizePublicNavigationUrl(block.data.cta_href, "contact"),
                    "hero CTA",
                  ),
                }
              : {}),
          },
        };
      case "richtext":
        return { ...block, data: { ...block.data, html: sanitizePublicHtml(block.data.html) } };
      case "image":
        return {
          ...block,
          data: {
            ...block.data,
            url: requireSafeDestination(normalizePublicMediaUrl(block.data.url), "image"),
          },
        };
      case "gallery":
        return {
          ...block,
          data: {
            ...block.data,
            imagens: block.data.imagens.flatMap((image) => {
              const url = normalizePublicMediaUrl(image.url);
              return url ? [{ ...image, url }] : [];
            }),
          },
        };
      case "video":
        return {
          ...block,
          data: {
            ...block.data,
            embed_url: requireSafeDestination(
              normalizePublicEmbedUrl(block.data.embed_url),
              "video embed",
            ),
          },
        };
      case "cta":
        return {
          ...block,
          data: {
            ...block.data,
            botao_href: requireSafeDestination(
              normalizePublicNavigationUrl(block.data.botao_href, "contact"),
              "CTA",
            ),
          },
        };
      default:
        return block;
    }
  });

  return { ...dto, seo, blocks };
}

export async function loadPublicPageForRequest(
  requireTenant: () => Promise<PublicPageTenantIdentity>,
  fetchRows: (
    tenant: PublicPageTenantIdentity,
  ) => Promise<readonly unknown[] | null | undefined>,
): Promise<PublicPageDto | null> {
  const tenant = await requireTenant();
  const rows = await fetchRows(tenant);
  const dto = parsePublicPageRows(tenant.id, rows);
  return dto ? sanitizePublicPageDto(dto) : null;
}
