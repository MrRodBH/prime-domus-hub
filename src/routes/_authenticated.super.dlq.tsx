import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { superListarDlq, superResolverDlq } from "@/lib/api/super.functions";
import { AlertOctagon, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/dlq")({
  component: DlqPage,
});

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  em_retry: "bg-blue-100 text-blue-800",
  resolvido: "bg-emerald-100 text-emerald-800",
  abandonado: "bg-red-100 text-red-800",
};

function DlqPage() {
  const [status, setStatus] = useState<"todos" | "pendente" | "em_retry" | "resolvido" | "abandonado">("todos");
  const listar = useServerFn(superListarDlq);
  const resolver = useServerFn(superResolverDlq);
  const qc = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["super", "dlq", status],
    queryFn: () => listar({ data: { status, limit: 100 } }),
    refetchInterval: 30_000,
  });

  const mResolve = useMutation({
    mutationFn: (id: string) => resolver({ data: { id } }),
    onSuccess: () => {
      toast.success("Item marcado como resolvido");
      qc.invalidateQueries({ queryKey: ["super", "dlq"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const rows = data ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <AlertOctagon className="size-6 text-amber-600" /> DLQ · Portais Imobiliários
          </h1>
          <p className="text-sm text-muted-foreground">
            Dead-letter queue de sincronizações que falharam. Retry exponencial automático (2 → 60 min, 6 tentativas).
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 text-sm rounded-md border hover:bg-foreground/5 inline-flex items-center gap-2"
          disabled={isFetching}
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </header>

      <div className="flex gap-2 flex-wrap">
        {(["todos", "pendente", "em_retry", "resolvido", "abandonado"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 text-xs rounded-md border ${status === s ? "bg-petroleum text-linen border-petroleum" : "hover:bg-foreground/5"}`}
          >
            {s} {s !== "todos" && counts[s] ? `(${counts[s]})` : ""}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum item na DLQ para este filtro.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Data</th>
                <th className="text-left px-4 py-2">Portal</th>
                <th className="text-left px-4 py-2">Ação</th>
                <th className="text-left px-4 py-2">Erro</th>
                <th className="text-center px-4 py-2">Tent.</th>
                <th className="text-center px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Próxima</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-foreground/5">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2 font-medium">{r.portal_slug}</td>
                  <td className="px-4 py-2 text-xs">{r.acao}</td>
                  <td className="px-4 py-2 text-xs text-red-700 max-w-xs truncate" title={r.erro ?? ""}>
                    {r.erro ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-center">{r.tentativas}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[r.status] ?? "bg-gray-100"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {r.proxima_tentativa_at
                      ? new Date(r.proxima_tentativa_at).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.status !== "resolvido" && (
                      <button
                        onClick={() => mResolve.mutate(r.id)}
                        disabled={mResolve.isPending}
                        className="text-xs px-2 py-1 rounded border hover:bg-emerald-50 inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="size-3" /> Resolver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
