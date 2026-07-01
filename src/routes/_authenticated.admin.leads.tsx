import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Mail, MessageCircle, Phone, Sparkles, Loader2, TrendingUp, History, Plus, X, Ban, Trash2, RotateCcw } from "lucide-react";
import { adminListarLeads, adminAtualizarLead, adminListarCorretores, adminListarImoveisLite, criarLeadManual, meusPapeis } from "@/lib/api/admin.functions";
import { adminContarDescartes } from "@/lib/api/historico.functions";
import { gerarInsightsFunil } from "@/lib/api/ia.functions";
import { listarMotivos } from "@/lib/api/lead-reasons.functions";
import {
  descartarLead,
  perderLead,
  listarLeadsDescartados,
  reabrirLead,
  performanceComercial,
  gerarInsightsPerformance,
} from "@/lib/api/leads-crm.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "@tanstack/react-router";
import { LeadHistoricoDialog } from "@/components/admin/LeadHistoricoDialog";
import { toast } from "sonner";
import { maskPhoneBR, digitsOnly, isValidPhoneBR } from "@/lib/phone-br";
import { z } from "zod";

const leadsSearchSchema = z.object({
  status: z.string().optional(),
  origem: z.string().optional(),
  corretor_id: z.string().optional(),
  inicio: z.string().optional(),
  fim: z.string().optional(),
  alerta: z.enum(["sem_atendimento", "sem_followup", "visitas_sem_feedback", "propostas_paradas"]).optional(),
  tab: z.enum(["kanban", "descartados"]).optional(),
});

export const Route = createFileRoute("/_authenticated/admin/leads")({
  validateSearch: (s) => leadsSearchSchema.parse(s),
  component: AdminLeads,
});

type Status = "novo" | "conversando" | "visita" | "proposta" | "ganho" | "perdido" | "descartado";

const COLUMNS: { id: Status; label: string; accent: string }[] = [
  { id: "novo", label: "Novo", accent: "bg-red-500" },
  { id: "conversando", label: "Conversando", accent: "bg-amber-500" },
  { id: "visita", label: "Visita", accent: "bg-lime-500" },
  { id: "proposta", label: "Proposta", accent: "bg-emerald-500" },
  { id: "ganho", label: "Ganho", accent: "bg-emerald-500" },
  { id: "perdido", label: "Perdido", accent: "bg-rose-500" },
];

type Lead = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  mensagem: string | null;
  origem: string | null;
  status: string;
  created_at: string;
  assigned_to: string | null;
  valor_estimado: number | null;
  imovel: { titulo?: string; slug?: string; preco?: number | null; preco_sob_consulta?: boolean | null } | null;
};

type CorretorLite = { id: string; nome: string; sobrenome: string | null; user_id: string | null };

