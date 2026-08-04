import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Check,
  CircleDot,
  Home,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Users,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { criarAtividade, listarHistorico } from "@/lib/api/historico.functions";

type Tipo =
  | "ligacao"
  | "whatsapp"
  | "email"
  | "visita"
  | "video_chamada"
  | "reuniao_presencial"
  | "outros";

const TIPO_INFO: Record<Tipo, { label: string; icon: typeof Phone; color: string }> = {
  ligacao: { label: "Ligação", icon: Phone, color: "text-blue-500" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "text-emerald-500" },
  email: { label: "Email", icon: Mail, color: "text-amber-500" },
  visita: { label: "Visita", icon: Home, color: "text-violet-500" },
  video_chamada: { label: "Vídeo Chamada", icon: Video, color: "text-cyan-500" },
  reuniao_presencial: { label: "Reunião Presencial", icon: Users, color: "text-pink-500" },
  outros: { label: "Atividade CRM", icon: CircleDot, color: "text-muted-foreground" },
};

const TIPOS_USUARIO = Object.keys(TIPO_INFO) as Tipo[];

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

type Props = {
  leadId: string | null;
  leadNome: string;
  isAdmin: boolean;
  onClose: () => void;
};

export function LeadHistoricoDialog({ leadId, leadNome, isAdmin, onClose }: Props) {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<Tipo | "">("");
  const [descricao, setDescricao] = useState("");

  const historyQuery = useQuery({
    queryKey: ["lead-historico", leadId],
    queryFn: () => listarHistorico({ data: { lead_id: leadId! } }),
    enabled: Boolean(leadId),
  });

  const createActivity = useMutation({
    mutationFn: (input: { tipo: Tipo; descricao: string }) =>
      criarAtividade({
        data: {
          lead_id: leadId!,
          tipo: input.tipo,
          descricao: input.descricao,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lead-historico", leadId] });
      setTipo("");
      setDescricao("");
      toast.success("Atividade registrada na timeline CRM.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const atividades = historyQuery.data?.atividades ?? [];
  const descartado = Boolean(historyQuery.data?.descarte);

  return (
    <Dialog open={Boolean(leadId)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Timeline CRM — {leadNome}</DialogTitle>
          <DialogDescription>
            Registros canônicos são append-only. Correções devem ser adicionadas como nova atividade, preservando a trilha de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {!descartado ? (
            <div className="rounded-lg border border-foreground/10 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Nova atividade</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                <Select value={tipo} onValueChange={(value) => setTipo(value as Tipo)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de atividade" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_USUARIO.map((key) => (
                      <SelectItem key={key} value={key}>{TIPO_INFO[key].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Registre contexto, resultado e próximo passo."
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!tipo || !descricao.trim() || createActivity.isPending}
                  onClick={() => createActivity.mutate({ tipo: tipo as Tipo, descricao })}
                >
                  {createActivity.isPending
                    ? <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    : <Check className="mr-1 h-4 w-4" />}
                  Registrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-muted px-4 py-3 text-sm text-muted-foreground">
              Lead descartado. Reabra-o pelo workflow canônico antes de registrar nova atividade.
            </div>
          )}

          <div className="space-y-2">
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
              </div>
            ) : null}
            {!historyQuery.isLoading && atividades.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum evento CRM registrado.
              </div>
            ) : null}
            {atividades.map((activity) => {
              const key = (activity.tipo in TIPO_INFO ? activity.tipo : "outros") as Tipo;
              const info = TIPO_INFO[key];
              const Icon = info.icon;
              return (
                <div key={activity.id} className="rounded-md border border-foreground/10 bg-background p-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${info.color}`}><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-sm font-medium">{info.label}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(activity.created_at)}</span>
                        {isAdmin ? (
                          <span className="text-xs text-muted-foreground">· por {activity.user_nome}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{activity.descricao}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="border-t border-foreground/10 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="mr-1 h-4 w-4" /> Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
