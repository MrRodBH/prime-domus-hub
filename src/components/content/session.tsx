// ContentSession — fonte única para editor (Bloco 3.1 §2).
// REGRA: Session NÃO conhece entidades. Nunca importa server function.
// Toda comunicação server-side ocorre exclusivamente através do Adapter injetado.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef, type ReactNode } from "react";
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

  const draftRef = useRef(draft);
  const baselineRef = useRef(initialDraft);
  const loadedRef = useRef(false);
  const operationRef = useRef(false);
  useEffect(() => {
    if (detailQuery.data && !loadedRef.current) {
      loadedRef.current = true;
      const d = draftFromDetail(detailQuery.data);
      draftRef.current = d; baselineRef.current = d;
      setDraft(d);
      setInitialDraft(d);
    }
  }, [detailQuery.data]);

  const setCurrent = useCallback((next: ContentDraft) => { draftRef.current = next; setDraft(next); }, []);
  const patch = useCallback((p: Partial<ContentDraft>) => setCurrent({ ...draftRef.current, ...p }), [setCurrent]);
  const updateBlocks = useCallback((blocks: CmsBlock[]) => patch({ blocks }), [patch]);
  const updateSeo = useCallback((seo: Record<string, unknown>) => patch({ seo }), [patch]);
  const updateData = useCallback((data: Record<string, unknown>) => patch({ data: { ...draftRef.current.data, ...data } }), [patch]);
  const reset = useCallback(() => setCurrent(baselineRef.current), [setCurrent]);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const canAutosave = !isNew && loadedRef.current && !publishing && !!entityId && (!!draft.titulo || descriptor.editorKind === "settings" || descriptor.editorKind === "media");
  const autosaveFn = useCallback(async (submitted: ContentDraft) => {
    const result = await adapter.save(entityId!, submitted, { publish: false });
    const saved = { ...submitted, status: result.status ?? submitted.status, data: { ...submitted.data, ...result.data } };
    baselineRef.current = saved; setInitialDraft(saved);
    // Acknowledged revision metadata must advance without replacing edits made in flight.
    const current = draftRef.current;
    setCurrent(current === submitted ? saved : { ...current, data: { ...current.data, ...result.data } });
    setPreviewNonce(n => n + 1);
    void qc.invalidateQueries({ queryKey: ["content-list", descriptor.kind] });
  }, [adapter, entityId, qc, descriptor.kind, setCurrent]);
  const autosave = useAutosave({
    value: draft, enabled: canAutosave, onSave: autosaveFn,
    getValue: () => draftRef.current, getBaseline: () => baselineRef.current,
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
    const wasPublished = original?.status === "published" || original?.status === "active"
      || !!original?.data.publishedVersionId || Number(original?.data.publishedRevision ?? 0) > 0;
    const pendingDraft = !!draft.data.draftVersionId || draft.data.configurationStatus === "draft";
    if (pendingDraft && !isDirty) return wasPublished && descriptor.workflowStates.includes("updated") ? "updated" : "saved";
    if (isDirty) {
      if (wasPublished && descriptor.workflowStates.includes("updated")) return "updated";
      return descriptor.workflowStates.includes("ready_to_publish") ? "ready_to_publish" : "saved";
    }
    if (wasPublished && descriptor.workflowStates.includes("published")) return "published";
    return descriptor.workflowStates.includes("saved") ? "saved" : "published";
  }, [draft, autosave.state, detailQuery.data, isDirty, descriptor.workflowStates]);

  const runWorkflow = useCallback(async (action: "publish" | "unpublish" | "archive" | "restore") => {
    if (isNew || !entityId || !loadedRef.current || operationRef.current) return;
    const handler = adapter[action];
    if (action !== "publish" && !handler) {
      toast.error("Esta operação ainda não possui um fluxo persistente disponível."); return;
    }
    operationRef.current = true; setPublishing(true);
    try {
      await autosave.flush();
      const submitted = draftRef.current;
      if (handler) await handler(entityId, submitted);
      else await adapter.save(entityId, submitted, { publish: true });
      const detail = await adapter.fetchDetail(entityId);
      const acknowledged = draftFromDetail(detail);
      // Edits typed while publishing remain a new draft, not silently discarded.
      const current = draftRef.current;
      baselineRef.current = acknowledged; setInitialDraft(acknowledged);
      setCurrent(current === submitted ? acknowledged : {
        ...current, status: acknowledged.status,
        data: { ...current.data, ...Object.fromEntries(Object.entries(acknowledged.data).filter(([key]) =>
          JSON.stringify(current.data[key]) === JSON.stringify(submitted.data[key]))) },
      });
      qc.setQueryData(["content-detail", descriptor.kind, entityId], detail);
      void qc.invalidateQueries({ queryKey: ["content-list", descriptor.kind] });
      setPreviewNonce(n => n + 1);
      toast.success({ publish: "Publicado", unpublish: "Despublicado", archive: "Arquivado", restore: "Reaberto como rascunho" }[action]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha na operação. Seus campos foram preservados."); }
    finally { operationRef.current = false; setPublishing(false); }
  }, [isNew, entityId, adapter, autosave, qc, descriptor.kind, setCurrent]);
  const publish = useCallback(() => runWorkflow("publish"), [runWorkflow]);
  const unpublish = useCallback(() => runWorkflow("unpublish"), [runWorkflow]);
  const archive = useCallback(() => runWorkflow("archive"), [runWorkflow]);
  const restore = useCallback(() => runWorkflow("restore"), [runWorkflow]);

  const refreshVersions = useCallback(async () => {
    if (!entityId || !adapter.listVersions) { setVersions([]); return; }
    try {
      const v = await adapter.listVersions(entityId);
      setVersions(v);
    } catch { setVersions([]); }
  }, [entityId, adapter]);

  const restoreVersion = useCallback(async (versionId: string) => {
    if (!entityId || !adapter.restoreVersion || operationRef.current) throw new Error("Restauração indisponível");
    operationRef.current = true; setPublishing(true);
    try {
      await autosave.flush();
      const submitted = draftRef.current;
      await adapter.restoreVersion(entityId, versionId);
      const restored = await adapter.fetchDetail(entityId);
      const next = draftFromDetail(restored);
      baselineRef.current = next; setInitialDraft(next);
      const current = draftRef.current;
      setCurrent(current === submitted ? next : { ...current, data: { ...current.data,
        ...Object.fromEntries(Object.entries(next.data).filter(([key]) => JSON.stringify(current.data[key]) === JSON.stringify(submitted.data[key]))) } });
      qc.setQueryData(["content-detail", descriptor.kind, entityId], restored);
      void qc.invalidateQueries({ queryKey: ["content-list", descriptor.kind] });
      await refreshVersions();
      toast.success("Versão restaurada como rascunho");
    } finally { operationRef.current = false; setPublishing(false); }
  }, [entityId, adapter, qc, descriptor.kind, refreshVersions, autosave, setCurrent]);

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