function AdminLeads() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: () => adminListarLeads(),
  });
  const { data: corretores } = useQuery({
    queryKey: ["admin", "corretores", "lite"],
    queryFn: () => adminListarCorretores(),
    staleTime: 60_000,
  });
  const { data: descartesData } = useQuery({
    queryKey: ["admin", "descartes-count"],
    queryFn: () => adminContarDescartes(),
    staleTime: 30_000,
  });
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [perdaLeadId, setPerdaLeadId] = useState<string | null>(null);
  const [descarteLeadId, setDescarteLeadId] = useState<string | null>(null);
  const [corretorFilter, setCorretorFilter] = useState<string>(search.corretor_id ?? "__all__");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Sync corretor filter from URL search params
  useEffect(() => {
    if (search.corretor_id && search.corretor_id !== corretorFilter) {
      setCorretorFilter(search.corretor_id);
    }
  }, [search.corretor_id]);

  const upd = useMutation({
    mutationFn: (p: { id: string; status: Status }) => adminAtualizarLead({ data: p }),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: ["admin", "leads"] });
      const prev = qc.getQueryData<Lead[]>(["admin", "leads"]);
      qc.setQueryData<Lead[]>(["admin", "leads"], (old) =>
        old?.map((l) => (l.id === p.id ? { ...l, status: p.status } : l)) ?? [],
      );
      return { prev };
    },
    onError: (e: Error, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "leads"], ctx.prev);
      toast.error(e.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
    },
  });

  // Aplica filtros (corretor + URL search params: status, origem, período, alerta)
  const filteredData = useMemo(() => {
    let list = (data ?? []) as Lead[];
    if (corretorFilter === "__none__") list = list.filter((l) => !l.assigned_to);
    else if (corretorFilter !== "__all__") list = list.filter((l) => l.assigned_to === corretorFilter);

    if (search.status) {
      const statuses = search.status.split(",");
      list = list.filter((l) => statuses.includes(l.status));
    }
    if (search.origem) {
      const origem = search.origem.toLowerCase();
      list = list.filter((l) => (l.origem ?? "").toLowerCase() === origem);
    }
    if (search.inicio) {
      const ini = new Date(search.inicio).getTime();
      list = list.filter((l) => new Date(l.created_at).getTime() >= ini);
    }
    if (search.fim) {
      const fim = new Date(search.fim).getTime() + 86_400_000;
      list = list.filter((l) => new Date(l.created_at).getTime() <= fim);
    }
    if (search.alerta) {
      const now = Date.now();
      const day = 86_400_000;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedAt = (l: any) => new Date(l.updated_at ?? l.created_at).getTime();
      if (search.alerta === "sem_atendimento") {
        list = list.filter((l) => l.status === "novo" && now - new Date(l.created_at).getTime() > day);
      } else if (search.alerta === "sem_followup") {
        list = list.filter(
          (l) => ["conversando", "visita", "proposta"].includes(l.status) && now - updatedAt(l) > 3 * day,
        );
      } else if (search.alerta === "visitas_sem_feedback") {
        list = list.filter((l) => l.status === "visita" && now - updatedAt(l) > 3 * day);
      } else if (search.alerta === "propostas_paradas") {
        list = list.filter((l) => l.status === "proposta" && now - updatedAt(l) > 5 * day);
      }
    }
    return list;
  }, [data, corretorFilter, search]);

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (search.status) chips.push({ key: "status", label: `Status: ${search.status}` });
    if (search.origem) chips.push({ key: "origem", label: `Origem: ${search.origem}` });
    if (search.inicio || search.fim)
      chips.push({ key: "periodo", label: `Período: ${search.inicio ?? "…"} → ${search.fim ?? "…"}` });
    if (search.alerta) chips.push({ key: "alerta", label: `Alerta: ${search.alerta.replace(/_/g, " ")}` });
    return chips;
  }, [search]);

  function clearFilter(key: string) {
    const next = { ...search } as Record<string, unknown>;
    if (key === "periodo") {
      delete next.inicio;
      delete next.fim;
    } else {
      delete next[key];
    }
    navigate({ to: "/admin/leads", search: next });
  }


  const byStatus = useMemo(() => {
    const map: Record<Status, Lead[]> = {
      novo: [], conversando: [], visita: [], proposta: [], ganho: [], perdido: [], descartado: [],
    };
    for (const l of filteredData) {
      const s = (COLUMNS.some((c) => c.id === l.status) ? l.status : "novo") as Status;
      map[s].push(l);
    }
    return map;
  }, [filteredData]);

  const activeLead = filteredData.find((l) => l.id === activeId) ?? null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const over = e.over?.id ? String(e.over.id) : null;
    if (!over) return;
    const lead = filteredData.find((l) => l.id === id);
    if (!lead || lead.status === over) return;

    if (over === "perdido") {
      if (lead.status !== "proposta") {
        toast.error("Só é possível marcar como Perdido leads que estão em Proposta. Use Descartar para desqualificar.");
        return;
      }
      setPerdaLeadId(id);
      return;
    }
    if (over === "descartado") {
      setDescarteLeadId(id);
      return;
    }
    upd.mutate({ id, status: over as Status });
  }

  const total = filteredData.length;
  const corretoresLista = (corretores ?? []) as CorretorLite[];
  const selectedLead = filteredData.find((l) => l.id === selectedId) ?? null;
  const historicoLead = filteredData.find((l) => l.id === historicoId) ?? null;
  const currentTab = (search.tab ?? "kanban") as "kanban" | "descartados";
  function setTab(t: "kanban" | "descartados") {
    navigate({ to: "/admin/leads", search: { ...search, tab: t } });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl">Leads</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <NovoLeadButton corretores={corretoresLista} />
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Corretor:</span>
            <Select value={corretorFilter} onValueChange={setCorretorFilter}>
              <SelectTrigger className="h-8 min-w-[200px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os corretores</SelectItem>
                <SelectItem value="__none__">Sem corretor atribuído</SelectItem>
                {corretoresLista
                  .filter((c) => !!c.user_id)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.user_id!}>
                      {c.nome}{c.sobrenome ? ` ${c.sobrenome}` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">{total} no total</span>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-md border border-foreground/10 bg-muted/30 px-3 py-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Filtros vindos do dashboard:</span>
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => clearFilter(f.key)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-xs hover:bg-primary/25"
              title="Remover filtro"
            >
              {f.label}
              <X className="size-3" />
            </button>
          ))}
          <button
            onClick={() => navigate({ to: "/admin/leads", search: {} })}
            className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
          >
            Limpar todos
          </button>
        </div>
      )}

      <Tabs value={currentTab} onValueChange={(v) => setTab(v as "kanban" | "descartados")}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban (ativos)</TabsTrigger>
          <TabsTrigger value="descartados">Descartados</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4 pt-3">
          <p className="text-sm text-muted-foreground">
            Arraste os cards entre as colunas para atualizar o status. Para marcar como <strong>Perdido</strong>, o lead precisa estar em <strong>Proposta</strong>. Caso contrário, use <strong>Descartar</strong>.
          </p>
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid gap-3 [grid-template-columns:repeat(6,minmax(220px,1fr))] overflow-x-auto pb-4">
              {COLUMNS.map((col) => (
                <Column key={col.id} col={col} leads={byStatus[col.id]} onOpen={setSelectedId} />
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {activeLead ? <Card lead={activeLead} /> : null}
            </DragOverlay>
          </DndContext>

          <FunilChart byStatus={byStatus} descartesTotal={descartesData?.total ?? 0} />
          <PerformanceComercialPanel />
        </TabsContent>

        <TabsContent value="descartados" className="pt-3">
          <DescartadosTab onOpen={setSelectedId} />
        </TabsContent>
      </Tabs>

      <LeadDetailDialog
        lead={selectedLead}
        onClose={() => setSelectedId(null)}
        onOpenHistorico={(id) => { setSelectedId(null); setHistoricoId(id); }}
        onDescartar={(id) => { setSelectedId(null); setDescarteLeadId(id); }}
        onPerder={(id) => { setSelectedId(null); setPerdaLeadId(id); }}
      />

      <LeadHistoricoDialog
        leadId={historicoId}
        leadNome={historicoLead?.nome ?? ""}
        isAdmin={true}
        onClose={() => setHistoricoId(null)}
      />

      <DescarteDialog
        leadId={descarteLeadId}
        onClose={() => setDescarteLeadId(null)}
        onDone={() => {
          setDescarteLeadId(null);
          qc.invalidateQueries({ queryKey: ["admin", "leads"] });
          qc.invalidateQueries({ queryKey: ["admin", "descartados"] });
          qc.invalidateQueries({ queryKey: ["admin", "performance"] });
        }}
      />
      <PerdaDialog
        leadId={perdaLeadId}
        onClose={() => setPerdaLeadId(null)}
        onDone={() => {
          setPerdaLeadId(null);
          qc.invalidateQueries({ queryKey: ["admin", "leads"] });
          qc.invalidateQueries({ queryKey: ["admin", "performance"] });
        }}
      />
    </div>
  );
}

const FUNIL_STAGES: { ids: Status[]; label: string; color: string }[] = [
  { ids: ["novo"], label: "Novo", color: "#ef4444" },
  { ids: ["conversando"], label: "Conversando", color: "#f59e0b" },
  { ids: ["visita"], label: "Visita", color: "#84cc16" },
  { ids: ["proposta"], label: "Proposta", color: "#10b981" },
];

const RESULTADO_STAGES: { id: Status; label: string; color: string }[] = [
  { id: "ganho", label: "Ganho", color: "#10b981" },
  { id: "perdido", label: "Perdido / Descartado", color: "#ef4444" },
];

function FunilChart({ byStatus, descartesTotal }: { byStatus: Record<Status, Lead[]>; descartesTotal: number }) {
  const stages = FUNIL_STAGES.map((s) => ({
    label: s.label,
    color: s.color,
    total: s.ids.reduce((sum, id) => sum + (byStatus[id]?.length ?? 0), 0),
  }));
  const totalFunil = stages.reduce((s, x) => s + x.total, 0);

  const resultados = [
    ...RESULTADO_STAGES.map((s) => ({
      label: s.label,
      color: s.color,
      total: byStatus[s.id]?.length ?? 0,
    })),
    { label: "Descartes", color: "#f43f5e", total: descartesTotal },
  ];
  // "Total fechados" = somente leads em GANHO (regra de negócio).
  const totalFechados = byStatus.ganho?.length ?? 0;
  const totalResultados = resultados.reduce((s, x) => s + x.total, 0);

  const funnelData = stages.map((s) => {
    const pct = totalFunil > 0 ? Math.round((s.total / totalFunil) * 100) : 0;
    return {
      name: `${s.label} — ${s.total} (${pct}%)`,
      value: Math.max(s.total, 0.0001), // recharts needs >0 to render
      fill: s.color,
    };
  });

  const barData = resultados.map((r) => {
    const pct = totalResultados > 0 ? Math.round((r.total / totalResultados) * 100) : 0;
    return { name: r.label, value: r.total, pct, fill: r.color };
  });

  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [errInsight, setErrInsight] = useState<string | null>(null);

  async function carregarInsight() {
    setLoadingInsight(true);
    setErrInsight(null);
    try {
      const res = await gerarInsightsFunil({
        data: {
          etapas: [...stages, ...resultados].map((s, i) => ({
            id: String(i),
            label: s.label,
            total: s.total,
          })),
        },
      });
      setInsight(res.insight);
    } catch (e) {
      setErrInsight(e instanceof Error ? e.message : "Erro ao gerar insight");
    } finally {
      setLoadingInsight(false);
    }
  }

  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg">Funil de Vendas</h2>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] items-start">
        {/* Funil 3D */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[420px] mx-auto">
            <Funnel3D stages={stages} totalFunil={totalFunil} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Total de leads no funil
            </span>
            <span className="font-display text-xl font-semibold">{totalFunil}</span>
          </div>
        </div>

        {/* Resultados — barras de crescimento */}
        <div className="flex flex-col border-l-0 lg:border-l border-foreground/10 lg:pl-5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mb-6 block">
            Resultados
          </span>
          <ResultadosBars resultados={resultados} totalResultados={totalResultados} />
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Total fechados
            </span>
            <span className="font-display text-xl font-semibold">{totalFechados}</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-5 rounded-lg border border-foreground/10 bg-background/60 p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Insights de IA</span>
          </div>
          <Button size="sm" variant="outline" onClick={carregarInsight} disabled={loadingInsight}>
            {loadingInsight ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Analisando…
              </>
            ) : insight ? (
              "Atualizar"
            ) : (
              "Gerar análise"
            )}
          </Button>
        </div>
        {errInsight && <p className="text-sm text-destructive">{errInsight}</p>}
        {!errInsight && insight && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {insight}
          </p>
        )}
        {!errInsight && !insight && !loadingInsight && (
          <p className="text-sm text-muted-foreground">
            Gere uma análise do momento atual do funil com base nos leads em cada etapa.
          </p>
        )}
      </div>
    </div>
  );
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function shade(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  const m = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

function Funnel3D({
  stages,
  totalFunil,
}: {
  stages: { label: string; color: string; total: number }[];
  totalFunil: number;
}) {
  const W = 560;
  const H = 320;
  const ellipseRy = 14; // depth perspective
  const stageH = (H - ellipseRy * 2) / stages.length;
  const topW = W - 20;
  const bottomW = 80;

  const widthAt = (i: number) => topW - (topW - bottomW) * (i / stages.length);

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H + 20}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {stages.map((s, i) => (
            <linearGradient key={i} id={`fg-${i}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={shade(s.color, -0.25)} />
              <stop offset="50%" stopColor={s.color} />
              <stop offset="100%" stopColor={shade(s.color, -0.35)} />
            </linearGradient>
          ))}
        </defs>

        {stages.map((s, i) => {
          const wTop = widthAt(i);
          const wBot = widthAt(i + 1);
          const y = ellipseRy + i * stageH;
          const cx = W / 2;
          const pct = totalFunil > 0 ? Math.round((s.total / totalFunil) * 100) : 0;

          // Trapezoid path + front ellipse for 3D depth
          const xTopL = cx - wTop / 2;
          const xTopR = cx + wTop / 2;
          const xBotL = cx - wBot / 2;
          const xBotR = cx + wBot / 2;

          return (
            <g key={i}>
              {/* Top ellipse rim (back) */}
              {i === 0 && (
                <ellipse
                  cx={cx}
                  cy={y}
                  rx={wTop / 2}
                  ry={ellipseRy}
                  fill={shade(s.color, -0.45)}
                />
              )}
              {/* Body trapezoid */}
              <path
                d={`M ${xTopL} ${y} L ${xTopR} ${y} L ${xBotR} ${y + stageH} L ${xBotL} ${y + stageH} Z`}
                fill={`url(#fg-${i})`}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1}
              />
              {/* Front ellipse (bottom rim — gives depth) */}
              <ellipse
                cx={cx}
                cy={y + stageH}
                rx={wBot / 2}
                ry={ellipseRy * (wBot / wTop)}
                fill={shade(s.color, -0.3)}
              />
              {/* Label */}
              <text
                x={cx}
                y={y + stageH / 2 - 4}
                textAnchor="middle"
                fill="#fff"
                style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}
              >
                {s.label}
              </text>
              <text
                x={cx}
                y={y + stageH / 2 + 12}
                textAnchor="middle"
                fill="rgba(255,255,255,0.95)"
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                {s.total} — {pct}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ResultadosBars({
  resultados,
  totalResultados,
}: {
  resultados: { label: string; color: string; total: number }[];
  totalResultados: number;
}) {
  const maxR = Math.max(...resultados.map((x) => x.total), 1);
  const H = 180;
  return (
    <div className="flex items-end justify-around gap-6 h-[210px] px-2 pt-6">
      {resultados.map((r) => {
        const pct = totalResultados > 0 ? Math.round((r.total / totalResultados) * 100) : 0;
        const h = Math.max((r.total / maxR) * H, 6);
        return (
          <div key={r.label} className="flex flex-col items-center gap-2 flex-1 max-w-[90px]">
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {r.total} — {pct}%
            </span>
            <div
              className="relative w-full rounded-t-md shadow-md transition-[height] duration-700 ease-out"
              style={{
                height: `${h}px`,
                background: `linear-gradient(180deg, ${shade(r.color, 0.2)} 0%, ${r.color} 55%, ${shade(r.color, -0.25)} 100%)`,
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-1.5 rounded-t-md"
                style={{ background: shade(r.color, 0.35), opacity: 0.7 }}
              />
            </div>
            <span className="text-sm font-medium text-foreground">{r.label}</span>
          </div>
        );
      })}
    </div>
  );
}


function Column({
  col,
  leads,
  onOpen,
}: {
  col: { id: Status; label: string; accent: string };
  leads: Lead[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-card flex flex-col h-[460px] transition-colors ${
        isOver ? "border-primary/60 bg-primary/5" : "border-foreground/5"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-foreground/5 shrink-0">
        <span className={`h-2 w-2 rounded-full ${col.accent}`} />
        <span className="text-sm font-medium">{col.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">{leads.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {leads.map((l) => <DraggableCard key={l.id} lead={l} onOpen={onOpen} />)}
        {leads.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6">Vazio</div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ lead, onOpen }: { lead: Lead; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(lead.id)}
      className="cursor-pointer"
      style={{ visibility: isDragging ? "hidden" : "visible" }}
    >
      <Card lead={lead} />
    </div>
  );
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function LeadDetailDialog({ lead, onClose, onOpenHistorico, onDescartar, onPerder }: { lead: Lead | null; onClose: () => void; onOpenHistorico: (id: string) => void; onDescartar?: (id: string) => void; onPerder?: (id: string) => void }) {
  const wa = lead?.telefone ? `https://wa.me/${lead.telefone.replace(/\D/g, "")}` : null;
  const valorNegocio = (() => {
    if (!lead?.imovel) return "Não informado";
    if (lead.imovel.preco_sob_consulta) return "Sob consulta";
    if (typeof lead.imovel.preco === "number" && lead.imovel.preco > 0) return formatBRL(lead.imovel.preco);
    return "Não informado";
  })();
  return (
    <Dialog open={!!lead} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl">
        {lead && (
          <>
            <DialogHeader>
              <DialogTitle>{lead.nome}</DialogTitle>
              <DialogDescription>
                Recebido em {new Date(lead.created_at).toLocaleString("pt-BR")} · Origem: {lead.origem ?? "—"} · Status: {lead.status}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <Field label="E-mail" value={lead.email ?? "—"} />
              <Field label="Telefone" value={lead.telefone ?? "—"} />
              <Field label="Imóvel de interesse" value={lead.imovel?.titulo ?? "—"} />
              <Field label="Valor do negócio" value={valorNegocio} />
              <ValorEstimadoEditor lead={lead} />

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Mensagem</div>
                <p className="rounded-md border border-foreground/10 bg-muted/40 p-3 whitespace-pre-wrap">
                  {lead.mensagem || "—"}
                </p>
              </div>
            </div>

            {/* Botões: desktop sempre em uma linha; mobile usa rolagem horizontal sem sobreposição. */}
            <div className="mt-4 border-t border-foreground/5 pt-4 -mx-1 overflow-x-auto pb-1 sm:overflow-visible">
              <div className="flex min-w-max flex-nowrap items-center gap-2 px-1 sm:min-w-0 sm:overflow-visible">
              {lead.email && (
                <Button asChild variant="outline" size="sm" className="shrink-0 min-w-[84px] px-3">
                  <a href={`mailto:${lead.email}`}><Mail className="h-4 w-4" />E-mail</a>
                </Button>
              )}
              {lead.telefone && (
                <Button asChild variant="outline" size="sm" className="shrink-0 min-w-[76px] px-3">
                  <a href={`tel:${lead.telefone}`}><Phone className="h-4 w-4" />Ligar</a>
                </Button>
              )}
              {wa && (
                <Button asChild variant="outline" size="sm" className="shrink-0 min-w-[108px] px-3">
                  <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a>
                </Button>
              )}
              {(lead.imovel as { slug?: string } | null)?.slug && (
                <Button asChild size="sm" variant="outline" className="shrink-0 min-w-[100px] px-3">
                  <Link to="/imovel/$slug" params={{ slug: (lead.imovel as { slug: string }).slug }} target="_blank">
                    Ver imóvel
                  </Link>
                </Button>
              )}
              <Button size="sm" className="shrink-0 min-w-[104px] px-3 sm:ml-auto" onClick={() => onOpenHistorico(lead.id)}>
                <History className="h-4 w-4" /> Histórico
              </Button>
              {onDescartar && lead.status !== "descartado" && lead.status !== "ganho" && lead.status !== "perdido" && (
                <Button size="sm" variant="outline" className="shrink-0 px-3 text-destructive" onClick={() => onDescartar(lead.id)}>
                  <Ban className="h-4 w-4" /> Descartar
                </Button>
              )}
              {onPerder && lead.status === "proposta" && (
                <Button size="sm" variant="outline" className="shrink-0 px-3 text-destructive" onClick={() => onPerder(lead.id)}>
                  <Trash2 className="h-4 w-4" /> Marcar como Perdido
                </Button>
              )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-foreground/5 pb-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function formatBRLInt(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (!d) return "";
  const n = parseInt(d, 10);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function ValorEstimadoEditor({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const initial = lead.valor_estimado != null ? String(Math.round(lead.valor_estimado)) : "";
  const [digits, setDigits] = useState<string>(initial);
  const save = useMutation({
    mutationFn: () =>
      adminAtualizarLead({
        data: { id: lead.id, valor_estimado: digits === "" ? null : Number(digits) },
      }),
    onSuccess: () => {
      toast.success("Valor atualizado.");
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const dirty = (lead.valor_estimado ?? null) !== (digits === "" ? null : Number(digits));
  return (
    <div className="flex items-center justify-between gap-3 border-b border-foreground/5 pb-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Valor estimado (VGV)</span>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="numeric"
          value={formatBRLInt(digits)}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, ""))}
          className="h-8 w-40 text-right"
          placeholder="R$ 0"
        />
        {dirty && (
          <Button size="sm" variant="outline" className="h-8" disabled={save.isPending} onClick={() => save.mutate()}>
            Salvar
          </Button>
        )}
      </div>
    </div>
  );
}



function Card({ lead }: { lead: Lead; dragging?: boolean }) {
  const wa = lead.telefone
    ? `https://wa.me/${lead.telefone.replace(/\D/g, "")}`
    : null;
  return (
    <div
      className="rounded-md border border-foreground/10 bg-background p-3 shadow-sm"
    >

      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm leading-tight">{lead.nome}</div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {new Date(lead.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>
      {lead.imovel?.titulo && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          🏠 {lead.imovel.titulo}
        </div>
      )}
      {lead.mensagem && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{lead.mensagem}</p>
      )}
      <div className="mt-2 flex items-center gap-2 text-muted-foreground">
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            onPointerDown={(e) => e.stopPropagation()}
            className="hover:text-foreground"
            title={lead.email}
          >
            <Mail className="h-3.5 w-3.5" />
          </a>
        )}
        {lead.telefone && (
          <a
            href={`tel:${lead.telefone}`}
            onPointerDown={(e) => e.stopPropagation()}
            className="hover:text-foreground"
            title={lead.telefone}
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            className="hover:text-emerald-600"
            title="WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        )}
        {lead.origem && (
          <span className="ml-auto text-[10px] uppercase tracking-wide">{lead.origem}</span>
        )}
      </div>
    </div>
  );
}

function NovoLeadButton({ corretores }: { corretores: CorretorLite[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [imovelId, setImovelId] = useState<string>("__none__");
  const [observacoes, setObservacoes] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("__self__");

  const { data: papeis } = useQuery({ queryKey: ["meus-papeis"], queryFn: () => meusPapeis(), staleTime: 60_000 });
  const isAdmin = (papeis ?? []).includes("admin");
  const isCorretor = (papeis ?? []).includes("corretor");
  const canCreate = isAdmin || isCorretor;

  const { data: imoveis } = useQuery({
    queryKey: ["imoveis-lite"],
    queryFn: () => adminListarImoveisLite(),
    enabled: open,
    staleTime: 60_000,
  });

  const criar = useMutation({
    mutationFn: () =>
      criarLeadManual({
        data: {
          nome,
          email: email || null,
          telefone: telefone ? digitsOnly(telefone) : null,
          imovel_id: imovelId !== "__none__" ? imovelId : null,
          observacoes: observacoes || null,
          assigned_to: isAdmin && assignedTo !== "__self__" ? assignedTo : null,
        },
      }),
    onSuccess: () => {
      toast.success("Lead criado.");
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      setOpen(false);
      setNome(""); setEmail(""); setTelefone(""); setImovelId("__none__"); setObservacoes(""); setAssignedTo("__self__");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canCreate) return null;

  const telOk = telefone.length === 0 || isValidPhoneBR(telefone);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Lead</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo lead manual</DialogTitle>
          <DialogDescription>Origem: Cadastro Manual</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nome.trim()) return toast.error("Informe o nome.");
            if (telefone && !isValidPhoneBR(telefone)) return toast.error("Telefone inválido.");
            criar.mutate();
          }}
        >
          <div>
            <Label>Nome *</Label>
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input
                value={maskPhoneBR(telefone)}
                onChange={(e) => setTelefone(digitsOnly(e.target.value).slice(0, 11))}
                placeholder="(31) 98888-7777"
                inputMode="tel"
              />
              {!telOk && <p className="text-xs text-destructive mt-1">Telefone inválido.</p>}
            </div>
          </div>
          <div>
            <Label>Imóvel de interesse</Label>
            <Select value={imovelId} onValueChange={setImovelId}>
              <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {(imoveis ?? []).map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.codigo} — {i.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div>
              <Label>Atribuir ao corretor</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__self__">Eu mesmo</SelectItem>
                  {corretores.filter((c) => !!c.user_id).map((c) => (
                    <SelectItem key={c.id} value={c.user_id!}>
                      {c.nome}{c.sobrenome ? ` ${c.sobrenome}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Observações</Label>
            <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={criar.isPending}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================================================================
// CRM — Descarte, Perda, Descartados e Performance Comercial
// ==================================================================

function ReasonSelect({
  kind,
  value,
  onChange,
}: {
  kind: "discard" | "lost";
  value: string;
  onChange: (v: string) => void;
}) {
  const { data } = useQuery({
    queryKey: ["motivos", kind, "ativos"],
    queryFn: () => listarMotivos({ data: { kind, apenasAtivos: true } }),
    staleTime: 60_000,
  });
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um motivo…" />
      </SelectTrigger>
      <SelectContent>
        {(data ?? []).map((m) => (
          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DescarteDialog({
  leadId,
  onClose,
  onDone,
}: {
  leadId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [motivoId, setMotivoId] = useState("");
  const [detalhes, setDetalhes] = useState("");
  useEffect(() => {
    if (leadId) { setMotivoId(""); setDetalhes(""); }
  }, [leadId]);
  const mut = useMutation({
    mutationFn: () =>
      descartarLead({ data: { lead_id: leadId!, motivo_id: motivoId, detalhes: detalhes || null } }),
    onSuccess: () => { toast.success("Lead descartado."); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={!!leadId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Descartar lead</DialogTitle>
          <DialogDescription>
            Use para leads desqualificados <strong>antes</strong> da apresentação de proposta.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Motivo *</Label>
            <ReasonSelect kind="discard" value={motivoId} onChange={setMotivoId} />
          </div>
          <div>
            <Label>Observação (opcional)</Label>
            <Textarea rows={3} value={detalhes} onChange={(e) => setDetalhes(e.target.value)} maxLength={1000} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={!motivoId || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? "Salvando…" : "Confirmar descarte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PerdaDialog({
  leadId,
  onClose,
  onDone,
}: {
  leadId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [motivoId, setMotivoId] = useState("");
  const [detalhes, setDetalhes] = useState("");
  useEffect(() => {
    if (leadId) { setMotivoId(""); setDetalhes(""); }
  }, [leadId]);
  const mut = useMutation({
    mutationFn: () =>
      perderLead({ data: { lead_id: leadId!, motivo_id: motivoId, detalhes: detalhes || null } }),
    onSuccess: () => { toast.success("Negócio marcado como perdido."); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={!!leadId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar negócio como perdido</DialogTitle>
          <DialogDescription>
            Somente leads que já receberam <strong>Proposta</strong> podem ser marcados como Perdidos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Motivo *</Label>
            <ReasonSelect kind="lost" value={motivoId} onChange={setMotivoId} />
          </div>
          <div>
            <Label>Observação (opcional)</Label>
            <Textarea rows={3} value={detalhes} onChange={(e) => setDetalhes(e.target.value)} maxLength={1000} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={!motivoId || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? "Salvando…" : "Confirmar perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DescartadoRow = Lead & {
  descartado_at?: string | null;
  discard_reason_id?: string | null;
  motivo?: { nome: string } | null;
};

function DescartadosTab({ onOpen }: { onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "descartados"],
    queryFn: () => listarLeadsDescartados(),
  });
  const rows = (data ?? []) as DescartadoRow[];
  const reabrir = useMutation({
    mutationFn: (lead_id: string) => reabrirLead({ data: { lead_id } }),
    onSuccess: () => {
      toast.success("Lead reaberto (Novo).");
      qc.invalidateQueries({ queryKey: ["admin", "descartados"] });
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border border-foreground/10 bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide">
          <tr className="text-left">
            <th className="px-3 py-2">Descartado em</th>
            <th className="px-3 py-2">Nome</th>
            <th className="px-3 py-2">Motivo</th>
            <th className="px-3 py-2">Imóvel</th>
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {isLoading && (
            <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
          )}
          {!isLoading && rows.length === 0 && (
            <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum lead descartado.</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                {r.descartado_at ? new Date(r.descartado_at).toLocaleString("pt-BR") : "—"}
              </td>
              <td className="px-3 py-2">
                <button className="font-medium hover:underline" onClick={() => onOpen(r.id)}>{r.nome}</button>
                {r.origem && <div className="text-[10px] uppercase text-muted-foreground">{r.origem}</div>}
              </td>
              <td className="px-3 py-2">{r.motivo?.nome ?? "—"}</td>
              <td className="px-3 py-2 truncate max-w-[240px]">{r.imovel?.titulo ?? "—"}</td>
              <td className="px-3 py-2 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reabrir.mutate(r.id)}
                  disabled={reabrir.isPending}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PerformanceComercialPanel() {
  const [dias, setDias] = useState(30);
  const { data } = useQuery({
    queryKey: ["admin", "performance", dias],
    queryFn: () => performanceComercial({ data: { dias } }),
    staleTime: 60_000,
  });
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  async function carregar() {
    if (!data) return;
    setLoadingInsight(true);
    try {
      const res = await gerarInsightsPerformance({ data });
      setInsight(res.insight);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar insight");
    } finally {
      setLoadingInsight(false);
    }
  }

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg">Performance comercial</h2>
        </div>
        <Select value={String(dias)} onValueChange={(v) => setDias(parseInt(v, 10))}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 180 dias</SelectItem>
            <SelectItem value="365">Últimos 365 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!data ? (
        <div className="text-sm text-muted-foreground">Carregando métricas…</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard label="Total" value={String(data.totais.total)} />
            <MetricCard label="Em andamento" value={String(data.totais.emAndamento)} />
            <MetricCard label="Propostas" value={String(data.totais.propostas)} />
            <MetricCard label="Ganhos" value={String(data.totais.ganhos)} tone="pos" />
            <MetricCard label="Perdidos" value={String(data.totais.perdidos)} tone="neg" />
            <MetricCard label="Descartados" value={String(data.totais.descartados)} tone="neg" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Taxa de conversão" value={pct(data.taxas.conversao)} tone="pos" />
            <MetricCard label="Taxa de descarte" value={pct(data.taxas.descarteRate)} tone="neg" />
            <MetricCard label="VGV proposta" value={brl(data.vgv.propostas)} />
            <MetricCard label="VGV ganho" value={brl(data.vgv.ganhos)} tone="pos" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ReasonsList title="Motivos de Descarte" items={data.motivosDescarte} />
            <ReasonsList title="Motivos de Perda" items={data.motivosPerda} />
          </div>

          <div className="rounded-lg border border-foreground/10 bg-background/60 p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Insight de IA</span>
              </div>
              <Button size="sm" variant="outline" onClick={carregar} disabled={loadingInsight}>
                {loadingInsight ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Analisando…</> : insight ? "Atualizar" : "Gerar análise"}
              </Button>
            </div>
            {insight ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{insight}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Gere uma análise sobre gargalos, motivos recorrentes e ações recomendadas.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-rose-600" : "text-foreground";
  return (
    <div className="rounded-lg border border-foreground/10 bg-background/60 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function ReasonsList({ title, items }: { title: string; items: { nome: string; total: number }[] }) {
  const total = items.reduce((a, b) => a + b.total, 0) || 1;
  return (
    <div className="rounded-lg border border-foreground/10 bg-background/60 p-3">
      <div className="text-sm font-medium mb-2">{title}</div>
      {items.length === 0 && <div className="text-xs text-muted-foreground">Sem registros no período.</div>}
      <ul className="space-y-1.5">
        {items.slice(0, 6).map((r) => {
          const p = (r.total / total) * 100;
          return (
            <li key={r.nome}>
              <div className="flex items-center justify-between text-xs">
                <span className="truncate">{r.nome}</span>
                <span className="tabular-nums text-muted-foreground">{r.total} · {p.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded bg-muted overflow-hidden mt-0.5">
                <div className="h-full bg-primary/70" style={{ width: `${p}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
