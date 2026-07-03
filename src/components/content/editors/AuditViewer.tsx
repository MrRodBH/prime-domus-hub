// AuditViewer — read-only viewer de evento (Bloco 3.1 §5).
import { useContentSession } from "../session";

export function AuditViewer() {
  const s = useContentSession();
  const d = s.draft.data as {
    user_email?: string | null; action?: string; entity?: string | null;
    entity_id?: string | null; ip?: string | null; user_agent?: string | null;
    before?: unknown; after?: unknown; created_at?: string;
  };
  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Data/Hora" value={d.created_at ? new Date(d.created_at).toLocaleString("pt-BR") : "—"} />
        <Info label="Usuário" value={d.user_email ?? "—"} />
        <Info label="Ação" value={d.action ?? "—"} mono />
        <Info label="Entidade" value={d.entity ?? "—"} />
        <Info label="ID do registro" value={d.entity_id ?? "—"} mono />
        <Info label="IP" value={d.ip ?? "—"} mono />
      </div>
      <Info label="User Agent" value={d.user_agent ?? "—"} />
      <div className="grid gap-3 md:grid-cols-2">
        <JsonBlock title="Antes" value={d.before} />
        <JsonBlock title="Depois" value={d.after} />
      </div>
    </div>
  );
}
function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-xs break-all" : "text-sm break-words"}>{value}</div>
    </div>
  );
}
function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="bg-muted/40 border border-foreground/5 rounded-md p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{title}</div>
      <pre className="text-[11px] whitespace-pre-wrap break-all font-mono max-h-72 overflow-y-auto">
        {value == null ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
