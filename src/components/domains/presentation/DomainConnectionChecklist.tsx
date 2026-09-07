import { useEffect, useRef, useState } from "react";
import { identifyDns } from "./public-dns";
import { connectionStatus, propagationGuidance } from "./domain-status";
export function DomainConnectionChecklist({ hostname }: { hostname: string }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof identifyDns>> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );
  async function check() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const value = await identifyDns(hostname, controller.signal);
      if (request.current === controller) setResult(value);
    } catch (e) {
      if (request.current === controller)
        setError(e instanceof Error ? e.message : "Consulta indisponível.");
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  const status = connectionStatus();
  return (
    <section aria-label="Checklist de conexão" className="mt-5 space-y-4">
      <h3 className="text-lg font-semibold">Checklist de conexão do domínio</h3>
      <ol className="list-decimal space-y-5 pl-5">
        <li>
          <strong>Domínio e provedor</strong>
          <p className="break-all">{hostname}</p>
          <button
            type="button"
            disabled={busy}
            onClick={check}
            className="my-2 min-h-11 rounded-xl border border-[#123f47]/20 px-4 py-2 disabled:opacity-50"
          >
            {busy ? "Consultando DNS…" : "Identificar provedor DNS"}
          </button>
          {result && (
            <div role="status">
              <p>Provedor DNS identificado: {result.provider}</p>
              <p className="break-all">{result.nameservers.join(", ")}</p>
              <p>{result.detail}</p>
            </div>
          )}
          <p className="text-xs">
            Consulta pública Cloudflare DNS: envia apenas o hostname, sem credenciais. O provedor
            informado no cadastro permanece editável.
          </p>
        </li>
        <li>
          <strong>Registros fornecidos pela plataforma</strong>
          <p>O tenant publica os registros exatos no painel Cloudflare ou de seu provedor.</p>
          <div className="my-2 rounded-xl border p-3">
            <p>TXT de propriedade: aguardando emissão autenticada.</p>
            <p>Nome e valor: ainda não emitidos.</p>
            <p>Apontamento CNAME/A/AAAA e TTL: aguardando configuração oficial da plataforma.</p>
          </div>
          <p className="text-sm">
            Este preview não emite chaves reais. Não copie exemplos nem use chaves de API no DNS. A
            emissão e a conferência estão no ambiente autenticado de Domínios.
          </p>
        </li>
        <li>
          <strong>Aguardar propagação</strong>
          <p>{propagationGuidance}</p>
        </li>
        <li>
          <strong>Conferir conexão</strong>
          <div className="my-2">
            <button
              type="button"
              disabled={busy}
              onClick={check}
              aria-label="Check Status"
              className={
                "min-h-11 rounded-xl px-4 py-2 font-semibold disabled:opacity-50 " +
                status.className
              }
            >
              {busy ? "Verificando…" : "Check Status — " + status.label}
            </button>
          </div>
          <p role="status">
            {status.detail} Neste preview, o botão consulta apenas a delegação pública; propriedade
            e SSL permanecem pendentes.
          </p>
          <p className="mt-2 text-sm">
            Verde: Conectado · Amarelo: Em Propagação · Vermelho: Não Conectado — verificar
            configurações.
          </p>
        </li>
      </ol>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
