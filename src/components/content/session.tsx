// ContentSession — fonte única para editor (Bloco 3.1 §2).
// REGRA: Session NÃO conhece entidades. Nunca importa server function.
// Toda comunicação server-side ocorre exclusivamente através do Adapter injetado.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CmsBlock } from "@/adapters/cms-legacy";
import type {
  ContentEntityAdapter, ContentEntityDetail, ContentDraft,
  EntityDescriptor, PublicationState, StatusValue, VersionRecord,
} from "./types";
import { useAutosave, type SaveState } from "./hooks/useAutosave";

function emptyDraft(defaultStatus: StatusValue): ContentDraft {
  return { titulo: "", slug: "", descricao: "", status: defaultStatus, seo: {}, blocks: [], data: {} };
}

function draftFromDetail(d: ContentEntityDetail): ContentDraft {
  return {
    titulo: d.titulo,
    slug: d.slug ?? "",
    descricao: d.descricao ?? "",
    status: d.status,
    seo: d.seo ?? {},
    blocks: Array.isArray(d.blocks) ? d.blocks : [],
    data: d.data ?? {},
  };
}

export type ContentSessionValue = {
  descriptor: EntityDescriptor;
  adapter: ContentEntityAdapter;
  entityId: string | null;
  isNew: boolean;

  detail: ContentEntityDetail | null;
  loading: boolean;

  draft: ContentDraft;
  patch: (p: Partial<ContentDraft>) => void;
  updateBlocks: (b: CmsBlock[]) => void;
  updateSeo: (s: Record<string, unknown>) => void;
  updateData: (d: Record<string, unknown>) => void;
  reset: () => void;
  isDirty: boolean;

  save: SaveState;
  lastSavedAt: Date | null;
  saveError: string | null;
  flush: () => Promise<void>;

  workflow: PublicationState;
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
  archive: () => Promise<void>;
  restore: () => Promise<void>;
  publishing: boolean;

  // Versionamento genérico
  versions: VersionRecord[] | null;
  refreshVersions: () => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;

  previewNonce: number;
};

// Re-export para compat com imports antigos (PublishWorkflow.tsx etc).
export type { PublicationState } from "./types";

const Ctx = createContext<ContentSessionValue | null>(null);

