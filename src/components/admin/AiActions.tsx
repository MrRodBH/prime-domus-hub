import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, Wand2, Scissors, Languages, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { executarAiAction, type AiActionInputT } from "@/lib/api/ai-actions.functions";

type Entity = AiActionInputT["entity"];
type Field = AiActionInputT["field"];
type Action = AiActionInputT["action"];
type Tone = AiActionInputT["tone"];
type Language = AiActionInputT["language"];

interface AiActionsProps {
  entity: Entity;
  field: Field;
  /** Contexto livre que a IA deve usar (dados do form, ficha, etc.) */
  context?: Record<string, unknown>;
  /** Valor atual do campo (para melhorar/resumir/traduzir) */
  value?: string;
  /** Callback chamado com o texto gerado — normalmente seta o campo */
  onApply?: (text: string) => void;
  /** Ações habilitadas (default: gerar + melhorar + resumir) */
  actions?: Action[];
  tone?: Tone;
  language?: Language;
  maxChars?: number;
  size?: "sm" | "default";
  label?: string;
  /** Permissão explícita (default: true) */
  can?: boolean;
}

const ACTION_META: Record<Action, { label: string; icon: typeof Sparkles }> = {
  gerar: { label: "Gerar com IA", icon: Sparkles },
  melhorar: { label: "Melhorar texto", icon: Wand2 },
  resumir: { label: "Resumir", icon: Scissors },
  encurtar: { label: "Encurtar", icon: Scissors },
  expandir: { label: "Expandir", icon: Wand2 },
  traduzir: { label: "Traduzir", icon: Languages },
};

/**
 * Componente global de ações de IA — reutilizável em qualquer campo/módulo.
 *
 *   <AiActions
 *     entity="imovel" field="descricao"
 *     context={{ titulo, tipo, bairro, quartos }}
 *     value={descricao}
 *     onApply={(t) => setDescricao(t)}
 *   />
 */
export function AiActions({
  entity, field, context = {}, value = "",
  onApply,
  actions = ["gerar", "melhorar", "resumir"],
  tone = "sofisticado", language = "pt-BR", maxChars,
  size = "sm", label = "IA",
  can = true,
}: AiActionsProps) {
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: async (action: Action) =>
      executarAiAction({
        data: { entity, field, action, tone, language, maxChars, context, base: value },
      }),
    onSuccess: ({ output }, action) => {
      if (onApply) onApply(output);
      toast.success(`${ACTION_META[action].label} concluído`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha na IA"),
  });

  if (!can) return null;

  const run = (a: Action) => {
    if ((a === "melhorar" || a === "resumir" || a === "encurtar" || a === "expandir" || a === "traduzir") && !value.trim()) {
      toast.error("Preencha o campo antes de usar esta ação.");
      return;
    }
    mutation.mutate(a);
  };

  const copy = async () => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size={size} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          <span>{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Ações de IA
        </DropdownMenuLabel>
        {actions.map((a) => {
          const M = ACTION_META[a];
          const Icon = M.icon;
          return (
            <DropdownMenuItem key={a} onClick={() => run(a)}>
              <Icon className="size-3.5" strokeWidth={1.5} />
              {M.label}
            </DropdownMenuItem>
          );
        })}
        {value ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={copy}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copiado" : "Copiar conteúdo"}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
