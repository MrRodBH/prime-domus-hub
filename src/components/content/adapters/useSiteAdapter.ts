// Site — Adapter (Bloco 3.1). Cada "seção" (branding, empresa, seo_global, ...)
// é uma entidade singleton. NÃO é exceção — usa mesmo ContentWorkspace/Editor.
import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { obterSiteSettings, atualizarSiteSettings } from "@/lib/api/site.functions";
import { salvarRascunho, listarVersoes, restaurarVersao } from "@/lib/api/site-versions.functions";
import type {
  ContentEntityAdapter, ContentEntityDetail, ContentEntityRecord,
  ContentDraft, StatusValue, VersionRecord,
} from "../types";

type SiteKey =
  | "branding" | "branding_v2" | "empresa" | "footer" | "seo_global"
  | "home_hero" | "home_secoes" | "contato" | "pagina_lancamentos"
  | "home_diferenciais" | "home_depoimentos"
  | "pagina_sobre" | "pagina_contato" | "pagina_anuncie";

export const SITE_SECTIONS: Array<{ id: SiteKey; label: string; group: string }> = [
  { id: "empresa", label: "Empresa", group: "Empresa" },
  { id: "branding", label: "Logo & Marca", group: "Empresa" },
  { id: "branding_v2", label: "Branding dinâmico", group: "Empresa" },
  { id: "contato", label: "Contato (global)", group: "Empresa" },
  { id: "footer", label: "Rodapé", group: "Empresa" },
  { id: "seo_global", label: "SEO Global", group: "Empresa" },
  { id: "home_hero", label: "Home — Hero", group: "Home" },
  { id: "home_secoes", label: "Home — Seções", group: "Home" },
  { id: "home_diferenciais", label: "Home — Diferenciais", group: "Home" },
  { id: "home_depoimentos", label: "Home — Depoimentos", group: "Home" },
  { id: "pagina_sobre", label: "Página Sobre", group: "Páginas fixas" },
  { id: "pagina_contato", label: "Página Contato", group: "Páginas fixas" },
  { id: "pagina_anuncie", label: "Página Anuncie", group: "Páginas fixas" },
  { id: "pagina_lancamentos", label: "Página Lançamentos", group: "Páginas fixas" },
];

export function useSiteAdapter(): ContentEntityAdapter {
  const obterFn = useServerFn(obterSiteSettings);
  const atualizarFn = useServerFn(atualizarSiteSettings);
  const rascunhoFn = useServerFn(salvarRascunho);
  const listVFn = useServerFn(listarVersoes);
  const restoreVFn = useServerFn(restaurarVersao);

  const fetchList = useCallback(async (): Promise<ContentEntityRecord[]> => {
    return SITE_SECTIONS.map((s) => ({
      id: s.id,
      titulo: s.label,
      slug: s.id,
      status: "published" as StatusValue,
      updated_at: new Date().toISOString(),
      extra: { group: s.group },
    }));
  }, []);

  const fetchDetail = useCallback(async (id: string): Promise<ContentEntityDetail> => {
    const all = await obterFn();
    const sectionKey = id as SiteKey;
    const section = SITE_SECTIONS.find((s) => s.id === sectionKey);
    const value = (all as unknown as Record<string, unknown>)[sectionKey] ?? {};
    return {
      id,
      titulo: section?.label ?? id,
      slug: id,
      status: "published",
      updated_at: new Date().toISOString(),
      descricao: null,
      seo: {},
      blocks: [],
      data: { value, sectionKey, all },
    };
  }, [obterFn]);

  const save = useCallback(
    async (id: string | null, draft: ContentDraft, opts: { publish: boolean }) => {
      if (!id) throw new Error("Site sections são singletons");
      const d = draft.data as { value: Record<string, unknown> };
      if (opts.publish) {
        await atualizarFn({ data: { key: id as never, value: d.value } });
      } else {
        await rascunhoFn({ data: { key: id as never, value: d.value } });
      }
      return { id };
    },
    [atualizarFn, rascunhoFn],
  );

  const remove = useCallback(async () => {
    throw new Error("Seções do site não podem ser excluídas.");
  }, []);

  const listVersions = useCallback(async (id: string): Promise<VersionRecord[]> => {
    const rows = await listVFn({ data: { key: id as never } });
    return rows.map((r) => ({
      id: r.id, label: r.status === "published" ? "Publicada" : (r.notes ?? "Rascunho"),
      status: r.status, createdAt: r.created_at, createdBy: r.created_by,
      payload: JSON.parse(r.value_json),
    }));
  }, [listVFn]);

  const restoreVersion = useCallback(async (_id: string, versionId: string) => {
    await restoreVFn({ data: { id: versionId } });
  }, [restoreVFn]);

  return useMemo(
    () => ({ fetchList, fetchDetail, save, remove, listVersions, restoreVersion }),
    [fetchList, fetchDetail, save, remove, listVersions, restoreVersion],
  );
}
