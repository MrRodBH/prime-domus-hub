// Helpers client-side para o Meta Pixel (fbq).
// O script base é injetado em src/routes/__root.tsx via head.scripts.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function metaTrack(
  event: string,
  params?: Record<string, unknown>,
  eventId?: string,
) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    if (eventId) {
      window.fbq("track", event, params ?? {}, { eventID: eventId });
    } else {
      window.fbq("track", event, params ?? {});
    }
  } catch (e) {
    console.error("[fbq]", e);
  }
}

export function metaEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Lê cookies _fbp e _fbc para enriquecer eventos da Conversions API. */
export function metaBrowserIds(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined") return {};
  const match = (name: string) => {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : undefined;
  };
  return { fbp: match("_fbp"), fbc: match("_fbc") };
}
