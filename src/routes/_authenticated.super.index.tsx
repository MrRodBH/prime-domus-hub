import { PlatformUsers } from "@/components/onboarding/PlatformUsers";
import { PersistentOnboarding } from "@/components/onboarding/PersistentOnboarding";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  listarTenants,
  atualizarTenant,
  estatisticasTenants,
  superKpisGlobais,
} from "@/lib/api/super.functions";
import { registerSetupCompany } from "@/lib/api/initial-admin-setup.functions";
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
import { Building2, Inbox, Plus, ShieldCheck, User2, Users } from "lucide-react";


export const Route = createFileRoute("/_authenticated/super/")({
  validateSearch: (search: Record<string, unknown>): { view?: "dashboard" | "plans" | "tenants" } => ({ view: search.view === "plans" || search.view === "tenants" ? search.view : "dashboard" }),
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
  const { view } = Route.useSearch();
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Dashboard</p>
          <h1 className="font-display text-4xl font-semibold">A visão completa do seu SaaS</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os planos e as empresas da sua plataforma.
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" /> Novo tenant
            </Button>
          </DialogTrigger>
          <NovoTenantDialog
            onDone={() => {
              setOpenNew(false);
              void navigate({ to: "/super", search: { view: "tenants" } });
              void qc.invalidateQueries({ queryKey: ["super-tenants"] });
              void qc.invalidateQueries({ queryKey: ["super-onboarding"] });
              void qc.invalidateQueries({ queryKey: ["super-tenants-stats"] });
              void qc.invalidateQueries({ queryKey: ["super-kpis"] });
            }}
          />
        </Dialog>
      </div>

      <PersistentOnboarding currentView={view ?? "dashboard"} onViewChange={next => { void navigate({ to: "/super", search: { view: next } }); }} />

      {view === "dashboard" && <>
        <section className="rounded-xl border bg-card p-6 space-y-4" aria-labelledby="platform-services">
          <h2 id="platform-services" className="font-display text-2xl">Serviços da plataforma</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link to="/super/domains" className="rounded-lg border p-4 hover:bg-muted focus-visible:outline focus-visible:outline-2">
              <strong className="block">Domínios e provedores</strong>
              <span className="text-sm text-muted-foreground">Configurar a infraestrutura e acompanhar falhas de conexão.</span>
            </Link>
            <Link to="/super/control-plane" search={{ section: "suporte" }} className="rounded-lg border p-4 hover:bg-muted focus-visible:outline focus-visible:outline-2">
              <strong className="block">Atendimento aos clientes</strong>
              <span className="text-sm text-muted-foreground">Registrar solicitações recebidas e acompanhar a resolução.</span>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">Website, CMS, conexão do domínio e operação comercial ficam no ambiente da empresa, em Conteúdo. O acesso é feito por uma conta autorizada da equipe. Esta conta Super Admin permanece na gestão da plataforma.</p>
        </section>
        <PlatformUsers />
      </>}
      <details className="rounded-xl border bg-card p-5">
        <summary className="cursor-pointer font-semibold">
          Operação dos tenants e indicadores globais
        </summary>
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

        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Nome / slug</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Domínio</th>
                <th className="text-center px-4 py-3">
                  <User2 className="size-3 inline" />
                </th>
                <th className="text-center px-4 py-3">
                  <Building2 className="size-3 inline" />
                </th>
                <th className="text-center px-4 py-3">
                  <Inbox className="size-3 inline" />
                </th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(tenants as TenantRow[]).map((tenant) => {
                const tenantStats = (stats as TenantStats)[tenant.id] ?? {
                  users: 0,
                  imoveis: 0,
                  leads: 0,
                };
                return (
                  <tr key={tenant.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{tenant.nome}</div>
                      <div className="text-xs text-muted-foreground font-mono">{tenant.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tenant.status} />
                    </td>
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
                      <Button size="sm" variant="ghost" onClick={() => setEdit(tenant)}>
                        Editar
                      </Button>

                    </td>
                  </tr>
                );
              })}
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum tenant.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </details>

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

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: "ok" | "warn";
}) {
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
  return (
    <Badge variant="outline" className={map[status] ?? ""}>
      {status}
    </Badge>
  );
}

function NovoTenantDialog({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [registrationId, setRegistrationId] = useState(() => crypto.randomUUID());
  const [source, setSource] = useState<"direct_sale" | "sales_platform">("direct_sale");
  const [reference, setReference] = useState("");

  const mutation = useMutation({
    mutationFn: () => registerSetupCompany({ data: { id: registrationId, name, slug, source, reference } }),
    onSuccess: (result) => {
      toast.success(`Empresa ${result.name} cadastrada. Complete seus dados e cadastre o Admin na próxima etapa.`);
      setRegistrationId(crypto.randomUUID()); setName(""); setSlug(""); setReference(""); setSource("direct_sale");
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo tenant</DialogTitle>
        <DialogDescription>
          Primeiro cadastre a empresa. Depois salve seus dados e plano, e cadastre o Admin em uma etapa independente.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Nome</Label>
          <Input disabled={mutation.isPending} value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input
            disabled={mutation.isPending}
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase())}
            placeholder="minha-empresa"
          />
        </div>
        <div><Label>Origem do cadastro</Label><Select disabled={mutation.isPending} value={source} onValueChange={(value: "direct_sale" | "sales_platform")=>setSource(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct_sale">Compra direta</SelectItem><SelectItem value="sales_platform">Plataforma de vendas</SelectItem></SelectContent></Select></div>
        <div><Label>Referência da venda{source === "sales_platform" ? " (obrigatória)" : " (opcional)"}</Label><Input disabled={mutation.isPending} value={reference} onChange={e=>setReference(e.target.value)} maxLength={200}/></div>
        <p className="text-sm text-muted-foreground">O cadastro registra a origem da empresa. A confirmação financeira segue o fluxo da venda; nenhum usuário é criado nesta etapa.</p>
      </div>
      <DialogFooter>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !name.trim() || !slug.trim() || (source === "sales_platform" && !reference.trim())}
        >
          {mutation.isPending ? "Criando…" : "Cadastrar empresa"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditTenantDialog({
  tenant,
  onClose,
  onDone,
}: {
  tenant: TenantRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(tenant.nome);
  const [status, setStatus] = useState(tenant.status);
  const mutation = useMutation({
    mutationFn: () =>
      atualizarTenant({
        data: {
          id: tenant.id,
          nome: name,
          status: status as "ativo" | "suspenso" | "cancelado" | "trial",
        },
      }),
    onSuccess: () => {
      toast.success("Tenant atualizado");
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tenant</DialogTitle>
          <DialogDescription>
            Domínio e billing são exibidos, mas suas ativações pertencem respectivamente à DCA-01 e
            BCA-01.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">ativo</SelectItem>
                <SelectItem value="trial">trial</SelectItem>
                <SelectItem value="suspenso">suspenso</SelectItem>
                <SelectItem value="cancelado">cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border p-3 text-sm">
            <div>
              <strong>Domínio:</strong> {tenant.dominio_principal ?? "pending DCA-01"}
            </div>
            <div>
              <strong>Plano:</strong> {tenant.plano_codigo ?? "pending BCA-01"}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
