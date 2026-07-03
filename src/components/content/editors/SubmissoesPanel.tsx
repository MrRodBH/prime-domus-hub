// SubmissoesPanel — lista de submissões do formulário (Bloco 3.1).
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarSubmissoes } from "@/lib/api/forms.functions";
import { useContentSession } from "../session";
import { Loader2 } from "lucide-react";

export function SubmissoesPanel() {
  const s = useContentSession();
  const fn = useServerFn(listarSubmissoes);
  const { data, isLoading } = useQuery({
    queryKey: ["form-submissoes", s.entityId],
    queryFn: () => fn({ data: { form_id: s.entityId!, page: 0, pageSize: 50 } }),
    enabled: !!s.entityId,
  });

  if (isLoading) return <div className="p-4"><Loader2 className="size-4 animate-spin" /></div>;
  const items = (data?.items ?? []) as Array<{ id: string; created_at: string; dados: Record<string, unknown> }>;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">{total} submissão(ões) registradas.</div>
      {items.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-md">Sem submissões.</div>
      ) : (
        <ul className="divide-y divide-foreground/5 rounded-md border border-foreground/10">
          {items.map((r) => (
            <li key={r.id} className="px-3 py-2">
              <div className="text-[10px] uppercase text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
              <div className="text-xs mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                {Object.entries(r.dados).map(([k, v]) => (
                  <div key={k}><span className="text-muted-foreground">{k}:</span> <span className="font-mono">{String(v ?? "")}</span></div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
