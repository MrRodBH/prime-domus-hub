import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  DEFAULT_PORTAL_MAPPING,
  cancelTenantPortalJob,
  generateTenantPortalManualExport,
  getPortalConnectorRegistry,
  getTenantPortalDashboard,
  getTenantPortalDiagnostics,
  listTenantPortalConnectors,
  listTenantPortalJobs,
  listTenantPortalLogs,
  listTenantPortalMappings,
  retryTenantPortalJob,
  rotateTenantPortalCredentialReference,
  saveTenantPortalConnector,
  saveTenantPortalMapping,
  setTenantPortalConnectorState,
} from "@/lib/api/tenant-portal.functions";
import type {
  PortalAutomatedMethod,
  PortalConnectorView,
  PortalManualMethod,
} from "@/lib/portals/portal-connector-registry";
import { AdminPageHeader, AdminStats } from "@/components/admin/ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  KeyRound,
  RefreshCw,
  Settings2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/portais")({
  component: AdminPortais,
});

type ExportFormat = "CSV" | "XLSX" | "MANUAL_EXPORT";

function AdminPortais() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PortalConnectorView | null>(null);
  const [mappingConnector, setMappingConnector] = useState<PortalConnectorView | null>(null);
  const [credentialConnector, setCredentialConnector] = useState<PortalConnectorView | null>(null);
  const [exportConnectorId, setExportConnectorId] = useState("");
  const [exportPropertyIds, setExportPropertyIds] = useState("");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("CSV");

  const connectors = useQuery({
    queryKey: ["tenant-portals", "connectors"],
    queryFn: () => listTenantPortalConnectors(),
  });
  const registry = useQuery({
    queryKey: ["tenant-portals", "registry"],
    queryFn: () => getPortalConnectorRegistry(),
  });
  const dashboard = useQuery({
    queryKey: ["tenant-portals", "dashboard"],
    queryFn: () => getTenantPortalDashboard(),
    refetchInterval: 30_000,
  });
  const diagnostics = useQuery({
    queryKey: ["tenant-portals", "diagnostics"],
    queryFn: () => getTenantPortalDiagnostics(),
  });
  const jobs = useQuery({
    queryKey: ["tenant-portals", "jobs"],
    queryFn: () => listTenantPortalJobs({ data: { limit: 100 } }),
    refetchInterval: 15_000,
  });
  const logs = useQuery({
    queryKey: ["tenant-portals", "logs"],
    queryFn: () => listTenantPortalLogs({ data: { limit: 100 } }),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tenant-portals"] }),
    ]);
  };

  const toggle = useMutation({
    mutationFn: (connector: PortalConnectorView) =>
      setTenantPortalConnectorState({
        data: {
          connectorId: connector.id,
          expectedRowVersion: connector.rowVersion,
          active: !connector.active,
        },
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Estado do connector atualizado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const retry = useMutation({
    mutationFn: (job: { id: string; revision: number }) =>
      retryTenantPortalJob({ data: { jobId: job.id, expectedRevision: job.revision } }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Retry agendado pelo servidor.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancel = useMutation({
    mutationFn: (job: { id: string; revision: number }) =>
      cancelTenantPortalJob({ data: { jobId: job.id, expectedRevision: job.revision } }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Job cancelado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const exportMutation = useMutation({
    mutationFn: () => {
      const propertyIds = exportPropertyIds
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (!exportConnectorId) throw new Error("Selecione um connector.");
      return generateTenantPortalManualExport({
        data: { connectorId: exportConnectorId, propertyIds, format: exportFormat },
      });
    },
    onSuccess: async (result) => {
      await invalidate();
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
      toast.success(`Export ${result.format} gerado com ${result.rowCount} registro(s).`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const loading = [connectors, registry, dashboard, diagnostics, jobs, logs].some(
    (query) => query.isLoading,
  );
  const failed = [connectors, registry, dashboard, diagnostics, jobs, logs].find(
    (query) => query.isError,
  );
  const connectorRows = connectors.data ?? [];
  const jobRows = jobs.data ?? [];
  const diagnostic = diagnostics.data;
  const kpis = dashboard.data;

  if (loading) {
    return <StateCard icon={Clock3} title="loading" description="Carregando contratos tenant-scoped de portais." />;
  }
  if (failed) {
    return (
      <StateCard
        icon={XCircle}
        title="permission_denied / error"
        description={failed.error instanceof Error ? failed.error.message : "Falha segura ao carregar portais."}
        action={<Button onClick={() => void invalidate()}>retry_available</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Distribuição HYBRID"
        title="Portal Connector Center"
        description="Registry fechado, mappings versionados, exports manuais, jobs idempotentes e diagnóstico sem secrets."
      />

      <Alert>
        <ShieldCheck className="size-4" />
        <AlertTitle>Automação fail-closed</AlertTitle>
        <AlertDescription>
          Adapters automatizados estão em <strong>adapter_not_implemented</strong>. Nenhum sucesso externo é simulado.
          CSV, XLSX e MANUAL_EXPORT permanecem disponíveis como entrega funcional auditável.
        </AlertDescription>
      </Alert>

      <AdminStats
        columns={4}
        items={[
          { label: "Connectors ativos", value: kpis?.connectorsActive ?? 0, icon: CheckCircle2, tone: "success" },
          { label: "Jobs ativos", value: kpis?.activeJobs ?? 0, icon: RefreshCw, tone: "warning" },
          { label: "Falhas terminais", value: kpis?.terminalFailures ?? 0, icon: AlertTriangle, tone: "danger" },
          { label: "Reconciliação", value: kpis?.reconciliationRequired ?? 0, icon: ShieldCheck },
          { label: "Exports", value: kpis?.exportsGenerated ?? 0, icon: Download },
          { label: "Credenciais pendentes", value: kpis?.credentialsPending ?? 0, icon: KeyRound, tone: "warning" },
        ]}
      />

      <Tabs defaultValue="connectors">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="connectors" className="space-y-3 pt-3">
          {connectorRows.length === 0 ? (
            <StateCard icon={Settings2} title="empty" description="Nenhuma instância persistida de connector foi encontrada para o tenant." />
          ) : connectorRows.map((connector) => (
            <Card key={connector.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle className="text-base">{connector.name}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <StateBadge state={connector.active ? "ready" : "disabled"} />
                    <StateBadge state={connector.configurationState} />
                    <StateBadge state={connector.credentialState} />
                    <StateBadge state={connector.adapterAvailability} />
                    <Badge variant="outline">HYBRID</Badge>
                    <Badge variant="secondary">row v{connector.rowVersion}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(connector)}>
                    <Settings2 className="mr-1 size-4" /> Configurar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setMappingConnector(connector)}>
                    Mapping
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCredentialConnector(connector)}>
                    <KeyRound className="mr-1 size-4" /> Referência
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => toggle.mutate(connector)}
                    disabled={toggle.isPending || connector.configurationState !== "adapter_not_implemented" || connector.credentialState === "credential_provisioning_required" || connector.credentialState === "rotation_required"}
                  >
                    {connector.active ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                <ReadOnly label="Slug persistido" value={connector.slug} />
                <ReadOnly label="Automated method" value={connector.hybridConfig?.automated_method ?? "configuration_required"} />
                <ReadOnly label="Manual method" value={connector.hybridConfig?.manual_method ?? "configuration_required"} />
                <ReadOnly label="Mapping version" value={String(connector.hybridConfig?.mapping_version ?? 0)} />
                <ReadOnly label="Last success" value={connector.lastSyncAt ?? "never"} />
                <ReadOnly label="Last failure" value={connector.lastErrorCode ?? "none"} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="jobs" className="pt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Publication jobs</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead><TableHead>Operation</TableHead><TableHead>State</TableHead>
                    <TableHead>Attempts</TableHead><TableHead>Next retry</TableHead><TableHead>Error</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobRows.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="text-xs">{formatDate(job.createdAt)}</TableCell>
                      <TableCell>{job.operation}</TableCell>
                      <TableCell><StateBadge state={job.currentState} /></TableCell>
                      <TableCell>{job.attemptCount}/{job.maxAttempts}</TableCell>
                      <TableCell className="text-xs">{job.nextAttemptAt ? formatDate(job.nextAttemptAt) : "-"}</TableCell>
                      <TableCell className="max-w-48 truncate text-xs">{job.lastErrorCode ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {job.currentState === "failed_retryable" ? (
                            <Button size="sm" variant="outline" onClick={() => retry.mutate(job)} disabled={retry.isPending}>Retry</Button>
                          ) : null}
                          {["queued", "unpublish_queued", "retry_scheduled", "failed_retryable"].includes(job.currentState) ? (
                            <Button size="sm" variant="outline" onClick={() => cancel.mutate(job)} disabled={cancel.isPending}>Cancel</Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {jobRows.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">empty — nenhum job registrado.</TableCell></TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="pt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Manual delivery</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Connector">
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={exportConnectorId} onChange={(event) => setExportConnectorId(event.target.value)}>
                  <option value="">Selecione</option>
                  {connectorRows.map((connector) => <option key={connector.id} value={connector.id}>{connector.name}</option>)}
                </select>
              </Field>
              <Field label="Format">
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                  <option value="CSV">CSV</option><option value="XLSX">XLSX</option><option value="MANUAL_EXPORT">MANUAL_EXPORT</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Property UUIDs — separados por vírgula, espaço ou linha; vazio gera export vazio explícito">
                  <Input value={exportPropertyIds} onChange={(event) => setExportPropertyIds(event.target.value)} placeholder="uuid-1, uuid-2" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
                  <Download className="mr-1 size-4" /> {exportMutation.isPending ? "Gerando…" : "Gerar export tenant-scoped"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="pt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Sanitized logs</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Connector</TableHead><TableHead>Action</TableHead><TableHead>Status</TableHead><TableHead>Error code</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(logs.data ?? []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.connectorSlug}</TableCell>
                      <TableCell>{log.action}</TableCell><TableCell><StateBadge state={log.status} /></TableCell>
                      <TableCell className="text-xs">{log.errorCode ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                  {(logs.data ?? []).length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">empty</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="grid gap-3 pt-3 md:grid-cols-2">
          <Diagnostic label="Operation mode" value={diagnostic?.operationMode ?? "HYBRID"} />
          <Diagnostic label="Automated state" value={diagnostic?.automatedState ?? "adapter_not_implemented"} />
          <Diagnostic label="Registry" value={`${diagnostic?.registryCount ?? 0} cataloged`} />
          <Diagnostic label="Adapters" value={`${diagnostic?.adapterImplementedCount ?? 0} implemented / ${diagnostic?.adapterNotImplementedCount ?? 0} pending`} />
          <Diagnostic label="Inline secrets" value={diagnostic?.inlineSecretsAccepted ? "unsafe" : "prohibited"} />
          <Diagnostic label="Plaintext credentials" value={diagnostic?.plaintextCredentialsAccepted ? "unsafe" : "prohibited"} />
          <Diagnostic label="Direct client mutation" value={diagnostic?.directClientMutation ? "unsafe" : "false"} />
          <Diagnostic label="Super Admin" value={diagnostic?.superAdminImpersonationRequired ? "impersonation required" : "invalid"} />
          <Diagnostic label="Managed backend" value="migration not executed in this increment" />
          <Diagnostic label="External portals" value="real publication not executed" />
        </TabsContent>
      </Tabs>

      <ConnectorDialog connector={editing} registry={registry.data} onClose={() => setEditing(null)} onSaved={invalidate} />
      <MappingDialog connector={mappingConnector} onClose={() => setMappingConnector(null)} onSaved={invalidate} />
      <CredentialDialog connector={credentialConnector} onClose={() => setCredentialConnector(null)} onSaved={invalidate} />
    </div>
  );
}

function ConnectorDialog({ connector, registry, onClose, onSaved }: {
  connector: PortalConnectorView | null;
  registry: Awaited<ReturnType<typeof getPortalConnectorRegistry>> | undefined;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const current = connector?.hybridConfig;
  const [automatedMethod, setAutomatedMethod] = useState<PortalAutomatedMethod>(current?.automated_method ?? "JSON_API");
  const [manualMethod, setManualMethod] = useState<PortalManualMethod>(current?.manual_method ?? "CSV");
  const [mappingProfile, setMappingProfile] = useState(current?.mapping_profile ?? "default-v1");
  const [feedUrl, setFeedUrl] = useState(connector?.feedUrl ?? "");
  const [webhookUrl, setWebhookUrl] = useState(connector?.webhookUrl ?? "");
  const [maxAttempts, setMaxAttempts] = useState(current?.retry_policy.max_attempts ?? 5);
  const mutation = useMutation({
    mutationFn: () => {
      if (!connector) throw new Error("Connector ausente.");
      return saveTenantPortalConnector({ data: {
        connectorId: connector.id,
        expectedRowVersion: connector.rowVersion,
        feedUrl: feedUrl || null,
        webhookUrl: webhookUrl || null,
        config: {
          operation_mode: "HYBRID",
          automated_method: automatedMethod,
          manual_method: manualMethod,
          configuration_schema_version: 1,
          credential_reference: current?.credential_reference ?? null,
          mapping_profile: mappingProfile,
          mapping_version: current?.mapping_version ?? 1,
          publication_rules: { only_published: true, include_statuses: ["publicado"], batch_size: 100 },
          retry_policy: { max_attempts: maxAttempts, initial_delay_seconds: 30, max_delay_seconds: 3600 },
        },
      } });
    },
    onSuccess: async () => { await onSaved(); toast.success("Configuração salva; connector desativado até validação completa."); onClose(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const definitions = registry?.definitions ?? [];
  return (
    <Dialog open={connector !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Configurar {connector?.name}</DialogTitle></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Automated method"><select className="h-10 w-full rounded-md border bg-background px-3" value={automatedMethod} onChange={(event) => setAutomatedMethod(event.target.value as PortalAutomatedMethod)}>{definitions.map((item) => <option key={item.connectorKey} value={item.connectorKey}>{item.displayName} — {item.availabilityState}</option>)}</select></Field>
          <Field label="Manual method"><select className="h-10 w-full rounded-md border bg-background px-3" value={manualMethod} onChange={(event) => setManualMethod(event.target.value as PortalManualMethod)}><option>CSV</option><option>XLSX</option><option>MANUAL_EXPORT</option></select></Field>
          <Field label="Mapping profile"><Input value={mappingProfile} onChange={(event) => setMappingProfile(event.target.value)} /></Field>
          <Field label="Max attempts"><Input type="number" min={1} max={20} value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value))} /></Field>
          <Field label="Feed/API HTTPS"><Input value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://…" /></Field>
          <Field label="Webhook HTTPS"><Input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://…" /></Field>
        </div>
        <Alert><AlertTriangle className="size-4" /><AlertDescription>Salvar não ativa o adapter nem confirma publicação externa. O estado automatizado permanece adapter_not_implemented.</AlertDescription></Alert>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Salvar contrato fechado</Button>
      </DialogContent>
    </Dialog>
  );
}

function MappingDialog({ connector, onClose, onSaved }: { connector: PortalConnectorView | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const mappings = useQuery({
    queryKey: ["tenant-portals", "mappings", connector?.id],
    queryFn: () => listTenantPortalMappings({ data: { connectorId: connector!.id } }),
    enabled: connector !== null,
  });
  const currentVersion = mappings.data?.find((item) => item.current)?.version ?? 0;
  const mutation = useMutation({
    mutationFn: () => {
      if (!connector) throw new Error("Connector ausente.");
      return saveTenantPortalMapping({ data: { connectorId: connector.id, expectedVersion: currentVersion, mapping: DEFAULT_PORTAL_MAPPING } });
    },
    onSuccess: async () => { await onSaved(); toast.success("Mapping fechado versionado."); onClose(); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <Dialog open={connector !== null} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Mapping — {connector?.name}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Versão atual: {currentVersion}. O mapping fechado cobre campos públicos de imóveis e mídia tenant-scoped.</p><Button onClick={() => mutation.mutate()} disabled={mutation.isPending || mappings.isLoading}>Criar próxima versão canônica</Button></DialogContent></Dialog>;
}

function CredentialDialog({ connector, onClose, onSaved }: { connector: PortalConnectorView | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [reference, setReference] = useState("credential://tenant/portal/provider");
  const mutation = useMutation({
    mutationFn: () => {
      if (!connector) throw new Error("Connector ausente.");
      return rotateTenantPortalCredentialReference({ data: { connectorId: connector.id, expectedRowVersion: connector.rowVersion, credentialReference: reference } });
    },
    onSuccess: async () => { await onSaved(); toast.success("Referência rotacionada; provisionamento externo ainda é obrigatório."); onClose(); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <Dialog open={connector !== null} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Credential reference — {connector?.name}</DialogTitle></DialogHeader><Field label="Reference only — nenhum secret"><Input value={reference} onChange={(event) => setReference(event.target.value)} /></Field><p className="text-sm text-muted-foreground">A operação não cria vault fictício e não recebe token, password ou client secret.</p><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Rotacionar referência</Button></DialogContent></Dialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>; }
function ReadOnly({ label, value }: { label: string; value: string }) { return <div><span className="text-xs text-muted-foreground">{label}</span><div className="font-mono text-xs break-all">{value}</div></div>; }
function Diagnostic({ label, value }: { label: string; value: string }) { return <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-mono text-sm">{value}</div></CardContent></Card>; }
function StateBadge({ state }: { state: string }) { const danger = state.includes("failed") || state === "error" || state === "permission_denied"; const warning = state.includes("required") || state.includes("queued") || state.includes("retry") || state === "adapter_not_implemented"; return <Badge variant={danger ? "destructive" : warning ? "outline" : "secondary"}>{state}</Badge>; }
function formatDate(value: string) { return new Date(value).toLocaleString("pt-BR"); }
function StateCard({ icon: Icon, title, description, action }: { icon: typeof Clock3; title: string; description: string; action?: React.ReactNode }) { return <Card><CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center"><Icon className="size-8 text-muted-foreground" /><div><div className="font-medium">{title}</div><p className="text-sm text-muted-foreground">{description}</p></div>{action}</CardContent></Card>; }
