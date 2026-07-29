/**
 * CMS Pages compatibility surface.
 *
 * Administrative reads delegate to the canonical PR-M2 workflow. Legacy
 * mutations fail closed so there is no second page authority. Public reads are
 * Host-derived and materialized exclusively from the published version pointer.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import { loadPublicPageForRequest } from "@/lib/public-page-contract";
import {
  getTenantPage,
  listTenantPages,
} from "@/lib/api/tenant-cms.functions";
import {
  SIGNED_URL_TTL_PREVIEW_SECONDS,
  validateTenantSignRequest,
} from "@/lib/storage/signed-url";

export const listarPaginas = listTenantPages;
export const obterPaginaAdmin = getTenantPage;

const retiredMutationSchema = z.record(z.string(), z.unknown());

export const salvarPagina = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(retiredMutationSchema)
  .handler(async () => {
    throw new Error("legacy_cms_page_mutation_retired");
  });

export const excluirPagina = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: z.string().uuid() }).strict())
  .handler(async () => {
    throw new Error("legacy_cms_page_delete_retired");
  });

type StoredSection = {
  id: string;
  type: string;
  region?: string;
  data: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asSections(snapshot: Record<string, unknown>): StoredSection[] {
  const layout = asRecord(snapshot.layout);
  if (!Array.isArray(layout.sections)) throw new Error("public_page_sections_invalid");
  return layout.sections.map((section) => {
    const value = asRecord(section);
    if (typeof value.id !== "string" || typeof value.type !== "string") {
      throw new Error("public_page_section_invalid");
    }
    return {
      id: value.id,
      type: value.type,
      region: typeof value.region === "string" ? value.region : undefined,
      data: asRecord(value.data),
    };
  });
}

async function resolvePublishedMediaUrls(
  tenantId: string,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("media_library")
    .select("id, arquivo, arquivo_medium, arquivo_thumbnail")
    .eq("tenant_id", tenantId)
    .in("id", unique);
  if (error) throw new Error("public_page_media_read_failed");
  if (!Array.isArray(data) || data.length !== unique.length) {
    throw new Error("public_page_media_reference_invalid");
  }
  for (const row of data as Array<Record<string, unknown>>) {
    const rawPath = (row.arquivo_medium ?? row.arquivo_thumbnail ?? row.arquivo) as string | null;
    if (typeof row.id !== "string" || !rawPath) throw new Error("public_page_media_reference_invalid");
    const { bucket, path } = validateTenantSignRequest({ bucket: "site", path: rawPath, tenantId });
    const signed = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_PREVIEW_SECONDS);
    if (signed.error || !signed.data?.signedUrl) throw new Error("public_page_media_sign_failed");
    result.set(row.id, signed.data.signedUrl);
  }
  return result;
}

async function resolvePublishedFormSlugs(
  tenantId: string,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any)
    .from("cms_forms")
    .select("id, slug, published_version_id, status")
    .eq("tenant_id", tenantId)
    .in("id", unique)
    .eq("status", "published")
    .not("published_version_id", "is", null);
  if (error) throw new Error("public_page_form_reference_read_failed");
  if (!Array.isArray(data) || data.length !== unique.length) {
    throw new Error("public_page_form_reference_invalid");
  }
  for (const row of data as Array<Record<string, unknown>>) {
    if (typeof row.id !== "string" || typeof row.slug !== "string") {
      throw new Error("public_page_form_reference_invalid");
    }
    result.set(row.id, row.slug);
  }
  return result;
}

function collectSectionReferences(sections: readonly StoredSection[]) {
  const mediaIds = new Set<string>();
  const formIds = new Set<string>();
  for (const section of sections) {
    if ((section.type === "hero" || section.type === "image") && typeof section.data.media_id === "string") {
      mediaIds.add(section.data.media_id);
    }
    if (section.type === "gallery" && Array.isArray(section.data.imagens)) {
      for (const image of section.data.imagens) {
        const value = asRecord(image);
        if (typeof value.media_id === "string") mediaIds.add(value.media_id);
      }
    }
    if (section.type === "form" && typeof section.data.form_id === "string") formIds.add(section.data.form_id);
  }
  return { mediaIds: [...mediaIds], formIds: [...formIds] };
}

function projectSection(
  section: StoredSection,
  mediaUrls: ReadonlyMap<string, string>,
  formSlugs: ReadonlyMap<string, string>,
) {
  const data = { ...section.data };
  switch (section.type) {
    case "hero": {
      const mediaId = data.media_id;
      delete data.media_id;
      if (typeof mediaId === "string") data.imagem_url = mediaUrls.get(mediaId);
      break;
    }
    case "image": {
      const mediaId = data.media_id;
      delete data.media_id;
      delete data.variant;
      if (typeof mediaId !== "string" || !mediaUrls.has(mediaId)) throw new Error("public_page_media_reference_invalid");
      data.url = mediaUrls.get(mediaId);
      break;
    }
    case "gallery": {
      data.imagens = Array.isArray(data.imagens)
        ? data.imagens.map((image) => {
            const value = asRecord(image);
            const mediaId = value.media_id;
            if (typeof mediaId !== "string" || !mediaUrls.has(mediaId)) throw new Error("public_page_media_reference_invalid");
            return { url: mediaUrls.get(mediaId), ...(typeof value.alt === "string" ? { alt: value.alt } : {}) };
          })
        : [];
      break;
    }
    case "form": {
      const formId = data.form_id;
      delete data.form_id;
      if (typeof formId !== "string" || !formSlugs.has(formId)) throw new Error("public_page_form_reference_invalid");
      data.form_slug = formSlugs.get(formId);
      break;
    }
    case "richtext":
      delete data.format;
      break;
    default:
      break;
  }
  return { id: section.id, type: section.type, data };
}

function projectSeo(snapshot: Record<string, unknown>, mediaUrls: ReadonlyMap<string, string>) {
  const seo = { ...asRecord(snapshot.seo) };
  const ogMediaId = seo.og_media_id;
  delete seo.og_media_id;
  if (typeof ogMediaId === "string") {
    const url = mediaUrls.get(ogMediaId);
    if (!url) throw new Error("public_page_media_reference_invalid");
    seo.og_image = url;
  }
  return seo;
}

export const obterPaginaPublica = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(180) }).strict().parse(d))
  .handler(async ({ data }) =>
    loadPublicPageForRequest(requirePublicTenantFromRequest, async (tenant) => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const pageResult = await (supabaseAdmin as any)
        .from("cms_pages")
        .select("tenant_id, id, slug, titulo, descricao, published_at, published_version_id")
        .eq("tenant_id", tenant.id)
        .eq("slug", data.slug)
        .eq("status", "published")
        .not("published_version_id", "is", null)
        .limit(2);
      if (pageResult.error) throw new Error("public_page_read_failed");
      if (!Array.isArray(pageResult.data) || pageResult.data.length !== 1) return pageResult.data ?? [];
      const page = pageResult.data[0] as Record<string, unknown>;
      const versionResult = await (supabaseAdmin as any)
        .from("cms_page_versions")
        .select("id, tenant_id, page_id, status, schema_version, snapshot")
        .eq("tenant_id", tenant.id)
        .eq("page_id", page.id)
        .eq("id", page.published_version_id)
        .eq("status", "published")
        .limit(2);
      if (versionResult.error) throw new Error("public_page_version_read_failed");
      if (!Array.isArray(versionResult.data) || versionResult.data.length !== 1) {
        throw new Error("public_page_published_version_invalid");
      }
      const version = versionResult.data[0] as Record<string, unknown>;
      const snapshot = asRecord(version.snapshot);
      const sections = asSections(snapshot);
      const references = collectSectionReferences(sections);
      const seo = asRecord(snapshot.seo);
      if (typeof seo.og_media_id === "string") references.mediaIds.push(seo.og_media_id);
      const [mediaUrls, formSlugs] = await Promise.all([
        resolvePublishedMediaUrls(tenant.id, references.mediaIds),
        resolvePublishedFormSlugs(tenant.id, references.formIds),
      ]);
      return [{
        tenant_id: tenant.id,
        id: page.id,
        slug: snapshot.slug ?? page.slug,
        titulo: snapshot.title ?? page.titulo,
        descricao: snapshot.description ?? page.descricao ?? null,
        seo: projectSeo(snapshot, mediaUrls),
        blocks: sections.map((section) => projectSection(section, mediaUrls, formSlugs)),
        published_at: page.published_at ?? null,
      }];
    }),
  );
