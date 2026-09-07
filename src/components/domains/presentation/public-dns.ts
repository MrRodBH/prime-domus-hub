// Advisory public NS lookup only. Never a source of ownership, registration or activation authority.
export async function identifyDns(hostname: string, signal: AbortSignal) {
  const name = hostname.trim().toLowerCase();
  if (
    name.length > 253 ||
    name.split(".").some((part) => part.length > 63) ||
    !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(name)
  )
    throw Error("Informe somente um domínio válido.");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(abort, 8000);
  try {
    const response = await fetch(
      "https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(name) + "&type=NS",
      {
        method: "GET",
        headers: { accept: "application/dns-json" },
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error",
        signal: controller.signal,
      },
    );
    if (!response.ok) throw Error();
    const data = await response.json();
    if (
      !data ||
      !Array.isArray(data.Question) ||
      data.Question.length !== 1 ||
      data.Question[0].name?.replace(/\.$/, "").toLowerCase() !== name ||
      data.Question[0].type !== 2 ||
      ![0, 3].includes(data.Status) ||
      data.TC === true
    )
      throw Error();
    if (data.Status === 3)
      return {
        provider: "Não identificado",
        nameservers: [] as string[],
        detail:
          "Nome não encontrado no DNS consultado. Isso não comprova disponibilidade para registro.",
      };
    if (data.Answer !== undefined && !Array.isArray(data.Answer)) throw Error();
    const nameservers: string[] = (data.Answer || [])
      .filter(
        (r: any) =>
          r.type === 2 &&
          typeof r.data === "string" &&
          r.name?.replace(/\.$/, "").toLowerCase() === name,
      )
      .map((r: any) => r.data.toLowerCase().replace(/\.$/, ""))
      .filter((v: string) => v.length <= 253 && /^[a-z0-9.-]+$/.test(v));
    return {
      nameservers,
      provider:
        nameservers.length && nameservers.every((ns) => ns.endsWith(".ns.cloudflare.com"))
          ? "Cloudflare"
          : nameservers.length
            ? "Outro provedor — confira os nameservers"
            : "Não identificado",
      detail: nameservers.length
        ? "Delegação DNS observada. Registrador, propriedade e SSL não foram verificados."
        : "Sem NS neste hostname; um subdomínio pode usar a zona do domínio principal. Confira no provedor.",
    };
  } catch {
    throw Error(
      signal.aborted
        ? "Consulta cancelada."
        : "Consulta DNS indisponível ou inválida. Tente novamente; nenhum status de conexão foi confirmado.",
    );
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
