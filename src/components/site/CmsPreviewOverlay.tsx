import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { getSavedWebsitePreview } from "@/lib/api/site-versions.functions";
import { buildBrandingCss } from "@/lib/website-branding-css";

/** The public page renders a private saved snapshot only after server authorization. */
export function CmsPreviewOverlay() {
  const qc = useQueryClient();
  const search = useRouterState({ select: state => state.location.searchStr });
  const active = new URLSearchParams(search).get("__preview") === "1";
  const [status, setStatus] = useState<"loading" | "draft" | "published" | "error">("loading");
  const [css, setCss] = useState("");
  const [fonts, setFonts] = useState<string[]>([]);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setStatus("loading");
    for (const queryKey of [["site-settings"], ["menu-header"]]) {
      qc.setQueryDefaults(queryKey, { refetchOnWindowFocus: false, refetchOnReconnect: false });
    }
    getSavedWebsitePreview().then(async data => {
      await Promise.all([qc.cancelQueries({ queryKey: ["site-settings"] }), qc.cancelQueries({ queryKey: ["menu-header"] })]);
      if (cancelled) return;
      qc.setQueryData(["site-settings"], data.settings);
      qc.setQueryData(["menu-header"], data.menu);
      setCss(buildBrandingCss(data.settings.branding_v2));
      setFonts([data.settings.branding_v2.font_primary, data.settings.branding_v2.font_secondary].filter((font): font is string => !!font));
      setStatus(data.source);
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => {
      cancelled = true;
      for (const queryKey of [["site-settings"], ["menu-header"]]) {
        qc.setQueryDefaults(queryKey, { refetchOnWindowFocus: true, refetchOnReconnect: true });
        void qc.resetQueries({ queryKey });
      }
    };
  }, [active, qc]);
  if (!active) return null;
  if (status === "loading" || status === "error") return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6" role={status === "error" ? "alert" : "status"}>
    <div className="max-w-lg space-y-4 text-center">
      <p>{status === "loading" ? "Carregando a prévia privada do website…" : "Não foi possível carregar o rascunho. Entre com uma conta autorizada desta empresa e tente novamente."}</p>
      {status === "error" && <><a className="mr-4 underline" href="/auth?next=%2F%3F__preview%3D1" target="_top">Entrar na empresa</a><button className="underline" onClick={() => window.location.reload()}>Tentar novamente</button></>}
      <p><a href="/" className="underline" target="_top">Ver site publicado</a></p>
    </div>
  </div>;
  return <>
    {css && <style>{css}</style>}
    {fonts.length > 0 && <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${[...new Set(fonts)].map(font => `family=${encodeURIComponent(font)}:wght@400;500;600;700`).join('&')}&display=swap`} />}
    <div aria-hidden className="h-14" />
    <div role="status" className="fixed inset-x-0 top-0 z-[100] flex min-h-14 flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-sm text-amber-950">
      <span>{status === "draft" ? "Prévia do rascunho salvo — alterações ainda não publicadas" : "Versão publicada — nenhum rascunho salvo"}</span>
      <a href="/" target="_top" className="underline">Sair da prévia</a>
    </div>
  </>;
}
