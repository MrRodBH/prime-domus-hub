// LeadFunilPanel — painel hospedado no PanelRegistry sob id "lead.funil"
// (Etapa 4.1.c). O core apenas resolve o id e injeta descriptor+adapter;
// a lógica de cálculo permanece encapsulada aqui, fora do registry.
import { useQuery } from "@tanstack/react-query";
import type { PanelProps } from "@/components/workspace/registry";

type LeadLike = { status: string };

const STAGES: { id: string; label: string }[] = [
  { id: "novo", label: "Novo" },
  { id: "conversando", label: "Conversando" },
  { id: "visita", label: "Visita" },
  { id: "proposta", label: "Proposta" },
  { id: "ganho", label: "Ganho" },
];

export function LeadFunilPanel({ descriptor, adapter }: PanelProps) {
  const { data } = useQuery({
    queryKey: ["panel", descriptor.kind, "funil"],
    queryFn: () => adapter.fetchList({ scope: "ativos" }),
  });
  const items = (data ?? []) as unknown as Array<{ extra?: { leadStatus?: string } }>;
  const counts = STAGES.map((s) => ({
    ...s,
    n: items.filter((i) => (i.extra?.leadStatus ?? "") === s.id).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.n));

  return (
    <div className="h-full overflow-y-auto p-6 space-y-3">
      <h3 className="text-sm font-semibold">Funil de conversão</h3>
      <div className="space-y-2">
        {counts.map((c) => (
          <div key={c.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>{c.label}</span>
              <span className="text-muted-foreground tabular-nums">{c.n}</span>
            </div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div
                className="h-full bg-primary/70"
                style={{ width: `${(c.n / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
