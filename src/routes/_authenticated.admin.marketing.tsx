import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  DEFAULT_MARKETING_FIELD_MAPPING,
  createTenantMarketingManualImport,
  executeTenantMarketingManualImport,
  getTenantMarketingDiagnostics,
  listTenantMarketingChannels,
  listTenantMarketingConnectors,
  listTenantMarketingIngestionEvents,
  listTenantMarketingManualImports,
  previewTenantMarketingManualImport,
  publishTenantMarketingConnectorConfiguration,
  retryTenantMarketingIngestion,
  saveTenantMarketingConnectorDraft,
  saveTenantMarketingMapping,
  setTenantMarketingCredentialReference,
} from "@/lib/api/tenant-marketing.functions";
import { AdminPageHeader, AdminStats } from "@/components/admin/ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  FileSpreadsheet,
  KeyRound,
  RefreshCw,
  Settings2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/marketing")({
  component: MarketingOperationsCenter,
});

type Connector = {
  id: string;
  channelKey: "META_ADS" | "GOOGLE_ADS" | "MANUAL_IMPORT" | "WEBSITE_FORM";
  displayName: string;
  providerKey: string;
  providerAccountReference: string | null;
  providerFormReference: string | null;
  credentialReferenceConfigured: boolean;
  credentialState: string;
  configurationVersion: number;
  mappingVersion: number;
  verificationState: string;
  availabilityState: string;
  adapterAvailability: string;
  active: boolean;
  rowVersion: number;
  lastErrorCode: string | null;
};

type ImportJob = {
  id: string;
  connectorId: string;
  format: string;
  fileName: string;
  state: string;
  totalRows: number;
  duplicateRows: number;
  createdLeads: number;
  failedRows: number;
  rowVersion: number;
  createdAt: string;
};

type IngestionEvent = {
  id: string;
  connector_id: string;
  channel_key: string;
  provider_payload_id: string;
  campaign_name: string | null;
  ingestion_state: string;
  lead_id: string | null;
  duplicate_candidate_ids: string[];
  error_code: string | null;
  retry_state: string;
  row_version: number;
  received_at: string;
};

