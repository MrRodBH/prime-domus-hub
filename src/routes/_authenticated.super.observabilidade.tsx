import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { superObservabilidade } from "@/lib/api/super.functions";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertTriangle, Zap, Rss } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/super/observabilidade")({
  component: ObservabilidadePage,
});

type Obs = {
  window_hours: number;
  since: string;
  totals: Record<string, number> | null;
  errors_by_source: Array<{ source: string; erros: number }>;
  slowest_endpoints: Array<{ source: string; avg_ms: number; max_ms: number; chamadas: number }>;
  ai_usage: Array<{ source: string; chamadas: number; avg_ms: number; tokens: number | null }>;
  portal_health: Array<{ portal: string; ok: number; erros: number; total: number }>;
  timeline: Array<{ bucket: string; info: number; warn: number; error: number }>;
  recent_errors: Array<{ id: string; created_at: string; category: string; source: string; event: string; status_code: number | null; tenant_id: string | null; error_message: string | null; meta: Record<string, unknown> }>;
};

function ObservabilidadePage() {
  const [hours, setHours] = useState(24);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["super-observabilidade", hours],
    queryFn: () => superObservabilidade({ data: { hours } }) as Promise<Obs>,
    refetchInterval: 30_000,
  });

  const totals = data?.totals ?? {};
  const totalEventos = Object.values(totals).reduce((a, b) => a + Number(b || 0), 0);
  const totalErros = data?.errors_by_source.reduce((a, s) => a + s.erros, 0) ?? 0;
  const totalAi = data?.ai_usage.reduce((a, s) => a + s.chamadas, 0) ?? 0;
  const totalPortalErr = data?.portal_health.reduce((a, s) => a + s.erros, 0) ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Observabilidade Técnica"
        description="Monitoramento de APIs, IA, portais, feeds e falhas — apenas Super Admin."
        actions={
          <div className="flex items-center gap-2">
            <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Última hora</SelectItem>
                <SelectItem value="6">Últimas 6h</SelectItem>
                <SelectItem value="24">Últimas 24h</SelectItem>
                <SelectItem value="72">Últimos 3 dias</SelectItem>
                <SelectItem value="168">Últimos 7 dias</SelectItem>
                <SelectItem value="720">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant={isFetching ? "secondary" : "outline"}>
              {isFetching ? "Atualizando…" : "Auto 30s"}
            </Badge>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Activity className="size-4" />} label="Eventos" value={totalEventos} />
        <Kpi icon={<AlertTriangle className="size-4" />} label="Erros" value={totalErros} tone={totalErros > 0 ? "warn" : "ok"} />
        <Kpi icon={<Zap className="size-4" />} label="Chamadas IA" value={totalAi} />
        <Kpi icon={<Rss className="size-4" />} label="Erros Portal/Feed" value={totalPortalErr} tone={totalPortalErr > 0 ? "warn" : "ok"} />
      </div>

      <Card className="p-6">
        <div className="font-semibold mb-4">Timeline de eventos por hora</div>
        <div className="h-64">
          {data?.timeline && data.timeline.length > 0 ? (
            <ResponsiveContainer>
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="bucket" tickFormatter={(v) => new Date(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} />
                <YAxis allowDecimals={false} />
                <Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString("pt-BR")} />
                <Legend />
                <Line type="monotone" dataKey="info"  stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="warn"  stroke="hsl(var(--warning, 38 92% 50%))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="error" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState loading={isLoading} label="Sem eventos no período" />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="font-semibold mb-4">Endpoints mais lentos</div>
          <SimpleTable
            columns={["Endpoint", "Chamadas", "Média (ms)", "Máx (ms)"]}
            rows={(data?.slowest_endpoints ?? []).map((r) => [r.source, r.chamadas, r.avg_ms, r.max_ms])}
            emptyLabel="Nenhuma métrica coletada"
            loading={isLoading}
          />
        </Card>

        <Card className="p-6">
          <div className="font-semibold mb-4">Erros por fonte</div>
          <SimpleTable
            columns={["Fonte", "Erros"]}
            rows={(data?.errors_by_source ?? []).map((r) => [r.source, r.erros])}
            emptyLabel="Sem erros no período"
            loading={isLoading}
          />
        </Card>

        <Card className="p-6">
          <div className="font-semibold mb-4">Uso de IA</div>
          <SimpleTable
            columns={["Função", "Chamadas", "Média (ms)", "Tokens"]}
            rows={(data?.ai_usage ?? []).map((r) => [r.source, r.chamadas, r.avg_ms, r.tokens ?? "—"])}
            emptyLabel="Nenhuma chamada de IA no período"
            loading={isLoading}
          />
        </Card>

        <Card className="p-6">
          <div className="font-semibold mb-4">Saúde dos portais</div>
          <SimpleTable
            columns={["Portal", "OK", "Erros", "Total"]}
            rows={(data?.portal_health ?? []).map((r) => [r.portal, r.ok, r.erros, r.total])}
            emptyLabel="Sem tráfego de portais no período"
            loading={isLoading}
          />
        </Card>
      </div>

      <Card className="p-6">
        <div className="font-semibold mb-4">Erros recentes</div>
        {(data?.recent_errors ?? []).length === 0 ? (
          <EmptyState loading={isLoading} label="Nenhum erro registrado" />
        ) : (
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-4">Quando</th>
                  <th className="py-2 pr-4">Categoria</th>
                  <th className="py-2 pr-4">Fonte</th>
                  <th className="py-2 pr-4">Evento</th>
                  <th className="py-2 pr-4">HTTP</th>
                  <th className="py-2">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_errors ?? []).map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="py-2 pr-4"><Badge variant="outline">{r.category}</Badge></td>
                    <td className="py-2 pr-4 font-mono text-xs">{r.source}</td>
                    <td className="py-2 pr-4">{r.event}</td>
                    <td className="py-2 pr-4">{r.status_code ?? "—"}</td>
                    <td className="py-2 text-destructive">{r.error_message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="text-xs text-muted-foreground">
        Janela: {data?.window_hours ?? hours}h · desde {data?.since ? new Date(data.since).toLocaleString("pt-BR") : "…"} ·
        <button className="ml-2 underline" onClick={() => refetch()}>atualizar agora</button>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone?: "ok" | "warn" }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <div className={`text-2xl font-semibold mt-1 ${tone === "warn" ? "text-destructive" : ""}`}>{value}</div>
    </Card>
  );
}

function SimpleTable({ columns, rows, emptyLabel, loading }: { columns: string[]; rows: Array<Array<string | number>>; emptyLabel: string; loading: boolean }) {
  if (rows.length === 0) return <EmptyState loading={loading} label={emptyLabel} />;
  return (
    <div className="overflow-auto max-h-72">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground border-b">
          <tr>{columns.map((c) => <th key={c} className="py-2 pr-4">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`py-2 pr-4 ${j === 0 ? "font-mono text-xs" : ""}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ loading, label }: { loading: boolean; label: string }) {
  return (
    <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
      {loading ? "Carregando…" : label}
    </div>
  );
}
