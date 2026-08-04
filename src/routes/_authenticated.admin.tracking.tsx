import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  disableTenantTrackingConnector,
  getTenantTrackingConsentConfiguration,
  getTenantTrackingHealth,
  listTenantTrackingConnectors,
  listTenantTrackingDiagnostics,
  listTenantTrackingEventBindings,
  listTenantTrackingEventDefinitions,
  listTenantTrackingProviders,
  previewTenantTrackingRuntime,
  publishTenantTrackingConnector,
  saveTenantTrackingConnectorDraft,
  saveTenantTrackingConsentConfiguration,
  saveTenantTrackingEventBindings,
} from "@/lib/api/tenant-tracking.functions";
import {
  TRACKING_EVENT_KEYS,
  type TrackingEventKey,
  type TrackingProviderKey,
} from "@/lib/tracking/tracking-registry";
import { AdminPageHeader, AdminStats } from "@/components/admin/ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Code2,
  Eye,
  RefreshCw,
  ShieldCheck,
  Tags,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tracking")({
  component: TrackingGovernanceCenter,
});

type Connector = {
  id: string;
  providerKey: TrackingProviderKey;
  displayName: string;
  capabilityClass: "required" | "extensible";
  providerIdentifier: string | null;
  identifierType: string;
  enabled: boolean;
  consentCategory: "ANALYTICS" | "MARKETING";
  configurationVersion: number;
  eventBindingVersion: number;
  availabilityState: string;
  rowVersion: number;
  lastErrorCode: string | null;
};