function MarketingOperationsCenter() {
  const queryClient = useQueryClient();
  const [selectedConnectorId, setSelectedConnectorId] = useState("");
  const [providerAccount, setProviderAccount] = useState("");
  const [providerForm, setProviderForm] = useState("");
  const [credentialReference, setCredentialReference] = useState("");
  const [mappingJson, setMappingJson] = useState(JSON.stringify(DEFAULT_MARKETING_FIELD_MAPPING, null, 2));
  const [fileName, setFileName] = useState("leads.csv");
  const [format, setFormat] = useState<"CSV" | "XLSX" | "MANUAL_ROW">("CSV");
  const [contentBase64, setContentBase64] = useState("");
  const [manualCsv, setManualCsv] = useState("name,email,phone,source,campaign_name\nMaria,maria@example.com,31999999999,manual,campanha-teste");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewTenantMarketingManualImport>> | null>(null);

  const channels = useQuery({ queryKey: ["tenant-marketing", "channels"], queryFn: () => listTenantMarketingChannels() });
  const connectors = useQuery({ queryKey: ["tenant-marketing", "connectors"], queryFn: () => listTenantMarketingConnectors() });
  const imports = useQuery({
    queryKey: ["tenant-marketing", "imports"],
    queryFn: () => listTenantMarketingManualImports({ data: { limit: 100 } }),
    refetchInterval: 20_000,
  });
  const events = useQuery({
    queryKey: ["tenant-marketing", "events"],
    queryFn: () => listTenantMarketingIngestionEvents({ data: { state: null, limit: 100 } }),
    refetchInterval: 20_000,
  });
  const diagnostics = useQuery({ queryKey: ["tenant-marketing", "diagnostics"], queryFn: () => getTenantMarketingDiagnostics() });

  const connectorRows = (connectors.data ?? []) as Connector[];
  const importRows = (imports.data ?? []) as ImportJob[];
  const eventRows = (events.data ?? []) as IngestionEvent[];
  const selected = connectorRows.find((item) => item.id === selectedConnectorId) ?? connectorRows[0] ?? null;

  useMemo(() => {
    if (!selectedConnectorId && connectorRows[0]) setSelectedConnectorId(connectorRows[0].id);
    return null;
  }, [connectorRows, selectedConnectorId]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["tenant-marketing"] });
  };

  const saveConnector = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione um connector.");
      return saveTenantMarketingConnectorDraft({
        data: {
          connectorId: selected.id,
          expectedRowVersion: selected.rowVersion,
          config: {
            channelKey: selected.channelKey,
            operationMode: "HYBRID",
            configurationVersion: 1,
            providerAccountReference: providerAccount.trim() || null,
            providerFormReference: providerForm.trim() || null,
            credentialReference: selected.channelKey === "META_ADS" || selected.channelKey === "GOOGLE_ADS"
              ? credentialReference.trim() || null
              : null,
            mappingVersion: selected.mappingVersion,
          },
          providerAccountReference: providerAccount.trim() || null,
          providerFormReference: providerForm.trim() || null,
        },
      });
    },
    onSuccess: async () => { await invalidate(); toast.success("Draft do connector salvo pelo servidor."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateCredential = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione um connector.");
      return setTenantMarketingCredentialReference({
        data: {
          connectorId: selected.id,
          expectedRowVersion: selected.rowVersion,
          credentialReference,
        },
      });
    },
    onSuccess: async () => { await invalidate(); toast.success("Referência registrada; nenhum secret foi exposto."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const publish = useMutation({
    mutationFn: async (connector: Connector) => publishTenantMarketingConnectorConfiguration({
      data: { connectorId: connector.id, expectedRowVersion: connector.rowVersion, active: !connector.active },
    }),
    onSuccess: async () => { await invalidate(); toast.success("Estado confirmado pelo servidor."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveMapping = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione um connector.");
      const parsed = JSON.parse(mappingJson) as typeof DEFAULT_MARKETING_FIELD_MAPPING;
      return saveTenantMarketingMapping({
        data: { connectorId: selected.id, expectedVersion: selected.mappingVersion, mapping: parsed },
      });
    },
    onSuccess: async () => { await invalidate(); toast.success("Mapping versionado salvo."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const importInput = () => {
    if (!selected) throw new Error("Selecione um connector.");
    const payload = contentBase64 || encodeBase64(manualCsv);
    if (!payload) throw new Error("Forneça um arquivo ou conteúdo manual.");
    return {
      connectorId: selected.id,
      format,
      fileName,
      contentBase64: payload,
      idempotencyKey: `marketing-import-${selected.id}-${hashClient(payload)}`.slice(0, 190),
    };
  };

  const previewImport = useMutation({
    mutationFn: () => previewTenantMarketingManualImport({ data: importInput() }),
    onSuccess: (result) => { setPreview(result); toast.success("Preview validado no servidor."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const createImport = useMutation({
    mutationFn: () => createTenantMarketingManualImport({ data: importInput() }),
    onSuccess: async () => { await invalidate(); toast.success("Importação persistida em preview_ready."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const executeImport = useMutation({
    mutationFn: (job: ImportJob) => executeTenantMarketingManualImport({
      data: { importId: job.id, expectedRowVersion: job.rowVersion },
    }),
    onSuccess: async (result) => {
      await invalidate();
      toast.success(`Importação ${result.state}: ${result.createdLeads} lead(s), ${result.duplicateRows} duplicado(s).`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const retryEvent = useMutation({
    mutationFn: (event: IngestionEvent) => retryTenantMarketingIngestion({
      data: { eventId: event.id, expectedRowVersion: event.row_version },
    }),
    onSuccess: async () => { await invalidate(); toast.success("Retry autorizado pelo servidor."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const loading = [channels, connectors, imports, events, diagnostics].some((query) => query.isLoading);
  const failed = [channels, connectors, imports, events, diagnostics].find((query) => query.isError);
  if (loading) return <StateCard icon={Clock3} title="loading" description="Carregando contratos tenant-scoped de marketing." />;
  if (failed) return (
    <StateCard
      icon={XCircle}
      title="permission_denied / error"
      description={failed.error instanceof Error ? failed.error.message : "Falha segura ao carregar marketing."}
      action={<Button onClick={() => void invalidate()}>retry_available</Button>}
    />
  );

  const diagnostic = diagnostics.data;
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Marketing HYBRID"
        title="Marketing & Lead Ingestion Center"
        description="Connectors tenant-scoped, attribution versionada, importação idempotente e diagnóstico sem secrets."
      />

      <Alert>
        <ShieldCheck className="size-4" />
        <AlertTitle>Providers externos permanecem fail-closed</AlertTitle>
        <AlertDescription>
          Meta Ads e Google Ads estão em <strong>adapter_not_implemented</strong>. Nenhum webhook, credencial ou sucesso externo é simulado.
          Importação manual está disponível; formulários públicos continuam exclusivamente no PTW-01.
        </AlertDescription>
      </Alert>

      <AdminStats columns={4} items={[
        { label: "Connectors", value: diagnostic?.connectors ?? 0, icon: Settings2 },
        { label: "Ativos", value: diagnostic?.activeConnectors ?? 0, icon: CheckCircle2, tone: "success" },
        { label: "Imports", value: diagnostic?.imports ?? 0, icon: FileSpreadsheet },
        { label: "Ingestões", value: diagnostic?.ingestionEvents ?? 0, icon: DatabaseZap },
        { label: "Duplicados", value: diagnostic?.duplicateCandidates ?? 0, icon: AlertTriangle, tone: "warning" },
        { label: "Falhas", value: diagnostic?.failures ?? 0, icon: XCircle, tone: "danger" },
      ]} />

      <Tabs defaultValue="connectors">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="mapping">Mapping</TabsTrigger>
          <TabsTrigger value="imports">Importação</TabsTrigger>
          <TabsTrigger value="events">Ingestion ledger</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="connectors" className="space-y-3 pt-3">
          {connectorRows.map((connector) => (
            <Card key={connector.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-2">
                  <CardTitle className="text-base">{connector.displayName}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <StateBadge state={connector.active ? "configured" : "draft"} />
                    <StateBadge state={connector.availabilityState} />
                    <StateBadge state={connector.credentialState} />
                    <StateBadge state={connector.verificationState} />
                    <Badge variant="outline">HYBRID</Badge>
                    <Badge variant="secondary">row v{connector.rowVersion}</Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={connector.active ? "outline" : "default"}
                  disabled={publish.isPending || connector.adapterAvailability === "adapter_not_implemented"}
                  onClick={() => publish.mutate(connector)}
                >
                  {connector.active ? "Desativar" : "Ativar"}
                </Button>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                <ReadOnly label="Channel key" value={connector.channelKey} />
                <ReadOnly label="Provider" value={connector.providerKey} />
                <ReadOnly label="Account reference" value={connector.providerAccountReference ?? "not_configured"} />
                <ReadOnly label="Form reference" value={connector.providerFormReference ?? "not_configured"} />
                <ReadOnly label="Credential reference" value={connector.credentialReferenceConfigured ? "configured / hidden" : "not_configured"} />
                <ReadOnly label="Mapping version" value={String(connector.mappingVersion)} />
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader><CardTitle className="text-base">Connector draft</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Connector">
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={selected?.id ?? ""} onChange={(event) => setSelectedConnectorId(event.target.value)}>
                  {connectorRows.map((connector) => <option key={connector.id} value={connector.id}>{connector.displayName}</option>)}
                </select>
              </Field>
              <Field label="Provider account reference"><Input value={providerAccount} onChange={(event) => setProviderAccount(event.target.value)} placeholder="account-reference" /></Field>
              <Field label="Provider form reference"><Input value={providerForm} onChange={(event) => setProviderForm(event.target.value)} placeholder="form-reference" /></Field>
              <Field label="Credential reference (não é secret)"><Input value={credentialReference} onChange={(event) => setCredentialReference(event.target.value)} placeholder="credential://marketing/meta/tenant" /></Field>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button onClick={() => saveConnector.mutate()} disabled={saveConnector.isPending}>Salvar draft</Button>
                <Button variant="outline" onClick={() => rotateCredential.mutate()} disabled={rotateCredential.isPending || !credentialReference || selected?.channelKey === "MANUAL_IMPORT" || selected?.channelKey === "WEBSITE_FORM"}>
                  <KeyRound className="mr-1 size-4" /> Registrar referência
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-3 pt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Closed field mapping</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Somente targets catalogados são aceitos. Tenant, actor, assignment, pipeline e stage não são mapeáveis.</p>
              <Textarea className="min-h-96 font-mono text-xs" value={mappingJson} onChange={(event) => setMappingJson(event.target.value)} />
              <Button onClick={() => saveMapping.mutate()} disabled={saveMapping.isPending || !selected}>Salvar nova versão</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imports" className="space-y-4 pt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Manual import — preview obrigatório</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Connector">
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={selected?.id ?? ""} onChange={(event) => setSelectedConnectorId(event.target.value)}>
                  {connectorRows.filter((connector) => connector.channelKey !== "WEBSITE_FORM").map((connector) => <option key={connector.id} value={connector.id}>{connector.displayName}</option>)}
                </select>
              </Field>
              <Field label="Formato">
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={format} onChange={(event) => setFormat(event.target.value as typeof format)}>
                  <option value="CSV">CSV</option><option value="XLSX">XLSX</option><option value="MANUAL_ROW">MANUAL_ROW</option>
                </select>
              </Field>
              <Field label="Arquivo">
                <Input type="file" accept=".csv,.xlsx" onChange={(event) => void readFile(event.target.files?.[0] ?? null, setFileName, setFormat, setContentBase64)} />
              </Field>
              <Field label="Nome"><Input value={fileName} onChange={(event) => setFileName(event.target.value)} /></Field>
              <div className="md:col-span-2">
                <Label>Conteúdo CSV/manual</Label>
                <Textarea className="mt-2 min-h-32 font-mono text-xs" value={manualCsv} onChange={(event) => { setManualCsv(event.target.value); setContentBase64(""); }} />
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button variant="outline" onClick={() => previewImport.mutate()} disabled={previewImport.isPending}>Preview server-side</Button>
                <Button onClick={() => createImport.mutate()} disabled={createImport.isPending || !preview || preview.invalidRows > 0}>Persistir importação</Button>
              </div>
            </CardContent>
          </Card>

          {preview ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Preview: {preview.state}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2"><StateBadge state="preview_ready" /><Badge variant="secondary">{preview.totalRows} rows</Badge><Badge variant="secondary">{preview.invalidRows} invalid</Badge></div>
                {preview.rows.slice(0, 10).map((row) => <div key={row.rowNumber} className="rounded border p-2 text-xs">#{row.rowNumber} · {row.state} · {row.name ?? "—"} · {row.email ?? row.phone ?? "—"} · {row.errorCode ?? "ok"}</div>)}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle className="text-base">Import jobs</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Created</TableHead><TableHead>File</TableHead><TableHead>State</TableHead><TableHead>Rows</TableHead><TableHead>Leads</TableHead><TableHead>Duplicates</TableHead><TableHead>Failed</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>{importRows.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="text-xs">{formatDate(job.createdAt)}</TableCell><TableCell>{job.fileName}</TableCell><TableCell><StateBadge state={job.state} /></TableCell>
                    <TableCell>{job.totalRows}</TableCell><TableCell>{job.createdLeads}</TableCell><TableCell>{job.duplicateRows}</TableCell><TableCell>{job.failedRows}</TableCell>
                    <TableCell><Button size="sm" variant="outline" disabled={executeImport.isPending || !["preview_ready", "failed"].includes(job.state)} onClick={() => executeImport.mutate(job)}>Executar</Button></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="pt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Sanitized ingestion ledger</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Received</TableHead><TableHead>Channel</TableHead><TableHead>Payload ID</TableHead><TableHead>Campaign</TableHead><TableHead>State</TableHead><TableHead>Lead</TableHead><TableHead>Error</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>{eventRows.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-xs">{formatDate(event.received_at)}</TableCell><TableCell>{event.channel_key}</TableCell><TableCell className="max-w-44 truncate font-mono text-xs">{event.provider_payload_id}</TableCell>
                    <TableCell>{event.campaign_name ?? "—"}</TableCell><TableCell><StateBadge state={event.ingestion_state} /></TableCell><TableCell className="font-mono text-xs">{event.lead_id?.slice(0, 8) ?? "—"}</TableCell>
                    <TableCell className="max-w-44 truncate text-xs">{event.error_code ?? "—"}</TableCell>
                    <TableCell><Button size="sm" variant="outline" disabled={event.retry_state !== "retry_available" || retryEvent.isPending} onClick={() => retryEvent.mutate(event)}><RefreshCw className="mr-1 size-3" />Retry</Button></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="pt-3">
          <Card><CardHeader><CardTitle className="text-base">Operational diagnostics</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm md:grid-cols-2">
            {Object.entries(diagnostic ?? {}).map(([key, value]) => <ReadOnly key={key} label={key} value={String(value)} />)}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const variant = state.includes("failed") || state.includes("error") || state.includes("invalid")
    ? "destructive"
    : state.includes("ready") || state.includes("verified") || state.includes("completed") || state.includes("lead_created")
      ? "default"
      : "secondary";
  return <Badge variant={variant}>{state}</Badge>;
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b py-1"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function StateCard({ icon: Icon, title, description, action }: { icon: typeof Clock3; title: string; description: string; action?: React.ReactNode }) {
  return <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><Icon className="size-8 text-muted-foreground" /><div><div className="font-medium">{title}</div><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{action}</CardContent></Card>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function encodeBase64(value: string): string {
  return btoa(unescape(encodeURIComponent(value)));
}

function hashClient(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, "0");
}

async function readFile(
  file: File | null,
  setFileName: (value: string) => void,
  setFormat: (value: "CSV" | "XLSX" | "MANUAL_ROW") => void,
  setContent: (value: string) => void,
) {
  if (!file) return;
  if (file.size > 6_000_000) throw new Error("Arquivo excede 6 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.slice(offset, offset + 32_768));
  }
  setFileName(file.name);
  setFormat(file.name.toLowerCase().endsWith(".xlsx") ? "XLSX" : "CSV");
  setContent(btoa(binary));
}
