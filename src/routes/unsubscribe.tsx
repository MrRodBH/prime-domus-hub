import { useEffect, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: (s.token as string | undefined) ?? "",
  }),
  head: () => ({
    meta: [
      { title: "Cancelar inscrição — RM Prime Imóveis" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UnsubscribePage,
});

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "success" }
  | { kind: "error"; message: string };

function UnsubscribePage() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) return setState({ kind: "invalid" });
        if (j.valid) return setState({ kind: "valid" });
        if (j.reason === "already_unsubscribed")
          return setState({ kind: "already" });
        setState({ kind: "invalid" });
      })
      .catch(() => setState({ kind: "error", message: "Falha ao validar." }));
  }, [token]);

  async function confirm() {
    setSubmitting(true);
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (j.success) setState({ kind: "success" });
      else if (j.reason === "already_unsubscribed")
        setState({ kind: "already" });
      else setState({ kind: "error", message: j.error || "Erro." });
    } catch {
      setState({ kind: "error", message: "Erro de rede." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">
          Cancelar inscrição
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          RM Prime Imóveis
        </p>

        <div className="mt-6 text-sm text-foreground">
          {state.kind === "loading" && <p>Validando link…</p>}
          {state.kind === "invalid" && (
            <p className="text-destructive">
              Link inválido ou expirado.
            </p>
          )}
          {state.kind === "already" && (
            <p>Este e-mail já foi removido das nossas comunicações.</p>
          )}
          {state.kind === "valid" && (
            <>
              <p className="mb-4">
                Confirme para parar de receber e-mails deste endereço.
              </p>
              <Button onClick={confirm} disabled={submitting}>
                {submitting ? "Processando…" : "Confirmar cancelamento"}
              </Button>
            </>
          )}
          {state.kind === "success" && (
            <p className="text-green-600">
              Pronto. Você não receberá mais e-mails da RM Prime Imóveis.
            </p>
          )}
          {state.kind === "error" && (
            <p className="text-destructive">{state.message}</p>
          )}
        </div>
      </div>
    </main>
  );
}
