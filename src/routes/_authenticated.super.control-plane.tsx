import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Building2,
  CircleDollarSign,
  CloudCog,
  Database,
  HeartPulse,
  LifeBuoy,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSuperControlPlaneSnapshot } from "@/lib/api/super-control-plane.functions";

export const Route = createFileRoute("/_authenticated/super/control-plane")({
  component: SuperControlPlanePage,
});

function SuperControlPlanePage() {
  const query = useQuery({
    queryKey: ["super-control-plane"],
    queryFn: () => getSuperControlPlaneSnapshot(),
    staleTime: 30_000,
  });

  if (query.isLoading) {
    return <StateCard icon={<Loader2 className="size-5 animate-spin" />} title="Carregando Control Plane" description="Consolidando fontes globais e diagnósticos." />;
  }
  if (query.isError || !query.data) {
    return (
      <StateCard
        icon={<AlertTriangle className="size-5" />}
        title="Control Plane indisponível"
        description={query.error instanceof Error ? query.error.message : "Falha ao consolidar as fontes obrigatórias."}
        action={<Button onClick={() => void query.refetch()}><RefreshCw className="size-4 mr-2" />Tentar novamente</Button>}
      />
    );
  }

  const data = query.data;
  const executive = data.globalExecutiveDashboard;
  const integration = data.integrations;
  const commercial = data.commercialVisibility;

  return (
    <div className="max-w-[1500px] mx-auto space-y-6 pb-12">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold">SaaS Control Plane</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Autoridade global da plataforma. Recursos internos de tenant exigem impersonação explícita e auditada.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Read-only comercial</Badge>
          <Badge variant="outline">DCA-01 pendente</Badge>
          <Badge variant="outline">BCA-01 pendente</Badge>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <RefreshCw className="size-4 mr-2" />Atualizar
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard icon={<Building2 className="size-4" />} label="Tenants" value={executive.tenantCount} helper={`${executive.activeTenantCount} ativos`} />
        <MetricCard icon={<Users className="size-4" />} label="Usuários" value={executive.distinctMembershipUsers} helper={`${executive.membershipCount} memberships`} />
        <MetricCard icon={<Activity className="size-4" />} label="Auditoria 24h" value={executive.auditEvents24h} />
        <MetricCard icon={<AlertTriangle className="size-4" />} label="Incidentes abertos" value={executive.openIncidentCount} />
        <MetricCard icon={<LifeBuoy className="size-4" />} label="Suporte aberto" value={executive.openSupportCount} />
        <MetricCard icon={<CircleDollarSign className="size-4" />} label="MRR realizado" value="Não provado" helper="Ativação em BCA-01" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="Comercial" icon={<CircleDollarSign className="size-4" />}>
          <KeyValue label="Planos catalogados" value={Array.isArray(commercial.plans) ? commercial.plans.length : 0} />
          <KeyValue label="Entitlements" value={Array.isArray(commercial.entitlementDefinitions) ? commercial.entitlementDefinitions.length : 0} />
          <KeyValue label="Relações plano-entitlement" value={commercial.planEntitlementRelationships} />
          <KeyValue label="Mappings de billing" value={commercial.billingProviderMappings} />
          <KeyValue label="Eventos de billing — 7d" value={commercial.billingEvents7d} />
          <StateLine state={commercial.activationState} label="Provider, checkout e MRR continuam bloqueados" />
        </Panel>

        <Panel title="Integrações" icon={<Webhook className="size-4" />}>
          <KeyValue label="Conectores de portal" value={integration.portalConnectorCount} />
          <KeyValue label="Jobs de portal" value={sumValues(integration.portalJobStates)} />
          <KeyValue label="Conectores de marketing" value={sumValues(integration.marketingConnectorStates)} />
          <KeyValue label="Ingestões de marketing — 7d" value={sumValues(integration.marketingIngestionStates7d)} />
          <KeyValue label="Tracking providers" value={sumValues(integration.trackingProviderStates)} />
          <StateLine state="external_delivery_not_implied" label="Estado local não comprova entrega externa" />
        </Panel>

        <Panel title="Operação e health" icon={<HeartPulse className="size-4" />}>
          <KeyValue label="Filas de portal" value={data.operations.queues.portalJobs} />
          <KeyValue label="Fila de marketing — 7d" value={data.operations.queues.marketingEvents7d} />
          <KeyValue label="Agendamentos CMS" value={data.operations.queues.cmsSchedules} />
          <KeyValue label="Alertas CRM abertos" value={data.operations.health.openCrmAlerts} />
          <KeyValue label="Schedules CMS ativos" value={data.operations.health.activeCmsSchedules} />
          <StateLine state={data.operations.health.dataCompleteness} label="Snapshot consolidado sem aceitação parcial" />
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Tenants e lifecycle" icon={<Building2 className="size-4" />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-2">Tenant</th><th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Memberships</th><th className="text-left py-2">Domínio</th>
                  <th className="text-left py-2">Billing</th><th className="text-right py-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {data.tenants.map((tenant: any) => (
                  <tr key={tenant.id} className="border-b last:border-0">
                    <td className="py-3"><div className="font-medium">{tenant.nome}</div><div className="font-mono text-xs text-muted-foreground">{tenant.slug}</div></td>
                    <td className="py-3"><Badge variant="outline">{tenant.status}</Badge></td>
                    <td className="py-3">{tenant.membershipSummary.memberships} · {tenant.membershipSummary.owners} owner</td>
                    <td className="py-3 text-xs">{tenant.domainActivationState}</td>
                    <td className="py-3 text-xs">{tenant.billingActivationState}</td>
                    <td className="py-3 text-right">
                      <Button asChild size="sm" variant="outline"><Link to="/super">Impersonar pelo cadastro</Link></Button>
                    </td>
                  </tr>
                ))}
                {data.tenants.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum tenant.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Gates externos" icon={<CloudCog className="size-4" />}>
          <StateLine state={data.domainVisibility.activationState} label={`${data.domainVisibility.configuredTenantDomains} domínio(s) configurado(s)`} />
          <StateLine state={commercial.activationState} label="Billing provider, checkout e portal indisponíveis" />
          <StateLine state="tenant_detail_requires_impersonation" label="Sem acesso direto a recursos tenant-scoped" />
          <StateLine state="same_backend_homologation_cell" label="Sem fallback para backend externo" />
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Incidentes" icon={<AlertTriangle className="size-4" />}>
          <RecordList records={data.incidents} empty="Nenhum incidente registrado." titleKey="title" stateKey="status" secondaryKey="incident_key" />
        </Panel>
        <Panel title="Suporte" icon={<LifeBuoy className="size-4" />}>
          <RecordList records={data.support} empty="Nenhum caso de suporte registrado." titleKey="subject" stateKey="status" secondaryKey="case_key" />
        </Panel>
      </section>

      <Panel title="Registry operacional" icon={<Database className="size-4" />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.operations.registry.map((operation: any) => (
            <div key={operation.key} className="rounded-lg border p-3">
              <div className="font-mono text-xs">{operation.key}</div>
              <div className="mt-2 flex flex-wrap gap-1"><Badge variant="secondary">{operation.category}</Badge><Badge variant="outline">{operation.executionState}</Badge></div>
              <p className="mt-2 text-xs text-muted-foreground">{operation.authority}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function sumValues(record: Record<string, number>) {
  return Object.values(record).reduce((total, value) => total + value, 0);
}
function MetricCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper?: string }) {
  return <div className="rounded-lg border bg-card p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div>{helper ? <div className="mt-1 text-xs text-muted-foreground">{helper}</div> : null}</div>;
}
function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-lg border bg-card p-4"><h2 className="flex items-center gap-2 font-medium">{icon}{title}</h2><div className="mt-4 space-y-3">{children}</div></section>;
}
function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
function StateLine({ state, label }: { state: string; label: string }) {
  return <div className="rounded-md border px-3 py-2"><div className="font-mono text-xs">{state}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>;
}
function RecordList({ records, empty, titleKey, stateKey, secondaryKey }: { records: any[]; empty: string; titleKey: string; stateKey: string; secondaryKey: string }) {
  if (!records.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return <div className="space-y-2">{records.slice(0, 20).map((record) => <div key={record.id} className="rounded-md border px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{record[titleKey]}</span><Badge variant="outline">{record[stateKey]}</Badge></div><div className="mt-1 font-mono text-xs text-muted-foreground">{record[secondaryKey]}</div></div>)}</div>;
}
function StateCard({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return <div className="max-w-xl mx-auto mt-20 rounded-lg border bg-card p-8 text-center"><div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">{icon}</div><h1 className="mt-4 text-lg font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</div>;
}
