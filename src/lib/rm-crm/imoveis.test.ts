import { describe, expect, it } from "vitest";
import { bairroDoEndereco, montarEndereco, statusPainel } from "./imoveis";

describe("imóveis RM Prime", () => {
  it("rascunho e reservado aparecem como inativo", () => {
    expect(statusPainel("rascunho")).toBe("inativo");
    expect(statusPainel("reservado")).toBe("inativo");
    expect(statusPainel("vendido")).toBe("vendido");
  });
  it("bairro ida e volta pelo endereço", () => {
    const e = montarEndereco({ logradouro: "Rua Maria Heilbuth Surette", numero: "609", bairro: "Buritis" });
    expect(e).toBe("Rua Maria Heilbuth Surette, 609 - Buritis");
    expect(bairroDoEndereco(e)).toBe("Buritis");
  });
});
