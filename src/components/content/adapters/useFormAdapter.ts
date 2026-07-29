// Formulário — adapter canônico PR-M2.
// Definição e campos são persistidos em um único snapshot/versionamento; não
// existe mais segundo save tolerado nem estado parcial de fields.
import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getTenantForm,
  listTenantForms,
  listTenantFormVersions,
  publishTenantForm,
  saveTenantFormDraft,
} from "@/lib/api/tenant-cms.functions";
import type {
  ContentEntityAdapter,
  ContentEntityDetail,
  ContentEntityRecord,
  ContentDraft,
  StatusValue,
  VersionRecord,
} from "../types";

export function useFormAdapter(): ContentEntityAdapter {
  const listFn = useServerFn(listTenantForms);
  const getFn = useServerFn(getTenantForm);
  const saveDraftFn = useServerFn(saveTenantFormDraft);
  const publishFn = useServerFn(publishTenantForm);
  const versionsFn = useServerFn(listTenantFormVersions);

  const fetchList = useCallback(async (): Promise<ContentEntityRecord[]> => {
    const rows = await listFn();
    return (rows as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as string,
      titulo: row.nome as string,
      slug: row.slug as string,
      status: row.status as StatusValue,
      updated_at: row.updated_at as string,
      published_at: (row.published_at as string | null) ?? null,
      extra: {
        revision: Number(row.revision),
        schemaVersion: Number(row.schema_version),
        draftVersionId: row.draft_version_id ?? null,
        publishedVersionId: row.published_version_id ?? null,
      },
    }));
  }, [listFn]);

  const fetchDetail = useCallback(async (id: string): Promise<ContentEntityDetail> => {
    const result = await getFn({ data: { id } });
    const form = result.form as Record<string, unknown>;
    const snapshot = result.effectiveSnapshot as Record<string, unknown> | null;
    const config = snapshot?.config && typeof snapshot.config === "object" && !Array.isArray(snapshot.config)
      ? snapshot.config as Record<string, unknown>
      : {};
    const fields = Array.isArray(snapshot?.fields) ? snapshot?.fields : [];
    return {
      id: form.id as string,
      titulo: (snapshot?.nome as string) ?? (form.nome as string) ?? "",
      slug: (snapshot?.slug as string) ?? (form.slug as string) ?? "",
      status: (form.status as StatusValue) ?? "draft",
      updated_at: (form.updated_at as string) ?? new Date(0).toISOString(),
      published_at: (form.published_at as string | null) ?? null,
      descricao: (snapshot?.descricao as string | null) ?? (form.descricao as string | null) ?? null,
      seo: {},
      blocks: [],
      data: {
        revision: Number(form.revision ?? 0),
        schemaVersion: Number(form.schema_version ?? 0),
        draftVersionId: result.draft?.id ?? null,
        publishedVersionId: result.published?.id ?? null,
        legacySnapshot: result.draft?.schemaVersion === 0 || result.published?.schemaVersion === 0,
        config,
        fields,
      },
    };
  }, [getFn]);

  const save = useCallback(
    async (id: string | null, draft: ContentDraft, opts: { publish: boolean }) => {
      const fields = Array.isArray(draft.data.fields) ? draft.data.fields : [];
      const config = draft.data.config && typeof draft.data.config === "object" && !Array.isArray(draft.data.config)
        ? draft.data.config as Record<string, unknown>
        : {};
      const expectedRevision = Number(draft.data.revision ?? 0);
      const saved = await saveDraftFn({
        data: {
          id: id ?? undefined,
          expectedRevision,
          snapshot: {
            ...(id ? { form_id: id } : {}),
            schema_version: 1,
            nome: draft.titulo.trim() || "Novo formulário",
            slug: draft.slug.trim(),
            status: "draft",
            descricao: draft.descricao.trim() || null,
            config: {
              success_message: typeof config.success_message === "string" ? config.success_message : undefined,
              redirect_url: typeof config.redirect_url === "string" ? config.redirect_url : undefined,
              submit_button_label: typeof config.submit_button_label === "string" ? config.submit_button_label : undefined,
              criar_lead: typeof config.criar_lead === "boolean" ? config.criar_lead : true,
              lead_origem_slug: typeof config.lead_origem_slug === "string" ? config.lead_origem_slug : undefined,
              consent_required: typeof config.consent_required === "boolean" ? config.consent_required : false,
            },
            fields: fields as never,
          },
        },
      });
      const formId = String(saved.formId);
      const revision = Number(saved.revision);
      if (opts.publish) await publishFn({ data: { formId, expectedRevision: revision } });
      return { id: formId };
    },
    [publishFn, saveDraftFn],
  );

  const remove = useCallback(async () => {
    throw new Error("Exclusão direta retirada: arquive o formulário por workflow explícito.");
  }, []);

  const listVersions = useCallback(async (id: string): Promise<VersionRecord[]> => {
    const versions = await versionsFn({ data: { formId: id } });
    return versions.map((version) => ({
      id: version.id,
      label: `Revisão ${version.revision}`,
      status: version.status,
      createdAt: version.createdAt,
      createdBy: version.createdBy,
      payload: version.snapshot,
    }));
  }, [versionsFn]);

  return useMemo(
    () => ({
      fetchList,
      fetchDetail,
      save,
      remove,
      listVersions,
      publicUrl: (_detail, draft) => (draft.slug ? `/f/${draft.slug}` : null),
    }),
    [fetchList, fetchDetail, save, remove, listVersions],
  );
}
