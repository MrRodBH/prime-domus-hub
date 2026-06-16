// Converte URLs de vídeo/tour em URLs prontas para <iframe src>.
// Suporta: YouTube (watch/shorts/youtu.be), Vimeo, Matterport, Kuula.
// Caso desconhecido, retorna a URL original (usuário pode colar URL de embed direta).

export function toEmbedUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const url = input.trim();
  if (!url) return null;

  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : url;
      }
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : url;
      }
      if (u.pathname.startsWith("/embed/")) return url;
    }

    // Vimeo
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : url;
    }
    if (host === "player.vimeo.com") return url;

    // Matterport
    if (host.endsWith("matterport.com")) {
      if (u.pathname.startsWith("/show")) return url;
      const m = u.searchParams.get("m");
      if (m) return `https://my.matterport.com/show/?m=${m}`;
    }

    // Kuula
    if (host.endsWith("kuula.co")) return url;

    return url;
  } catch {
    return null;
  }
}
