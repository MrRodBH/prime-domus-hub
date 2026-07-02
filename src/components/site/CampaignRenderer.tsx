/**
 * CampaignRenderer — renderiza campanhas ativas (banners/popups) no site público.
 * Segmentação por rota + dispositivo + agendamento + frequência com localStorage.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { listarCampanhasAtivas, registrarEventoCampanha, type Campaign } from "@/lib/api/campaigns.functions";
import { X } from "lucide-react";

const STORAGE_KEY = "rm_campaigns_v1";

type Tracking = Record<string, { count: number; last: number; dismissed?: boolean }>;

function loadTracking(): Tracking {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveTracking(t: Tracking) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch { /* noop */ }
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function matchRoute(pattern: string, path: string): boolean {
  if (!pattern) return false;
  if (pattern === "*" || pattern === "/*") return true;
  if (pattern.endsWith("/*")) return path.startsWith(pattern.slice(0, -2));
  return path === pattern;
}

function isEligible(c: Campaign, path: string): boolean {
  const seg = c.segmentacao || { rotas_incluir: [], rotas_excluir: [], dispositivo: "all" };
  if (seg.dispositivo === "mobile" && !isMobile()) return false;
  if (seg.dispositivo === "desktop" && isMobile()) return false;
  if (seg.rotas_excluir?.some((p) => matchRoute(p, path))) return false;
  if (seg.rotas_incluir?.length && !seg.rotas_incluir.some((p) => matchRoute(p, path))) return false;
  return true;
}

function frequencyAllows(c: Campaign, tracking: Tracking): boolean {
  const t = tracking[c.id];
  if (!t) return true;
  if (t.dismissed) return false;
  const maxSess = c.frequencia?.max_por_sessao ?? 1;
  if (maxSess > 0 && t.count >= maxSess) {
    const cooldownMs = (c.frequencia?.cooldown_horas ?? 24) * 3600_000;
    if (Date.now() - t.last < cooldownMs) return false;
  }
  return true;
}

export function CampaignRenderer() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);
  const { data: campaigns } = useQuery({
    queryKey: ["campanhas-ativas"],
    queryFn: () => listarCampanhasAtivas({ data: {} }),
    staleTime: 5 * 60_000,
    enabled: mounted,
  });
  const [tracking, setTracking] = useState<Tracking>({});
  const [now, setNow] = useState(0);

  useEffect(() => {
    setMounted(true);
    setTracking(loadTracking());
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);

  if (!mounted || !campaigns?.length) return null;



  const eligible = campaigns
    .filter((c) => {
      if (c.start_at && new Date(c.start_at).getTime() > now) return false;
      if (c.end_at && new Date(c.end_at).getTime() < now) return false;
      return isEligible(c, path) && frequencyAllows(c, tracking);
    })
    .sort((a, b) => (b.prioridade ?? 0) - (a.prioridade ?? 0));

  // Um por tipo/posição
  const byPosition = new Map<string, Campaign>();
  for (const c of eligible) if (!byPosition.has(c.tipo)) byPosition.set(c.tipo, c);
  const active = Array.from(byPosition.values());

  if (!active.length) return null;

  return (
    <>
      {active.map((c) => (
        <CampaignItem
          key={c.id}
          campaign={c}
          path={path}
          onImpression={() => {
            const cur = loadTracking();
            const t = cur[c.id] || { count: 0, last: 0 };
            cur[c.id] = { ...t, count: t.count + 1, last: Date.now() };
            saveTracking(cur);
            setTracking(cur);
            registrarEventoCampanha({ data: { campaign_id: c.id, tipo: "impression", rota: path } }).catch(() => {});
          }}
          onClick={() => {
            registrarEventoCampanha({ data: { campaign_id: c.id, tipo: "click", rota: path } }).catch(() => {});
          }}
          onDismiss={() => {
            const cur = loadTracking();
            cur[c.id] = { ...(cur[c.id] || { count: 0, last: 0 }), dismissed: true };
            saveTracking(cur);
            setTracking(cur);
            registrarEventoCampanha({ data: { campaign_id: c.id, tipo: "dismiss", rota: path } }).catch(() => {});
          }}
        />
      ))}
    </>
  );
}

function CampaignItem({
  campaign,
  onImpression,
  onClick,
  onDismiss,
}: {
  campaign: Campaign;
  path: string;
  onImpression: () => void;
  onClick: () => void;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    onImpression();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;
  const c = campaign.conteudo || {};
  const bg = c.cor_fundo || "#0b3a3a";
  const fg = c.cor_texto || "#ffffff";
  const dismissible = c.dismissible !== false;

  const dismiss = () => {
    setVisible(false);
    onDismiss();
  };

  const CTA = c.cta_label && c.cta_url ? (
    <a
      href={c.cta_url}
      onClick={onClick}
      className="inline-flex items-center rounded-md px-4 py-2 text-sm font-medium bg-white/95 text-black hover:bg-white transition-colors"
    >
      {c.cta_label}
    </a>
  ) : null;

  if (campaign.tipo === "banner_top" || campaign.tipo === "banner_bottom") {
    return (
      <div
        className={`fixed left-0 right-0 z-40 px-4 py-3 shadow-md ${campaign.tipo === "banner_top" ? "top-0" : "bottom-0"}`}
        style={{ backgroundColor: bg, color: fg }}
        role="region"
        aria-label={campaign.nome}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <div className="flex-1 text-sm">
            {c.titulo && <strong className="mr-2">{c.titulo}</strong>}
            {c.mensagem && <span>{c.mensagem}</span>}
          </div>
          {CTA}
          {dismissible && (
            <button aria-label="Fechar" onClick={dismiss} className="opacity-80 hover:opacity-100">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (campaign.tipo === "floating") {
    return (
      <div
        className="fixed bottom-24 right-4 z-40 max-w-xs rounded-lg shadow-xl p-4"
        style={{ backgroundColor: bg, color: fg }}
        role="region"
        aria-label={campaign.nome}
      >
        {dismissible && (
          <button aria-label="Fechar" onClick={dismiss} className="absolute top-2 right-2 opacity-80 hover:opacity-100">
            <X className="size-4" />
          </button>
        )}
        {c.titulo && <h3 className="font-semibold text-base mb-1">{c.titulo}</h3>}
        {c.mensagem && <p className="text-sm mb-3">{c.mensagem}</p>}
        {CTA}
      </div>
    );
  }

  // popup_center / modal
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={campaign.nome}
      onClick={dismissible ? dismiss : undefined}
    >
      <div
        className="relative max-w-md w-full rounded-lg shadow-2xl overflow-hidden"
        style={{ backgroundColor: bg, color: fg }}
        onClick={(e) => e.stopPropagation()}
      >
        {c.imagem_url && <img src={c.imagem_url} alt="" className="w-full h-auto" />}
        <div className="p-6">
          {dismissible && (
            <button aria-label="Fechar" onClick={dismiss} className="absolute top-2 right-2 opacity-80 hover:opacity-100">
              <X className="size-5" />
            </button>
          )}
          {c.titulo && <h3 className="text-xl font-semibold mb-2">{c.titulo}</h3>}
          {c.mensagem && <p className="text-sm mb-4 opacity-90">{c.mensagem}</p>}
          {CTA}
        </div>
      </div>
    </div>
  );
}
