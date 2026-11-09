import { describe, it, expect } from "vitest";
import { buildInsights } from "@/components/super/ExecutiveOverview";
const k = { tenants: 2, tenantsAtivos: 1, users: 3, imoveis: 0, leads: 0, leads24h: 0, portalOk7d: 0, portalErr7d: 2, auditoria24h: 0 };
describe("buildInsights", () => {
  it("flags inactive tenants and portal failures from real counts", () => {
    const r = buildInsights(k, [{ id: "a", nome: "A", status: "ativo", dominio_principal: "a.com", owner_user_id: "x" }], { a: { users: 1, imoveis: 5, leads: 1 } });
    expect(r.map(i => i.title)).toEqual(["1 empresa(s) não ativa(s)", "2 falha(s) de sincronização com portais (7 dias)"]);
  });
  it("returns no insights without data", () => { expect(buildInsights(undefined, [], {})).toEqual([]); });
});
