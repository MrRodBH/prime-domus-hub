// ContentSession — Bloco 3 §2 (fonte única para editor, preview, versionamento, autosave).
// Todos os componentes do editor DEVEM consumir esta sessão. Não manter estados próprios paralelos.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { CmsBlock } from "@/adapters/cms-legacy";
import type { ContentEntityDetail, EntityDescriptor } from "./entity-registry";
import { useAutosave, type SaveState } from "./hooks/useAutosave";

// -----------------------------------------------------------------------------
// Publication workflow — Bloco 3 §4 (não somente draft/publicar; suportar estados)
// -----------------------------------------------------------------------------
export type PublicationState =
  | "editing"          // usuário está alterando
  | "saved"            // autosave concluído; ainda é rascunho
  | "ready_to_publish" // rascunho válido e diferente da versão publicada
  | "published"        // publicado + sem alterações pendentes
  | "updated"          // publicado + com novas alterações rascunhadas
  | "archived";        // arquivado

// -----------------------------------------------------------------------------
// Draft — o estado editável in-memory (sincronizado com autosave)
// -----------------------------------------------------------------------------
export type ContentDraft = {
  titulo: string;
  slug: string;
  descricao: string;
  status: "draft" | "published" | "archived";
  seo: Record<string, unknown>;
  blocks: CmsBlock[];
};

function emptyDraft(): ContentDraft {
  return { titulo: "", slug: "", descricao: "", status: "draft", seo: {}, blocks: [] };
}

function draftFromDetail(d: ContentEntityDetail): ContentDraft {
  return {
    titulo: d.titulo,
    slug: d.slug ?? "",
    descricao: d.descricao ?? "",
    status: d.status,
    seo: d.seo ?? {},
    blocks: Array.isArray(d.blocks) ? d.blocks : [],
  };
}

// -----------------------------------------------------------------------------
// Session
// -----------------------------------------------------------------------------
export type ContentSessionValue = {
  descriptor: EntityDescriptor;
  entityId: string | null;    // null = nova
  isNew: boolean;

  // Loaded from server
  detail: ContentEntityDetail | null;
  loading: boolean;

  // Editable draft
  draft: ContentDraft;
  patch: (p: Partial<ContentDraft>) => void;
  updateBlocks: (b: CmsBlock[]) => void;
  updateSeo: (s: Record<string, unknown>) => void;
  reset: () => void;
  isDirty: boolean;

  // Autosave
  save: SaveState;
  lastSavedAt: Date | null;
  saveError: string | null;
  flush: () => Promise<void>;

  // Workflow
  workflow: PublicationState;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
  archive: () => Promise<void>;
  restore: () => Promise<void>;
  publishing: boolean;

  // Preview coordination
  previewNonce: number;   // incrementa após cada save; preview reage
};

const Ctx = createContext<ContentSessionValue | null>(null);

// -----------------------------------------------------------------------------
// Server-adapter hooks (Bloco 3: apenas "pagina" implementada — outras entidades
// virão pelo mesmo contrato).
// -----------------------------------------------------------------------------
import {
  obterPaginaAdmin,
  salvarPagina,
  excluirPagina,
  type CmsBlock as PageBlock,
} from "@/lib/api/pages.functions";

