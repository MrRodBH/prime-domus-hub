import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Phone,
  MessageCircle,
  Mail,
  Home,
  Video,
  Users,
  CircleDot,
  Sparkles,
  Trash2,
  Pencil,
  Loader2,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  listarHistorico,
  criarAtividade,
  editarAtividade,
  descartarLead,
  analisarLeadIA,
} from "@/lib/api/historico.functions";

type Tipo =
  | "ligacao"
  | "whatsapp"
  | "email"
  | "visita"
  | "video_chamada"
  | "reuniao_presencial"
  | "outros"
  | "descarte"
  | "ia_analise";

const TIPO_INFO: Record<Tipo, { label: string; icon: typeof Phone; color: string }> = {
  ligacao: { label: "Ligação", icon: Phone, color: "text-blue-500" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "text-emerald-500" },
  email: { label: "Email", icon: Mail, color: "text-amber-500" },
  visita: { label: "Visita", icon: Home, color: "text-violet-500" },
  video_chamada: { label: "Vídeo Chamada", icon: Video, color: "text-cyan-500" },
  reuniao_presencial: { label: "Reunião Presencial", icon: Users, color: "text-pink-500" },
  outros: { label: "Outros", icon: CircleDot, color: "text-muted-foreground" },
  descarte: { label: "Descarte", icon: Trash2, color: "text-rose-500" },
  ia_analise: { label: "Análise IA", icon: Sparkles, color: "text-primary" },
};

const TIPOS_USUARIO: Tipo[] = [
  "ligacao",
  "whatsapp",
  "email",
  "visita",
  "video_chamada",
  "reuniao_presencial",
  "outros",
];

