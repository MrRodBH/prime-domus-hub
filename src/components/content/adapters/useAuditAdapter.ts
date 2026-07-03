// Auditoria — Adapter (Bloco 3.1). Auditoria não é tela especial: é uma entidade
// somente-leitura dentro do ContentWorkspace.
import { useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listarCmsAuditoria } from "@/lib/api/cms-audit.functions";
import type {
  ContentEntityAdapter, ContentEntityDetail, ContentEntityRecord,
  StatusValue,
} from "../types";

type AuditRow = {
  id: string; created_at: string; user_email: string | null;
  action: string; entity: string | null; entity_id: string | null;
  ip: string | null; user_agent: string | null;
  before: unknown; after: unknown;
};

export function useAuditAdapter(): ContentEntityAdapter {
  const listFn = useServerFn(listarCmsAuditoria);

  const fetchList = useCallback(async (): Promise<ContentEntityRecord[]> => {
    const res = await listFn({ data: { limit: 200, offset: 0 } });
    return ((res.rows ?? []) as AuditRow[]).map((r) => ({
      id: r.id,
      titulo: r.action,
      slug: r.entity_id,
      status: "published" as StatusValue,
      updated_at: r.created_at,
      extra: {
        user_email: r.user_email, entity: r.entity, entity_id: r.entity_id,
        ip: r.ip,
      },
    }));
  }, [listFn]);

  const fetchDetail = useCallback(async (id: string): Promise<ContentEntityDetail> => {
    const res = await listFn({ data: { limit: 500, offset: 0 } });
    const row = ((res.rows ?? []) as AuditRow[]).find((r) => r.id === id);
    if (!row) throw new Error("Evento não encontrado");
    return {
      id: row.id,
      titulo: row.action,
      slug: row.entity_id,
      status: "published",
      updated_at: row.created_at,
      descricao: null,
      seo: {},
      blocks: [],
      data: {
        user_email: row.user_email, action: row.action, entity: row.entity,
        entity_id: row.entity_id, ip: row.ip, user_agent: row.user_agent,
        before: row.before, after: row.after, created_at: row.created_at,
      },
    };
  }, [listFn]);

  const save = useCallback(async () => { throw new Error("Auditoria é somente-leitura"); }, []);
  const remove = useCallback(async () => { throw new Error("Auditoria é somente-leitura"); }, []);

  return useMemo(() => ({ fetchList, fetchDetail, save, remove }), [fetchList, fetchDetail, save, remove]);
}
