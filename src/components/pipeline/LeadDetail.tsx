// LeadDetail — painel de detalhe do lead (inline dentro do Pipeline; drawer fora).
// Contract Bloco 2 §1: uma única implementação, modo é resolvido pelo host.
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageCircle, Phone, History, Ban, Trash2, RotateCcw, ArrowRight, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Lead, Status } from "@/adapters/pipeline-legacy";
import { ValorEstimadoEditor, DescarteDialog, PerdaDialog, formatBRL } from "@/adapters/pipeline-legacy";
import { adminAtualizarLead } from "@/lib/api/admin.functions";
import { reabrirLead } from "@/lib/api/leads-crm.functions";
import { LeadHistoricoDialog } from "@/components/admin/LeadHistoricoDialog";

const STATUS_STYLES: Record<string, string> = {
  novo: "bg-red-500/15 text-red-600 dark:text-red-400",
  conversando: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  visita: "bg-lime-500/15 text-lime-600 dark:text-lime-400",
  proposta: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  ganho: "bg-emerald-500/25 text-emerald-700",
  perdido: "bg-rose-500/15 text-rose-600",
  descartado: "bg-muted text-muted-foreground",
};

const FLOW: Status[] = ["novo", "conversando", "visita", "proposta", "ganho"];

export function LeadDetailEmpty() {
  return (
    <div className="h-full flex items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-2">
        <div className="text-sm font-medium">Selecione um lead</div>
        <p className="text-xs text-muted-foreground">
          Escolha um lead na lista à esquerda para ver detalhes, histórico e ações.
          Ou pressione <kbd className="px-1.5 py-0.5 rounded border text-[10px]">⌘K</kbd> para buscar.
        </p>
      </div>
    </div>
  );
}

export function LeadDetail({ lead, onClose }: { lead: Lead; onClose?: () => void }) {
  const qc = useQueryClient();
  const [showHistorico, setShowHistorico] = useState(false);
  const [descarteOpen, setDescarteOpen] = useState(false);
  const [perdaOpen, setPerdaOpen] = useState(false);

  const wa = lead.telefone ? `https://wa.me/${lead.telefone.replace(/\D/g, "")}` : null;
  const valorNegocio = useMemo(() => {
    if (!lead.imovel) return "Não informado";
    if (lead.imovel.preco_sob_consulta) return "Sob consulta";
    if (typeof lead.imovel.preco === "number" && lead.imovel.preco > 0) return formatBRL(lead.imovel.preco);
    return "Não informado";
  }, [lead.imovel]);

  const isClosed = lead.status === "ganho" || lead.status === "perdido" || lead.status === "descartado";

  const advance = useMutation({
    mutationFn: (next: Status) => adminAtualizarLead({ data: { id: lead.id, status: next } }),
    onSuccess: () => { toast.success("Status atualizado."); qc.invalidateQueries({ queryKey: ["admin", "leads"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reabrir = useMutation({
    mutationFn: () => reabrirLead({ data: { lead_id: lead.id } }),
    onSuccess: () => {
      toast.success("Lead reaberto.");
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      qc.invalidateQueries({ queryKey: ["admin", "descartados"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentIdx = FLOW.indexOf(lead.status as Status);
  const nextStatus = currentIdx >= 0 && currentIdx < FLOW.length - 1 ? FLOW[currentIdx + 1] : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-foreground/5 flex items-start gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold truncate">{lead.nome}</h2>
            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide ${STATUS_STYLES[lead.status] ?? STATUS_STYLES.novo}`}>
              {lead.status}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Recebido em {new Date(lead.created_at).toLocaleString("pt-BR")} · Origem: {lead.origem ?? "—"}
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Ações rápidas */}
      <div className="px-5 py-3 border-b border-foreground/5 flex flex-wrap items-center gap-2 shrink-0">
        {lead.email && (
          <Button asChild variant="outline" size="sm"><a href={`mailto:${lead.email}`}><Mail className="h-4 w-4" />E-mail</a></Button>
        )}
        {lead.telefone && (
          <Button asChild variant="outline" size="sm"><a href={`tel:${lead.telefone}`}><Phone className="h-4 w-4" />Ligar</a></Button>
        )}
        {wa && (
          <Button asChild variant="outline" size="sm"><a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a></Button>
        )}
        {lead.imovel?.slug && (
          <Button asChild variant="outline" size="sm">
            <Link to="/imovel/$slug" params={{ slug: lead.imovel.slug }} target="_blank">Ver imóvel</Link>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setShowHistorico(true)}><History className="h-4 w-4" />Histórico</Button>
      </div>

      {/* Pipeline actions */}
      <div className="px-5 py-3 border-b border-foreground/5 flex flex-wrap items-center gap-2 shrink-0">
        {!isClosed && nextStatus && (
          <Button size="sm" onClick={() => advance.mutate(nextStatus)} disabled={advance.isPending}>
            <ArrowRight className="h-4 w-4" /> Avançar para {nextStatus}
          </Button>
        )}
        {!isClosed && lead.status !== "ganho" && (
          <Button size="sm" variant="outline" onClick={() => advance.mutate("ganho")} disabled={advance.isPending}>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Marcar como Ganho
          </Button>
        )}
        {!isClosed && lead.status === "proposta" && (
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setPerdaOpen(true)}>
            <Trash2 className="h-4 w-4" /> Perdido
          </Button>
        )}
        {!isClosed && (
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDescarteOpen(true)}>
            <Ban className="h-4 w-4" /> Descartar
          </Button>
        )}
        {(lead.status === "descartado" || lead.status === "perdido") && (
          <Button size="sm" variant="outline" onClick={() => reabrir.mutate()} disabled={reabrir.isPending}>
            <RotateCcw className="h-4 w-4" /> Reabrir
          </Button>
        )}
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid gap-2 text-sm">
          <Row label="E-mail" value={lead.email ?? "—"} />
          <Row label="Telefone" value={lead.telefone ?? "—"} />
          <Row label="Imóvel" value={lead.imovel?.titulo ?? "—"} />
          <Row label="Valor do negócio" value={valorNegocio} />
          <ValorEstimadoEditor lead={lead} />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Mensagem</div>
          <p className="rounded-md border border-foreground/10 bg-muted/40 p-3 whitespace-pre-wrap text-sm">
            {lead.mensagem || "—"}
          </p>
        </div>
      </div>

      <LeadHistoricoDialog
        leadId={showHistorico ? lead.id : null}
        leadNome={lead.nome}
        isAdmin={true}
        onClose={() => setShowHistorico(false)}
      />
      <DescarteDialog
        leadId={descarteOpen ? lead.id : null}
        onClose={() => setDescarteOpen(false)}
        onDone={() => { setDescarteOpen(false); qc.invalidateQueries({ queryKey: ["admin", "leads"] }); qc.invalidateQueries({ queryKey: ["admin", "descartados"] }); }}
      />
      <PerdaDialog
        leadId={perdaOpen ? lead.id : null}
        onClose={() => setPerdaOpen(false)}
        onDone={() => { setPerdaOpen(false); qc.invalidateQueries({ queryKey: ["admin", "leads"] }); }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-foreground/5 pb-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
