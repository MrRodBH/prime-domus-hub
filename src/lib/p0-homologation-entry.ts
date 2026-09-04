const P0_HOMOLOGATION_HOSTS = new Set(["realone.com.br", "www.realone.com.br"]);

export function resolveP0HomologationEntry(requestUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }

  if (url.pathname !== "/" || !P0_HOMOLOGATION_HOSTS.has(url.hostname.toLowerCase())) {
    return null;
  }

  url.pathname = "/demonstracao";
  url.search = "";
  url.hash = "";
  return url.toString();
}
