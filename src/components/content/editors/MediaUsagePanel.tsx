// MediaUsagePanel — onde a mídia é usada.
import { useContentSession } from "../session";

export function MediaUsagePanel() {
  const s = useContentSession();
  const usos = (s.draft.data.usos as Array<{ id: string; entidade: string; entidade_id: string | null; campo: string | null; created_at: string }>) ?? [];
  return (
    <div className="max-w-3xl">
      {usos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esta mídia ainda não é referenciada em nenhum conteúdo.</p>
      ) : (
        <ul className="rounded-md border border-foreground/10 divide-y divide-foreground/5">
          {usos.map((u) => (
            <li key={u.id} className="px-3 py-2 text-sm flex items-center gap-3">
              <span className="font-mono text-xs bg-muted rounded px-1.5 py-0.5">{u.entidade}</span>
              <span className="text-muted-foreground text-xs truncate">{u.entidade_id ?? "—"}</span>
              {u.campo && <span className="text-[10px] uppercase text-muted-foreground">campo: {u.campo}</span>}
              <span className="ml-auto text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
