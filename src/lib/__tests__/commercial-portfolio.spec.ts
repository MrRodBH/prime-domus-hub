import assert from "node:assert/strict";
import { summarizePortfolio } from "../commercial-portfolio";

const now = new Date("2026-11-09T00:00:00Z");
const items = [
  { id: "1", titulo: "A", status: "ativo", preco: 1_000_000, updated_at: "2026-11-01T00:00:00Z" },
  { id: "2", titulo: "B", status: "ativo", preco: 3_000_000, updated_at: "2026-08-01T00:00:00Z" },
  { id: "3", titulo: "C", status: "ativo", preco: null, updated_at: "2026-11-01T00:00:00Z" },
  { id: "4", titulo: "D", status: "vendido", preco: 9_000_000, updated_at: "2026-01-01T00:00:00Z" },
];
const s = summarizePortfolio(items, now);
assert.equal(s.vgv, 4_000_000);
assert.equal(s.ticketMedio, 2_000_000);
assert.deepEqual(s.parados.map((p) => p.id), ["2"]);
assert.equal(s.semPreco, 1);
console.log("commercial-portfolio ok");
