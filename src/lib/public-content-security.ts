export type PublicLinkContext = "navigation" | "contact";

const CONTROL_OR_SPACE = /[\u0000-\u001F\u007F]/;
const SAFE_INTERNAL_PATH = /^\/(?!\/)/;
const SAFE_MAILTO = /^mailto:[^\s@]+@[^\s@]+$/i;
const SAFE_TEL = /^tel:\+?[0-9().\-\s]{3,32}$/i;

function cleanInput(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || CONTROL_OR_SPACE.test(trimmed)) return null;
  return trimmed;
}

function hasUnsafeDecodedPrefix(value: string): boolean {
  let candidate = value;
  for (let index = 0; index < 3; index += 1) {
    const lower = candidate.toLowerCase();
    if (
      lower.startsWith("javascript:") ||
      lower.startsWith("vbscript:") ||
      lower.startsWith("data:") ||
      lower.startsWith("blob:") ||
      lower.startsWith("file:")
    ) {
      return true;
    }
    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) break;
      candidate = decoded;
    } catch {
      break;
    }
  }
  return false;
}

function normalizeInternalPath(value: string): string | null {
  if (!SAFE_INTERNAL_PATH.test(value) || hasUnsafeDecodedPrefix(value)) return null;
  try {
    const parsed = new URL(value, "https://public.invalid");
    if (parsed.origin !== "https://public.invalid") return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function normalizeHttps(value: string): string | null {
  if (hasUnsafeDecodedPrefix(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizePublicNavigationUrl(
  value: string | null | undefined,
  context: PublicLinkContext = "navigation",
): string | null {
  const cleaned = cleanInput(value);
  if (!cleaned || cleaned.startsWith("//")) return null;

  const internal = normalizeInternalPath(cleaned);
  if (internal) return internal;

  if (context === "contact") {
    if (SAFE_MAILTO.test(cleaned)) return cleaned;
    if (SAFE_TEL.test(cleaned)) return cleaned.replace(/\s+/g, "");
  }

  return normalizeHttps(cleaned);
}

export function normalizePublicMediaUrl(
  value: string | null | undefined,
): string | null {
  const cleaned = cleanInput(value);
  if (!cleaned || cleaned.startsWith("//")) return null;
  return normalizeInternalPath(cleaned) ?? normalizeHttps(cleaned);
}

export function normalizePublicDocumentUrl(
  value: string | null | undefined,
): string | null {
  return normalizePublicMediaUrl(value);
}

const EMBED_RULES: ReadonlyArray<{
  host: string;
  path: (pathname: string) => boolean;
}> = [
  { host: "www.youtube.com", path: (path) => path.startsWith("/embed/") },
  { host: "www.youtube-nocookie.com", path: (path) => path.startsWith("/embed/") },
  { host: "player.vimeo.com", path: (path) => path.startsWith("/video/") },
  { host: "my.matterport.com", path: (path) => path === "/show" || path === "/show/" },
  { host: "kuula.co", path: (path) => path.startsWith("/share/") },
  { host: "www.google.com", path: (path) => path.startsWith("/maps/embed") },
];

export function normalizePublicEmbedUrl(
  value: string | null | undefined,
): string | null {
  const cleaned = cleanInput(value);
  if (!cleaned || cleaned.startsWith("//") || hasUnsafeDecodedPrefix(cleaned)) return null;
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    const allowed = EMBED_RULES.some(
      (rule) => parsed.hostname === rule.host && rule.path(parsed.pathname),
    );
    return allowed ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function normalizePublicLinkPresentation(
  href: string,
  requestedTarget: string | null | undefined,
): { target: "_self" | "_blank"; rel?: "noopener noreferrer" } {
  const external = href.startsWith("https://");
  if (requestedTarget === "_blank" && external) {
    return { target: "_blank", rel: "noopener noreferrer" };
  }
  return { target: "_self" };
}
