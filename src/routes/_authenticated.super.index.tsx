import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listarTenants,
  criarTenant,
  atualizarTenant,
  estatisticasTenants,
  superKpisGlobais,
} from "@/lib/api/super.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, User2, Building2, Inbox, LogIn } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/")({
  component: SuperTenantsPage,
});

function SuperTenantsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: tenants = [] } = useQuery({ queryKey: ["super-tenants"], queryFn: () => listarTenants() });
  const { data: stats = {} } = useQuery({ queryKey: ["super-tenants-stats"], queryFn: () => estatisticasTenants() });
  const { data: kpis } = useQuery({ queryKey: ["super-kpis"], queryFn: () => superKpisGlobais() });
  const [openNew, setOpenNew] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);

  const impersonating = typeof window !== "undefined" ? localStorage.getItem("impersonate_tenant_id") : null;

  function impersonate(id: string) {
    localStorage.setItem("impersonate_tenant_id", id);
    toast.success("Impersonação ativada");
    navigate({ to: "/admin" });
  }
  function clearImpersonation() {
    localStorage.removeItem("impersonate_tenant_id");
    toast.success("Impersonação encerrada");
    qc.invalidateQueries();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="text-sm text-muted-foreground">Contas SaaS operando na plataforma.</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-2" /> Novo tenant</Button>
          </DialogTrigger>
          <NovoTenantDialog onDone={() => { setOpenNew(false); qc.invalidateQueries({ queryKey: ["super-tenants"] }); }} />
        </Dialog>
      </div>

      {kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Tenants" value={kpis.tenants} sub={`${kpis.tenantsAtivos} ativos`} />
          <KpiCard label="Usuários" value={kpis.users} />
          <KpiCard label="Imóveis" value={kpis.imoveis} />
          <KpiCard label="Leads" value={kpis.leads} sub={`+${kpis.leads24h} em 24h`} />
          <KpiCard label="Sync portais (7d)" value={`${kpis.portalOk7d} ok`} sub={`${kpis.portalErr7d} erros`} tone={kpis.portalErr7d > 0 ? "warn" : "ok"} />
          <KpiCard label="Auditoria 24h" value={kpis.auditoria24h} />
          <KpiCard label="MRR / ARR" value="⚠️ pendente" sub="Requer módulo de billing" tone="warn" />
        </div>
      ) : null}

      {impersonating ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center justify-between text-sm">
          <span>Você está impersonando o tenant <code className="font-mono">{impersonating}</code>.</span>
          <Button size="sm" variant="outline" onClick={clearImpersonation}>Encerrar impersonação</Button>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Nome / slug</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Domínio</th>
              <th className="text-center px-4 py-3"><User2 className="size-3 inline" /></th>
              <th className="text-center px-4 py-3"><Building2 className="size-3 inline" /></th>
              <th className="text-center px-4 py-3"><Inbox className="size-3 inline" /></th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t: any) => {
              const s = (stats as any)[t.id] ?? { users: 0, imoveis: 0, leads: 0 };
              return (
                <tr key={t.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.nome}</div>
                    <div className="text-xs text-muted-foreground font-mono">{t.slug}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.dominio_principal ?? "—"}</td>
                  <td className="px-4 py-3 text-center">{s.users}</td>
                  <td className="px-4 py-3 text-center">{s.imoveis}</td>
                  <td className="px-4 py-3 text-center">{s.leads}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => setEdit(t)}>Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => impersonate(t.id)}>
                      <LogIn className="size-3 mr-1" /> Entrar
                    </Button>
                  </td>
                </tr>
              );
            })}
            {tenants.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Nenhum tenant.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {edit ? (
        <EditTenantDialog tenant={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["super-tenants"] }); }} />
      ) : null}
    </div>
  );
}

function KpiCard({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "ok" | "warn" }) {
  const toneCls = tone === "warn" ? "border-amber-500/30 bg-amber-500/5" : "";
  return (
    <div className={`rounded-lg border bg-card p-4 ${toneCls}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground mt-1">{sub}</div> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativo: "bg-green-500/15 text-green-700 border-green-500/30",
    trial: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    suspenso: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    cancelado: "bg-red-500/15 text-red-700 border-red-500/30",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}

function NovoTenantDialog({ onDone }: { onDone: () => void }) {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [dominio, setDominio] = useState("");
  const mut = useMutation({
    mutationFn: () => criarTenant({ data: { nome, slug, dominio_principal: dominio || null } }),
    onSuccess: () => { toast.success("Tenant criado"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo tenant</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="minha-empresa" /></div>
        <div><Label>Domínio principal (opcional)</Label><Input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="minhaempresa.com.br" /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || !nome || !slug}>Criar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditTenantDialog({ tenant, onClose, onDone }: { tenant: any; onClose: () => void; onDone: () => void }) {
  const [nome, setNome] = useState(tenant.nome);
  const [status, setStatus] = useState(tenant.status);
  const [dominio, setDominio] = useState(tenant.dominio_principal ?? "");
  const [plano, setPlano] = useState(tenant.plano_codigo ?? "");
  const mut = useMutation({
    mutationFn: () => atualizarTenant({ data: { id: tenant.id, nome, status, dominio_principal: dominio || null, plano_codigo: plano || null } }),
    onSuccess: () => { toast.success("Atualizado"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar tenant</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">ativo</SelectItem>
                <SelectItem value="trial">trial</SelectItem>
                <SelectItem value="suspenso">suspenso</SelectItem>
                <SelectItem value="cancelado">cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Domínio principal</Label><Input value={dominio} onChange={(e) => setDominio(e.target.value)} /></div>
          <div><Label>Plano</Label><Input value={plano} onChange={(e) => setPlano(e.target.value)} placeholder="ex: starter, pro (Fase 3)" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
