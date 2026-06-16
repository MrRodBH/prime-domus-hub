// Mapa temporário de slug -> imagem local. Substituído na etapa do CMS
// quando o upload de imagens passar a popular `imovel_imagens`.
import p1 from "@/assets/property-1.jpg";
import p2 from "@/assets/property-2.jpg";
import p3 from "@/assets/property-3.jpg";
import feature from "@/assets/feature.jpg";
import nLourdes from "@/assets/n-lourdes.jpg";
import nBelvedere from "@/assets/n-belvedere.jpg";
import nVila from "@/assets/n-vila-da-serra.jpg";
import nFunc from "@/assets/n-funcionarios.jpg";

const map: Record<string, string> = {
  "cobertura-linear-belvedere": p1,
  "residencial-aura": p2,
  "mansao-suspensa-belvedere": p3,
  "apartamento-garden-lourdes": feature,
  "casa-condominio-vila-da-serra": nVila,
  "penthouse-funcionarios": nFunc,
};

const fallback = [p1, p2, p3, feature, nLourdes, nBelvedere, nVila, nFunc];

export function imovelImage(slug: string, idx = 0): string {
  return map[slug] ?? fallback[idx % fallback.length];
}

const bairroMap: Record<string, string> = {
  lourdes: nLourdes,
  belvedere: nBelvedere,
  "vila-da-serra": nVila,
  funcionarios: nFunc,
  sion: feature,
  "cidade-jardim": p3,
};

export function bairroImage(slug: string): string {
  return bairroMap[slug] ?? feature;
}

export function formatPreco(preco: number | null, sobConsulta?: boolean): string {
  if (sobConsulta || preco == null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(preco);
}
