import { digits } from "./formats";
export type PostalAddress = { street: string; district: string; city: string; region: string };
export async function lookupPostalCode(value: string, signal: AbortSignal): Promise<PostalAddress> {
  const cep = digits(value);
  if (!/^\d{8}$/.test(cep)) throw Error("Informe um CEP com 8 dígitos.");
  const timeout = new AbortController();
  const abort = () => timeout.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(abort, 8000);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      method: "GET",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      signal: timeout.signal,
    });
    if (!response.ok) throw Error("Consulta de CEP indisponível. Preencha o endereço manualmente.");
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw Error("Resposta de CEP inválida. Preencha manualmente.");
    const row = data as Record<string, unknown>;
    if (row.erro === true || row.erro === "true")
      throw Error("CEP não encontrado. Confira o CEP ou preencha manualmente.");
    const text = (key: string) =>
      typeof row[key] === "string" ? (row[key] as string).trim().slice(0, 160) : "";
    if (digits(text("cep")) !== cep || !text("localidade") || !/^[A-Z]{2}$/.test(text("uf")))
      throw Error("Resposta de CEP inválida. Preencha manualmente.");
    return {
      street: text("logradouro"),
      district: text("bairro"),
      city: text("localidade"),
      region: text("uf"),
    };
  } catch (error) {
    if (signal.aborted) throw Error("Consulta cancelada.");
    if (timeout.signal.aborted)
      throw Error("A consulta de CEP demorou demais. Tente novamente ou preencha manualmente.");
    if (
      error instanceof Error &&
      /^(Consulta de CEP|CEP não encontrado|Resposta de CEP)/.test(error.message)
    )
      throw error;
    throw Error("Consulta de CEP indisponível. Preencha o endereço manualmente.");
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
