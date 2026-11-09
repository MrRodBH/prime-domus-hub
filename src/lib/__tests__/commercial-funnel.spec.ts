import assert from "node:assert/strict";
import { summarizeFunnel } from "../commercial-funnel";

const now = new Date("2026-11-09T12:00:00Z");
const l = (id: string, status: string, updated: string, a: string | null = "u1") => ({ id, nome: id, status, assigned_to: a, created_at: updated, updated_at: updated });
const s = summarizeFunnel([
  l("1", "novo", "2026-11-09T10:00:00Z", null),
  l("2", "conversando", "2026-11-06T00:00:00Z"),
  l("3", "visita", "2026-11-09T00:00:00Z"),
  l("4", "ganho", "2026-11-01T00:00:00Z"),
  l("5", "perdido", "2026-11-01T00:00:00Z"),
], now);
assert.deepEqual(s.etapas.map((e) => e.total), [4, 3, 2, 1, 1]);
assert.equal(s.conversoes[0].taxa, 0.75);
assert.deepEqual(s.semInteracao.map((x) => x.id), ["2"]);
assert.equal(s.semResponsavel, 1);
assert.deepEqual(s.porResponsavel.u1, { abertos: 2, ganhos: 1 });
console.log("commercial-funnel ok");
