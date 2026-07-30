import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, CalendarDays, Contact, Download, Loader2, RefreshCw, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  exportTenantCrmData,
  getTenantCrmFunctionalRegistry,
  listTenantCrmAlerts,
  listTenantCrmAutomationRules,
  listTenantCrmCalendarEvents,
  listTenantCrmContacts,
  listTenantCrmProposals,
  listTenantCrmSlaPolicies,
  listTenantCrmVisits,
  saveTenantCrmContact,
  saveTenantCrmSlaPolicy,
} from "@/lib/api/tenant-crm-functional.functions";

export const Route = createFileRoute("/_authenticated/admin/crm-operacoes")({
  component: CrmOperationsPage,
});

function CrmOperationsPage() {
  const queryClient = useQueryClient();
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [slaMinutes, setSlaMinutes] = useState("120");
  const [exportContent, setExportContent] = useState("");

  const registry = useQuery({ queryKey: ["crm-functional", "registry"], queryFn: () => getTenantCrmFunctionalRegistry() });
  const contacts = useQuery({ queryKey: ["crm-functional", "contacts"], queryFn: () => listTenantCrmContacts({ data: { limit: 200 } }) });
  const calendar = useQuery({ queryKey: ["crm-functional", "calendar"], queryFn: () => listTenantCrmCalendarEvents({ data: {} }) });
  const visits = useQuery({ queryKey: ["crm-functional", "visits"], queryFn: () => listTenantCrmVisits({ data: {} }) });
  const proposals = useQuery({ queryKey: ["crm-functional", "proposals"], queryFn: () => listTenantCrmProposals({ data: {} }) });
  const alerts = useQuery({ queryKey: ["crm-functional", "alerts"], queryFn: () => listTenantCrmAlerts({ data: { state: "open" } }), refetchInterval: 30_000 });
  const automations = useQuery({ queryKey: ["crm-functional", "automations"], queryFn: () => listTenantCrmAutomationRules() });
  const sla = useQuery({ queryKey: ["crm-functional", "sla"], queryFn: () => listTenantCrmSlaPolicies() });

  const queries = [registry, contacts, calendar, visits, proposals, alerts, automations, sla];
  const loading = queries.some((query) => query.isLoading);
  const failed = queries.find((query) => query.isError);
  const invalidate = async () => queryClient.invalidateQueries({ queryKey: ["crm-functional"] });

  const createContact = useMutation({
    mutationFn: () => saveTenantCrmContact({ data: {
      name: contactName,
      email: contactEmail.trim() || null,
      phone: contactPhone.trim() || null,
      leadId: null,
    } }),
    onSuccess: async () => {
      setContactName(""); setContactEmail(""); setContactPhone("");
      await invalidate();
      toast.success("Contato criado pelo boundary CRM.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveSla = useMutation({
    mutationFn: () => saveTenantCrmSlaPolicy({ data: {
      policyKey: "first_response",
      thresholdMinutes: Number(slaMinutes),
      active: true,
    } }),
    onSuccess: async () => { await invalidate(); toast.success("SLA de primeira resposta salvo."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const exportData = useMutation({
    mutationFn: () => exportTenantCrmData({ data: { format: "CSV", resource: "contacts" } }),
    onSuccess: (result) => {
      setExportContent(result.content);
      toast.success(`Exportação determinística: ${result.rows} linha(s).`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (loading) return <State title="Carregando CRM operacional" icon={<Loader2 className="size-5 animate-spin" />} />;
  if (failed) return <State title="CRM operacional indisponível" description={failed.error instanceof Error ? failed.error.message : "Falha segura."} icon={<AlertTriangle className="size-5" />} action={<Button onClick={() => void invalidate()}><RefreshCw className="mr-2 size-4" />Tentar novamente</Button>} />;

  const capabilityCount = registry.data?.capabilities.length ?? 0;
  return (
    <div className="mx-auto max-w-[1450px] space-y-6 pb-12">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CRM Operational Center</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Contatos, agenda, visitas, propostas, automações, SLA, alertas, importação, exportação e comunicação fail-closed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{capabilityCount} capacidades</Badge>
          <Badge variant="outline">server-only tenant authority</Badge>
          <Badge variant="outline">communication adapter_not_implemented</Badge>
          <Button size="sm" variant="outline" onClick={() => void invalidate()}><RefreshCw className="mr-2 size-4" />Atualizar</Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Contatos" value={(contacts.data ?? []).length} icon={<Contact className="size-4" />} />
        <Metric label="Agenda" value={(calendar.data ?? []).length} icon={<CalendarDays className="size-4" />} />
        <Metric label="Visitas" value={(visits.data ?? []).length} icon={<CalendarDays className="size-4" />} />
        <Metric label="Propostas" value={(proposals.data ?? []).length} icon={<Workflow className="size-4" />} />
        <Metric label="Alertas abertos" value={(alerts.data ?? []).length} icon={<AlertTriangle className="size-4" />} />
        <Metric label="Automações" value={(automations.data ?? []).length} icon={<Workflow className="size-4" />} />
      </section>

      <Tabs defaultValue="contacts">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="calendar">Agenda e visitas</TabsTrigger>
          <TabsTrigger value="proposals">Propostas</TabsTrigger>
          <TabsTrigger value="automation">Automação e SLA</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="export">Exportação</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="grid gap-4 pt-4 xl:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader><CardTitle>Novo contato</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Nome" value={contactName} onChange={setContactName} />
              <Field label="E-mail" value={contactEmail} onChange={setContactEmail} />
              <Field label="Telefone" value={contactPhone} onChange={setContactPhone} />
              <Button className="w-full" disabled={!contactName.trim() || createContact.isPending} onClick={() => createContact.mutate()}>
                {createContact.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Criar contato
              </Button>
            </CardContent>
          </Card>
          <RecordTable
            title="Contatos tenant-scoped"
            rows={(contacts.data ?? []).map((row: any) => ({ id: row.id, primary: row.name, secondary: row.email ?? row.phone ?? "Sem contato", state: row.status, meta: `v${row.row_version}` }))}
          />
        </TabsContent>

        <TabsContent value="calendar" className="grid gap-4 pt-4 xl:grid-cols-2">
          <RecordTable title="Agenda" rows={(calendar.data ?? []).map((row: any) => ({ id: row.id, primary: row.title, secondary: `${row.event_type} · ${row.starts_at}`, state: row.status, meta: row.timezone }))} />
          <RecordTable title="Visitas" rows={(visits.data ?? []).map((row: any) => ({ id: row.id, primary: row.property_id, secondary: row.scheduled_at, state: row.status, meta: row.feedback ? "feedback registrado" : "feedback pendente" }))} />
        </TabsContent>

        <TabsContent value="proposals" className="pt-4">
          <RecordTable title="Propostas" rows={(proposals.data ?? []).map((row: any) => ({ id: row.id, primary: `R$ ${Number(row.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, secondary: `${row.lead_id} · ${row.property_id}`, state: row.status, meta: row.valid_until ?? "sem validade" }))} />
        </TabsContent>

        <TabsContent value="automation" className="grid gap-4 pt-4 xl:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader><CardTitle>SLA de primeira resposta</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Limite em minutos" value={slaMinutes} onChange={setSlaMinutes} type="number" />
              <Button className="w-full" disabled={saveSla.isPending || Number(slaMinutes) < 1} onClick={() => saveSla.mutate()}>Salvar SLA</Button>
              <p className="text-xs text-muted-foreground">A avaliação produz alertas determinísticos; não executa provider externo.</p>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <RecordTable title="Políticas SLA" rows={(sla.data ?? []).map((row: any) => ({ id: row.id, primary: row.policy_key, secondary: `${row.threshold_minutes} min`, state: row.active ? "active" : "inactive", meta: `v${row.row_version}` }))} />
            <RecordTable title="Regras de automação" rows={(automations.data ?? []).map((row: any) => ({ id: row.id, primary: row.rule_key, secondary: "registry fechado", state: row.active ? "active" : "inactive", meta: `v${row.row_version}` }))} />
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="pt-4">
          <RecordTable title="Alertas operacionais" rows={(alerts.data ?? []).map((row: any) => ({ id: row.id, primary: row.alert_key, secondary: row.lead_id ?? "global do tenant", state: row.state, meta: row.severity }))} />
        </TabsContent>

        <TabsContent value="export" className="grid gap-4 pt-4 xl:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader><CardTitle>Exportar contatos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" disabled={exportData.isPending} onClick={() => exportData.mutate()}><Download className="mr-2 size-4" />Gerar CSV determinístico</Button>
              <p className="text-xs text-muted-foreground">O hash, contagem e auditoria são gerados no servidor. Nenhum provider é chamado.</p>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Resultado</CardTitle></CardHeader><CardContent><Textarea className="min-h-[360px] font-mono text-xs" readOnly value={exportContent} placeholder="O conteúdo exportado aparecerá aqui." /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-lg border bg-card p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div>;
}
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
function RecordTable({ title, rows }: { title: string; rows: Array<{ id: string; primary: string; secondary: string; state: string; meta: string }> }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-2">{rows.map((row) => <div key={row.id} className="rounded-md border px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-sm font-medium">{row.primary}</span><Badge variant="outline">{row.state}</Badge></div><div className="mt-1 truncate text-xs text-muted-foreground">{row.secondary}</div><div className="mt-1 font-mono text-[10px] text-muted-foreground">{row.meta}</div></div>)}{rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">empty</p> : null}</CardContent></Card>;
}
function State({ title, description, icon, action }: { title: string; description?: string; icon: React.ReactNode; action?: React.ReactNode }) {
  return <div className="mx-auto mt-20 max-w-xl rounded-lg border bg-card p-8 text-center"><div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">{icon}</div><h1 className="mt-4 text-lg font-semibold">{title}</h1>{description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}{action ? <div className="mt-4">{action}</div> : null}</div>;
}
