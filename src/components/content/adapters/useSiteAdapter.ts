import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getTenantConfigurationDraft,
  listTenantConfigurationVersions,
  publishTenantConfiguration,
  rollbackTenantConfiguration,
  saveTenantConfigurationDraft,
} from "@/lib/api/tenant-configuration.functions";
import {
  configurationDomainSnapshot,
  mergeConfigurationDomain,
  type ConfigurationDomain,
  type ConfigurationSnapshot,
} from "@/lib/api/configuration-registry";
import type {
  ContentEntityAdapter,
  ContentEntityDetail,
  ContentEntityRecord,
  ContentDraft,
  StatusValue,
  VersionRecord,
} from "../types";

export const SITE_SECTIONS: Array<{
  id: ConfigurationDomain;
  label: string;
  group: string;
  description: string;
}> = [
  { id: "identity", label: "Identidade institucional", group: "Marca", description: "Nomes, descrição, registros e regiões atendidas." },
  { id: "branding", label: "Logos e mídias da marca", group: "Marca", description: "Referências tenant-scoped à biblioteca de mídias." },
  { id: "visual", label: "Tokens visuais", group: "Marca", description: "Cores, tipografia, escala e bordas." },
  { id: "contact", label: "Contato e atendimento", group: "Institucional", description: "Canais, endereço, localização e horários." },
  { id: "social", label: "Redes sociais", group: "Institucional", description: "Destinos sociais HTTPS validados." },
  { id: "seo", label: "SEO padrão", group: "Publicação", description: "Metadados, robots, schema e sitemap." },
  { id: "legal", label: "Legal e privacidade", group: "Publicação", description: "Referências legais, cookies e controlador de dados." },
  { id: "catalog", label: "Comportamento do catálogo", group: "Produto", description: "Exibição, ordenação e CTAs do catálogo." },
  { id: "lead_capture", label: "Captação de leads", group: "Produto", description: "Campos obrigatórios, consentimento e visibilidade." },
  { id: "header_footer", label: "Cabeçalho, rodapé e menus", group: "Navegação", description: "Variações, menus, colunas e links legais." },
  { id: "analytics", label: "Analytics e marketing", group: "Integrações", description: "Identificadores públicos; secrets são proibidos." },
  { id: "future_activation", label: "Ativações futuras", group: "Integrações", description: "DCA-01, BCA-01 e PR-M3, em modo somente leitura." },
  { id: "legacy_content", label: "Conteúdo institucional existente", group: "Conteúdo", description: "Snapshots estruturados das páginas fixas existentes." },
];

function sectionFor(id: string) {
  return SITE_SECTIONS.find((section) => section.id === id);
}

export function useSiteAdapter(): ContentEntityAdapter {
  const stateFn = useServerFn(getTenantConfigurationDraft);
  const saveFn = useServerFn(saveTenantConfigurationDraft);
  const publishFn = useServerFn(publishTenantConfiguration);
  const versionsFn = useServerFn(listTenantConfigurationVersions);
  const rollbackFn = useServerFn(rollbackTenantConfiguration);

  const fetchList = useCallback(async (): Promise<ContentEntityRecord[]> => {
    const state = await stateFn();
    const status: StatusValue = state.draft ? "draft" : "published";
    const updatedAt = state.draft?.createdAt ?? state.published?.createdAt ?? new Date(0).toISOString();
    return SITE_SECTIONS.map((section) => ({
      id: section.id,
      titulo: section.label,
      slug: section.id,
      status,
      updated_at: updatedAt,
      extra: {
        group: section.group,
        description: section.description,
        expectedRevision: state.expectedRevision,
      },
    }));
  }, [stateFn]);

  const fetchDetail = useCallback(async (id: string): Promise<ContentEntityDetail> => {
    const section = sectionFor(id);
    if (!section) throw new Error("configuration_domain_not_cataloged");
    const state = await stateFn();
    return {
      id,
      titulo: section.label,
      slug: id,
      status: state.draft ? "draft" : "published",
      updated_at: state.draft?.createdAt ?? state.published?.createdAt ?? new Date(0).toISOString(),
      descricao: section.description,
      seo: {},
      blocks: [],
      data: {
        domain: section.id,
        value: configurationDomainSnapshot(state.snapshot, section.id),
        snapshot: state.snapshot,
        expectedRevision: state.expectedRevision,
        configurationStatus: state.status,
        publishedRevision: state.published?.revision ?? 0,
        draftRevision: state.draft?.revision ?? null,
      },
    };
  }, [stateFn]);

  const save = useCallback(async (
    id: string | null,
    draft: ContentDraft,
    options: { publish: boolean },
  ) => {
    if (!id) throw new Error("configuration_domains_are_singletons");
    const section = sectionFor(id);
    if (!section) throw new Error("configuration_domain_not_cataloged");
    if (section.id === "future_activation") throw new Error("configuration_future_activation_is_readonly");

    const data = draft.data as {
      domain?: ConfigurationDomain;
      value?: Record<string, unknown>;
      snapshot?: ConfigurationSnapshot;
      expectedRevision?: number;
    };
    if (data.domain !== section.id || !data.snapshot || !data.value || !Number.isInteger(data.expectedRevision)) {
      throw new Error("configuration_editor_state_invalid");
    }
    const snapshot = mergeConfigurationDomain(data.snapshot, section.id, data.value);
    await saveFn({
      data: {
        snapshot,
        expectedRevision: data.expectedRevision as number,
        notes: `Configuration Center — ${section.label}`,
      },
    });
    if (options.publish) {
      await publishFn({ data: { expectedRevision: data.expectedRevision as number } });
    }
    return { id };
  }, [publishFn, saveFn]);

  const remove = useCallback(async () => {
    throw new Error("configuration_domains_cannot_be_deleted");
  }, []);

  const listVersions = useCallback(async (): Promise<VersionRecord[]> => {
    const rows = await versionsFn();
    return rows.map((row) => ({
      id: row.id,
      label: `${row.status === "published" ? "Publicada" : "Arquivada"} · revisão ${row.revision}`,
      status: row.status,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      payload: row.snapshot,
    }));
  }, [versionsFn]);

  const restoreVersion = useCallback(async (_id: string, versionId: string) => {
    const state = await stateFn();
    await rollbackFn({
      data: {
        versionId,
        expectedRevision: state.expectedRevision,
      },
    });
  }, [rollbackFn, stateFn]);

  const publicUrl = useCallback(() => "/", []);

  return useMemo(
    () => ({ fetchList, fetchDetail, save, remove, listVersions, restoreVersion, publicUrl }),
    [fetchList, fetchDetail, save, remove, listVersions, restoreVersion, publicUrl],
  );
}
