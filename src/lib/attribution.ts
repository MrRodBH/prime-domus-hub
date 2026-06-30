/**
 * Atribuição de origem de leads.
 *
 * Captura UTM / gclid / fbclid / referrer na primeira visita (e a cada novo
 * "paid touch"), persiste por 30 dias em localStorage, e resolve para um dos
 * nomes cadastrados em `lead_origens`:
 *   Site, Meta Ads, Google Ads, Indicação, WhatsApp, Instagram, Cadastro Manual
 */

const STORAGE_KEY = "rmp_attrib_v1";
const OVERRIDE_KEY = "rmp_attrib_override";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export type AttributionData = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  landing_url?: string;
  captured_at: number;
};

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
function safeSessionStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function readStored(): AttributionData | null {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttributionData;
    if (!parsed?.captured_at || Date.now() - parsed.captured_at > TTL_MS) {
      ls.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(d: AttributionData) {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* noop */
  }
}

/**
 * Captura parâmetros da URL atual e referrer. Deve ser chamado em toda
 * navegação (PageView). Política:
 *   - se chegar nova marca paga (gclid, fbclid ou utm_source) → sobrescreve
 *     (last paid touch wins).
 *   - se não houver atribuição armazenada → grava a atual (mesmo orgânica).
 *   - caso contrário, mantém a atribuição anterior dentro do TTL.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const get = (k: string) => params.get(k)?.trim() || undefined;
  const current: AttributionData = {
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_term: get("utm_term"),
    utm_content: get("utm_content"),
    gclid: get("gclid"),
    fbclid: get("fbclid"),
    referrer: document.referrer || undefined,
    landing_url: window.location.href,
    captured_at: Date.now(),
  };
  const hasPaidSignal =
    !!current.gclid ||
    !!current.fbclid ||
    !!current.utm_source ||
    !!current.utm_campaign;
  const stored = readStored();
  if (!stored || hasPaidSignal) writeStored(current);
}

/**
 * Define uma origem "sticky" para o próximo lead enviado (sessão atual).
 * Ex.: clique no botão WhatsApp pode marcar override = "WhatsApp" antes do
 * usuário voltar e preencher um formulário.
 */
export function setOriginOverride(nome: string, ttlMinutes = 60): void {
  const ss = safeSessionStorage();
  if (!ss) return;
  try {
    ss.setItem(
      OVERRIDE_KEY,
      JSON.stringify({ nome, expires: Date.now() + ttlMinutes * 60 * 1000 }),
    );
  } catch {
    /* noop */
  }
}

function readOverride(): string | null {
  const ss = safeSessionStorage();
  if (!ss) return null;
  try {
    const raw = ss.getItem(OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { nome: string; expires: number };
    if (!parsed?.expires || Date.now() > parsed.expires) {
      ss.removeItem(OVERRIDE_KEY);
      return null;
    }
    return parsed.nome;
  } catch {
    return null;
  }
}

const PAID_MEDIUMS = new Set([
  "cpc",
  "ppc",
  "paid",
  "paidsocial",
  "paid-social",
  "paid_social",
  "display",
  "ads",
  "sponsored",
]);

function host(url?: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Resolve a origem do lead atual para um dos nomes cadastrados.
 */
export function resolveOrigem(): string {
  const override = readOverride();
  if (override) return override;
  const a = readStored();
  const src = (a?.utm_source || "").toLowerCase();
  const med = (a?.utm_medium || "").toLowerCase();
  const ref = host(a?.referrer);

  // 1) sinais de tráfego pago — alta prioridade
  if (a?.gclid) return "Google Ads";
  if (a?.fbclid) return "Meta Ads";
  if (src === "google" && PAID_MEDIUMS.has(med)) return "Google Ads";
  if (
    (src === "facebook" || src === "fb" || src === "meta" || src === "instagram" || src === "ig") &&
    PAID_MEDIUMS.has(med)
  ) {
    return "Meta Ads";
  }

  // 2) sinais explícitos
  if (src === "whatsapp" || src === "wa" || med === "whatsapp") return "WhatsApp";
  if (src === "indicacao" || src === "indicação" || src === "referral" || med === "referral") {
    return "Indicação";
  }
  if (src === "instagram" || src === "ig") return "Instagram";

  // 3) referrer orgânico
  if (ref.includes("instagram.com")) return "Instagram";
  if (ref.includes("facebook.com") || ref.includes("fb.com") || ref.includes("m.me")) {
    return "Meta Ads"; // tráfego Meta sem utm — atribuído como Meta Ads
  }
  if (ref.includes("wa.me") || ref.includes("whatsapp.com")) return "WhatsApp";

  // 4) default
  return "Site";
}

/**
 * Monta o payload de atribuição para enviar junto com o lead.
 */
export function attributionPayload(): {
  origem: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  landing_url?: string;
} {
  const a = readStored();
  return {
    origem: resolveOrigem(),
    utm_source: a?.utm_source,
    utm_medium: a?.utm_medium,
    utm_campaign: a?.utm_campaign,
    utm_term: a?.utm_term,
    utm_content: a?.utm_content,
    gclid: a?.gclid,
    fbclid: a?.fbclid,
    referrer: a?.referrer,
    landing_url: a?.landing_url,
  };
}
