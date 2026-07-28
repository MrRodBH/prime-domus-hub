import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  listarTenants,
  atualizarTenant,
  estatisticasTenants,
  superKpisGlobais,
} from "@/lib/api/super.functions";
import { bootstrapTenantWithOwner } from "@/lib/api/tenant-lifecycle.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Inbox, LogIn, Plus, ShieldCheck, User2, Users } from "lucide-react";
import {
  clearImpersonationTenantId,
  setImpersonationTenantId,
} from "@/integrations/supabase/impersonation-state";
import { useImpersonation } from "@/integrations/supabase/use-impersonation";

export const Route = createFileRoute("/_authenticated/super/")({
  component: SuperTenantsPage,
});

type TenantRow = {
  id: string;
  nome: string;
  slug: string;
  status: string;
  dominio_principal: string | null;
  plano_codigo: string | null;
  owner_user_id: string | null;
  metadata: unknown;
};

type TenantStats = Record<string, { users: number; imoveis: number; leads: number }>;

function SuperTenantsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: tenants = [] } = useQuery({
    queryKey: ["super-tenants"],
    queryFn: () => listarTenants(),
  });
  const { data: stats = {} } = useQuery({
    queryKey: ["super-tenants-stats"],
    queryFn: () => estatisticasTenants(),
  });
  const { data: kpis } = useQuery({
    queryKey: ["super-kpis"],
    queryFn: () => superKpisGlobais(),
  });
  const [openNew, setOpenNew] = useState(false);
  const [edit, setEdit] = useState<TenantRow | null>(null);
  const impersonating = useImpersonation();

  function impersonate(id: string, destination: "/admin" | "/admin/memberships" = "/admin") {
    setImpersonationTenantId(id);
    toast.success("Impersonação ativada");
    navigate({ to: destination });
  }

  function clearImpersonation() {
    clearImpersonationTenantId();
    toast.success("Impersonação encerrada");
    qc.invalidateQueries();
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            Control Plane global. Bootstrap atômico, owner obrigatório e lifecycle auditável.
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-2" /> Novo tenant</Button>
          </DialogTrigger>
          <NovoTenantDialog
            onDone={() => {
              setOpenNew(false);
              void qc.invalidateQueries({ queryKey: ["super-tenants"] });
              void qc.invalidateQueries({ queryKey: ["super-tenants-stats"] });
              void qc.invalidateQueries({ queryKey: ["super-kpis"] });
            }}
          />
        </Dialog>
      </div>

      {kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Tenants" value={kpis.tenants} sub={`${kpis.tenantsAtivos} ativos`} />
          <KpiCard label="Usuários" value={kpis.users} />
          <KpiCard label="Imóveis" value={kpis.imoveis} />
          <KpiCard label="Leads" value={kpis.leads} sub={`+${kpis.leads24h} em 24h`} />
          <KpiCard
            label="Sync portais (7d)"
            value={`${kpis.portalOk7d} ok`}
            sub={`${kpis.portalErr7d} erros`}
            tone={kpis.portalErr7d > 0 ? "warn" : "ok"}
          />
          <KpiCard label="Auditoria 24h" value={kpis.auditoria24h} />
          <KpiCard label="MRR / ARR" value="Pendente" sub="Ativação em BCA-01" tone="warn" />
        </div>
      ) : null}

      {impersonating ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3 text-sm">
          <span>
            Você está impersonando o tenant <code className="font-mono">{impersonating}</code>.
          </span>
          <Button size="sm" variant="outline" onClick={clearImpersonation}>
            Encerrar impersonação
          </Button>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Nome / slug</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Owner</th>
              <th className="text-left px-4 py-3">Domínio</th>
              <th className="text-center px-4 py-3"><User2 className="size-3 inline" /></th>
              <th className="text-center px-4 py-3"><Building2 className="size-3 inline" /></th>
              <th className="text-center px-4 py-3"><Inbox className="size-3 inline" /></th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(tenants as TenantRow[]).map((tenant) => {
              const tenantStats = (stats as TenantStats)[tenant.id] ?? { users: 0, imoveis: 0, leads: 0 };
              return (
                <tr key={tenant.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{tenant.nome}</div>
                    <div className="text-xs text-muted-foreground font-mono">{tenant.slug}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={tenant.status} /></td>
                  <td className="px-4 py-3 text-xs">
                    {tenant.owner_user_id ? (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <ShieldCheck className="size-3 text-emerald-600" />
                        {tenant.owner_user_id.slice(0, 8)}…
                      </span>
                    ) : (
                      <span className="text-destructive">Owner ausente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {tenant.dominio_principal ? (
                      <span>{tenant.dominio_principal}</span>
                    ) : (
                      <Badge variant="outline">pending DCA-01</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{tenantStats.users}</td>
                  <td className="px-4 py-3 text-center">{tenantStats.imoveis}</td>
                  <td className="px-4 py-3 text-center">{tenantStats.leads}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setEdit(tenant)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => impersonate(tenant.id, "/admin/memberships")}>
                      <Users className="size-3 mr-1" /> Membros
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => impersonate(tenant.id)}>
                      <LogIn className="size-3 mr-1" /> Entrar
                    </Button>
                  </td>
                </tr>
              );
            })}
            {tenants.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Nenhum tenant.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {edit ? (
        <EditTenantDialog
          tenant={edit}
          onClose={() => setEdit(null)}
          onDone={() => {
            setEdit(null);
            void qc.invalidateQueries({ queryKey: ["super-tenants"] });
          }}
        />
      ) : null}
    </div>
  );
}

function KpiCard({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: "ok" | "warn" }) {
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
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [initialStatus, setInitialStatus] = useState<"trial" | "ativo">("trial");
  const mutation = useMutation({
    mutationFn: () => bootstrapTenantWithOwner({ data: { name, slug, ownerEmail, initialStatus } }),
    onSuccess: (result) => {
      toast.success(`Tenant ${result.name} criado com owner ${result.ownerEmail}.`);
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo tenant</DialogTitle>
        <DialogDescription>
          O tenant e o owner inicial são criados na mesma transação. O domínio será ativado na DCA-01.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div>
          <Label>Slug</Label>
          <Input
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase())}
            placeholder="minha-empresa"
          />
        </div>
        <div>
          <Label>E-mail do owner inicial</Label>
          <Input
            type="email"
            value={ownerEmail}
            onChange={(event) => setOwnerEmail(event.target.value)}
            placeholder="owner@empresa.com.br"
          />
          <p className="mt-1 text-xs text-muted-foreground">O usuário Auth deve existir antes do bootstrap.</p>
        </div>
        <div>
          <Label>Status inicial</Label>
          <Select value={initialStatus} onValueChange={(value: "trial" | "ativo") => setInitialStatus(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">trial</SelectItem>
              <SelectItem value="ativo">ativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Domain activation = <strong>pending DCA-01</strong>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !name.trim() || !slug.trim() || !ownerEmail.trim()}
        >
          {mutation.isPending ? "Criando…" : "Criar tenant e owner"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditTenantDialog({ tenant, onClose, onDone }: { tenant: TenantRow; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(tenant.nome);
  const [status, setStatus] = useState(tenant.status);
  const mutation = useMutation({
    mutationFn: () => atualizarTenant({ data: { id: tenant.id, nome: name, status: status as "ativo" | "suspenso" | "cancelado" | "trial" } }),
    onSuccess: () => { toast.success("Tenant atualizado"); onDone(); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tenant</DialogTitle>
          <DialogDescription>
            Domínio e billing são exibidos, mas suas ativações pertencem respectivamente à DCA-01 e BCA-01.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div>
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
          <div className="rounded-md border p-3 text-sm">
            <div><strong>Domínio:</strong> {tenant.dominio_principal ?? "pending DCA-01"}</div>
            <div><strong>Plano:</strong> {tenant.plano_codigo ?? "pending BCA-01"}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
