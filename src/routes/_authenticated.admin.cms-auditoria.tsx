import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarCmsAuditoria, modulosCmsAuditoria } from "@/lib/api/cms-audit.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileClock, Download, RefreshCcw, Search, Eye } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/cms-auditoria")({
  component: CmsAuditPage,
});

type Row = {
  id: string;
  created_at: string;
  user_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  ip: string | null;
  user_agent: string | null;
  before: unknown;
  after: unknown;
};

const SUB_ACTIONS = [
  "criar", "editar", "publicar", "excluir", "reordenar",
  "upload", "restaurar", "descartar", "salvar", "campos",
] as const;

function fmt(d: string) { return new Date(d).toLocaleString("pt-BR"); }

export default function CmsAuditPage() {
  const [modulo, setModulo] = useState<string>("");
  const [subAction, setSubAction] = useState<string>("");
  const [userEmail, setUserEmail] = useState("");
  const [entity, setEntity] = useState("");
  const [entityId, setEntityId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<Row | null>(null);
  const limit = 50;

  const modulos = useQuery({ queryKey: ["cms-audit-modulos"], queryFn: () => modulosCmsAuditoria() });

  const filters = useMemo(() => ({
    modulo: modulo || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sub_action: (subAction || null) as any,
    user_email: userEmail || null,
    entity: entity || null,
    entity_id: entityId || null,
    from: from ? new Date(from).toISOString() : null,
    to: to ? new Date(to).toISOString() : null,
    search: search || null,
    limit,
    offset: page * limit,
  }), [modulo, subAction, userEmail, entity, entityId, from, to, search, page]);

  const q = useQuery({
    queryKey: ["cms-audit", filters],
    queryFn: () => listarCmsAuditoria({ data: filters }),
  });

  const rows = (q.data?.rows ?? []) as Row[];
  const total = q.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  function reset() {
    setModulo(""); setSubAction(""); setUserEmail(""); setEntity("");
    setEntityId(""); setFrom(""); setTo(""); setSearch(""); setPage(0);
  }

  function exportCsv() {
    const header = ["created_at","user_email","action","entity","entity_id","ip","user_agent"];
    const lines = [header.join(";")];
    for (const r of rows) {
      lines.push([
        r.created_at, r.user_email ?? "", r.action, r.entity ?? "",
        r.entity_id ?? "", r.ip ?? "", (r.user_agent ?? "").replace(/[\r\n;]/g, " "),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cms-auditoria-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <AdminPageHeader
            eyebrow="CMS"
            title="Auditoria CMS"
          />
<p className="text-sm text-muted-foreground mt-1">
            Histórico completo de alterações nos módulos de conteúdo — páginas, mídias,
            formulários, campanhas, menu, branding e versões — com IP, user-agent e diff.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCcw className="size-4 mr-1" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="size-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Módulo</Label>
            <Select value={modulo || "all"} onValueChange={(v) => { setModulo(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(modulos.data ?? []).map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ação</Label>
            <Select value={subAction || "all"} onValueChange={(v) => { setSubAction(v === "all" ? "" : v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {SUB_ACTIONS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Usuário (e-mail)</Label>
            <Input value={userEmail} onChange={(e) => { setUserEmail(e.target.value); setPage(0); }} placeholder="ex: fulano@..." />
          </div>
          <div>
            <Label className="text-xs">Entidade (tabela)</Label>
            <Input value={entity} onChange={(e) => { setEntity(e.target.value); setPage(0); }} placeholder="ex: cms_pages" />
          </div>
          <div>
            <Label className="text-xs">ID do registro</Label>
            <Input value={entityId} onChange={(e) => { setEntityId(e.target.value); setPage(0); }} placeholder="uuid ou key" />
          </div>
          <div>
            <Label className="text-xs">De</Label>
            <Input type="datetime-local" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="datetime-local" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} />
          </div>
          <div>
            <Label className="text-xs">Busca livre</Label>
            <div className="relative">
              <Search className="size-3 absolute left-2 top-2.5 text-muted-foreground" />
              <Input className="pl-7" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="ação, e-mail ou id" />
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="ghost" size="sm" onClick={reset}>Limpar filtros</Button>
        </div>
      </div>

      <div className="bg-card border border-foreground/5 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>IP</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                <TableCell className="text-sm">{r.user_email ?? "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="font-mono text-[10px]">{r.action}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.entity ?? "—"}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[220px]">{r.entity_id ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.ip ?? "—"}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => setDetail(r)} aria-label="Ver detalhes">
                    <Eye className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {q.isLoading ? "Carregando…" : "Nenhum evento encontrado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{total} evento(s) • página {page + 1} de {pages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileClock className="size-5" /> Detalhes do evento
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Data/Hora" value={fmt(detail.created_at)} />
                <Info label="Usuário" value={detail.user_email ?? "—"} />
                <Info label="Ação" value={detail.action} mono />
                <Info label="Entidade" value={detail.entity ?? "—"} />
                <Info label="ID" value={detail.entity_id ?? "—"} mono />
                <Info label="IP" value={detail.ip ?? "—"} mono />
              </div>
              <Info label="User Agent" value={detail.user_agent ?? "—"} />
              <div className="grid gap-3 md:grid-cols-2">
                <JsonBlock title="Antes" value={detail.before} />
                <JsonBlock title="Depois" value={detail.after} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
