const P0_HOMOLOGATION_HOSTS = new Set(["realone.com.br", "www.realone.com.br"]);

function isLovableHomologationHost(hostname: string): boolean {
  if (hostname === "prime-domus-hub.lovable.app") return true;
  if (!hostname.endsWith(".lovable.app")) return false;
  return hostname.startsWith("id-preview--") || hostname === "preview--prime-domus-hub.lovable.app";
}

export function resolveP0HomologationEntry(requestUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (
    url.pathname !== "/" ||
    (!P0_HOMOLOGATION_HOSTS.has(hostname) && !isLovableHomologationHost(hostname))
  ) {
    return null;
  }

  url.pathname = "/demonstracao";
  url.search = "";
  url.hash = "";
  return url.toString();
}
