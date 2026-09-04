const P0_HOMOLOGATION_HOSTS = new Set(["realone.com.br", "www.realone.com.br"]);

function isLovableHomologationHost(hostname: string): boolean {
  if (hostname === "prime-domus-hub.lovable.app") return true;
  if (!hostname.endsWith(".lovable.app")) return false;
  return hostname.startsWith("id-preview--") || hostname === "preview--prime-domus-hub.lovable.app";
}

function normalizeRequestHostname(requestHost: string | null | undefined): string | null {
  const firstHost = requestHost?.split(",", 1)[0]?.trim();
  if (!firstHost) return null;
  try {
    return new URL(`http://${firstHost}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function resolveP0HomologationEntry(
  requestUrl: string,
  requestHost?: string | null,
): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }

  const forwardedHostname = normalizeRequestHostname(requestHost);
  const hostname = forwardedHostname ?? url.hostname.toLowerCase();
  if (
    url.pathname !== "/" ||
    (!P0_HOMOLOGATION_HOSTS.has(hostname) && !isLovableHomologationHost(hostname))
  ) {
    return null;
  }

  if (forwardedHostname) {
    url.protocol = "https:";
    url.hostname = forwardedHostname;
    url.port = "";
  }
  url.pathname = "/demonstracao";
  url.search = "";
  url.hash = "";
  return url.toString();
}
