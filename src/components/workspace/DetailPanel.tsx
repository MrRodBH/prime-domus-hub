// DetailPanel — padrão de interação com entidade (Doc 06 §4).
// Right-side sheet. 1 painel ativo por contexto. Esc fecha.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

type PanelPayload = {
  title: string;
  subtitle?: string;
  content: ReactNode;
  entityId?: string | number;
};

type Ctx = {
  isOpen: boolean;
  open: (payload: PanelPayload) => void;
  close: () => void;
  current: PanelPayload | null;
};

const DetailPanelCtx = createContext<Ctx | null>(null);

export function DetailPanelProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<PanelPayload | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const open = useCallback((p: PanelPayload) => {
    if (typeof document !== "undefined") {
      lastFocusRef.current = document.activeElement as HTMLElement | null;
    }
    setPayload(p);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // keep content in DOM until animation completes handled by Sheet
    setTimeout(() => {
      lastFocusRef.current?.focus?.();
    }, 200);
  }, []);

  const value = useMemo<Ctx>(() => ({ isOpen, open, close, current: payload }), [isOpen, open, close, payload]);

  return (
    <DetailPanelCtx.Provider value={value}>
      {children}
      <Sheet open={isOpen} onOpenChange={(o) => (o ? setIsOpen(true) : close())}>
        <SheetContent
          side="right"
          className="w-full sm:w-[80vw] lg:w-[40vw] lg:min-w-[480px] lg:max-w-[720px] p-0 flex flex-col"
        >
          <VisuallyHidden>
            <SheetTitle>{payload?.title ?? "Detalhes"}</SheetTitle>
            <SheetDescription>{payload?.subtitle ?? ""}</SheetDescription>
          </VisuallyHidden>
          <header className="h-14 px-5 border-b flex items-center gap-3 shrink-0">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {payload?.subtitle ?? "Detalhe"}
              </div>
              <div className="text-sm font-medium truncate">{payload?.title}</div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">{payload?.content}</div>
        </SheetContent>
      </Sheet>
    </DetailPanelCtx.Provider>
  );
}

export function useDetailPanel(): Ctx {
  const ctx = useContext(DetailPanelCtx);
  if (!ctx) throw new Error("useDetailPanel deve ser usado dentro de DetailPanelProvider");
  return ctx;
}