function usePageAdapter() {
  const obterFn = useServerFn(obterPaginaAdmin);
  const salvarFn = useServerFn(salvarPagina);
  const excluirFn = useServerFn(excluirPagina);

  const fetchDetail = useCallback(
    async (id: string): Promise<ContentEntityDetail> => {
      const row = await obterFn({ data: { id } });
      return {
        id: row.id,
        titulo: row.titulo,
        slug: row.slug,
        status: row.status as ContentEntityDetail["status"],
        updated_at: row.updated_at,
        published_at: row.published_at,
        descricao: row.descricao,
        seo: (row.seo ?? {}) as Record<string, unknown>,
        blocks: (Array.isArray(row.blocks) ? row.blocks : []) as PageBlock[],
      };
    },
    [obterFn],
  );

  const saveEntity = useCallback(
    async (id: string | null, draft: ContentDraft, publish: boolean): Promise<{ id: string }> => {
      const status = publish ? "published" : draft.status;
      const row = await salvarFn({
        data: {
          id: id ?? undefined,
          slug: draft.slug.trim(),
          titulo: draft.titulo.trim(),
          descricao: draft.descricao.trim() || null,
          status,
          seo: draft.seo as never,
          blocks: draft.blocks as never,
        },
      });
      return { id: (row as { id: string }).id };
    },
    [salvarFn],
  );

  const removeEntity = useCallback(
    async (id: string) => { await excluirFn({ data: { id } }); },
    [excluirFn],
  );

  return { fetchDetail, saveEntity, removeEntity };
}

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------
export function ContentSessionProvider({
  descriptor,
  entityId,
  children,
  onCreated,
}: {
  descriptor: EntityDescriptor;
  entityId: string | null;
  children: ReactNode;
  onCreated?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const adapter = usePageAdapter(); // Bloco 3: apenas 'pagina'. Ampliar por descriptor.kind depois.
  const isNew = entityId === null || entityId === "novo";

  const detailQuery = useQuery({
    queryKey: ["content-detail", descriptor.kind, entityId],
    queryFn: () => adapter.fetchDetail(entityId!),
    enabled: !isNew && !!entityId,
  });

  const [draft, setDraft] = useState<ContentDraft>(emptyDraft());
  const [initialDraft, setInitialDraft] = useState<ContentDraft>(emptyDraft());
  const [previewNonce, setPreviewNonce] = useState(0);
  const [publishing, setPublishing] = useState(false);

  // Hidratar draft quando detail carregar
  useEffect(() => {
    if (detailQuery.data) {
      const d = draftFromDetail(detailQuery.data);
      setDraft(d);
      setInitialDraft(d);
    }
  }, [detailQuery.data]);

  const patch = useCallback((p: Partial<ContentDraft>) => {
    setDraft((prev) => ({ ...prev, ...p }));
  }, []);
  const updateBlocks = useCallback((b: CmsBlock[]) => setDraft((prev) => ({ ...prev, blocks: b })), []);
  const updateSeo = useCallback((s: Record<string, unknown>) => setDraft((prev) => ({ ...prev, seo: s })), []);
  const reset = useCallback(() => setDraft(initialDraft), [initialDraft]);

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initialDraft), [draft, initialDraft]);

  // Autosave — só salva quando há id (nova entidade requer salvamento explícito com slug/titulo)
  const canAutosave = !isNew && !!entityId && !!draft.titulo && !!draft.slug;
  const autosaveFn = useCallback(
    async (value: ContentDraft) => {
      await adapter.saveEntity(entityId!, { ...value, status: "draft" }, false);
      setInitialDraft(value);
      setPreviewNonce((n) => n + 1);
      qc.invalidateQueries({ queryKey: ["content-list", descriptor.kind] });
    },
    [adapter, entityId, qc, descriptor.kind],
  );

  const autosave = useAutosave({
    value: draft,
    enabled: canAutosave,
    onSave: autosaveFn,
    isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });

  // Criar entidade nova quando usuário salva pela primeira vez
  const createMut = useMutation({
    mutationFn: async () => adapter.saveEntity(null, { ...draft, status: "draft" }, false),
    onSuccess: (res) => {
      toast.success(`${descriptor.singular} criada`);
      qc.invalidateQueries({ queryKey: ["content-list", descriptor.kind] });
      onCreated?.(res.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Workflow
  const workflow: PublicationState = useMemo(() => {
    if (draft.status === "archived") return "archived";
    if (autosave.state === "saving" || autosave.state === "editing") return "editing";
    const original = detailQuery.data;
    const wasPublished = original?.status === "published";
    if (isDirty) return wasPublished ? "updated" : "ready_to_publish";
    if (wasPublished) return "published";
    return "saved";
  }, [draft.status, autosave.state, detailQuery.data, isDirty]);

  const publish = useCallback(async () => {
    if (isNew || !entityId) {
      toast.error("Salve a página antes de publicar.");
      return;
    }
    setPublishing(true);
    try {
      await autosave.flush();
      await adapter.saveEntity(entityId, draft, true);
      toast.success(`${descriptor.singular} publicada`);
      qc.invalidateQueries({ queryKey: ["content-detail", descriptor.kind, entityId] });
      qc.invalidateQueries({ queryKey: ["content-list", descriptor.kind] });
      qc.invalidateQueries({ queryKey: ["cms-page"] });
      setPreviewNonce((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao publicar");
    } finally {
      setPublishing(false);
    }
  }, [isNew, entityId, autosave, adapter, draft, qc, descriptor]);

  const unpublish = useCallback(async () => {
    if (!entityId) return;
    setPublishing(true);
    try {
      const next = { ...draft, status: "draft" as const };
      setDraft(next);
      await adapter.saveEntity(entityId, next, false);
      toast.success("Despublicada");
      qc.invalidateQueries({ queryKey: ["content-detail", descriptor.kind, entityId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setPublishing(false); }
  }, [entityId, adapter, draft, qc, descriptor.kind]);

  const archive = useCallback(async () => {
    if (!entityId) return;
    setPublishing(true);
    try {
      const next = { ...draft, status: "archived" as const };
      setDraft(next);
      await adapter.saveEntity(entityId, next, false);
      toast.success("Arquivada");
      qc.invalidateQueries({ queryKey: ["content-detail", descriptor.kind, entityId] });
      qc.invalidateQueries({ queryKey: ["content-list", descriptor.kind] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setPublishing(false); }
  }, [entityId, adapter, draft, qc, descriptor.kind]);

  const restore = useCallback(async () => {
    if (!entityId) return;
    const next = { ...draft, status: "draft" as const };
    setDraft(next);
    await adapter.saveEntity(entityId, next, false);
    qc.invalidateQueries({ queryKey: ["content-detail", descriptor.kind, entityId] });
  }, [entityId, adapter, draft, qc, descriptor.kind]);

  const value: ContentSessionValue = {
    descriptor,
    entityId: entityId ?? null,
    isNew,
    detail: detailQuery.data ?? null,
    loading: detailQuery.isLoading,
    draft,
    patch,
    updateBlocks,
    updateSeo,
    reset,
    isDirty,
    save: autosave.state,
    lastSavedAt: autosave.lastSavedAt,
    saveError: autosave.error,
    flush: async () => {
      if (isNew) { await createMut.mutateAsync(); }
      else { await autosave.flush(); }
    },
    workflow,
    publish,
    unpublish,
    archive,
    restore,
    publishing,
    previewNonce,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useContentSession(): ContentSessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useContentSession deve ser usado dentro de ContentSessionProvider");
  return v;
}
