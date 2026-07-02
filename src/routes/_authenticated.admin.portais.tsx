import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listarPortais, atualizarPortal, rotacionarToken, dashboardPortais } from "@/lib/api/portals.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, RefreshCw, Settings2, Radio, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/portais")({
  component: AdminPortais,
});

type Portal = {
  id: string;
  portal_slug: string;
  portal_nome: string;
  ativo: boolean;
  feed_url: string | null;
  feed_token: string;
  webhook_url: string | null;
  webhook_secret: string;
  status: string;
  ultimo_sync_at: string | null;
  ultimo_erro: string | null;
};

function AdminPortais() {
  const qc = useQueryClient();
  const { data: portais = [] } = useQuery({
    queryKey: ["admin", "portais"],
    queryFn: () => listarPortais() as Promise<Portal[]>,
  });
  const { data: dash } = useQuery({
    queryKey: ["admin", "portais", "dashboard"],
    queryFn: () => dashboardPortais(),
    refetchInterval: 30_000,
  });
  const [editing, setEditing] = useState<Portal | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const toggle = useMutation({
    mutationFn: (p: Portal) => atualizarPortal({ data: { id: p.id, ativo: !p.ativo } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "portais"] });
      toast.success("Portal atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rotate = useMutation({
    mutationFn: (id: string) => rotacionarToken({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "portais"] });
      toast.success("Novo token gerado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado.");
  }

  const kpis = dash?.kpis;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Portais Imobiliários</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte e monitore a distribuição de imóveis e leads nos principais portais.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Kpi label="Imóveis publicados" value={kpis?.imoveis_publicados ?? 0} icon={<CheckCircle2 className="size-4 text-emerald-600" />} />
        <Kpi label="Pendentes" value={kpis?.imoveis_pendentes ?? 0} icon={<Radio className="size-4 text-amber-600" />} />
        <Kpi label="Com erro" value={kpis?.imoveis_erro ?? 0} icon={<AlertTriangle className="size-4 text-destructive" />} />
        <Kpi label="Portais ativos" value={kpis?.portais_ativos ?? 0} icon={<Settings2 className="size-4" />} />
        <Kpi label="Leads recebidos" value={kpis?.leads_total ?? 0} icon={<Radio className="size-4 text-blue-600" />} />
      </div>

      <Tabs defaultValue="conectores">
        <TabsList>
          <TabsTrigger value="conectores">Conectores</TabsTrigger>
          <TabsTrigger value="portais">Leads por Portal</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="conectores" className="space-y-3 pt-3">
          {portais.map((p) => {
            const feedUrl = `${origin}/api/public/feeds/${p.portal_slug}/${p.feed_token}`;
            const leadsUrl = `${origin}/api/public/portal-leads`;
            return (
              <Card key={p.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{p.portal_nome}</CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={p.ativo ? p.status : "nao_configurado"} />
                      {p.ultimo_sync_at ? (
                        <span className="text-xs text-muted-foreground">
                          Último sync: {new Date(p.ultimo_sync_at).toLocaleString("pt-BR")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={p.ativo} onCheckedChange={() => toggle.mutate(p)} />
                    <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                      <Settings2 className="size-4 mr-1" /> Configurar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <FieldCopy label="Feed XML (VRSync)" value={feedUrl} onCopy={() => copyToClipboard(feedUrl)} />
                  <FieldCopy label="Endpoint de Leads" value={leadsUrl} onCopy={() => copyToClipboard(leadsUrl)} />
                  <div className="grid gap-1">
                    <Label className="text-xs">Feed token</Label>
                    <div className="flex gap-2">
                      <Input value={p.feed_token} readOnly className="font-mono text-xs" />
                      <Button size="icon" variant="outline" onClick={() => copyToClipboard(p.feed_token)}><Copy className="size-4" /></Button>
                      <Button size="icon" variant="outline" onClick={() => rotate.mutate(p.id)}><RefreshCw className="size-4" /></Button>
                    </div>
                  </div>
                  {p.ultimo_erro ? (
                    <div className="text-xs text-destructive">Último erro: {p.ultimo_erro}</div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
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
                  {Object.entries(dash?.leadsPorPortal ?? {}).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell className="font-mono text-xs">{k}</TableCell>
                      <TableCell className="text-right">{v}</TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(dash?.leadsPorPortal ?? {}).length === 0 ? (
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
                  {(dash?.logs ?? []).map((l: { id: string; created_at: string; portal_slug: string; acao: string; status: string; erro: string | null }) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="font-mono text-xs">{l.portal_slug}</TableCell>
                      <TableCell className="text-xs">{l.acao}</TableCell>
                      <TableCell><Badge variant={l.status === "ok" ? "secondary" : "destructive"}>{l.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{l.erro ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                  {(dash?.logs ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem operações ainda.</TableCell></TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfigurePortalDialog portal={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    ativo: { label: "Conectado", variant: "default" },
    inativo: { label: "Inativo", variant: "secondary" },
    erro: { label: "Erro", variant: "destructive" },
    nao_configurado: { label: "Não configurado", variant: "outline" },
  };
  const info = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

function FieldCopy({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Input value={value} readOnly className="font-mono text-xs" />
        <Button size="icon" variant="outline" onClick={onCopy}><Copy className="size-4" /></Button>
      </div>
    </div>
  );
}

function ConfigurePortalDialog({ portal, onClose }: { portal: Portal | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [feedUrl, setFeedUrl] = useState(portal?.feed_url ?? "");
  const [webhookUrl, setWebhookUrl] = useState(portal?.webhook_url ?? "");

  const save = useMutation({
    mutationFn: () =>
      atualizarPortal({
        data: { id: portal!.id, feed_url: feedUrl || null, webhook_url: webhookUrl || null },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "portais"] });
      toast.success("Configuração salva.");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!portal) return null;

  return (
    <Dialog open={!!portal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Configurar {portal.portal_nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1">
            <Label>URL de Feed (opcional — para consumo externo, se o portal exigir upload)</Label>
            <Input value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid gap-1">
            <Label>URL de Webhook do Portal (opcional)</Label>
            <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
