import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { friendlyStatus } from "@/lib/ui-labels";
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
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [account, setAccount] = useState("");
  const [form, setForm] = useState("");
  const [credential, setCredential] = useState("");
  const [mappingJson, setMappingJson] = useState(
    JSON.stringify(DEFAULT_MARKETING_FIELD_MAPPING, null, 2),
  );
  const [format, setFormat] = useState<"CSV" | "XLSX" | "MANUAL_ROW">("CSV");
  const [fileName, setFileName] = useState("leads.csv");
  const [contentBase64, setContentBase64] = useState("");
  const [manualCsv, setManualCsv] = useState(
    "name,email,phone,source,campaign_name\nMaria,maria@example.com,31999999999,manual,campanha-teste",
  );
  const [preview, setPreview] = useState<any>(null);

  const channels = useQuery({
    queryKey: ["tenant-marketing", "channels"],
    queryFn: () => listTenantMarketingChannels(),
  });
  const connectors = useQuery({
    queryKey: ["tenant-marketing", "connectors"],
    queryFn: () => listTenantMarketingConnectors(),
  });
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
  const diagnostics = useQuery({
    queryKey: ["tenant-marketing", "diagnostics"],
    queryFn: () => getTenantMarketingDiagnostics(),
  });

  const connectorRows = (connectors.data ?? []) as Connector[];
  const importRows = (imports.data ?? []) as ImportJob[];
  const eventRows = (events.data ?? []) as IngestionEvent[];
  const selected = connectorRows.find((item) => item.id === selectedId) ?? connectorRows[0] ?? null;

  useEffect(() => {
    if (!selectedId && connectorRows[0]) setSelectedId(connectorRows[0].id);
  }, [connectorRows, selectedId]);
  useEffect(() => {
    if (!selected) return;
    setAccount(selected.providerAccountReference ?? "");
    setForm(selected.providerFormReference ?? "");
    setCredential("");
  }, [selected?.id]);

  const invalidate = async () => client.invalidateQueries({ queryKey: ["tenant-marketing"] });
  const importInput = () => {
    if (!selected) throw new Error("Selecione uma integração.");
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

  const saveConnector = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione uma integração.");
      return saveTenantMarketingConnectorDraft({
        data: {
          connectorId: selected.id,
          expectedRowVersion: selected.rowVersion,
          config: {
            channelKey: selected.channelKey,
            operationMode: "HYBRID",
            configurationVersion: 1,
            providerAccountReference: account.trim() || null,
            providerFormReference: form.trim() || null,
            credentialReference: selected.credentialReferenceConfigured
              ? `credential://preserved/${selected.id}`
              : null,
            mappingVersion: selected.mappingVersion,
          },
          providerAccountReference: account.trim() || null,
          providerFormReference: form.trim() || null,
        },
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Rascunho salvo para esta empresa.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateCredential = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione uma integração.");
      return setTenantMarketingCredentialReference({
        data: {
          connectorId: selected.id,
          expectedRowVersion: selected.rowVersion,
          credentialReference: credential,
        },
      });
    },
    onSuccess: async () => {
      setCredential("");
      await invalidate();
      toast.success("Referência registrada sem expor a credencial.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const publish = useMutation({
    mutationFn: (connector: Connector) =>
      publishTenantMarketingConnectorConfiguration({
        data: {
          connectorId: connector.id,
          expectedRowVersion: connector.rowVersion,
          active: !connector.active,
        },
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Estado confirmado pelo servidor.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveMapping = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione uma integração.");
      return saveTenantMarketingMapping({
        data: {
          connectorId: selected.id,
          expectedVersion: selected.mappingVersion,
          mapping: JSON.parse(mappingJson),
        },
      });
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Mapeamento de campos salvo.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const previewImport = useMutation({
    mutationFn: () => previewTenantMarketingManualImport({ data: importInput() }),
    onSuccess: (result) => {
      setPreview(result);
      toast.success("Prévia validada no servidor.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const createImport = useMutation({
    mutationFn: () => createTenantMarketingManualImport({ data: importInput() }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Importação salva e pronta para conferência.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const executeImport = useMutation({
    mutationFn: (job: ImportJob) =>
      executeTenantMarketingManualImport({
        data: { importId: job.id, expectedRowVersion: job.rowVersion },
      }),
    onSuccess: async (result: any) => {
      await invalidate();
      toast.success(`Importação ${result.state}: ${result.createdLeads} lead(s).`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const retryEvent = useMutation({
    mutationFn: (event: IngestionEvent) =>
      retryTenantMarketingIngestion({
        data: { eventId: event.id, expectedRowVersion: event.row_version },
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Nova tentativa autorizada pelo servidor.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const loading = [channels, connectors, imports, events, diagnostics].some(
    (query) => query.isLoading,
  );
  const failed = [channels, connectors, imports, events, diagnostics].find(
    (query) => query.isError,
  );
  if (loading)
    return (
      <StateCard
        icon={Clock3}
        title="Carregando"
        description="Carregando configurações de marketing desta empresa."
      />
    );
  if (failed)
    return (
      <StateCard
        icon={XCircle}
        title="Não foi possível carregar"
        description={
          failed.error instanceof Error ? failed.error.message : "Ocorreu uma falha protegida."
        }
        action={<Button onClick={() => void invalidate()}>Tentar novamente</Button>}
      />
    );

  const diag = diagnostics.data as any;
  const providerConnectors = connectorRows.filter(
    (item) => item.channelKey === "META_ADS" || item.channelKey === "GOOGLE_ADS",
  );
  const providerReady = providerConnectors.filter(
    (item) =>
      item.active &&
      item.availabilityState === "automated_ready" &&
      item.verificationState === "verified",
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Aquisição e campanhas"
        title="Central de marketing e captura de leads"
        description="Gerencie Meta Ads, Google Ads, importações e entrada de leads sem expor credenciais."
      />

      <Alert>
        <ShieldCheck className="size-4" />
        <AlertTitle>Integrações implementadas com ativação protegida</AlertTitle>
        <AlertDescription>
          Meta Ads e Google Ads começam com credencial necessária e ainda não verificados ao vivo. A
          ativação só ocorre depois da credencial, do mapeamento de campos e da confirmação feita
          pelo servidor.
        </AlertDescription>
      </Alert>

      <AdminStats
        columns={4}
        items={[
          { label: "Integrações", value: diag?.connectors ?? 0, icon: Settings2 },
          { label: "Canais prontos", value: providerReady, icon: CheckCircle2, tone: "success" },
          { label: "Importações", value: diag?.imports ?? 0, icon: FileSpreadsheet },
          { label: "Ingestões", value: diag?.ingestionEvents ?? 0, icon: DatabaseZap },
          {
            label: "Duplicados",
            value: diag?.duplicateCandidates ?? 0,
            icon: AlertTriangle,
            tone: "warning",
          },
          { label: "Falhas", value: diag?.failures ?? 0, icon: XCircle, tone: "danger" },
        ]}
      />

      <Tabs defaultValue="connectors">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="connectors">Integrações</TabsTrigger>
          <TabsTrigger value="mapping">Mapeamento de campos</TabsTrigger>
          <TabsTrigger value="imports">Importação</TabsTrigger>
          <TabsTrigger value="events">Histórico de entradas</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnóstico</TabsTrigger>
        </TabsList>

        <TabsContent value="connectors" className="space-y-3 pt-3">
          {connectorRows.map((connector) => {
            const external =
              connector.channelKey === "META_ADS" || connector.channelKey === "GOOGLE_ADS";
            const activatable =
              !external ||
              (connector.credentialReferenceConfigured &&
                connector.verificationState === "verified" &&
                connector.availabilityState !== "failed");
            return (
              <Card key={connector.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="text-base">{connector.displayName}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <StateBadge state={connector.active ? "configured" : "draft"} />
                      <StateBadge state={connector.availabilityState} />
                      <StateBadge state={connector.credentialState} />
                      <StateBadge state={connector.verificationState} />
                      <Badge variant="outline">Modo combinado</Badge>
                      <Badge variant="secondary">versão {connector.rowVersion}</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={connector.active ? "outline" : "default"}
                    disabled={publish.isPending || (!connector.active && !activatable)}
                    onClick={() => publish.mutate(connector)}
                  >
                    {connector.active ? "Desativar" : "Ativar"}
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-3">
                  <Field
                    label="Identificação da conta no canal"
                    value={
                      selected?.id === connector.id
                        ? account
                        : (connector.providerAccountReference ?? "")
                    }
                    onChange={setAccount}
                    disabled={selected?.id !== connector.id}
                  />
                  <Field
                    label="Identificação do formulário de leads"
                    value={
                      selected?.id === connector.id ? form : (connector.providerFormReference ?? "")
                    }
                    onChange={setForm}
                    disabled={selected?.id !== connector.id}
                  />
                  <div className="space-y-2">
                    <Label>Referência protegida da credencial</Label>
                    <div className="flex gap-2">
                      <Input
                        value={selected?.id === connector.id ? credential : ""}
                        onChange={(event) => setCredential(event.target.value)}
                        disabled={selected?.id !== connector.id || !external}
                        placeholder="Referência gerenciada da credencial"
                      />
                      <Button
                        aria-label="Atualizar referência da credencial"
                        variant="outline"
                        disabled={
                          selected?.id !== connector.id ||
                          !external ||
                          !credential ||
                          rotateCredential.isPending
                        }
                        onClick={() => rotateCredential.mutate()}
                      >
                        <KeyRound className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="lg:col-span-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedId(connector.id);
                        setAccount(connector.providerAccountReference ?? "");
                        setForm(connector.providerFormReference ?? "");
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      disabled={selected?.id !== connector.id || saveConnector.isPending}
                      onClick={() => saveConnector.mutate()}
                    >
                      Salvar rascunho
                    </Button>
                  </div>
                  {external && !activatable ? (
                    <p className="lg:col-span-3 text-xs text-muted-foreground">
                      Ativação protegida até que credencial, verificação ao vivo e mapeamento sejam
                      válidos. Dados locais não habilitam canais externos.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
          {connectorRows.length === 0 ? (
            <StateCard
              icon={Settings2}
              title="Nenhuma integração configurada"
              description="Esta empresa ainda não possui canais de marketing configurados."
            />
          ) : null}
        </TabsContent>

        <TabsContent value="mapping" className="pt-3">
          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de campos versionado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                aria-label="Configuração do mapeamento de campos"
                className="min-h-[420px] font-mono text-xs"
                value={mappingJson}
                onChange={(event) => setMappingJson(event.target.value)}
              />
              <Button
                disabled={!selected || saveMapping.isPending}
                onClick={() => saveMapping.mutate()}
              >
                Salvar mapeamento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imports" className="space-y-4 pt-3">
          <Card>
            <CardHeader>
              <CardTitle>Importação manual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Formato</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={format}
                    onChange={(event) => setFormat(event.target.value as typeof format)}
                  >
                    <option>CSV</option>
                    <option>XLSX</option>
                    <option value="MANUAL_ROW">Registro digitado</option>
                  </select>
                </div>
                <Field label="Arquivo" value={fileName} onChange={setFileName} />
                <Field label="Base64 opcional" value={contentBase64} onChange={setContentBase64} />
              </div>
              <div>
                <Label>Conteúdo manual</Label>
                <Textarea
                  className="min-h-32 font-mono text-xs"
                  value={manualCsv}
                  onChange={(event) => setManualCsv(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!selected || previewImport.isPending}
                  onClick={() => previewImport.mutate()}
                >
                  Gerar prévia no servidor
                </Button>
                <Button
                  disabled={!selected || createImport.isPending}
                  onClick={() => createImport.mutate()}
                >
                  Persistir importação
                </Button>
              </div>
              {preview ? (
                <pre className="max-h-72 overflow-auto rounded-md border bg-muted p-3 text-xs">
                  {JSON.stringify(preview, null, 2)}
                </pre>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Processamentos de importação</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importRows.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        {job.fileName}
                        <div className="text-xs text-muted-foreground">{job.format}</div>
                      </TableCell>
                      <TableCell>
                        <StateBadge state={job.state} />
                      </TableCell>
                      <TableCell>
                        {job.createdLeads} criados · {job.duplicateRows} duplicados ·{" "}
                        {job.failedRows} falhas
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            !["preview_ready", "partial_success", "failed"].includes(job.state) ||
                            executeImport.isPending
                          }
                          onClick={() => executeImport.mutate(job)}
                        >
                          Executar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="pt-3">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de entrada dos leads</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal / payload</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventRows.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Badge variant="outline">{event.channel_key}</Badge>
                        <div className="mt-1 max-w-48 truncate font-mono text-xs">
                          {event.provider_payload_id}
                        </div>
                      </TableCell>
                      <TableCell>{event.campaign_name ?? "—"}</TableCell>
                      <TableCell>
                        <StateBadge state={event.ingestion_state} />
                        {event.error_code ? (
                          <div className="mt-1 text-xs text-destructive">{event.error_code}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.lead_id ??
                          `${event.duplicate_candidate_ids?.length ?? 0} candidato(s)`}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={event.retry_state !== "available" || retryEvent.isPending}
                          onClick={() => retryEvent.mutate(event)}
                        >
                          Tentar novamente
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="pt-3">
          <Card>
            <CardHeader>
              <CardTitle>Diagnóstico protegido</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">
                {JSON.stringify(diag, null, 2)}
              </pre>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={() => void invalidate()}>
                  <RefreshCw className="mr-2 size-4" />
                  Atualizar
                </Button>
                <Badge variant="outline">Nenhum canal externo executado</Badge>
                <Badge variant="outline">Nenhuma entrega externa confirmada</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
function StateBadge({ state }: { state: string }) {
  const variant =
    state.includes("failed") || state.includes("error")
      ? "destructive"
      : state.includes("ready") ||
          state === "configured" ||
          state === "verified" ||
          state === "completed" ||
          state === "lead_created"
        ? "default"
        : "secondary";
  return <Badge variant={variant}>{friendlyStatus(state)}</Badge>;
}
function StateCard({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Clock3;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
        <Icon className="size-8 text-muted-foreground" />
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
function encodeBase64(value: string) {
  return typeof window === "undefined"
    ? Buffer.from(value).toString("base64")
    : window.btoa(unescape(encodeURIComponent(value)));
}
function hashClient(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0)
    .toString(16)
    .padStart(8, "0");
}