const MOTIVO_OPTIONS: { value: string; label: string }[] = [
  { value: "sem_contato", label: "Não consigo contato" },
  { value: "nao_e_lead", label: "Não é Lead" },
  { value: "financeiro", label: "Condições Financeiras" },
  { value: "desistiu", label: "Desistiu da Compra" },
  { value: "aluguel", label: "Procurando Aluguel" },
  { value: "outros", label: "Outros" },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} - ${hh}:${mi}`;
}

type Props = {
  leadId: string | null;
  leadNome: string;
  isAdmin: boolean;
  onClose: () => void;
};

export function LeadHistoricoDialog({ leadId, leadNome, isAdmin, onClose }: Props) {
  const qc = useQueryClient();
  const [novoTipo, setNovoTipo] = useState<Tipo | "">("");
  const [novaDesc, setNovaDesc] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [showDescarte, setShowDescarte] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["lead-historico", leadId],
    queryFn: () => listarHistorico({ data: { lead_id: leadId! } }),
    enabled: !!leadId,
  });

  const criar = useMutation({
    mutationFn: (p: { tipo: Tipo; descricao: string }) =>
      criarAtividade({ data: { lead_id: leadId!, tipo: p.tipo, descricao: p.descricao } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-historico", leadId] });
      setNovoTipo("");
      setNovaDesc("");
      toast.success("Atividade registrada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editar = useMutation({
    mutationFn: (p: { id: string; descricao: string }) =>
      editarAtividade({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-historico", leadId] });
      setEditId(null);
      setEditDesc("");
      toast.success("Atividade atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ia = useMutation({
    mutationFn: () => analisarLeadIA({ data: { lead_id: leadId! } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-historico", leadId] });
      toast.success("Análise gerada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atividades = data?.atividades ?? [];
  const temAtividade = atividades.length > 0;
  const jaDescartado = !!data?.descarte;

  return (
    <Dialog open={!!leadId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico — {leadNome}</DialogTitle>
          <DialogDescription>
            Registre todas as interações com este lead. Os registros são permanentes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Nova atividade */}
          {!jaDescartado && (
            <div className="rounded-lg border border-foreground/10 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Nova atividade</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as Tipo)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de atividade" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_USUARIO.map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_INFO[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Descreva a atividade: resumo, interesse, objeções, próximos passos…"
                  value={novaDesc}
                  onChange={(e) => setNovaDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!novoTipo || !novaDesc.trim() || criar.isPending}
                  onClick={() => criar.mutate({ tipo: novoTipo as Tipo, descricao: novaDesc })}
                >
                  {criar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}

          {/* Lista */}
          <div className="space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
              </div>
            )}
            {!isLoading && atividades.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma atividade registrada ainda.
              </div>
            )}
            {atividades.map((a) => {
              const tipo = a.tipo as Tipo;
              const info = TIPO_INFO[tipo] ?? TIPO_INFO.outros;
              const Icon = info.icon;
              const editavel =
                tipo !== "descarte" && tipo !== "ia_analise";
              return (
                <div key={a.id} className="rounded-md border border-foreground/10 bg-background p-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${info.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-sm font-medium">{info.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(a.created_at)}
                        </span>
                        {isAdmin && (
                          <span className="text-xs text-muted-foreground">
                            · por <strong className="font-medium text-foreground">{a.user_nome}</strong>
                          </span>
                        )}
                      </div>
                      {editId === a.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setEditDesc(""); }}>
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              disabled={!editDesc.trim() || editar.isPending}
                              onClick={() => editar.mutate({ id: a.id, descricao: editDesc })}
                            >
                              {editar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.descricao}</p>
                      )}
                    </div>
                    {editavel && editId !== a.id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => { setEditId(a.id); setEditDesc(a.descricao); }}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex-row flex-wrap gap-2 sm:justify-between border-t border-foreground/10 pt-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => ia.mutate()}
              disabled={ia.isPending || !temAtividade}
              title={!temAtividade ? "Registre ao menos uma atividade" : "Analisar com IA"}
            >
              {ia.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Analisar com IA
            </Button>
            {/*
              PR-M1: a ação "Descartar Lead" foi removida deste diálogo. O
              descarte canônico é uma transição de status atômica
              (transition_lead_status) exposta pelo botão Descartar do
              LeadDetail; o histórico permanece dedicado exclusivamente ao
              registro/consulta/edição de atividades e à análise de IA.
              A referência a jaDescartado permanece apenas para bloquear a
              criação de novas atividades em leads já descartados.
            */}
            {jaDescartado && (
              <span className="text-xs text-muted-foreground self-center">
                Lead descartado — abra o lead para reabrir.
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DescarteDialog({
  leadId,
  atividadesTipos,
  onClose,
  onDone,
}: {
  leadId: string;
  atividadesTipos: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [detalhes, setDetalhes] = useState("");

  const pendentes = useMemo(() => {
    if (motivo !== "sem_contato") return [] as string[];
    const obrig: Array<{ k: string; l: string }> = [
      { k: "ligacao", l: "Ligação" },
      { k: "whatsapp", l: "WhatsApp" },
      { k: "email", l: "Email" },
    ];
    const set = new Set(atividadesTipos);
    return obrig.filter((o) => !set.has(o.k)).map((o) => o.l);
  }, [motivo, atividadesTipos]);

  const mut = useMutation({
    mutationFn: () =>
      descartarLead({
        data: { lead_id: leadId, motivo: motivo as never, detalhes },
      }),
    onSuccess: () => {
      toast.success("Lead descartado.");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bloqueado = !motivo || !detalhes.trim() || pendentes.length > 0;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Descartar Lead</DialogTitle>
          <DialogDescription>
            Esta ação registra o descarte permanentemente no histórico.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVO_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {pendentes.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">
                    Para descartar por falta de contato é obrigatório registrar tentativa de Ligação, WhatsApp e Email.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Atividades pendentes: {pendentes.join(", ")}.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Detalhes do Descarte</Label>
            <Textarea
              placeholder="Justifique o descarte…"
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={bloqueado || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Confirmar descarte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
