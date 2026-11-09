export type PortfolioItem = { id: string; titulo: string; status: string; preco: number | null; updated_at: string };
export type PortfolioSummary = {
  ativos: number; vgv: number; ticketMedio: number; semPreco: number;
  parados: PortfolioItem[]; porStatus: Record<string, number>;
};

/** Commercial portfolio indicators from real listings only. "Parado" = active listing not updated for 60+ days. */
export function summarizePortfolio(items: PortfolioItem[], now = new Date()): PortfolioSummary {
  const porStatus: Record<string, number> = {};
  for (const i of items) porStatus[i.status] = (porStatus[i.status] ?? 0) + 1;
  const ativos = items.filter((i) => i.status === "ativo");
  const comPreco = ativos.filter((i) => typeof i.preco === "number" && i.preco > 0);
  const vgv = comPreco.reduce((s, i) => s + (i.preco as number), 0);
  const limite = now.getTime() - 60 * 86_400_000;
  const parados = ativos
    .filter((i) => new Date(i.updated_at).getTime() < limite)
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  return {
    ativos: ativos.length, vgv,
    ticketMedio: comPreco.length ? Math.round(vgv / comPreco.length) : 0,
    semPreco: ativos.length - comPreco.length, parados, porStatus,
  };
}
