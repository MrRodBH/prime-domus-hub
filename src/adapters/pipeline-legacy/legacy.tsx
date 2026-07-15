// Adapter — Legacy Pipeline Components (isolamento arquitetural, Bloco 2 §3).
// Copiado de _authenticated.admin.leads.tsx sem alterar contratos.
// Core pipeline importa daqui via index.ts; nunca do arquivo original.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { Mail, MessageCircle, Phone, Sparkles, Loader2, TrendingUp, Plus, RotateCcw } from "lucide-react";
import { adminAtualizarLead, adminListarImoveisLite, criarLeadManual, meusPapeis } from "@/lib/api/admin.functions";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { maskPhoneBR, digitsOnly, isValidPhoneBR } from "@/lib/phone-br";
import type { Lead, Status, CorretorLite } from "./types";

export const COLUMNS: { id: Status; label: string; accent: string }[] = [
  { id: "novo", label: "Novo", accent: "bg-red-500" },
  { id: "conversando", label: "Conversando", accent: "bg-amber-500" },
  { id: "visita", label: "Visita", accent: "bg-lime-500" },
  { id: "proposta", label: "Proposta", accent: "bg-emerald-500" },
  { id: "ganho", label: "Ganho", accent: "bg-emerald-500" },
  { id: "perdido", label: "Perdido", accent: "bg-rose-500" },
];

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

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function formatBRLInt(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (!d) return "";
  return parseInt(d, 10).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function shade(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  const m = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

export function Card({ lead }: { lead: Lead }) {
  const wa = lead.telefone ? `https://wa.me/${lead.telefone.replace(/\D/g, "")}` : null;
  return (
    <div className="rounded-md border border-foreground/10 bg-background p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm leading-tight">{lead.nome}</div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {new Date(lead.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>
      {lead.imovel?.titulo && <div className="text-xs text-muted-foreground mt-1 truncate">🏠 {lead.imovel.titulo}</div>}
      {lead.mensagem && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{lead.mensagem}</p>}
      <div className="mt-2 flex items-center gap-2 text-muted-foreground">
        {lead.email && <a href={`mailto:${lead.email}`} onPointerDown={(e) => e.stopPropagation()} className="hover:text-foreground"><Mail className="h-3.5 w-3.5" /></a>}
        {lead.telefone && <a href={`tel:${lead.telefone}`} onPointerDown={(e) => e.stopPropagation()} className="hover:text-foreground"><Phone className="h-3.5 w-3.5" /></a>}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" onPointerDown={(e) => e.stopPropagation()} className="hover:text-emerald-600"><MessageCircle className="h-3.5 w-3.5" /></a>}
        {lead.origem && <span className="ml-auto text-[10px] uppercase tracking-wide">{lead.origem}</span>}
      </div>
    </div>
  );
}

export function DraggableCard({ lead, onOpen }: { lead: Lead; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} onClick={() => onOpen(lead.id)} className="cursor-pointer" style={{ visibility: isDragging ? "hidden" : "visible" }}>
      <Card lead={lead} />
    </div>
  );
}

export function Column({ col, leads, onOpen }: { col: { id: Status; label: string; accent: string }; leads: Lead[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div ref={setNodeRef} className={`rounded-lg border bg-card flex flex-col h-[460px] transition-colors ${isOver ? "border-primary/60 bg-primary/5" : "border-foreground/5"}`}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-foreground/5 shrink-0">
        <span className={`h-2 w-2 rounded-full ${col.accent}`} />
        <span className="text-sm font-medium">{col.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">{leads.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {leads.map((l) => <DraggableCard key={l.id} lead={l} onOpen={onOpen} />)}
        {leads.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">Vazio</div>}
      </div>
    </div>
  );
}

function Funnel3D({ stages, totalFunil }: { stages: { label: string; color: string; total: number }[]; totalFunil: number }) {
  const W = 560, H = 320, ellipseRy = 14;
  const stageH = (H - ellipseRy * 2) / stages.length;
  const topW = W - 20, bottomW = 80;
  const widthAt = (i: number) => topW - (topW - bottomW) * (i / stages.length);
  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
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
          const wTop = widthAt(i), wBot = widthAt(i + 1);
          const y = ellipseRy + i * stageH, cx = W / 2;
          const pct = totalFunil > 0 ? Math.round((s.total / totalFunil) * 100) : 0;
          const xTopL = cx - wTop / 2, xTopR = cx + wTop / 2, xBotL = cx - wBot / 2, xBotR = cx + wBot / 2;
          return (
            <g key={i}>
              {i === 0 && <ellipse cx={cx} cy={y} rx={wTop / 2} ry={ellipseRy} fill={shade(s.color, -0.45)} />}
              <path d={`M ${xTopL} ${y} L ${xTopR} ${y} L ${xBotR} ${y + stageH} L ${xBotL} ${y + stageH} Z`} fill={`url(#fg-${i})`} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              <ellipse cx={cx} cy={y + stageH} rx={wBot / 2} ry={ellipseRy * (wBot / wTop)} fill={shade(s.color, -0.3)} />
              <text x={cx} y={y + stageH / 2 - 4} textAnchor="middle" fill="#fff" style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>{s.label}</text>
              <text x={cx} y={y + stageH / 2 + 12} textAnchor="middle" fill="rgba(255,255,255,0.95)" style={{ fontSize: 12, fontWeight: 600 }}>{s.total} — {pct}%</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ResultadosBars({ resultados, totalResultados }: { resultados: { label: string; color: string; total: number }[]; totalResultados: number }) {
  const maxR = Math.max(...resultados.map((x) => x.total), 1);
  const H = 180;
  return (
    <div className="flex items-end justify-around gap-6 h-[210px] px-2 pt-6">
      {resultados.map((r) => {
        const pct = totalResultados > 0 ? Math.round((r.total / totalResultados) * 100) : 0;
        const h = Math.max((r.total / maxR) * H, 6);
        return (
          <div key={r.label} className="flex flex-col items-center gap-2 flex-1 max-w-[90px]">
            <span className="text-xs font-semibold text-foreground tabular-nums">{r.total} — {pct}%</span>
            <div className="relative w-full rounded-t-md shadow-md transition-[height] duration-700 ease-out" style={{ height: `${h}px`, background: `linear-gradient(180deg, ${shade(r.color, 0.2)} 0%, ${r.color} 55%, ${shade(r.color, -0.25)} 100%)` }}>
              <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-md" style={{ background: shade(r.color, 0.35), opacity: 0.7 }} />
            </div>
            <span className="text-sm font-medium text-foreground">{r.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function FunilChart({ byStatus, descartesTotal }: { byStatus: Record<Status, Lead[]>; descartesTotal: number }) {
  const stages = FUNIL_STAGES.map((s) => ({ label: s.label, color: s.color, total: s.ids.reduce((sum, id) => sum + (byStatus[id]?.length ?? 0), 0) }));
  const totalFunil = stages.reduce((s, x) => s + x.total, 0);
  const resultados = [
    ...RESULTADO_STAGES.map((s) => ({ label: s.label, color: s.color, total: byStatus[s.id]?.length ?? 0 })),
    { label: "Descartes", color: "#f43f5e", total: descartesTotal },
  ];
  const totalFechados = byStatus.ganho?.length ?? 0;
  const totalResultados = resultados.reduce((s, x) => s + x.total, 0);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [errInsight, setErrInsight] = useState<string | null>(null);
  async function carregarInsight() {
    setLoadingInsight(true); setErrInsight(null);
    try {
      const res = await gerarInsightsFunil({ data: { etapas: [...stages, ...resultados].map((s, i) => ({ id: String(i), label: s.label, total: s.total })) } });
      setInsight(res.insight);
    } catch (e) { setErrInsight(e instanceof Error ? e.message : "Erro"); }
    finally { setLoadingInsight(false); }
  }
  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><h2 className="font-display text-lg">Funil de Vendas</h2></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] items-start">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[420px] mx-auto"><Funnel3D stages={stages} totalFunil={totalFunil} /></div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Total de leads no funil</span>
            <span className="font-display text-xl font-semibold">{totalFunil}</span>
          </div>
        </div>
        <div className="flex flex-col border-l-0 lg:border-l border-foreground/10 lg:pl-5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mb-6 block">Resultados</span>
          <ResultadosBars resultados={resultados} totalResultados={totalResultados} />
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Total fechados</span>
            <span className="font-display text-xl font-semibold">{totalFechados}</span>
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-lg border border-foreground/10 bg-background/60 p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Insights de IA</span></div>
          <Button size="sm" variant="outline" onClick={carregarInsight} disabled={loadingInsight}>
            {loadingInsight ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Analisando…</> : insight ? "Atualizar" : "Gerar análise"}
          </Button>
        </div>
        {errInsight && <p className="text-sm text-destructive">{errInsight}</p>}
        {!errInsight && insight && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{insight}</p>}
        {!errInsight && !insight && !loadingInsight && <p className="text-sm text-muted-foreground">Gere uma análise do momento atual do funil.</p>}
      </div>
    </div>
  );
}

export function ValorEstimadoEditor({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const initial = lead.valor_estimado != null ? String(Math.round(lead.valor_estimado)) : "";
  const [digits, setDigits] = useState<string>(initial);
  const save = useMutation({
    mutationFn: () => adminAtualizarLead({ data: { id: lead.id, valor_estimado: digits === "" ? null : Number(digits) } }),
    onSuccess: () => { toast.success("Valor atualizado."); qc.invalidateQueries({ queryKey: ["admin", "leads"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const dirty = (lead.valor_estimado ?? null) !== (digits === "" ? null : Number(digits));
  return (
    <div className="flex items-center justify-between gap-3 border-b border-foreground/5 pb-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Valor estimado (VGV)</span>
      <div className="flex items-center gap-2">
        <Input type="text" inputMode="numeric" value={formatBRLInt(digits)} onChange={(e) => setDigits(e.target.value.replace(/\D/g, ""))} className="h-8 w-40 text-right" placeholder="R$ 0" />
        {dirty && <Button size="sm" variant="outline" className="h-8" disabled={save.isPending} onClick={() => save.mutate()}>Salvar</Button>}
      </div>
    </div>
  );
}

function ReasonSelect({ kind, value, onChange }: { kind: "discard" | "lost"; value: string; onChange: (v: string) => void }) {
  const { data } = useQuery({ queryKey: ["motivos", kind, "ativos"], queryFn: () => listarMotivos({ data: { kind, apenasAtivos: true } }), staleTime: 60_000 });
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Selecione um motivo…" /></SelectTrigger>
      <SelectContent>{(data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function DescarteDialog({ lead, onClose, onDone }: { lead: Lead | null; onClose: () => void; onDone: () => void }) {
  const [motivoId, setMotivoId] = useState("");
  const [detalhes, setDetalhes] = useState("");
  useEffect(() => { if (lead) { setMotivoId(""); setDetalhes(""); } }, [lead]);
  const mut = useMutation({
    mutationFn: () => descartarLead({ data: { lead_id: lead!.id, motivo_id: motivoId, detalhes: detalhes || null, expected_version: lead!.version } }),
    onSuccess: () => { toast.success("Lead descartado."); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={!!lead} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Descartar lead</DialogTitle><DialogDescription>Use para leads desqualificados <strong>antes</strong> da proposta.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>Motivo *</Label><ReasonSelect kind="discard" value={motivoId} onChange={setMotivoId} /></div>
          <div><Label>Observação (opcional)</Label><Textarea rows={3} value={detalhes} onChange={(e) => setDetalhes(e.target.value)} maxLength={1000} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={!motivoId || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? "Salvando…" : "Confirmar descarte"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PerdaDialog({ lead, onClose, onDone }: { lead: Lead | null; onClose: () => void; onDone: () => void }) {
  const [motivoId, setMotivoId] = useState("");
  const [detalhes, setDetalhes] = useState("");
  useEffect(() => { if (lead) { setMotivoId(""); setDetalhes(""); } }, [lead]);
  const mut = useMutation({
    mutationFn: () => perderLead({ data: { lead_id: lead!.id, motivo_id: motivoId, detalhes: detalhes || null, expected_version: lead!.version } }),
    onSuccess: () => { toast.success("Negócio marcado como perdido."); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={!!lead} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Marcar como perdido</DialogTitle><DialogDescription>Somente leads em <strong>Proposta</strong>.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label>Motivo *</Label><ReasonSelect kind="lost" value={motivoId} onChange={setMotivoId} /></div>
          <div><Label>Observação (opcional)</Label><Textarea rows={3} value={detalhes} onChange={(e) => setDetalhes(e.target.value)} maxLength={1000} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={!motivoId || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? "Salvando…" : "Confirmar perda"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DescartadoRow = Lead & { descartado_at?: string | null; motivo?: { nome: string } | null };
export function DescartadosPanel({ onOpen }: { onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "descartados"], queryFn: () => listarLeadsDescartados() });
  const rows = (data ?? []) as unknown as DescartadoRow[];
  const reabrir = useMutation({
    mutationFn: (lead_id: string) => reabrirLead({ data: { lead_id } }),
    onSuccess: () => { toast.success("Lead reaberto (Novo)."); qc.invalidateQueries({ queryKey: ["admin", "descartados"] }); qc.invalidateQueries({ queryKey: ["admin", "leads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="rounded-lg border border-foreground/10 bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide">
          <tr className="text-left"><th className="px-3 py-2">Descartado em</th><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Motivo</th><th className="px-3 py-2">Imóvel</th><th className="px-3 py-2 text-right">Ações</th></tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>}
          {!isLoading && rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum lead descartado.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{r.descartado_at ? new Date(r.descartado_at).toLocaleString("pt-BR") : "—"}</td>
              <td className="px-3 py-2"><button className="font-medium hover:underline" onClick={() => onOpen(r.id)}>{r.nome}</button>{r.origem && <div className="text-[10px] uppercase text-muted-foreground">{r.origem}</div>}</td>
              <td className="px-3 py-2">{r.motivo?.nome ?? "—"}</td>
              <td className="px-3 py-2 truncate max-w-[240px]">{r.imovel?.titulo ?? "—"}</td>
              <td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => reabrir.mutate(r.id)} disabled={reabrir.isPending}><RotateCcw className="h-3.5 w-3.5" /> Reabrir</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-rose-600" : "text-foreground";
  return (
    <div className="rounded-lg border border-foreground/10 bg-background p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold ${color} tabular-nums`}>{value}</div>
    </div>
  );
}

export function PerformanceComercialPanel() {
  const [dias, setDias] = useState(30);
  const { data } = useQuery({ queryKey: ["admin", "performance", dias], queryFn: () => performanceComercial({ data: { dias } }), staleTime: 60_000 });
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  async function carregar() {
    if (!data) return;
    setLoadingInsight(true);
    try { const res = await gerarInsightsPerformance({ data }); setInsight(res.insight); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha"); }
    finally { setLoadingInsight(false); }
  }
  return (
    <div className="rounded-xl border border-foreground/10 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><h2 className="font-display text-lg">Performance comercial</h2></div>
        <Select value={String(dias)} onValueChange={(v) => setDias(parseInt(v, 10))}>
          <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 180 dias</SelectItem>
            <SelectItem value="365">Últimos 365 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!data ? <div className="text-sm text-muted-foreground">Carregando métricas…</div> : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard label="Total" value={String(data.totais.total)} />
            <MetricCard label="Em andamento" value={String(data.totais.emAndamento)} />
            <MetricCard label="Propostas" value={String(data.totais.propostas)} />
            <MetricCard label="Ganhos" value={String(data.totais.ganhos)} tone="pos" />
            <MetricCard label="Perdidos" value={String(data.totais.perdidos)} tone="neg" />
            <MetricCard label="Descartados" value={String(data.totais.descartados)} tone="neg" />
          </div>
          <div className="rounded-lg border border-foreground/10 bg-background/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Insights de IA</span></div>
              <Button size="sm" variant="outline" onClick={carregar} disabled={loadingInsight}>{loadingInsight ? "Analisando…" : insight ? "Atualizar" : "Gerar análise"}</Button>
            </div>
            {insight && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{insight}</p>}
          </div>
        </>
      )}
    </div>
  );
}

export function NovoLeadDialog({
  open,
  onOpenChange,
  corretores,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  corretores: CorretorLite[];
  onCreated?: (leadId?: string) => void;
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [imovelId, setImovelId] = useState<string>("__none__");
  const [observacoes, setObservacoes] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("__self__");

  const { data: papeis } = useQuery({ queryKey: ["meus-papeis"], queryFn: () => meusPapeis(), staleTime: 60_000 });
  const isAdmin = (papeis ?? []).includes("admin");
  const { data: imoveis } = useQuery({ queryKey: ["imoveis-lite"], queryFn: () => adminListarImoveisLite(), enabled: open, staleTime: 60_000 });

  const criar = useMutation({
    mutationFn: () => criarLeadManual({ data: {
      nome, email: email || null, telefone: telefone ? digitsOnly(telefone) : null,
      imovel_id: imovelId !== "__none__" ? imovelId : null, observacoes: observacoes || null,
      assigned_to: isAdmin && assignedTo !== "__self__" ? assignedTo : null,
    } }),
    onSuccess: (res: unknown) => {
      toast.success("Lead criado.");
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      onOpenChange(false);
      setNome(""); setEmail(""); setTelefone(""); setImovelId("__none__"); setObservacoes(""); setAssignedTo("__self__");
      const id = (res as { id?: string } | undefined)?.id;
      onCreated?.(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const telOk = telefone.length === 0 || isValidPhoneBR(telefone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo lead manual</DialogTitle><DialogDescription>Origem: Cadastro Manual</DialogDescription></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          if (!nome.trim()) return toast.error("Informe o nome.");
          if (telefone && !isValidPhoneBR(telefone)) return toast.error("Telefone inválido.");
          criar.mutate();
        }}>
          <div><Label>Nome *</Label><Input required value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input value={maskPhoneBR(telefone)} onChange={(e) => setTelefone(digitsOnly(e.target.value).slice(0, 11))} placeholder="(31) 98888-7777" inputMode="tel" />
              {!telOk && <p className="text-xs text-destructive mt-1">Telefone inválido.</p>}
            </div>
          </div>
          <div>
            <Label>Imóvel de interesse</Label>
            <Select value={imovelId} onValueChange={setImovelId}>
              <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {(imoveis ?? []).map((i) => <SelectItem key={i.id} value={i.id}>{i.codigo} — {i.titulo}</SelectItem>)}
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
                    <SelectItem key={c.id} value={c.user_id!}>{c.nome}{c.sobrenome ? ` ${c.sobrenome}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Observações</Label><Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={criar.isPending}>{criar.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={criar.isPending}>Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NovoLeadButton({ corretores, onCreated }: { corretores: CorretorLite[]; onCreated?: (leadId?: string) => void }) {
  const [open, setOpen] = useState(false);
  const { data: papeis } = useQuery({ queryKey: ["meus-papeis"], queryFn: () => meusPapeis(), staleTime: 60_000 });
  const canCreate = (papeis ?? []).some((r) => r === "admin" || r === "corretor");
  if (!canCreate) return null;
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Novo Lead</Button>
      <NovoLeadDialog open={open} onOpenChange={setOpen} corretores={corretores} onCreated={onCreated} />
    </>
  );
}
