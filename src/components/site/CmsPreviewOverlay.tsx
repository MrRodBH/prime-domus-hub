import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { obterSiteSettingsPreview, publicarTodosRascunhos } from "@/lib/api/site-versions.functions";
import { Eye, X, Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Fase 2C — Preview ao vivo.
 * Ativado por ?__preview=1 na URL. Sobrepõe rascunhos pendentes no cache
 * de ["site-settings"] em qualquer rota pública, e mostra banner com ações.
 */
export function CmsPreviewOverlay() {
  const qc = useQueryClient();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Detecta o flag na URL após hidratação (browser-only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = new URLSearchParams(window.location.search).get("__preview") === "1";
    setActive(on);
  }, []);

  // Carrega drafts overlay e injeta no cache do TanStack Query.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    obterSiteSettingsPreview()
      .then((data) => {
        if (cancelled) return;
        qc.setQueryData(["site-settings"], data);
        qc.invalidateQueries({ queryKey: ["site-settings"], refetchType: "none" });
      })
      .catch((e: Error) => {
        toast.error("Preview: " + e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, qc]);

  if (!active) return null;

  const exit = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("__preview");
    window.location.href = url.toString();
  };

  const publishAll = async () => {
    setPublishing(true);
    try {
      const res = await publicarTodosRascunhos();
      toast.success(`${res.count} rascunho(s) publicado(s).`);
      // Recarrega em modo normal para refletir estado final.
      const url = new URL(window.location.href);
      url.searchParams.delete("__preview");
      window.location.href = url.toString();
    } catch (e) {
      toast.error((e as Error).message);
      setPublishing(false);
    }
  };

  return (
    <>
      {/* espaçador para o banner fixo não cobrir header */}
      <div aria-hidden className="h-11" />
      <div
        role="status"
        className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-amber-950 shadow-md"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 h-11 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Eye className="size-4" />
            <span>Modo Rascunho — visualizando alterações não publicadas</span>
            {loading && <Loader2 className="size-3.5 animate-spin" />}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={publishAll}
              disabled={publishing || loading}
              className="inline-flex items-center gap-1.5 rounded bg-amber-950 text-amber-50 px-3 py-1 text-xs font-medium hover:bg-amber-900 disabled:opacity-60"
            >
              {publishing ? <Loader2 className="size-3.5 animate-spin" /> : <Rocket className="size-3.5" />}
              Publicar tudo
            </button>
            <button
              onClick={exit}
              className="inline-flex items-center gap-1 rounded border border-amber-950/30 px-2.5 py-1 text-xs font-medium hover:bg-amber-400"
            >
              <X className="size-3.5" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
