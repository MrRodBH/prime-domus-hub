import assert from "node:assert/strict";
import { summarizeOperational } from "./src/lib/operational-dashboard";

const now = new Date(2026, 10, 9, 12);
const lead = (status: string, updated: string, assigned_to: string | null = null) => ({ id: Math.random().toString(), nome: "x", status, assigned_to, origem: null, created_at: "2026-11-01T10:00:00Z", updated_at: updated });

assert.equal(summarizeOperational([lead("conversando", "2026-11-01T10:00:00"), lead("conversando", "2026-11-05T10:00:00")], now).parados, 1, "stalled after 7 days");
const s = summarizeOperational([lead("ganho", "2026-11-08"), lead("perdido", "2026-11-08"), lead("descartado", "2026-11-08"), lead("proposta", "2026-11-08")], now);
assert.equal(s.ativos, 1, "won/lost/discarded are not active");
assert.equal(s.taxaConversao, 25);
assert.equal(summarizeOperational([lead("novo", "2026-11-08", "uuid-a")], now).corretores[0].nome, "Corretor 1", "broker ids never shown");
console.log("operational dashboard specs: 4 passed");
