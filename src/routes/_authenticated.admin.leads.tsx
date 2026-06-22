import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Mail, MessageCircle, Phone, Sparkles, Loader2 } from "lucide-react";
import { adminListarLeads, adminAtualizarLead } from "@/lib/api/admin.functions";
import { gerarInsightsFunil } from "@/lib/api/ia.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  component: AdminLeads,
});

type Status = "novo" | "conversando" | "visita" | "proposta" | "ganho" | "perdido";

const COLUMNS: { id: Status; label: string; accent: string }[] = [
  { id: "novo", label: "Novo", accent: "bg-blue-500" },
  { id: "conversando", label: "Conversando", accent: "bg-indigo-500" },
  { id: "visita", label: "Visita", accent: "bg-amber-500" },
  { id: "proposta", label: "Proposta", accent: "bg-purple-500" },
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
  imovel: { titulo?: string } | null;
};

function AdminLeads() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: () => adminListarLeads(),
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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

  const byStatus = useMemo(() => {
    const map: Record<Status, Lead[]> = {
      novo: [], conversando: [], visita: [], proposta: [], ganho: [], perdido: [],
    };
    for (const l of (data ?? []) as Lead[]) {
      const s = (COLUMNS.some((c) => c.id === l.status) ? l.status : "novo") as Status;
      map[s].push(l);
    }
    return map;
  }, [data]);

  const activeLead = (data as Lead[] | undefined)?.find((l) => l.id === activeId) ?? null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const over = e.over?.id ? String(e.over.id) : null;
    if (!over) return;
    const lead = (data as Lead[] | undefined)?.find((l) => l.id === id);
    if (!lead || lead.status === over) return;
    upd.mutate({ id, status: over as Status });
  }

  const total = (data ?? []).length;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl">Leads</h1>
        <span className="text-sm text-muted-foreground">{total} no total</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Arraste os cards entre as colunas para atualizar o status.
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

      <FunilChart byStatus={byStatus} />

      <LeadDetailDialog
        lead={(data as Lead[] | undefined)?.find((l) => l.id === selectedId) ?? null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

const FUNIL_STAGES: { ids: Status[]; label: string; color: string }[] = [
  { ids: ["novo"], label: "Novo", color: "#dc2626" },
  { ids: ["conversando"], label: "Conversando", color: "#f59e0b" },
  { ids: ["visita"], label: "Visita", color: "#84cc16" },
  { ids: ["proposta"], label: "Proposta", color: "#10b981" },
];

function FunilChart({ byStatus }: { byStatus: Record<Status, Lead[]> }) {
  const stages = FUNIL_STAGES.map((s) => ({
    label: s.label,
    color: s.color,
    total: s.ids.reduce((sum, id) => sum + (byStatus[id]?.length ?? 0), 0),
  }));

  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [errInsight, setErrInsight] = useState<string | null>(null);

  async function carregarInsight() {
    setLoadingInsight(true);
    setErrInsight(null);
    try {
      const res = await gerarInsightsFunil({
        data: { etapas: stages.map((s, i) => ({ id: String(i), label: s.label, total: s.total })) },
      });
      setInsight(res.insight);
    } catch (e) {
      setErrInsight(e instanceof Error ? e.message : "Erro ao gerar insight");
    } finally {
      setLoadingInsight(false);
    }
  }

  // Geometry: inverted pyramid (trapezoids decreasing width)
  const W = 720;
  const H = 360;
  const stageH = H / stages.length;
  const minW = 120;

  return (
    <div className="rounded-xl border border-foreground/10 bg-gradient-to-br from-card to-muted/30 p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl">Funil de Vendas</h2>
        <span className="text-xs text-muted-foreground">
          {stages.reduce((s, x) => s + x.total, 0)} leads ativos no funil
        </span>
      </div>

      <div className="flex justify-center">
        <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full max-w-3xl h-auto">
          <defs>
            {stages.map((s, i) => (
              <linearGradient key={i} id={`grad-${i}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.95" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.7" />
              </linearGradient>
            ))}
            <filter id="funil-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.18" />
            </filter>
          </defs>
          {stages.map((s, i) => {
            const topW = W - (i * (W - minW)) / stages.length;
            const botW = W - ((i + 1) * (W - minW)) / stages.length;
            const y1 = i * stageH;
            const y2 = (i + 1) * stageH - 6;
            const x1L = (W - topW) / 2;
            const x1R = x1L + topW;
            const x2L = (W - botW) / 2;
            const x2R = x2L + botW;
            const cy = (y1 + y2) / 2;
            return (
              <g key={i} filter="url(#funil-shadow)">
                <polygon
                  points={`${x1L},${y1} ${x1R},${y1} ${x2R},${y2} ${x2L},${y2}`}
                  fill={`url(#grad-${i})`}
                />
                <text x={W / 2} y={cy - 4} textAnchor="middle" fill="white" fontWeight="700" fontSize="18" style={{ letterSpacing: "0.02em" }}>
                  {s.label}
                </text>
                <text x={W / 2} y={cy + 18} textAnchor="middle" fill="white" fontSize="14" opacity="0.95">
                  {s.total} {s.total === 1 ? "lead" : "leads"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-6 rounded-lg border border-foreground/10 bg-background/60 p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Insights de IA</span>
          </div>
          <Button size="sm" variant="outline" onClick={carregarInsight} disabled={loadingInsight}>
            {loadingInsight ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Analisando…</> : insight ? "Atualizar análise" : "Gerar análise"}
          </Button>
        </div>
        {errInsight && <p className="text-sm text-destructive">{errInsight}</p>}
        {!errInsight && insight && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{insight}</p>
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
      className={`rounded-lg border bg-card flex flex-col min-h-[400px] transition-colors ${
        isOver ? "border-primary/60 bg-primary/5" : "border-foreground/5"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-foreground/5">
        <span className={`h-2 w-2 rounded-full ${col.accent}`} />
        <span className="text-sm font-medium">{col.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">{leads.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2">
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

function LeadDetailDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const wa = lead?.telefone ? `https://wa.me/${lead.telefone.replace(/\D/g, "")}` : null;
  return (
    <Dialog open={!!lead} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
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
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Mensagem</div>
                <p className="rounded-md border border-foreground/10 bg-muted/40 p-3 whitespace-pre-wrap">
                  {lead.mensagem || "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {lead.email && (
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${lead.email}`}><Mail className="h-4 w-4 mr-1" />E-mail</a>
                </Button>
              )}
              {lead.telefone && (
                <Button asChild variant="outline" size="sm">
                  <a href={`tel:${lead.telefone}`}><Phone className="h-4 w-4 mr-1" />Ligar</a>
                </Button>
              )}
              {wa && (
                <Button asChild variant="outline" size="sm">
                  <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</a>
                </Button>
              )}
              {(lead.imovel as { slug?: string } | null)?.slug && (
                <Button asChild size="sm" className="ml-auto">
                  <Link to="/imovel/$slug" params={{ slug: (lead.imovel as { slug: string }).slug }} target="_blank">
                    Ver imóvel
                  </Link>
                </Button>
              )}
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
