import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { friendlyStatus } from "@/lib/ui-labels";
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
type PortalJobView = {
  id: string;
  revision: number;
  createdAt: string;
  operation: "publish" | "unpublish" | "reconcile";
  currentState: string;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
};
type PortalLogView = {
  id: string;
  createdAt: string;
  connectorSlug: string;
  action: string;
  status: string;
  errorCode: string | null;
};
type PortalRegistryView = {
  definitions: Array<{
    connectorKey: PortalAutomatedMethod;
    displayName: string;
    availabilityState: string;
  }>;
};

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
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["tenant-portals"] })]);
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
      toast.success("Estado da integração atualizado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const retry = useMutation({
    mutationFn: (job: { id: string; revision: number }) =>
      retryTenantPortalJob({ data: { jobId: job.id, expectedRevision: job.revision } }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Nova tentativa agendada pelo servidor.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancel = useMutation({
    mutationFn: (job: { id: string; revision: number }) =>
      cancelTenantPortalJob({ data: { jobId: job.id, expectedRevision: job.revision } }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Processamento cancelado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const exportMutation = useMutation({
    mutationFn: () => {
      const propertyIds = exportPropertyIds
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (!exportConnectorId) throw new Error("Selecione um portal de destino.");
      return generateTenantPortalManualExport({
        data: { connectorId: exportConnectorId, propertyIds, format: exportFormat },
      });
    },
    onSuccess: async (result) => {
      await invalidate();
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
      toast.success(`Exportação ${result.format} gerada com ${result.rowCount} registro(s).`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const loading = [connectors, registry, dashboard, diagnostics, jobs, logs].some(
    (query) => query.isLoading,
  );
  const failed = [connectors, registry, dashboard, diagnostics, jobs, logs].find(
    (query) => query.isError,
  );
  const connectorRows = (connectors.data ?? []) as PortalConnectorView[];
  const jobRows = (jobs.data ?? []) as PortalJobView[];
  const logRows = (logs.data ?? []) as PortalLogView[];
  const diagnostic = diagnostics.data;
  const kpis = dashboard.data;

  if (loading) {
    return (
      <StateCard
        icon={Clock3}
        title="Carregando"
        description="Carregando configurações de portais desta empresa."
      />
    );
  }
  if (failed) {
    return (
      <StateCard
        icon={XCircle}
        title="Não foi possível carregar"
        description={
          failed.error instanceof Error ? failed.error.message : "Falha segura ao carregar portais."
        }
        action={<Button onClick={() => void invalidate()}>Tentar novamente</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Distribuição de imóveis"
        title="Central de portais imobiliários"
        description="Gerencie integrações, mapeamentos, exportações e processamentos sem expor credenciais."
      />

      <Alert>
        <ShieldCheck className="size-4" />
        <AlertTitle>Automação com bloqueio seguro</AlertTitle>
        <AlertDescription>
          As publicações automatizadas ainda não estão disponíveis. Nenhum sucesso externo é
          simulado. As exportações CSV, XLSX e manual permanecem disponíveis.
        </AlertDescription>
      </Alert>

      <AdminStats
        columns={4}
        items={[
          {
            label: "Integrações ativas",
            value: kpis?.connectorsActive ?? 0,
            icon: CheckCircle2,
            tone: "success",
          },
          {
            label: "Processamentos ativos",
            value: kpis?.activeJobs ?? 0,
            icon: RefreshCw,
            tone: "warning",
          },
          {
            label: "Falhas terminais",
            value: kpis?.terminalFailures ?? 0,
            icon: AlertTriangle,
            tone: "danger",
          },
          { label: "Reconciliação", value: kpis?.reconciliationRequired ?? 0, icon: ShieldCheck },
          { label: "Exportações", value: kpis?.exportsGenerated ?? 0, icon: Download },
          {
            label: "Credenciais pendentes",
            value: kpis?.credentialsPending ?? 0,
            icon: KeyRound,
            tone: "warning",
          },
        ]}
      />

      <Tabs defaultValue="connectors">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="connectors">Integrações</TabsTrigger>
          <TabsTrigger value="jobs">Processamentos</TabsTrigger>
          <TabsTrigger value="exports">Exportações</TabsTrigger>
          <TabsTrigger value="logs">Histórico</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnóstico</TabsTrigger>
        </TabsList>

        <TabsContent value="connectors" className="space-y-3 pt-3">
          {connectorRows.length === 0 ? (
            <StateCard
              icon={Settings2}
              title="Nenhuma integração configurada"
              description="Esta empresa ainda não possui portais imobiliários configurados."
            />
          ) : (
            connectorRows.map((connector: PortalConnectorView) => (
              <Card key={connector.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="text-base">{connector.name}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <StateBadge state={connector.active ? "ready" : "disabled"} />
                      <StateBadge state={connector.configurationState} />
                      <StateBadge state={connector.credentialState} />
                      <StateBadge state={connector.adapterAvailability} />
                      <Badge variant="outline">Modo combinado</Badge>
                      <Badge variant="secondary">versão {connector.rowVersion}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(connector)}>
                      <Settings2 className="mr-1 size-4" /> Configurar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMappingConnector(connector)}
                    >
                      Mapear campos
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCredentialConnector(connector)}
                    >
                      <KeyRound className="mr-1 size-4" /> Referência
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => toggle.mutate(connector)}
                      disabled={
                        toggle.isPending ||
                        connector.configurationState !== "adapter_not_implemented" ||
                        connector.credentialState === "credential_provisioning_required" ||
                        connector.credentialState === "rotation_required"
                      }
                    >
                      {connector.active ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                  <ReadOnly label="Identificador técnico" value={connector.slug} />
                  <ReadOnly
                    label="Método automatizado"
                    value={friendlyStatus(
                      connector.hybridConfig?.automated_method ?? "configuration_required",
                    )}
                  />
                  <ReadOnly
                    label="Método manual"
                    value={friendlyStatus(
                      connector.hybridConfig?.manual_method ?? "configuration_required",
                    )}
                  />
                  <ReadOnly
                    label="Versão do mapeamento"
                    value={String(connector.hybridConfig?.mapping_version ?? 0)}
                  />
                  <ReadOnly label="Último sucesso" value={connector.lastSyncAt ?? "Nunca"} />
                  <ReadOnly
                    label="Última falha"
                    value={friendlyStatus(connector.lastErrorCode ?? "none")}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="jobs" className="pt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Processamentos de publicação</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tentativas</TableHead>
                    <TableHead>Próxima tentativa</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobRows.map((job: PortalJobView) => (
                    <TableRow key={job.id}>
                      <TableCell className="text-xs">{formatDate(job.createdAt)}</TableCell>
                      <TableCell>{friendlyStatus(job.operation)}</TableCell>
                      <TableCell>
                        <StateBadge state={job.currentState} />
                      </TableCell>
                      <TableCell>
                        {job.attemptCount}/{job.maxAttempts}
                      </TableCell>
                      <TableCell className="text-xs">
                        {job.nextAttemptAt ? formatDate(job.nextAttemptAt) : "-"}
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-xs">
                        {job.lastErrorCode ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {job.currentState === "failed_retryable" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retry.mutate(job)}
                              disabled={retry.isPending}
                            >
                              Tentar novamente
                            </Button>
                          ) : null}
                          {[
                            "queued",
                            "unpublish_queued",
                            "retry_scheduled",
                            "failed_retryable",
                          ].includes(job.currentState) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cancel.mutate(job)}
                              disabled={cancel.isPending}
                            >
                              Cancelar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {jobRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Nenhum processamento registrado.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="pt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exportação manual</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Portal de destino">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={exportConnectorId}
                  onChange={(event) => setExportConnectorId(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {connectorRows.map((connector: PortalConnectorView) => (
                    <option key={connector.id} value={connector.id}>
                      {connector.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Formato do arquivo">
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                >
                  <option value="CSV">CSV</option>
                  <option value="XLSX">XLSX</option>
                  <option value="MANUAL_EXPORT">Exportação manual</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Identificadores dos imóveis — separe por vírgula, espaço ou linha">
                  <Input
                    value={exportPropertyIds}
                    onChange={(event) => setExportPropertyIds(event.target.value)}
                    placeholder="uuid-1, uuid-2"
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
                  <Download className="mr-1 size-4" />{" "}
                  {exportMutation.isPending ? "Gerando…" : "Gerar exportação desta empresa"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="pt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico protegido</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Portal</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Código do erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logRows.map((log: PortalLogView) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.connectorSlug}</TableCell>
                      <TableCell>{friendlyStatus(log.action)}</TableCell>
                      <TableCell>
                        <StateBadge state={log.status} />
                      </TableCell>
                      <TableCell className="text-xs">{log.errorCode ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                  {logRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="grid gap-3 pt-3 md:grid-cols-2">
          <Diagnostic label="Modo de operação" value="Combinado: automação e exportação manual" />
          <Diagnostic
            label="Estado da automação"
            value={friendlyStatus(diagnostic?.automatedState ?? "adapter_not_implemented")}
          />
          <Diagnostic
            label="Portais no catálogo"
            value={`${diagnostic?.registryCount ?? 0} cadastrados`}
          />
          <Diagnostic
            label="Automações"
            value={`${diagnostic?.adapterImplementedCount ?? 0} implementadas / ${diagnostic?.adapterNotImplementedCount ?? 0} pendentes`}
          />
          <Diagnostic
            label="Credenciais digitadas diretamente"
            value={diagnostic?.inlineSecretsAccepted ? "Inseguro" : "Proibido"}
          />
          <Diagnostic
            label="Credenciais sem proteção"
            value={diagnostic?.plaintextCredentialsAccepted ? "Inseguro" : "Proibido"}
          />
          <Diagnostic
            label="Alteração direta pelo navegador"
            value={diagnostic?.directClientMutation ? "Inseguro" : "Não permitida"}
          />
          <Diagnostic
            label="Administrador da plataforma"
            value={
              diagnostic?.superAdminImpersonationRequired
                ? "Seleção de empresa obrigatória"
                : "Configuração inválida"
            }
          />
          <Diagnostic label="Banco de dados gerenciado" value="Sem alteração nesta entrega" />
          <Diagnostic label="Portais externos" value="Nenhuma publicação real executada" />
        </TabsContent>
      </Tabs>

      <ConnectorDialog
        connector={editing}
        registry={registry.data as PortalRegistryView | undefined}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />
      <MappingDialog
        connector={mappingConnector}
        onClose={() => setMappingConnector(null)}
        onSaved={invalidate}
      />
      <CredentialDialog
        connector={credentialConnector}
        onClose={() => setCredentialConnector(null)}
        onSaved={invalidate}
      />
    </div>
  );
}

function ConnectorDialog({
  connector,
  registry,
  onClose,
  onSaved,
}: {
  connector: PortalConnectorView | null;
  registry: PortalRegistryView | undefined;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const current = connector?.hybridConfig;
  const [automatedMethod, setAutomatedMethod] = useState<PortalAutomatedMethod>(
    current?.automated_method ?? "JSON_API",
  );
  const [manualMethod, setManualMethod] = useState<PortalManualMethod>(
    current?.manual_method ?? "CSV",
  );
  const [mappingProfile, setMappingProfile] = useState(current?.mapping_profile ?? "default-v1");
  const [feedUrl, setFeedUrl] = useState(connector?.feedUrl ?? "");
  const [webhookUrl, setWebhookUrl] = useState(connector?.webhookUrl ?? "");
  const [maxAttempts, setMaxAttempts] = useState(current?.retry_policy.max_attempts ?? 5);
  const mutation = useMutation({
    mutationFn: () => {
      if (!connector) throw new Error("Integração não selecionada.");
      return saveTenantPortalConnector({
        data: {
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
            publication_rules: {
              only_published: true,
              include_statuses: ["publicado"],
              batch_size: 100,
            },
            retry_policy: {
              max_attempts: maxAttempts,
              initial_delay_seconds: 30,
              max_delay_seconds: 3600,
            },
          },
        },
      });
    },
    onSuccess: async () => {
      await onSaved();
      toast.success("Configuração salva; integração desativada até a validação completa.");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const definitions = registry?.definitions ?? [];
  return (
    <Dialog open={connector !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar {connector?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Método automatizado">
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={automatedMethod}
              onChange={(event) => setAutomatedMethod(event.target.value as PortalAutomatedMethod)}
            >
              {definitions.map((item: PortalRegistryView["definitions"][number]) => (
                <option key={item.connectorKey} value={item.connectorKey}>
                  {item.displayName} — {friendlyStatus(item.availabilityState)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Método manual">
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={manualMethod}
              onChange={(event) => setManualMethod(event.target.value as PortalManualMethod)}
            >
              <option>CSV</option>
              <option>XLSX</option>
              <option value="MANUAL_EXPORT">Exportação manual</option>
            </select>
          </Field>
          <Field label="Perfil de mapeamento">
            <Input
              value={mappingProfile}
              onChange={(event) => setMappingProfile(event.target.value)}
            />
          </Field>
          <Field label="Número máximo de tentativas">
            <Input
              type="number"
              min={1}
              max={20}
              value={maxAttempts}
              onChange={(event) => setMaxAttempts(Number(event.target.value))}
            />
          </Field>
          <Field label="Feed/API HTTPS">
            <Input
              value={feedUrl}
              onChange={(event) => setFeedUrl(event.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Endereço HTTPS para recebimento automático">
            <Input
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Salvar não ativa a automação nem confirma publicação externa. A integração permanece
            protegida até a implementação do canal.
          </AlertDescription>
        </Alert>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Salvar contrato fechado
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function MappingDialog({
  connector,
  onClose,
  onSaved,
}: {
  connector: PortalConnectorView | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const mappings = useQuery({
    queryKey: ["tenant-portals", "mappings", connector?.id],
    queryFn: () => listTenantPortalMappings({ data: { connectorId: connector!.id } }),
    enabled: connector !== null,
  });
  const currentVersion =
    mappings.data?.find((item: { current: boolean; version: number }) => item.current)?.version ??
    0;
  const mutation = useMutation({
    mutationFn: () => {
      if (!connector) throw new Error("Integração não selecionada.");
      return saveTenantPortalMapping({
        data: {
          connectorId: connector.id,
          expectedVersion: currentVersion,
          mapping: DEFAULT_PORTAL_MAPPING,
        },
      });
    },
    onSuccess: async () => {
      await onSaved();
      toast.success("Mapeamento de campos versionado.");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <Dialog open={connector !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mapeamento de campos — {connector?.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Versão atual: {currentVersion}. O mapeamento cobre campos públicos de imóveis e mídias
          desta empresa.
        </p>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || mappings.isLoading}
        >
          Criar próxima versão canônica
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function CredentialDialog({
  connector,
  onClose,
  onSaved,
}: {
  connector: PortalConnectorView | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [reference, setReference] = useState("credential://tenant/portal/provider");
  const mutation = useMutation({
    mutationFn: () => {
      if (!connector) throw new Error("Integração não selecionada.");
      return rotateTenantPortalCredentialReference({
        data: {
          connectorId: connector.id,
          expectedRowVersion: connector.rowVersion,
          credentialReference: reference,
        },
      });
    },
    onSuccess: async () => {
      await onSaved();
      toast.success("Referência rotacionada; provisionamento externo ainda é obrigatório.");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <Dialog open={connector !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Referência protegida da credencial — {connector?.name}</DialogTitle>
        </DialogHeader>
        <Field label="Somente a referência — não informe a credencial">
          <Input value={reference} onChange={(event) => setReference(event.target.value)} />
        </Field>
        <p className="text-sm text-muted-foreground">
          Esta operação não recebe token, senha ou segredo do aplicativo.
        </p>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Rotacionar referência
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="font-mono text-xs break-all">{value}</div>
    </div>
  );
}
function Diagnostic({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 font-mono text-sm">{value}</div>
      </CardContent>
    </Card>
  );
}
function StateBadge({ state }: { state: string }) {
  const danger = state.includes("failed") || state === "error" || state === "permission_denied";
  const warning =
    state.includes("required") ||
    state.includes("queued") ||
    state.includes("retry") ||
    state === "adapter_not_implemented";
  return (
    <Badge variant={danger ? "destructive" : warning ? "outline" : "secondary"}>
      {friendlyStatus(state)}
    </Badge>
  );
}
function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
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
          <div className="font-medium">{title}</div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
