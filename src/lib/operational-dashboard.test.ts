import { describe, expect, it } from "vitest";
import { summarizeOperational } from "./operational-dashboard";

const now = new Date(2026, 10, 9, 12);
const lead = (status: string, updated: string, extra: Partial<{ assigned_to: string; origem: string }> = {}) => ({ id: Math.random().toString(), nome: "x", status, assigned_to: extra.assigned_to ?? null, origem: extra.origem ?? null, created_at: "2026-11-01T10:00:00Z", updated_at: updated });

describe("summarizeOperational", () => {
  it("counts a lead as stalled after 7 days without update", () => {
    const s = summarizeOperational([lead("conversando", "2026-11-01T10:00:00"), lead("conversando", "2026-11-05T10:00:00")], now);
    expect(s.parados).toBe(1);
  });
  it("excludes won, lost and discarded leads from active leads", () => {
    const s = summarizeOperational([lead("ganho", "2026-11-08"), lead("perdido", "2026-11-08"), lead("descartado", "2026-11-08"), lead("proposta", "2026-11-08")], now);
    expect(s.ativos).toBe(1);
    expect(s.taxaConversao).toBe(25);
  });
  it("never exposes broker ids", () => {
    const s = summarizeOperational([lead("novo", "2026-11-08", { assigned_to: "uuid-a" })], now);
    expect(s.corretores[0].nome).toBe("Corretor 1");
  });
});
