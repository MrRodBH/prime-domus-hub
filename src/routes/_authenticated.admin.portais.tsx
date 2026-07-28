import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listarPortais,
  atualizarPortal,
  rotacionarToken,
  dashboardPortais,
  obterContratoPortais,
} from "@/lib/api/portals.functions";
import type {
  PortalConnectorView,
  PortalHybridConfig,
} from "@/lib/portals/portal-connector-registry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, RefreshCw, Settings2, Radio, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AdminPageHeader, AdminStats } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/portais")({
  component: AdminPortais,
});

function AdminPortais() {
  const queryClient = useQueryClient();
  const { data: portais = [] } = useQuery({
    queryKey: ["admin", "portais"],
    queryFn: () => listarPortais(),
  });
  const { data: contract } = useQuery({
    queryKey: ["admin", "portais", "contract"],
    queryFn: () => obterContratoPortais(),
  });
  const { data: dashboard } = useQuery({
    queryKey: ["admin", "portais", "dashboard"],
    queryFn: () => dashboardPortais(),
    refetchInterval: 30_000,
  });
  const [editing, setEditing] = useState<PortalConnectorView | null>(null);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  const toggle = useMutation({
    mutationFn: (portal: PortalConnectorView) =>
      atualizarPortal({ data: { id: portal.id, ativo: !portal.ativo } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "portais"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "portais", "dashboard"] });
      toast.success("Portal atualizado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rotate = useMutation({
    mutationFn: (id: string) => rotacionarToken({ data: { id } }),
    onSuccess: (result) => {
      setIssuedToken(result.token);
      toast.success("Novo token gerado. Copie agora; ele não será exibido novamente.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado.");
  }

  const kpis = dashboard?.kpis;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Distribuição"
        title="Portais Imobiliários"
        description="Configure conectores híbridos, acompanhe publicações e monitore leads por tenant."
      />

      <AdminStats
        columns={4}
        items={[
          { label: "Imóveis publicados", value: kpis?.imoveis_publicados ?? 0, icon: CheckCircle2, tone: "success" },
          { label: "Pendentes", value: kpis?.imoveis_pendentes ?? 0, icon: Radio, tone: "warning" },
          { label: "Com erro", value: kpis?.imoveis_erro ?? 0, icon: AlertTriangle, tone: "danger" },
          { label: "Portais ativos", value: kpis?.portais_ativos ?? 0, icon: Settings2 },
          { label: "Leads recebidos", value: kpis?.leads_total ?? 0, icon: Radio },
        ]}
      />

      <Tabs defaultValue="conectores">
        <TabsList>
          <TabsTrigger value="conectores">Conectores</TabsTrigger>
          <TabsTrigger value="portais">Leads por Portal</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="conectores" className="space-y-3 pt-3">
          {portais.map((portal) => (
            <Card key={portal.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{portal.portal_nome}</CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={
                        portal.configuration_state === "configuration_required"
                          ? "configuration_required"
                          : portal.ativo
                            ? portal.status
                            : "inativo"
                      }
                    />
                    <Badge variant="outline">HYBRID</Badge>
                    {portal.hybrid_config ? (
                      <>
                        <Badge variant="secondary">Auto: {portal.hybrid_config.automated_method}</Badge>
                        <Badge variant="secondary">Manual: {portal.hybrid_config.manual_method}</Badge>
                      </>
                    ) : null}
                    {portal.ultimo_sync_at ? (
                      <span className="text-xs text-muted-foreground">
                        Último sync: {new Date(portal.ultimo_sync_at).toLocaleString("pt-BR")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={portal.ativo}
                    onCheckedChange={() => toggle.mutate(portal)}
                    disabled={toggle.isPending}
                  />
                  <Button variant="outline" size="sm" onClick={() => setEditing(portal)}>
                    <Settings2 className="size-4 mr-1" /> Configurar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <FieldCopy
                  label="Feed/API configurado"
                  value={portal.feed_url ?? "Não configurado"}
                  onCopy={() => portal.feed_url && copyToClipboard(portal.feed_url)}
                  copyDisabled={!portal.feed_url}
                />
                <FieldCopy
                  label="Webhook configurado"
                  value={portal.webhook_url ?? "Não configurado"}
                  onCopy={() => portal.webhook_url && copyToClipboard(portal.webhook_url)}
                  copyDisabled={!portal.webhook_url}
                />
                <div className="grid gap-1">
                  <Label className="text-xs">Token de feed</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      O token não é exibido após a geração.
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rotate.mutate(portal.id)}
                      disabled={rotate.isPending}
                    >
                      <RefreshCw className="size-4 mr-1" /> Rotacionar
                    </Button>
                  </div>
                </div>
                {portal.ultimo_erro ? (
                  <div className="text-xs text-destructive">Último erro: {portal.ultimo_erro}</div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="portais" className="pt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Leads por Portal (últimos 500)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Portal</TableHead><TableHead className="text-right">Leads</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(dashboard?.leadsPorPortal ?? {}).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-xs">{key}</TableCell>
                      <TableCell className="text-right">{value}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(dashboard?.leadsPorPortal ?? {}).length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Nenhum lead registrado ainda.</TableCell></TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="pt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Últimas 50 operações</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Portal</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dashboard?.logs ?? []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="font-mono text-xs">{log.portal_slug}</TableCell>
                      <TableCell className="text-xs">{log.acao}</TableCell>
                      <TableCell><Badge variant={log.status === "ok" ? "secondary" : "destructive"}>{log.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{log.erro ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                  {(dashboard?.logs ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem operações ainda.</TableCell></TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfigurePortalDialog
        key={editing?.id ?? "portal-dialog"}
        portal={editing}
        automatedMethods={contract?.automated_methods ?? ["JSON_API", "XML_FEED", "WEBHOOK", "CUSTOM_ADAPTER"]}
        manualMethods={contract?.manual_methods ?? ["XLSX", "CSV", "MANUAL_EXPORT"]}
        onClose={() => setEditing(null)}
      />

      <Dialog open={issuedToken !== null} onOpenChange={(open) => !open && setIssuedToken(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Token gerado</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copie o token agora. Por segurança, ele não será exibido novamente.
          </p>
          <div className="flex gap-2">
            <Input value={issuedToken ?? ""} readOnly className="font-mono text-xs" />
            <Button
              size="icon"
              variant="outline"
              onClick={() => issuedToken && copyToClipboard(issuedToken)}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    ativo: { label: "Conectado", variant: "default" },
    inativo: { label: "Inativo", variant: "secondary" },
    erro: { label: "Erro", variant: "destructive" },
    configuration_required: { label: "Configuração obrigatória", variant: "outline" },
  };
  const info = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

function FieldCopy({
  label,
  value,
  onCopy,
  copyDisabled = false,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copyDisabled?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Input value={value} readOnly className="font-mono text-xs" />
        <Button size="icon" variant="outline" onClick={onCopy} disabled={copyDisabled}>
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

type AutomatedMethod = PortalHybridConfig["automated_method"];
type ManualMethod = PortalHybridConfig["manual_method"];

function ConfigurePortalDialog({
  portal,
  automatedMethods,
  manualMethods,
  onClose,
}: {
  portal: PortalConnectorView | null;
  automatedMethods: readonly string[];
  manualMethods: readonly string[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const current = portal?.hybrid_config;
  const [automatedMethod, setAutomatedMethod] = useState<AutomatedMethod>(
    current?.automated_method ?? "JSON_API",
  );
  const [manualMethod, setManualMethod] = useState<ManualMethod>(
    current?.manual_method ?? "CSV",
  );
  const [feedUrl, setFeedUrl] = useState(portal?.feed_url ?? "");
  const [webhookUrl, setWebhookUrl] = useState(portal?.webhook_url ?? "");
  const [credentialReference, setCredentialReference] = useState(
    current?.credential_reference ?? "",
  );
  const [mappingProfile, setMappingProfile] = useState(
    current?.mapping_profile ?? "default-v1",
  );
  const [schemaVersion, setSchemaVersion] = useState(
    current?.configuration_schema_version ?? 1,
  );
  const [onlyPublished, setOnlyPublished] = useState(
    current?.publication_rules.only_published ?? true,
  );
  const [maxAttempts, setMaxAttempts] = useState(
    current?.retry_policy.max_attempts ?? 5,
  );
  const [initialDelay, setInitialDelay] = useState(
    current?.retry_policy.initial_delay_seconds ?? 30,
  );
  const [maxDelay, setMaxDelay] = useState(
    current?.retry_policy.max_delay_seconds ?? 3600,
  );

  const save = useMutation({
    mutationFn: () => {
      const hybridConfig: PortalHybridConfig = {
        operation_mode: "HYBRID",
        automated_method: automatedMethod,
        manual_method: manualMethod,
        configuration_schema_version: schemaVersion,
        credential_reference: credentialReference || null,
        mapping_profile: mappingProfile,
        publication_rules: { only_published: onlyPublished },
        retry_policy: {
          max_attempts: maxAttempts,
          initial_delay_seconds: initialDelay,
          max_delay_seconds: maxDelay,
        },
      };
      return atualizarPortal({
        data: {
          id: portal!.id,
          feed_url: feedUrl || null,
          webhook_url: webhookUrl || null,
          hybrid_config: hybridConfig,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "portais"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "portais", "dashboard"] });
      toast.success("Configuração híbrida salva.");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!portal) return null;

  return (
    <Dialog open={Boolean(portal)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Configurar {portal.portal_nome}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1">
            <Label>Modo de operação</Label>
            <Input value="HYBRID" readOnly />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1">
              <Label>Método automatizado</Label>
              <Select value={automatedMethod} onValueChange={(value) => setAutomatedMethod(value as AutomatedMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {automatedMethods.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label>Método manual</Label>
              <Select value={manualMethod} onValueChange={(value) => setManualMethod(value as ManualMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {manualMethods.map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1">
            <Label>URL de Feed/API</Label>
            <Input value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} placeholder="https://..." />
          </div>
          <div className="grid gap-1">
            <Label>URL de Webhook</Label>
            <Input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://..." />
          </div>
          <div className="grid gap-1">
            <Label>Referência segura de credencial</Label>
            <Input
              value={credentialReference}
              onChange={(event) => setCredentialReference(event.target.value)}
              placeholder="vault://tenant/portal/credentials"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-1">
              <Label>Mapping profile</Label>
              <Input value={mappingProfile} onChange={(event) => setMappingProfile(event.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Versão do schema</Label>
              <Input
                type="number"
                min={1}
                value={schemaVersion}
                onChange={(event) => setSchemaVersion(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Publicar somente imóveis publicados</Label>
              <p className="text-xs text-muted-foreground">Regra aplicada aos caminhos manual e automatizado.</p>
            </div>
            <Switch checked={onlyPublished} onCheckedChange={setOnlyPublished} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-1">
              <Label>Máx. tentativas</Label>
              <Input type="number" min={1} max={20} value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value))} />
            </div>
            <div className="grid gap-1">
              <Label>Delay inicial (s)</Label>
              <Input type="number" min={1} value={initialDelay} onChange={(event) => setInitialDelay(Number(event.target.value))} />
            </div>
            <div className="grid gap-1">
              <Label>Delay máximo (s)</Label>
              <Input type="number" min={1} value={maxDelay} onChange={(event) => setMaxDelay(Number(event.target.value))} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !mappingProfile.trim()}>
              Salvar configuração híbrida
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}