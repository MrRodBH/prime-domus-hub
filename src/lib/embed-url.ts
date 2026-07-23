import { normalizePublicEmbedUrl } from "@/lib/public-content-security";

function videoId(pathname: string): string | null {
  const value = pathname.split("/").filter(Boolean)[0];
  return value && /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}

export function toEmbedUrl(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  try {
    const parsed = new URL(input.trim());
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    const host = parsed.hostname.toLowerCase();
    let candidate: string | null = null;

    if (host === "youtu.be") {
      const id = videoId(parsed.pathname);
      candidate = id ? `https://www.youtube.com/embed/${id}` : null;
    } else if (host === "youtube.com" || host === "www.youtube.com") {
      if (parsed.pathname === "/watch") {
        const id = parsed.searchParams.get("v");
        candidate = id && /^[A-Za-z0-9_-]+$/.test(id)
          ? `https://www.youtube.com/embed/${id}`
          : null;
      } else if (parsed.pathname.startsWith("/shorts/")) {
        const id = videoId(parsed.pathname.slice("/shorts".length));
        candidate = id ? `https://www.youtube.com/embed/${id}` : null;
      } else if (parsed.pathname.startsWith("/embed/")) {
        candidate = `https://www.youtube.com${parsed.pathname}${parsed.search}`;
      }
    } else if (host === "www.youtube-nocookie.com" && parsed.pathname.startsWith("/embed/")) {
      candidate = parsed.toString();
    } else if (host === "vimeo.com" || host === "www.vimeo.com") {
      const id = videoId(parsed.pathname);
      candidate = id ? `https://player.vimeo.com/video/${id}` : null;
    } else if (host === "player.vimeo.com" && parsed.pathname.startsWith("/video/")) {
      candidate = parsed.toString();
    } else if (host === "my.matterport.com" && (parsed.pathname === "/show" || parsed.pathname === "/show/")) {
      candidate = parsed.toString();
    } else if ((host === "matterport.com" || host === "www.matterport.com") && parsed.searchParams.get("m")) {
      candidate = `https://my.matterport.com/show/?m=${encodeURIComponent(parsed.searchParams.get("m")!)}`;
    } else if (host === "kuula.co" && parsed.pathname.startsWith("/share/")) {
      candidate = parsed.toString();
    } else if (host === "www.google.com" && parsed.pathname.startsWith("/maps/embed")) {
      candidate = parsed.toString();
    }

    return normalizePublicEmbedUrl(candidate);
  } catch {
    return null;
  }
}
