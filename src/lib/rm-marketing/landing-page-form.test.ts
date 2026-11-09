import { describe, expect, it } from "vitest";
import { normalizarSlug, sugerirSlugLandingPage } from "./landing-page-form";

describe("landing page slug", () => {
  it("remove acentos, espaços e palavras de ligação na sugestão", () => {
    expect(sugerirSlugLandingPage("Apartamento à venda com 64m², 2 quartos e 2 vagas")).toBe("apartamento-64m2-2-quartos-2-vagas");
  });
  it("normaliza o slug digitado para letras minúsculas, números e hífens", () => {
    expect(normalizarSlug("Casa_Savassi  3 Quartos!")).toBe("casa-savassi-3-quartos");
  });
});
