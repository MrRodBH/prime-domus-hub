// AiDrawer — stub do assistente contextual (Doc 06 §6).
// Contrato completo será implementado no Bloco 7. Aqui apenas o shell.
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useUI } from "./ui-store";
import { useRouterState } from "@tanstack/react-router";
import { contextFromPath } from "./contexts";
import { Sparkles } from "lucide-react";

export function AiDrawer() {
  const { aiOpen, closeAi } = useUI();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const ctx = contextFromPath(path);

  return (
    <Sheet open={aiOpen} onOpenChange={(o) => (!o ? closeAi() : null)}>
      <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="p-5 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4" /> Assistente
          </SheetTitle>
          <SheetDescription>
            Contexto atual: <span className="font-medium text-foreground">{ctx.label}</span>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
          <p className="text-muted-foreground">
            O assistente contextual será ativado no Bloco 7. Nesta etapa a Command Palette
            (<kbd className="text-[10px] font-mono px-1 py-0.5 rounded border">⌘K</kbd>) já cobre navegação,
            criação e ações globais.
          </p>
          <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
            Ele receberá automaticamente: contexto ({ctx.label}), entidade ativa, tenant, permissões e histórico.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