export function ContentSessionProvider({
  descriptor, adapter, entityId, children, onCreated,
}: {
  descriptor: EntityDescriptor;
  adapter: ContentEntityAdapter;
  entityId: string | null;
  children: ReactNode;
  onCreated?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const isNew = entityId === null || entityId === "novo";

  const detailQuery = useQuery({
    queryKey: ["content-detail", descriptor.kind, entityId],
    queryFn: () => adapter.fetchDetail(entityId!),
    enabled: !isNew && !!entityId,
  });

  const [draft, setDraft] = useState<ContentDraft>(() => emptyDraft(descriptor.defaultStatus));
  const [initialDraft, setInitialDraft] = useState<ContentDraft>(() => emptyDraft(descriptor.defaultStatus));
  const [previewNonce, setPreviewNonce] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [versions, setVersions] = useState<VersionRecord[] | null>(null);

  useEffect(() => {
    if (detailQuery.data) {
      const d = draftFromDetail(detailQuery.data);
      setDraft(d);
      setInitialDraft(d);
    }
  }, [detailQuery.data]);

  const patch = useCallback((p: Partial<ContentDraft>) => setDraft((prev) => ({ ...prev, ...p })), []);
  const updateBlocks = useCallback((b: CmsBlock[]) => setDraft((p) => ({ ...p, blocks: b })), []);
  const updateSeo = useCallback((s: Record<string, unknown>) => setDraft((p) => ({ ...p, seo: s })), []);
  const updateData = useCallback((d: Record<string, unknown>) => setDraft((p) => ({ ...p, data: { ...p.data, ...d } })), []);
  const reset = useCallback(() => setDraft(initialDraft), [initialDraft]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialDraft),
    [draft, initialDraft],
  );

  const canAutosave = !isNew && !!entityId && (!!draft.titulo || descriptor.editorKind === "settings" || descriptor.editorKind === "media");
  const autosaveFn = useCallback(
    async (value: ContentDraft) => {
      await adapter.save(entityId!, value, { publish: false });
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

  const createMut = useMutation({
    mutationFn: async () => adapter.save(null, draft, { publish: false }),
    onSuccess: (res) => {
      toast.success(`${descriptor.singular} criada`);
      qc.invalidateQueries({ queryKey: ["content-list", descriptor.kind] });
      onCreated?.(res.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Workflow universal (Bloco 3.1 §7) — cada descriptor filtra estados suportados.
  const workflow: PublicationState = useMemo(() => {
    if (draft.status === "archived" && descriptor.workflowStates.includes("archived")) return "archived";
    if (autosave.state === "saving" || autosave.state === "editing") return "editing";
    const original = detailQuery.data;
    const wasPublished = original?.status === "published" || original?.status === "active";
    if (isDirty) {
      if (wasPublished && descriptor.workflowStates.includes("updated")) return "updated";
      return descriptor.workflowStates.includes("ready_to_publish") ? "ready_to_publish" : "saved";
    }
    if (wasPublished && descriptor.workflowStates.includes("published")) return "published";
    return descriptor.workflowStates.includes("saved") ? "saved" : "published";
  }, [draft.status, autosave.state, detailQuery.data, isDirty, descriptor.workflowStates]);

  const publish = useCallback(async () => {
    if (isNew || !entityId) { toast.error(`Salve a ${descriptor.singular.toLowerCase()} antes de publicar.`); return; }
    setPublishing(true);
    try {
      await autosave.flush();
      await adapter.save(entityId, draft, { publish: true });
      toast.success(`${descriptor.singular} publicada`);
      qc.invalidateQueries({ queryKey: ["content-detail", descriptor.kind, entityId] });
      qc.invalidateQueries({ queryKey: ["content-list", descriptor.kind] });
      setPreviewNonce((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao publicar");
    } finally { setPublishing(false); }
  }, [isNew, entityId, autosave, adapter, draft, qc, descriptor]);

  const unpublish = useCallback(async () => {
    if (!entityId) return;
    setPublishing(true);
    try {
      const next = { ...draft, status: "draft" as StatusValue };
      setDraft(next);
      await adapter.save(entityId, next, { publish: false });
      toast.success("Despublicado");
      qc.invalidateQueries({ queryKey: ["content-detail", descriptor.kind, entityId] });
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setPublishing(false); }
  }, [entityId, adapter, draft, qc, descriptor.kind]);

  const archive = useCallback(async () => {
    if (!entityId) return;
    setPublishing(true);
    try {
      const next = { ...draft, status: "archived" as StatusValue };
      setDraft(next);
      await adapter.save(entityId, next, { publish: false });
      toast.success("Arquivado");
      qc.invalidateQueries({ queryKey: ["content-detail", descriptor.kind, entityId] });
      qc.invalidateQueries({ queryKey: ["content-list", descriptor.kind] });
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    finally { setPublishing(false); }
  }, [entityId, adapter, draft, qc, descriptor.kind]);

  const restore = useCallback(async () => {
    if (!entityId) return;
    const next = { ...draft, status: "draft" as StatusValue };
    setDraft(next);
    await adapter.save(entityId, next, { publish: false });
    qc.invalidateQueries({ queryKey: ["content-detail", descriptor.kind, entityId] });
  }, [entityId, adapter, draft, qc, descriptor.kind]);

  const refreshVersions = useCallback(async () => {
    if (!entityId || !adapter.listVersions) { setVersions([]); return; }
    try {
      const v = await adapter.listVersions(entityId);
      setVersions(v);
    } catch { setVersions([]); }
  }, [entityId, adapter]);

  const restoreVersion = useCallback(async (versionId: string) => {
    if (!entityId || !adapter.restoreVersion) throw new Error("Restauração não suportada");
    await adapter.restoreVersion(entityId, versionId);
    qc.invalidateQueries({ queryKey: ["content-detail", descriptor.kind, entityId] });
    await refreshVersions();
    toast.success("Versão restaurada como rascunho");
  }, [entityId, adapter, qc, descriptor.kind, refreshVersions]);

  const value: ContentSessionValue = {
    descriptor, adapter, entityId: entityId ?? null, isNew,
    detail: detailQuery.data ?? null,
    loading: detailQuery.isLoading,
    draft, patch, updateBlocks, updateSeo, updateData, reset, isDirty,
    save: autosave.state,
    lastSavedAt: autosave.lastSavedAt,
    saveError: autosave.error,
    flush: async () => { if (isNew) await createMut.mutateAsync(); else await autosave.flush(); },
    workflow, publish, unpublish, archive, restore, publishing,
    versions, refreshVersions, restoreVersion,
    previewNonce,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useContentSession(): ContentSessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useContentSession fora do ContentSessionProvider");
  return v;
}
