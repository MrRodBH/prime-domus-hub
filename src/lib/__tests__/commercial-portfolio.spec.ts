import { describe, expect, it } from "vitest";
import { summarizePortfolio } from "../commercial-portfolio";

const now = new Date("2026-11-09T00:00:00Z");
const items = [
  { id: "1", titulo: "A", status: "ativo", preco: 1_000_000, updated_at: "2026-11-01T00:00:00Z" },
  { id: "2", titulo: "B", status: "ativo", preco: 3_000_000, updated_at: "2026-08-01T00:00:00Z" },
  { id: "3", titulo: "C", status: "ativo", preco: null, updated_at: "2026-11-01T00:00:00Z" },
  { id: "4", titulo: "D", status: "vendido", preco: 9_000_000, updated_at: "2026-01-01T00:00:00Z" },
];

describe("summarizePortfolio", () => {
  it("VGV soma só imóveis ativos com preço", () => expect(summarizePortfolio(items, now).vgv).toBe(4_000_000));
  it("ticket médio ignora imóveis sem preço", () => expect(summarizePortfolio(items, now).ticketMedio).toBe(2_000_000));
  it("parado = ativo sem atualização há 60+ dias", () =>
    expect(summarizePortfolio(items, now).parados.map((p) => p.id)).toEqual(["2"]));
  it("conta ativos sem preço", () => expect(summarizePortfolio(items, now).semPreco).toBe(1));
});