type Binding = { eventKey: TrackingEventKey; enabled: boolean; bindingVersion: number };
type ConsentConfig = {
  noticeEnabled: boolean;
  analyticsMode: "opt_in";
  marketingMode: "opt_in";
  policyRevision: number;
  rowVersion: number;
};
type Diagnostic = {
  id: string;
  connectorId: string | null;
  providerKey: TrackingProviderKey | null;
  state: string;
  errorCode: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

const emptyBindings = (): Record<TrackingEventKey, boolean> =>
  Object.fromEntries(TRACKING_EVENT_KEYS.map((eventKey) => [eventKey, false])) as Record<TrackingEventKey, boolean>;

function TrackingGovernanceCenter() {
  const queryClient = useQueryClient();
  const [selectedConnectorId, setSelectedConnectorId] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [bindings, setBindings] = useState<Record<TrackingEventKey, boolean>>(emptyBindings);
  const [noticeEnabled, setNoticeEnabled] = useState(true);
  const [policyRevision, setPolicyRevision] = useState(1);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);

  const providersQuery = useQuery({ queryKey: ["tenant-tracking", "providers"], queryFn: () => listTenantTrackingProviders() });
  const connectorsQuery = useQuery({ queryKey: ["tenant-tracking", "connectors"], queryFn: () => listTenantTrackingConnectors() });
  const eventsQuery = useQuery({ queryKey: ["tenant-tracking", "events"], queryFn: () => listTenantTrackingEventDefinitions() });
  const consentQuery = useQuery({ queryKey: ["tenant-tracking", "consent"], queryFn: () => getTenantTrackingConsentConfiguration() });
  const healthQuery = useQuery({ queryKey: ["tenant-tracking", "health"], queryFn: () => getTenantTrackingHealth(), refetchInterval: 30_000 });
  const diagnosticsQuery = useQuery({
    queryKey: ["tenant-tracking", "diagnostics"],
    queryFn: async () => await listTenantTrackingDiagnostics({ data: { limit: 100 } }) as Diagnostic[],
    refetchInterval: 30_000,
  });

  const connectorRows = (connectorsQuery.data ?? []) as Connector[];
  const selected = connectorRows.find((connector) => connector.id === selectedConnectorId) ?? connectorRows[0] ?? null;
  const bindingsQuery = useQuery({
    queryKey: ["tenant-tracking", "bindings", selected?.id],
    queryFn: async () => await listTenantTrackingEventBindings({ data: { connectorId: selected!.id } }) as Binding[],
    enabled: Boolean(selected?.id),
  });

  useEffect(() => {
    if (!selectedConnectorId && connectorRows[0]) setSelectedConnectorId(connectorRows[0].id);
  }, [connectorRows, selectedConnectorId]);
  useEffect(() => {
    setIdentifier(selected?.providerIdentifier ?? "");
    setPreview(null);
  }, [selected?.id, selected?.providerIdentifier]);
  useEffect(() => {
    const next = emptyBindings();
    for (const binding of bindingsQuery.data ?? []) next[binding.eventKey] = binding.enabled;
    setBindings(next);
  }, [bindingsQuery.data]);
  useEffect(() => {
    const consent = consentQuery.data as ConsentConfig | undefined;
    if (!consent) return;
    setNoticeEnabled(consent.noticeEnabled);
    setPolicyRevision(consent.policyRevision);
  }, [consentQuery.data]);

  const invalidate = async () => queryClient.invalidateQueries({ queryKey: ["tenant-tracking"] });
  const connectorConfig = (enabled: boolean) => {
    if (!selected) throw new Error("Selecione um provider.");
    return {
      providerKey: selected.providerKey,
      providerIdentifier: identifier.trim() || null,
      schemaVersion: 1 as const,
      enabled,
      consentCategory: selected.consentCategory,
    };
  };

  const saveDraft = useMutation({
    mutationFn: async () => selected && saveTenantTrackingConnectorDraft({ data: { connectorId: selected.id, expectedRowVersion: selected.rowVersion, config: connectorConfig(false) } }),
    onSuccess: async () => { await invalidate(); toast.success("Draft confirmado pelo servidor."); },
    onError: (error: Error) => toast.error(error.message),
  });
  const publish = useMutation({
    mutationFn: async () => selected && publishTenantTrackingConnector({ data: { connectorId: selected.id, expectedRowVersion: selected.rowVersion, config: connectorConfig(true) } }),
    onSuccess: async () => { await invalidate(); toast.success("Ativação confirmada pelo servidor."); },
    onError: (error: Error) => toast.error(error.message),
  });
  const disable = useMutation({
    mutationFn: async () => selected && disableTenantTrackingConnector({ data: { connectorId: selected.id, expectedRowVersion: selected.rowVersion } }),
    onSuccess: async () => { await invalidate(); toast.success("Provider desativado."); },
    onError: (error: Error) => toast.error(error.message),
  });
  const saveBindings = useMutation({
    mutationFn: async () => selected && saveTenantTrackingEventBindings({ data: {
      connectorId: selected.id,
      expectedBindingVersion: selected.eventBindingVersion,
      bindings: TRACKING_EVENT_KEYS.map((eventKey) => ({ eventKey, enabled: bindings[eventKey] })),
    } }),
    onSuccess: async () => { await invalidate(); toast.success("Event bindings versionados salvos."); },
    onError: (error: Error) => toast.error(error.message),
  });
  const previewRuntime = useMutation({
    mutationFn: async () => selected && previewTenantTrackingRuntime({ data: { connectorId: selected.id } }),
    onSuccess: (value) => { setPreview((value ?? null) as Record<string, unknown> | null); toast.success("Preview sem chamada externa."); },
    onError: (error: Error) => toast.error(error.message),
  });
  const saveConsent = useMutation({
    mutationFn: async () => {
      const current = consentQuery.data as ConsentConfig | undefined;
      if (!current) throw new Error("Configuração de consentimento indisponível.");
      return saveTenantTrackingConsentConfiguration({ data: {
        expectedRowVersion: current.rowVersion,
        config: { schemaVersion: 1, noticeEnabled, analyticsMode: "opt_in", marketingMode: "opt_in", policyRevision },
      } });
    },
    onSuccess: async () => { await invalidate(); toast.success("Política de consentimento versionada."); },
    onError: (error: Error) => toast.error(error.message),
  });

  const baseQueries = [providersQuery, connectorsQuery, eventsQuery, consentQuery, healthQuery, diagnosticsQuery];
  if (baseQueries.some((query) => query.isLoading)) {
    return <StateCard icon={Clock3} title="loading" description="Carregando autoridade tenant-scoped de tracking." />;
  }
  const failed = baseQueries.find((query) => query.isError);
  if (failed) {
    return <StateCard icon={XCircle} title="permission_denied / error" description={failed.error instanceof Error ? failed.error.message : "Falha segura."} action={<Button onClick={() => void invalidate()}>retry_available</Button>} />;
  }

  const health = healthQuery.data;
  const eventDefinitions = eventsQuery.data ?? [];
  const consent = consentQuery.data as ConsentConfig;
  const gtmBlocked = selected?.providerKey === "GOOGLE_TAG_MANAGER";

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Tracking governance" title="Analytics, Pixels & Conversion Events" description="Providers catalogados, consentimento opt-in, payloads sem PII e runtime Host-derived." />
      <Alert>
        <ShieldCheck className="size-4" />
        <AlertTitle>Sem JavaScript arbitrário e sem prova falsa de entrega</AlertTitle>
        <AlertDescription>Os nomes são derivados do registry fechado. GTM permanece <strong>csp_blocked</strong> porque um container externo não auditado pode introduzir tags fora do contrato.</AlertDescription>
      </Alert>
      <AdminStats columns={4} items={[
        { label: "Providers", value: health?.providerCount ?? 0, icon: Tags },
        { label: "Configurados", value: health?.configuredProviders ?? 0, icon: Code2 },
        { label: "Ativos", value: health?.activeProviders ?? 0, icon: CheckCircle2, tone: "success" },
        { label: "Falhas", value: health?.failedProviders ?? 0, icon: AlertTriangle, tone: "danger" },
      ]} />

      <Tabs defaultValue="providers">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="events">Conversion events</TabsTrigger>
          <TabsTrigger value="consent">Consentimento</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {connectorRows.map((connector) => (
                <button key={connector.id} type="button" onClick={() => setSelectedConnectorId(connector.id)} className={`w-full rounded-lg border p-3 text-left ${selected?.id === connector.id ? "border-primary bg-primary/5" : "bg-card"}`}>
                  <div className="flex justify-between gap-2"><strong className="text-sm">{connector.displayName}</strong><Badge variant={connector.enabled ? "default" : "secondary"}>{connector.availabilityState}</Badge></div>
                  <p className="mt-1 text-xs text-muted-foreground">{connector.providerKey} · {connector.capabilityClass} · {connector.consentCategory}</p>
                </button>
              ))}
            </div>
            {selected ? (
              <Card><CardHeader><CardTitle className="text-base">{selected.displayName}</CardTitle></CardHeader><CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2"><Badge variant="outline">config v{selected.configurationVersion}</Badge><Badge variant="outline">bindings v{selected.eventBindingVersion}</Badge><Badge variant="outline">row v{selected.rowVersion}</Badge></div>
                <div className="space-y-2"><Label htmlFor="provider-id">Identificador público validado</Label><Input id="provider-id" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={selected.identifierType} /><p className="text-xs text-muted-foreground">Tokens, endpoints, HTML e JavaScript não são aceitos.</p></div>
                {gtmBlocked ? <Alert><AlertTriangle className="size-4" /><AlertTitle>csp_blocked</AlertTitle><AlertDescription>Contrato extensível catalogado; ativação bloqueada por governança.</AlertDescription></Alert> : null}
                <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => saveDraft.mutate()}>Salvar draft</Button><Button variant="outline" onClick={() => previewRuntime.mutate()}><Eye className="mr-2 size-4" />Preview</Button><Button disabled={gtmBlocked} onClick={() => publish.mutate()}>Ativar</Button><Button variant="destructive" disabled={!selected.enabled} onClick={() => disable.mutate()}>Desativar</Button></div>
                {preview ? <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(preview, null, 2)}</pre> : null}
              </CardContent></Card>
            ) : <StateCard icon={AlertTriangle} title="empty" description="Nenhum connector materializado." />}
          </div>
        </TabsContent>

        <TabsContent value="events" className="pt-4">
          <Card><CardHeader><CardTitle className="text-base">Event bindings fechados</CardTitle></CardHeader><CardContent className="space-y-3">
            {eventDefinitions.map((definition) => (
              <label key={definition.eventKey} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <span><strong className="font-mono text-xs">{definition.eventKey}</strong><span className="ml-2 text-xs text-muted-foreground">{definition.businessMeaning} · {definition.consentCategory}</span></span>
                <Switch checked={bindings[definition.eventKey]} onCheckedChange={(checked) => setBindings((current) => ({ ...current, [definition.eventKey]: checked }))} />
              </label>
            ))}
            <Button disabled={!selected || bindingsQuery.isLoading} onClick={() => saveBindings.mutate()}>Salvar bindings versionados</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="consent" className="pt-4">
          <Card><CardHeader><CardTitle className="text-base">Política explícita de consentimento</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3"><span><strong className="text-sm">Aviso de preferências</strong><p className="text-xs text-muted-foreground">Estado desconhecido não carrega analytics ou marketing.</p></span><Switch checked={noticeEnabled} onCheckedChange={setNoticeEnabled} /></div>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border p-3">Analytics: {consent.analyticsMode}</div><div className="rounded-lg border p-3">Marketing: {consent.marketingMode}</div></div>
            <div className="max-w-xs space-y-2"><Label htmlFor="policy-revision">Revisão da política</Label><Input id="policy-revision" type="number" min={1} value={policyRevision} onChange={(event) => setPolicyRevision(Number(event.target.value))} /></div>
            <Button onClick={() => saveConsent.mutate()}>Salvar política versionada</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="pt-4">
          <Card><CardHeader><CardTitle className="text-base">Diagnósticos sanitizados</CardTitle></CardHeader><CardContent className="space-y-3">
            {(diagnosticsQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">empty</p> : (diagnosticsQuery.data ?? []).map((item: Diagnostic) => (
              <div key={item.id} className="grid gap-1 rounded-lg border p-3 text-xs sm:grid-cols-4"><span>{item.providerKey ?? "global"}</span><Badge variant="outline">{item.state}</Badge><span>{item.errorCode ?? "—"}</span><span>{new Date(item.createdAt).toLocaleString("pt-BR")}</span></div>
            ))}
            <Button variant="outline" onClick={() => void diagnosticsQuery.refetch()}><RefreshCw className="mr-2 size-4" />Atualizar</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StateCard({ icon: Icon, title, description, action }: { icon: typeof Activity; title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-[320px] items-center justify-center p-6"><Card className="w-full max-w-lg"><CardContent className="flex flex-col items-center gap-3 p-8 text-center"><Icon className="size-8 text-muted-foreground" /><h2 className="font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p>{action}</CardContent></Card></div>;
}
