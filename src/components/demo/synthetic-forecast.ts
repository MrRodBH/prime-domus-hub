import type { ContatoSinteticoCriado } from "./SyntheticWorkflowDialogs";

export type CenarioPrevisao = "Conservador" | "Realista" | "Otimista";

type EtapaBasePrevisao = {
  nome: string;
  valorPotencial: number;
  probabilidade: number;
  leituraAmigavel: string;
  cor: string;
};

export type EtapaPrevisaoSintetica = EtapaBasePrevisao & {
  valorPrevisto: number;
  probabilidadeAjustada: number;
};

export type MetaResponsavelSintetica = {
  responsavel: string;
  meta: number;
  realizado: number;
  previsao: number;
  atingimentoPrevisto: number;
  cor: string;
};

export type ResumoPrevisaoSintetica = {
  cenario: CenarioPrevisao;
  descricaoCenario: string;
  etapas: EtapaPrevisaoSintetica[];
  totalPotencial: number;
  totalPrevisto: number;
  metaTotal: number;
  coberturaMeta: number;
  metasResponsaveis: MetaResponsavelSintetica[];
};

export const CENARIOS_PREVISAO: Record<CenarioPrevisao, { fator: number; descricao: string }> = {
  Conservador: { fator: 0.8, descricao: "Ritmo de conversão 20% menor" },
  Realista: { fator: 1, descricao: "Ritmo atual de conversão" },
  Otimista: { fator: 1.2, descricao: "Ritmo de conversão 20% maior" },
};

const ETAPAS_BASE: EtapaBasePrevisao[] = [
  {
    nome: "Novos contatos",
    valorPotencial: 31_800_000,
    probabilidade: 0.15,
    leituraAmigavel: "Chance inicial",
    cor: "#7c3aed",
  },
  {
    nome: "Em atendimento",
    valorPotencial: 22_400_000,
    probabilidade: 0.35,
    leituraAmigavel: "Em avaliação",
    cor: "#2694d1",
  },
  {
    nome: "Visita agendada",
    valorPotencial: 12_100_000,
    probabilidade: 0.6,
    leituraAmigavel: "Boa chance",
    cor: "#d6a84b",
  },
  {
    nome: "Proposta enviada",
    valorPotencial: 7_700_000,
    probabilidade: 0.85,
    leituraAmigavel: "Chance alta",
    cor: "#f06449",
  },
  {
    nome: "Negócio fechado",
    valorPotencial: 4_900_000,
    probabilidade: 1,
    leituraAmigavel: "Confirmado",
    cor: "#16a56b",
  },
  {
    nome: "Negócio perdido",
    valorPotencial: 0,
    probabilidade: 0,
    leituraAmigavel: "Encerrado",
    cor: "#db3f8d",
  },
];

const METAS_BASE = [
  {
    responsavel: "Amanda Reis",
    meta: 18_000_000,
    realizado: 1_800_000,
    previsaoAberta: 9_000_000,
    cor: "#7c3aed",
  },
  {
    responsavel: "Lucas Prado",
    meta: 14_000_000,
    realizado: 1_400_000,
    previsaoAberta: 7_200_000,
    cor: "#f06449",
  },
  {
    responsavel: "Bruno Lima",
    meta: 10_000_000,
    realizado: 1_000_000,
    previsaoAberta: 5_400_000,
    cor: "#16a56b",
  },
  {
    responsavel: "Camila Torres",
    meta: 10_000_000,
    realizado: 700_000,
    previsaoAberta: 4_815_000,
    cor: "#2694d1",
  },
];

const META_TOTAL = METAS_BASE.reduce((total, item) => total + item.meta, 0);
const REALIZADO_TOTAL = METAS_BASE.reduce((total, item) => total + item.realizado, 0);
const PREVISAO_ABERTA_REALISTA = METAS_BASE.reduce((total, item) => total + item.previsaoAberta, 0);

function normalizarEtapa(etapa: string) {
  return etapa === "Novo contato" ? "Novos contatos" : etapa;
}

function probabilidadeDaEtapa(etapa: EtapaBasePrevisao, fator: number) {
  if (etapa.probabilidade === 0 || etapa.probabilidade === 1) return etapa.probabilidade;
  return Math.min(1, etapa.probabilidade * fator);
}

function valorDoContato(contato: ContatoSinteticoCriado, valoresImoveis: Record<string, number>) {
  return contato.proposta?.valorNumerico ?? valoresImoveis[contato.imovelSelecionado] ?? 0;
}

export function calcularPrevisaoSintetica({
  cenario,
  contatos,
  valoresImoveis,
}: {
  cenario: CenarioPrevisao;
  contatos: ContatoSinteticoCriado[];
  valoresImoveis: Record<string, number>;
}): ResumoPrevisaoSintetica {
  const configuracao = CENARIOS_PREVISAO[cenario];
  const contatosNoFunil = contatos.filter((contato) => contato.encaminhadoAoFunil);

  const etapas = ETAPAS_BASE.map((etapa) => {
    const probabilidadeAjustada = probabilidadeDaEtapa(etapa, configuracao.fator);
    const valorAdicionado = contatosNoFunil
      .filter((contato) => normalizarEtapa(contato.etapa) === etapa.nome)
      .reduce((total, contato) => total + valorDoContato(contato, valoresImoveis), 0);
    const valorPotencial = etapa.valorPotencial + valorAdicionado;
    return {
      ...etapa,
      valorPotencial,
      probabilidadeAjustada,
      valorPrevisto: valorPotencial * probabilidadeAjustada,
    };
  });

  const previsaoBaseDoCenario = ETAPAS_BASE.reduce((total, etapa) => {
    const probabilidadeAjustada = probabilidadeDaEtapa(etapa, configuracao.fator);
    return total + etapa.valorPotencial * probabilidadeAjustada;
  }, 0);
  const fatorEquivalenteParaMetas =
    (previsaoBaseDoCenario - REALIZADO_TOTAL) / PREVISAO_ABERTA_REALISTA;

  const contribuicaoPorResponsavel = new Map<string, number>();
  contatosNoFunil.forEach((contato) => {
    const etapa = etapas.find((item) => item.nome === normalizarEtapa(contato.etapa));
    if (!etapa) return;
    contribuicaoPorResponsavel.set(
      contato.responsavel,
      (contribuicaoPorResponsavel.get(contato.responsavel) ?? 0) +
        valorDoContato(contato, valoresImoveis) * etapa.probabilidadeAjustada,
    );
  });

  const metasResponsaveis = METAS_BASE.map((item) => {
    const previsao =
      item.realizado +
      item.previsaoAberta * fatorEquivalenteParaMetas +
      (contribuicaoPorResponsavel.get(item.responsavel) ?? 0);
    return {
      responsavel: item.responsavel,
      meta: item.meta,
      realizado: item.realizado,
      previsao,
      atingimentoPrevisto: (previsao / item.meta) * 100,
      cor: item.cor,
    };
  });
  const totalPotencial = etapas.reduce((total, etapa) => total + etapa.valorPotencial, 0);
  const totalPrevisto = etapas.reduce((total, etapa) => total + etapa.valorPrevisto, 0);

  return {
    cenario,
    descricaoCenario: configuracao.descricao,
    etapas,
    totalPotencial,
    totalPrevisto,
    metaTotal: META_TOTAL,
    coberturaMeta: (totalPrevisto / META_TOTAL) * 100,
    metasResponsaveis,
  };
}
