import type { ContatoSinteticoCriado } from "./SyntheticWorkflowDialogs";

export const PALETA_GRAFICOS = {
  petroleo: "#123f47",
  violeta: "#7c3aed",
  coral: "#f06449",
  dourado: "#d6a84b",
  esmeralda: "#16a56b",
  magenta: "#db3f8d",
  azulCeu: "#2694d1",
} as const;

export const CONTEXTO_DEMONSTRACAO = {
  plataforma: {
    nome: "Real One",
    dominio: "realone.com.br",
    descricao: "Plataforma SaaS imobiliária",
  },
  tenant: {
    nome: "RM Prime Imóveis",
    dominio: "rmprimeimoveis.com.br",
    descricao: "Primeira empresa representada com dados sintéticos",
  },
} as const;

export const evolucaoComercial = [
  { periodo: "1–7 ago", leads: 62, visitas: 21, propostas: 8, vendas: 3 },
  { periodo: "8–14 ago", leads: 78, visitas: 29, propostas: 12, vendas: 5 },
  { periodo: "15–21 ago", leads: 71, visitas: 34, propostas: 16, vendas: 6 },
  { periodo: "22–28 ago", leads: 96, visitas: 41, propostas: 19, vendas: 8 },
  { periodo: "29 ago–4 set", leads: 114, visitas: 48, propostas: 23, vendas: 10 },
];

export const origemDosLeads = [
  { nome: "Meta Ads", valor: 38, cor: PALETA_GRAFICOS.violeta },
  { nome: "Google Ads", valor: 29, cor: PALETA_GRAFICOS.coral },
  { nome: "Portais imobiliários", valor: 18, cor: PALETA_GRAFICOS.dourado },
  { nome: "Tráfego orgânico", valor: 15, cor: PALETA_GRAFICOS.esmeralda },
];

export const etapasDoFunil = [
  { nome: "Novos contatos", quantidade: 42, valor: "R$ 31,8 mi", cor: "bg-violet-500" },
  { nome: "Em atendimento", quantidade: 27, valor: "R$ 22,4 mi", cor: "bg-sky-500" },
  { nome: "Visita agendada", quantidade: 14, valor: "R$ 12,1 mi", cor: "bg-amber-500" },
  { nome: "Proposta enviada", quantidade: 8, valor: "R$ 7,7 mi", cor: "bg-orange-500" },
  { nome: "Negócio fechado", quantidade: 5, valor: "R$ 4,9 mi", cor: "bg-emerald-500" },
  { nome: "Negócio perdido", quantidade: 3, valor: "R$ 0", cor: "bg-rose-500" },
];

export const leadsSinteticos = [
  {
    nome: "Mariana Alves",
    interesse: "Cobertura · Lourdes",
    origem: "Meta Ads",
    responsavel: "Amanda Reis",
    etapa: "Visita agendada",
    temperatura: "Quente",
  },
  {
    nome: "Eduardo Nogueira",
    interesse: "Apartamento · Vila da Serra",
    origem: "Google Ads",
    responsavel: "Lucas Prado",
    etapa: "Proposta enviada",
    temperatura: "Quente",
  },
  {
    nome: "Camila Fonseca",
    interesse: "Casa · Belvedere",
    origem: "Site institucional",
    responsavel: "Amanda Reis",
    etapa: "Em atendimento",
    temperatura: "Morno",
  },
  {
    nome: "Rafael Martins",
    interesse: "Lançamento · Vale do Sereno",
    origem: "Portal imobiliário",
    responsavel: "Bruno Lima",
    etapa: "Novo contato",
    temperatura: "Novo",
  },
];

export const campanhasSinteticas = [
  {
    nome: "Coberturas em Belo Horizonte",
    canal: "Meta Ads",
    estado: "Em demonstração",
    investimento: "R$ 8.400",
    leads: 96,
    custo: "R$ 87,50",
    conversao: "7,3%",
    cor: "from-violet-500 to-fuchsia-500",
  },
  {
    nome: "Apartamentos Vila da Serra",
    canal: "Google Ads",
    estado: "Em demonstração",
    investimento: "R$ 6.250",
    leads: 71,
    custo: "R$ 88,03",
    conversao: "6,8%",
    cor: "from-orange-500 to-amber-400",
  },
  {
    nome: "Lançamento Vale do Sereno",
    canal: "Página de captura",
    estado: "Rascunho",
    investimento: "R$ 0",
    leads: 24,
    custo: "—",
    conversao: "9,1%",
    cor: "from-emerald-500 to-teal-400",
  },
];

export const integracoesSinteticas = [
  {
    nome: "Meta Ads",
    descricao: "Campanhas, formulários instantâneos e atribuição de leads.",
    estado: "Pronto para configurar",
    grupo: "Publicidade",
    cor: "bg-violet-500",
  },
  {
    nome: "Google Ads",
    descricao: "Campanhas de pesquisa, conversões e custo por oportunidade.",
    estado: "Pronto para configurar",
    grupo: "Publicidade",
    cor: "bg-orange-500",
  },
  {
    nome: "Meta Pixel",
    descricao: "Eventos de navegação e conversão com consentimento.",
    estado: "Demonstração ativa",
    grupo: "Rastreamento",
    cor: "bg-fuchsia-500",
  },
  {
    nome: "API de Conversões",
    descricao: "Eventos enviados pelo servidor com deduplicação.",
    estado: "Contrato validado",
    grupo: "Rastreamento",
    cor: "bg-rose-500",
  },
  {
    nome: "Google Tag Manager",
    descricao: "Centralização das etiquetas autorizadas do site.",
    estado: "Bloqueado até consentimento",
    grupo: "Rastreamento",
    cor: "bg-sky-500",
  },
  {
    nome: "Instagram",
    descricao: "Conteúdo, mensagens e origem de oportunidades.",
    estado: "Pronto para configurar",
    grupo: "Redes sociais",
    cor: "bg-pink-500",
  },
  {
    nome: "WhatsApp",
    descricao: "Atendimento, distribuição e histórico de conversas.",
    estado: "Pronto para configurar",
    grupo: "Comunicação",
    cor: "bg-emerald-500",
  },
  {
    nome: "Portais imobiliários",
    descricao: "Exportações e futura publicação automatizada de imóveis.",
    estado: "Exportação disponível",
    grupo: "Distribuição",
    cor: "bg-amber-500",
  },
];

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

export type PeriodoRelatorioComercial = "Últimos 7 dias" | "Últimos 30 dias" | "Últimos 90 dias";

export type FiltroResponsavelRelatorio =
  | "Toda a equipe"
  | "Amanda Reis"
  | "Lucas Prado"
  | "Bruno Lima"
  | "Camila Torres";

export type DesempenhoResponsavelSintetico = {
  responsavel: Exclude<FiltroResponsavelRelatorio, "Toda a equipe">;
  leads: number;
  visitas: number;
  propostas: number;
  ganhos: number;
  perdidos: number;
  meta: number;
  realizado: number;
  previsto: number;
  atingimento: number;
  cor: string;
};

export type ConversaoEtapaSintetica = {
  etapa: string;
  quantidade: number;
  taxa: number;
  cor: string;
};

export type RelatorioComercialSintetico = {
  periodo: PeriodoRelatorioComercial;
  responsavel: FiltroResponsavelRelatorio;
  desempenho: DesempenhoResponsavelSintetico[];
  conversaoEtapas: ConversaoEtapaSintetica[];
  totais: {
    leads: number;
    visitas: number;
    propostas: number;
    ganhos: number;
    perdidos: number;
    meta: number;
    realizado: number;
    previsto: number;
    taxaConversao: number;
  };
};

export const PERIODOS_RELATORIO_COMERCIAL: PeriodoRelatorioComercial[] = [
  "Últimos 7 dias",
  "Últimos 30 dias",
  "Últimos 90 dias",
];

export const RESPONSAVEIS_RELATORIO_COMERCIAL: FiltroResponsavelRelatorio[] = [
  "Toda a equipe",
  "Amanda Reis",
  "Lucas Prado",
  "Bruno Lima",
  "Camila Torres",
];

const DESEMPENHO_BASE_30_DIAS = [
  { responsavel: "Amanda Reis", leads: 128, visitas: 55, propostas: 25, ganhos: 12, perdidos: 8 },
  { responsavel: "Lucas Prado", leads: 112, visitas: 46, propostas: 19, ganhos: 9, perdidos: 6 },
  { responsavel: "Bruno Lima", leads: 96, visitas: 38, propostas: 15, ganhos: 8, perdidos: 5 },
  { responsavel: "Camila Torres", leads: 85, visitas: 34, propostas: 9, ganhos: 6, perdidos: 4 },
] as const;

const FATOR_POR_PERIODO: Record<PeriodoRelatorioComercial, number> = {
  "Últimos 7 dias": 0.24,
  "Últimos 30 dias": 1,
  "Últimos 90 dias": 2.72,
};

function arredondarVolume(valor: number) {
  return Math.max(0, Math.round(valor));
}

export function calcularRelatorioComercialSintetico({
  periodo,
  responsavel,
  resumoPrevisao,
  contatos = [],
}: {
  periodo: PeriodoRelatorioComercial;
  responsavel: FiltroResponsavelRelatorio;
  resumoPrevisao: ResumoPrevisaoSintetica;
  contatos?: ContatoSinteticoCriado[];
}): RelatorioComercialSintetico {
  const fator = FATOR_POR_PERIODO[periodo];
  const desempenho = DESEMPENHO_BASE_30_DIAS.map((base) => {
    const meta = resumoPrevisao.metasResponsaveis.find(
      (item) => item.responsavel === base.responsavel,
    );
    const contatosDoResponsavel = contatos.filter(
      (contato) => contato.responsavel === base.responsavel,
    );
    const negociosGanhos = contatosDoResponsavel.filter(
      (contato) => contato.proposta?.estado === "Ganha",
    );
    const realizadoDaSessao = negociosGanhos.reduce(
      (total, contato) => total + (contato.proposta?.valorNumerico ?? 0),
      0,
    );
    const leads = arredondarVolume(base.leads * fator) + contatosDoResponsavel.length;
    const visitas =
      arredondarVolume(base.visitas * fator) +
      contatosDoResponsavel.filter((contato) => contato.visitaAgendada).length;
    const propostas =
      arredondarVolume(base.propostas * fator) +
      contatosDoResponsavel.filter((contato) => contato.proposta).length;
    const ganhos = arredondarVolume(base.ganhos * fator) + negociosGanhos.length;
    const perdidos =
      arredondarVolume(base.perdidos * fator) +
      contatosDoResponsavel.filter((contato) => contato.proposta?.estado === "Perdida").length;
    const metaDoPeriodo = (meta?.meta ?? 0) * fator;
    const realizado = (meta?.realizado ?? 0) * fator + realizadoDaSessao;
    const previsto = Math.max(realizado, (meta?.previsao ?? 0) * fator);

    return {
      responsavel: base.responsavel,
      leads,
      visitas,
      propostas,
      ganhos,
      perdidos,
      meta: metaDoPeriodo,
      realizado,
      previsto,
      atingimento: metaDoPeriodo > 0 ? (realizado / metaDoPeriodo) * 100 : 0,
      cor: meta?.cor ?? PALETA_GRAFICOS.petroleo,
    };
  }).filter((item) => responsavel === "Toda a equipe" || item.responsavel === responsavel);

  const somar = (campo: "leads" | "visitas" | "propostas" | "ganhos" | "perdidos") =>
    desempenho.reduce((total, item) => total + item[campo], 0);
  const somarValor = (campo: "meta" | "realizado" | "previsto") =>
    desempenho.reduce((total, item) => total + item[campo], 0);
  const leads = somar("leads");
  const volumesEtapas = [
    { etapa: "Novos contatos", quantidade: leads, cor: PALETA_GRAFICOS.violeta },
    {
      etapa: "Em atendimento",
      quantidade: arredondarVolume(leads * 0.64),
      cor: PALETA_GRAFICOS.azulCeu,
    },
    { etapa: "Visita agendada", quantidade: somar("visitas"), cor: PALETA_GRAFICOS.dourado },
    { etapa: "Proposta enviada", quantidade: somar("propostas"), cor: PALETA_GRAFICOS.coral },
    { etapa: "Negócio fechado", quantidade: somar("ganhos"), cor: PALETA_GRAFICOS.esmeralda },
    { etapa: "Negócio perdido", quantidade: somar("perdidos"), cor: PALETA_GRAFICOS.magenta },
  ];
  const conversaoEtapas = volumesEtapas.map((etapa) => ({
    ...etapa,
    taxa: leads > 0 ? (etapa.quantidade / leads) * 100 : 0,
  }));
  const ganhos = somar("ganhos");

  return {
    periodo,
    responsavel,
    desempenho,
    conversaoEtapas,
    totais: {
      leads,
      visitas: somar("visitas"),
      propostas: somar("propostas"),
      ganhos,
      perdidos: somar("perdidos"),
      meta: somarValor("meta"),
      realizado: somarValor("realizado"),
      previsto: somarValor("previsto"),
      taxaConversao: leads > 0 ? (ganhos / leads) * 100 : 0,
    },
  };
}

export type TomInsightComercial = "Positivo" | "Atenção" | "Informativo";

export type InsightComercialSintetico = {
  id: string;
  titulo: string;
  leitura: string;
  explicacao: string;
  evidencia: string;
  tom: TomInsightComercial;
};

export type AlertaComercialSintetico = {
  id: string;
  titulo: string;
  valor: number;
  unidade: "p.p." | "%";
  detalhe: string;
  tom: TomInsightComercial;
};

export type RecomendacaoResponsavelSintetica = {
  responsavel: Exclude<FiltroResponsavelRelatorio, "Toda a equipe">;
  prioridade: "Alta" | "Média" | "Baixa";
  proximaAcao: string;
  motivo: string;
  impactoEsperado: string;
  resultadoEsperado: string;
};

export type EstadoDecisaoComercial = "Pendente" | "Aceita" | "Adiada" | "Dispensada";
export type AcaoDecisaoComercial = Exclude<EstadoDecisaoComercial, "Pendente">;
export type RegistroDecisaoComercial = {
  estado: EstadoDecisaoComercial;
  atualizadoEm: string;
};
export type DecisoesComerciaisSinteticas = Record<string, RegistroDecisaoComercial>;

export type EtapaPlaybookComercialSintetico = {
  id: string;
  orientacao: string;
  criterioConclusao: string;
};

export type PlaybookComercialSintetico = {
  id: string;
  titulo: string;
  responsavel: RecomendacaoResponsavelSintetica["responsavel"];
  prazoFicticio: string;
  criterioConclusao: string;
  etapas: EtapaPlaybookComercialSintetico[];
  etapasConcluidas: string[];
};

export type PlaybooksComerciaisSinteticos = Record<string, PlaybookComercialSintetico>;

export type FaixaResultadoPlaybookSintetico =
  | "Abaixo do esperado"
  | "Dentro do esperado"
  | "Acima do esperado";

export type ResultadoPlaybookComercialSintetico = {
  playbookId: string;
  responsavel: RecomendacaoResponsavelSintetica["responsavel"];
  faixa: FaixaResultadoPlaybookSintetico;
  impactoEsperado: string;
  resultadoFicticio: string;
  comparacaoExplicavel: string;
  aprendizadoExplicavel: string;
  efetividade: number;
  registradoEm: string;
};

export type ResultadosPlaybooksComerciaisSinteticos = Record<
  string,
  ResultadoPlaybookComercialSintetico
>;

export type ComparacaoPlaybookSintetico = {
  posicao: number;
  responsavel: RecomendacaoResponsavelSintetica["responsavel"];
  faixa: FaixaResultadoPlaybookSintetico;
  efetividade: number;
  praticaEficaz: string;
  justificativaPratica: string;
  recomendacaoMelhoria: string;
  justificativaMelhoria: string;
  aprendizadoBase: string;
  origemPlaybookId: string;
};

export type PlaybookMelhoriaContinuaSintetico = {
  id: string;
  origemPlaybookId: string;
  responsavel: RecomendacaoResponsavelSintetica["responsavel"];
  titulo: string;
  praticaBase: string;
  aprendizadoBase: string;
  objetivoMelhoria: string;
  justificativa: string;
  prazoFicticio: string;
  etapas: string[];
  criadoEm: string;
};

export type PlaybooksMelhoriaContinuaSinteticos = Record<string, PlaybookMelhoriaContinuaSintetico>;

export type FaixaResultadoExperimentoSintetico =
  | "Abaixo do critério"
  | "Próximo do critério"
  | "Acima do critério";

export type RecomendacaoVersaoExperimentoSintetico = "Manter" | "Ajustar" | "Encerrar";

export type ResultadoVersaoExperimentoSintetico = {
  faixa: FaixaResultadoExperimentoSintetico;
  efetividade: number;
  atingiuCriterio: boolean;
  resultadoFicticio: string;
  leituraExplicavel: string;
  recomendacao: RecomendacaoVersaoExperimentoSintetico;
  justificativaRecomendacao: string;
  registradoEm: string;
};

export type VersaoExperimentoPlaybookSintetico = {
  id: "versao-a" | "versao-b";
  rotulo: "Versão A — prática atual" | "Versão B — prática aprimorada";
  titulo: string;
  descricao: string;
  resultado?: ResultadoVersaoExperimentoSintetico;
};

export type DecisaoOwnerPortfolioSintetica = "Escalar" | "Repetir" | "Arquivar";

export type RegistroDecisaoOwnerPortfolioSintetica = {
  decisao: DecisaoOwnerPortfolioSintetica;
  registradoEm: string;
};

export type NivelPortfolioSintetico = "Alto" | "Médio" | "Baixo";
export type NivelConfiancaPortfolioSintetica = "Alta" | "Média" | "Baixa";

export type ExperimentoPlaybookSintetico = {
  id: string;
  playbookMelhoriaId: string;
  origemPlaybookId: string;
  responsavel: RecomendacaoResponsavelSintetica["responsavel"];
  titulo: string;
  hipotese: string;
  criterioSucesso: string;
  valorCriterio: number;
  versoes: VersaoExperimentoPlaybookSintetico[];
  criadoEm: string;
  decisaoOwner?: RegistroDecisaoOwnerPortfolioSintetica;
};

export type ExperimentosPlaybooksSinteticos = Record<string, ExperimentoPlaybookSintetico>;

export type EstadoRolloutExperimentoSintetico =
  | "Não iniciado"
  | "Em andamento"
  | "Pausado"
  | "Revertido"
  | "Concluído";

export type FaixaResultadoEtapaRolloutSintetico =
  | "Dentro do limite"
  | "Atenção"
  | "Limite violado";

export type RecomendacaoMonitoramentoRolloutSintetico =
  | "Continuar"
  | "Pausar"
  | "Reverter";

export type ResultadoEtapaRolloutSintetico = {
  faixa: FaixaResultadoEtapaRolloutSintetico;
  efetividade: number;
  desvioDoLimite: number;
  alertasSeguranca: number;
  leituraExplicavel: string;
  registradoEm: string;
};

export type ReaplicacaoAprendizadoRolloutSintetica = {
  origemRolloutId: string;
  origemTitulo: string;
  recomendacaoRastreada: RecomendacaoMonitoramentoRolloutSintetico;
  criterioPreservado: string;
  simuladoEm: string;
};

export type DecisaoOwnerPoliticaAprendizadoSintetica =
  | "Promover"
  | "Rejeitar"
  | "Retirar";

export type RegistroPoliticaAprendizadoSintetica = {
  decisao: DecisaoOwnerPoliticaAprendizadoSintetica;
  versao: string;
  justificativaExplicavel: string;
  impactoProjetado: string;
  decididoEm: string;
};

export type EstadoAdocaoPoliticaSintetica =
  | "Não iniciada"
  | "Em andamento"
  | "Pausada"
  | "Revogada"
  | "Concluída";

export type FaixaAderenciaPoliticaSintetica =
  | "Conforme"
  | "Atenção"
  | "Desvio crítico";

export type DecisaoOwnerAdocaoPoliticaSintetica =
  | "Continuar"
  | "Pausar"
  | "Revogar";

export type EtapaAdocaoPoliticaSintetica = {
  id: "orientacao-interna" | "adocao-assistida" | "cobertura-simulada";
  titulo: string;
  publicoInternoFicticio: string;
  percentualPublico: number;
  concluida: boolean;
  aderencia?: {
    faixa: FaixaAderenciaPoliticaSintetica;
    indice: number;
    desvioDoLimite: number;
    alertas: number;
    explicacao: string;
    registradoEm: string;
  };
};

export type AdocaoPoliticaSintetica = {
  politicaVersao: string;
  estado: EstadoAdocaoPoliticaSintetica;
  etapas: EtapaAdocaoPoliticaSintetica[];
  criteriosConformidade: string[];
  motivoEstado: string;
  estadoCicloVida?: EstadoCicloVidaPoliticaSintetica;
  revisoesEficacia?: RegistroRevisaoEficaciaPoliticaSintetica[];
  historicoDecisoesCicloVida?: RegistroDecisaoCicloVidaPoliticaSintetica[];
  propostaAjuste?: PropostaAjustePoliticaSintetica;
  atualizadoEm: string;
};

export type FaixaEficaciaPoliticaSintetica =
  | "Eficácia sustentada"
  | "Atenção de eficácia"
  | "Deterioração crítica";

export type DecisaoOwnerCicloVidaPoliticaSintetica =
  | "Manter"
  | "Ajustar"
  | "Aposentar";

export type RegistroRevisaoEficaciaPoliticaSintetica = {
  ciclo: number;
  faixa: FaixaEficaciaPoliticaSintetica;
  aderenciaObservada: number | null;
  impactoProjetado: number;
  impactoObservado: number;
  diferencaImpacto: number;
  variacaoCicloAnterior: number | null;
  deterioracaoDetectada: boolean;
  explicacao: string;
  registradoEm: string;
};

export type RegistroDecisaoCicloVidaPoliticaSintetica = {
  ciclo: number;
  decisao: DecisaoOwnerCicloVidaPoliticaSintetica;
  justificativaExplicavel: string;
  decididoEm: string;
};

export type EstadoCicloVidaPoliticaSintetica = "Ativa" | "Em ajuste" | "Aposentada";

export type EstadoPropostaAjustePoliticaSintetica =
  | "Em avaliação"
  | "Aprovada"
  | "Rejeitada"
  | "Retirada";

export type DecisaoOwnerPropostaAjustePoliticaSintetica =
  | "Aprovar"
  | "Rejeitar"
  | "Retirar";

export type CriterioPropostaAjustePoliticaSintetica = {
  id: "ajuste-recomendado" | "versao-incremental" | "impacto-explicado" | "riscos-mapeados";
  descricao: string;
  atendido: boolean;
};

export type RegistroDecisaoPropostaAjustePoliticaSintetica = {
  decisao: DecisaoOwnerPropostaAjustePoliticaSintetica;
  justificativaExplicavel: string;
  decididoEm: string;
};

export type PropostaAjustePoliticaSintetica = {
  id: string;
  versaoVigente: string;
  versaoProposta: string;
  regraVigente: string;
  regraProposta: string;
  impactoAtual: number;
  impactoProjetado: number;
  riscosProjetados: string[];
  criterios: CriterioPropostaAjustePoliticaSintetica[];
  estado: EstadoPropostaAjustePoliticaSintetica;
  transicaoSimulada?: {
    de: string;
    para: string;
    estado: "Aprovada para sucessão" | "Retirada antes de aplicação";
  };
  historicoDecisoes: RegistroDecisaoPropostaAjustePoliticaSintetica[];
  validacaoSucessora?: ValidacaoSucessoraPoliticaSintetica;
  criadoEm: string;
  atualizadoEm: string;
};

export type FaixaCicloValidacaoSucessoraSintetica =
  | "Dentro dos limites"
  | "Atenção"
  | "Risco crítico";

export type DecisaoOwnerValidacaoSucessoraSintetica =
  | "Ativar"
  | "Adiar"
  | "Reverter";

export type CicloValidacaoSucessoraSintetica = {
  ciclo: number;
  faixa: FaixaCicloValidacaoSucessoraSintetica;
  eficaciaVigente: number;
  eficaciaSucessora: number;
  ganhoSucessora: number;
  alertasRisco: number;
  dentroDosLimites: boolean;
  explicacao: string;
  registradoEm: string;
};

export type RegistroDecisaoValidacaoSucessoraSintetica = {
  decisao: DecisaoOwnerValidacaoSucessoraSintetica;
  justificativaExplicavel: string;
  decididoEm: string;
};

export type ValidacaoSucessoraPoliticaSintetica = {
  estado: "Em validação" | "Pronta para ativação" | "Adiada" | "Revertida";
  ciclos: CicloValidacaoSucessoraSintetica[];
  limitesRisco: string[];
  historicoDecisoes: RegistroDecisaoValidacaoSucessoraSintetica[];
  ativacaoControlada?: AtivacaoControladaPoliticaSucessoraSintetica;
  atualizadoEm: string;
};

export type FaixaCheckpointAtivacaoSucessoraSintetica =
  | "Seguro"
  | "Atenção"
  | "Limite violado";

export type DecisaoOwnerAtivacaoSucessoraSintetica =
  | "Continuar"
  | "Pausar"
  | "Rollback";

export type ResultadoCheckpointAtivacaoSucessoraSintetica = {
  faixa: FaixaCheckpointAtivacaoSucessoraSintetica;
  aderenciaVigente: number;
  aderenciaSucessora: number;
  alertasSeguranca: number;
  explicacao: string;
  registradoEm: string;
};

export type CheckpointAtivacaoSucessoraSintetica = {
  id: "piloto-controlado" | "expansao-assistida" | "cobertura-simulada";
  titulo: string;
  publicoInternoFicticio: string;
  percentualPublico: number;
  concluido: boolean;
  resultado?: ResultadoCheckpointAtivacaoSucessoraSintetica;
};

export type RegistroDecisaoAtivacaoSucessoraSintetica = {
  checkpointId: CheckpointAtivacaoSucessoraSintetica["id"];
  decisao: DecisaoOwnerAtivacaoSucessoraSintetica;
  justificativaExplicavel: string;
  decididoEm: string;
};

export type AtivacaoControladaPoliticaSucessoraSintetica = {
  encerramento?: {
    decisao: "Concluir" | "Revisar";
    owner: "Owner simulado";
    decididoEm: string;
    justificativa: string;
    aprendizados: string[];
  };
  estado: "Em transição" | "Pausada" | "Concluída" | "Rollback concluído";
  versaoVigente: string;
  versaoSucessora: string;
  politicaVigentePreservada: true;
  checkpoints: CheckpointAtivacaoSucessoraSintetica[];
  limitesSeguranca: string[];
  historicoDecisoes: RegistroDecisaoAtivacaoSucessoraSintetica[];
  atualizadoEm: string;
};

export type EtapaRolloutExperimentoSintetico = {
  id: "piloto-interno" | "expansao-controlada" | "cobertura-ampliada";
  titulo: string;
  publicoFicticio: string;
  percentualPublico: number;
  criterioAvanco: string;
  concluida: boolean;
  resultado?: ResultadoEtapaRolloutSintetico;
};

export type RolloutExperimentoSintetico = {
  id: string;
  experimentoId: string;
  responsavel: RecomendacaoResponsavelSintetica["responsavel"];
  titulo: string;
  estado: EstadoRolloutExperimentoSintetico;
  etapas: EtapaRolloutExperimentoSintetico[];
  limitesSeguranca: string[];
  criteriosPausa: string[];
  criteriosReversao: string[];
  motivoEstado?: string;
  aprendizadoReaplicado?: ReaplicacaoAprendizadoRolloutSintetica;
  historicoPoliticaAprendizado?: RegistroPoliticaAprendizadoSintetica[];
  adocaoPolitica?: AdocaoPoliticaSintetica;
  atualizadoEm: string;
};

export type RolloutsExperimentosSinteticos = Record<string, RolloutExperimentoSintetico>;

export type ItemPortfolioExperimentoSintetico = {
  experimentoId: string;
  responsavel: RecomendacaoResponsavelSintetica["responsavel"];
  titulo: string;
  comparacaoConcluida: boolean;
  diferencaVersaoB: number | null;
  impacto: NivelPortfolioSintetico;
  pontuacaoImpacto: number;
  impactoEsperado: string;
  confianca: NivelConfiancaPortfolioSintetica;
  pontuacaoConfianca: number;
  prioridade: NivelPortfolioSintetico;
  pontuacaoPrioridade: number;
  recomendacaoAtual: DecisaoOwnerPortfolioSintetica;
  justificativaRecomendacao: string;
  decisaoOwner?: RegistroDecisaoOwnerPortfolioSintetica;
};

export const CRITERIOS_DECISAO_PORTFOLIO_SINTETICOS = [
  {
    decisao: "Escalar",
    descricao:
      "Versão B alcança 80% ou mais e supera a Versão A em pelo menos 8 p.p. após a comparação completa.",
  },
  {
    decisao: "Repetir",
    descricao:
      "Há potencial, mas falta evidência ou pelo menos um dos critérios para escalar ainda não foi atendido.",
  },
  {
    decisao: "Arquivar",
    descricao:
      "A comparação está completa, a Versão B fica abaixo de 80% e não supera a prática atual.",
  },
] as const;

export function criarChaveDecisaoComercial(
  periodo: PeriodoRelatorioComercial,
  responsavel: RecomendacaoResponsavelSintetica["responsavel"],
) {
  return `${periodo}:${responsavel}`;
}

export function aplicarDecisaoComercialSintetica({
  decisoes,
  periodo,
  recomendacao,
  estado,
}: {
  decisoes: DecisoesComerciaisSinteticas;
  periodo: PeriodoRelatorioComercial;
  recomendacao: RecomendacaoResponsavelSintetica;
  estado: AcaoDecisaoComercial;
}): DecisoesComerciaisSinteticas {
  return {
    ...decisoes,
    [criarChaveDecisaoComercial(periodo, recomendacao.responsavel)]: {
      estado,
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function criarPlaybookComercialSintetico({
  periodo,
  recomendacao,
}: {
  periodo: PeriodoRelatorioComercial;
  recomendacao: RecomendacaoResponsavelSintetica;
}): PlaybookComercialSintetico {
  const modelo = PLAYBOOK_POR_RESPONSAVEL[recomendacao.responsavel];
  return {
    id: criarChaveDecisaoComercial(periodo, recomendacao.responsavel),
    titulo: recomendacao.proximaAcao,
    responsavel: recomendacao.responsavel,
    prazoFicticio: modelo.prazoFicticio,
    criterioConclusao: modelo.criterioConclusao,
    etapas: modelo.etapas.map((etapa, indice) => ({
      id: `etapa-${indice + 1}`,
      ...etapa,
    })),
    etapasConcluidas: [],
  };
}

export function sincronizarPlaybookComDecisaoSintetica({
  playbooks,
  periodo,
  recomendacao,
  estado,
}: {
  playbooks: PlaybooksComerciaisSinteticos;
  periodo: PeriodoRelatorioComercial;
  recomendacao: RecomendacaoResponsavelSintetica;
  estado: AcaoDecisaoComercial;
}): PlaybooksComerciaisSinteticos {
  const chave = criarChaveDecisaoComercial(periodo, recomendacao.responsavel);
  if (estado === "Aceita") {
    return playbooks[chave]
      ? playbooks
      : { ...playbooks, [chave]: criarPlaybookComercialSintetico({ periodo, recomendacao }) };
  }
  if (!playbooks[chave]) return playbooks;
  const atualizados = { ...playbooks };
  delete atualizados[chave];
  return atualizados;
}

export function alternarEtapaPlaybookComercialSintetico({
  playbooks,
  playbookId,
  etapaId,
}: {
  playbooks: PlaybooksComerciaisSinteticos;
  playbookId: string;
  etapaId: string;
}): PlaybooksComerciaisSinteticos {
  const playbook = playbooks[playbookId];
  if (!playbook || !playbook.etapas.some((etapa) => etapa.id === etapaId)) return playbooks;
  const concluida = playbook.etapasConcluidas.includes(etapaId);
  return {
    ...playbooks,
    [playbookId]: {
      ...playbook,
      etapasConcluidas: concluida
        ? playbook.etapasConcluidas.filter((id) => id !== etapaId)
        : [...playbook.etapasConcluidas, etapaId],
    },
  };
}

export function calcularProgressoPlaybookSintetico(playbook: PlaybookComercialSintetico) {
  return playbook.etapas.length > 0
    ? Math.round((playbook.etapasConcluidas.length / playbook.etapas.length) * 100)
    : 0;
}

export function calcularResumoPlaybooksComerciaisSinteticos({
  playbooks,
  decisoes,
  periodo,
  recomendacoes,
}: {
  playbooks: PlaybooksComerciaisSinteticos;
  decisoes: DecisoesComerciaisSinteticas;
  periodo: PeriodoRelatorioComercial;
  recomendacoes: RecomendacaoResponsavelSintetica[];
}) {
  const ativos = recomendacoes.flatMap((recomendacao) => {
    const chave = criarChaveDecisaoComercial(periodo, recomendacao.responsavel);
    return decisoes[chave]?.estado === "Aceita" && playbooks[chave] ? [playbooks[chave]] : [];
  });
  const totalEtapas = ativos.reduce((total, playbook) => total + playbook.etapas.length, 0);
  const etapasConcluidas = ativos.reduce(
    (total, playbook) => total + playbook.etapasConcluidas.length,
    0,
  );
  return {
    playbooksAtivos: ativos.length,
    totalEtapas,
    etapasConcluidas,
    progressoMedio: totalEtapas > 0 ? Math.round((etapasConcluidas / totalEtapas) * 100) : 0,
  };
}

export function registrarResultadoPlaybookComercialSintetico({
  resultados,
  playbook,
  recomendacao,
  faixa,
}: {
  resultados: ResultadosPlaybooksComerciaisSinteticos;
  playbook: PlaybookComercialSintetico;
  recomendacao: RecomendacaoResponsavelSintetica;
  faixa: FaixaResultadoPlaybookSintetico;
}): ResultadosPlaybooksComerciaisSinteticos {
  if (calcularProgressoPlaybookSintetico(playbook) !== 100) return resultados;
  const modelo = RESULTADO_PLAYBOOK_POR_RESPONSAVEL[playbook.responsavel][faixa];
  return {
    ...resultados,
    [playbook.id]: {
      playbookId: playbook.id,
      responsavel: playbook.responsavel,
      faixa,
      impactoEsperado: recomendacao.impactoEsperado,
      resultadoFicticio: modelo.resultadoFicticio,
      comparacaoExplicavel: modelo.comparacaoExplicavel,
      aprendizadoExplicavel: modelo.aprendizadoExplicavel,
      efetividade: modelo.efetividade,
      registradoEm: "Agora, nesta sessão",
    },
  };
}

export function removerResultadoPlaybookComercialSintetico(
  resultados: ResultadosPlaybooksComerciaisSinteticos,
  playbookId: string,
) {
  if (!resultados[playbookId]) return resultados;
  const atualizados = { ...resultados };
  delete atualizados[playbookId];
  return atualizados;
}

export function calcularResumoResultadosPlaybooksSinteticos({
  resultados,
  playbooks,
  decisoes,
  periodo,
  recomendacoes,
}: {
  resultados: ResultadosPlaybooksComerciaisSinteticos;
  playbooks: PlaybooksComerciaisSinteticos;
  decisoes: DecisoesComerciaisSinteticas;
  periodo: PeriodoRelatorioComercial;
  recomendacoes: RecomendacaoResponsavelSintetica[];
}) {
  const ativos = recomendacoes.flatMap((recomendacao) => {
    const chave = criarChaveDecisaoComercial(periodo, recomendacao.responsavel);
    return decisoes[chave]?.estado === "Aceita" && playbooks[chave] ? [playbooks[chave]] : [];
  });
  const concluidos = ativos.filter(
    (playbook) => calcularProgressoPlaybookSintetico(playbook) === 100,
  );
  const registrados = concluidos.flatMap((playbook) =>
    resultados[playbook.id] ? [resultados[playbook.id]] : [],
  );
  return {
    playbooksConcluidos: concluidos.length,
    resultadosRegistrados: registrados.length,
    efetividadeMedia:
      registrados.length > 0
        ? Math.round(
            registrados.reduce((total, resultado) => total + resultado.efetividade, 0) /
              registrados.length,
          )
        : 0,
  };
}

export function calcularComparativoPlaybooksSinteticos({
  resultados,
  periodo,
  recomendacoes,
}: {
  resultados: ResultadosPlaybooksComerciaisSinteticos;
  periodo: PeriodoRelatorioComercial;
  recomendacoes: RecomendacaoResponsavelSintetica[];
}): ComparacaoPlaybookSintetico[] {
  return recomendacoes
    .flatMap((recomendacao) => {
      const resultado = resultados[criarChaveDecisaoComercial(periodo, recomendacao.responsavel)];
      if (!resultado) return [];
      const pratica = PRATICA_MELHORIA_POR_RESPONSAVEL[resultado.responsavel];
      const orientacao = ORIENTACAO_MELHORIA_POR_FAIXA[resultado.faixa];
      return [
        {
          posicao: 0,
          responsavel: resultado.responsavel,
          faixa: resultado.faixa,
          efetividade: resultado.efetividade,
          praticaEficaz: pratica.pratica,
          justificativaPratica: pratica.justificativa,
          recomendacaoMelhoria: `${orientacao} ${pratica.proximoTeste}`,
          justificativaMelhoria: `${resultado.comparacaoExplicavel} Por isso, o próximo ciclo deve preservar o que funcionou e testar uma única melhoria por vez.`,
          aprendizadoBase: resultado.aprendizadoExplicavel,
          origemPlaybookId: resultado.playbookId,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.efetividade - a.efetividade || a.responsavel.localeCompare(b.responsavel, "pt-BR"),
    )
    .map((comparacao, indice) => ({ ...comparacao, posicao: indice + 1 }));
}

export function reaplicarAprendizadoEmNovoPlaybookSintetico({
  playbooks,
  comparacao,
}: {
  playbooks: PlaybooksMelhoriaContinuaSinteticos;
  comparacao: ComparacaoPlaybookSintetico;
}): PlaybooksMelhoriaContinuaSinteticos {
  const id = `melhoria:${comparacao.origemPlaybookId}`;
  if (playbooks[id]) return playbooks;
  const modelo = PRATICA_MELHORIA_POR_RESPONSAVEL[comparacao.responsavel];
  return {
    ...playbooks,
    [id]: {
      id,
      origemPlaybookId: comparacao.origemPlaybookId,
      responsavel: comparacao.responsavel,
      titulo: `Novo ciclo: ${modelo.pratica}`,
      praticaBase: modelo.pratica,
      aprendizadoBase: comparacao.aprendizadoBase,
      objetivoMelhoria: comparacao.recomendacaoMelhoria,
      justificativa: comparacao.justificativaMelhoria,
      prazoFicticio: "Próximos 3 dias úteis (fictício)",
      etapas: [
        `Preparar um novo conjunto sintético para testar ${modelo.pratica.toLocaleLowerCase("pt-BR")}.`,
        `Aplicar a prática com a melhoria proposta: ${modelo.proximoTeste}`,
        "Comparar o novo resultado fictício com o ciclo anterior e registrar o aprendizado.",
      ],
      criadoEm: "Agora, nesta sessão",
    },
  };
}

export function removerPlaybookMelhoriaContinuaPorOrigem(
  playbooks: PlaybooksMelhoriaContinuaSinteticos,
  origemPlaybookId: string,
) {
  const id = `melhoria:${origemPlaybookId}`;
  if (!playbooks[id]) return playbooks;
  const atualizados = { ...playbooks };
  delete atualizados[id];
  return atualizados;
}

export function criarExperimentoComparativoPlaybookSintetico({
  experimentos,
  playbook,
}: {
  experimentos: ExperimentosPlaybooksSinteticos;
  playbook: PlaybookMelhoriaContinuaSintetico;
}): ExperimentosPlaybooksSinteticos {
  const id = `experimento:${playbook.id}`;
  if (experimentos[id]) return experimentos;
  return {
    ...experimentos,
    [id]: {
      id,
      playbookMelhoriaId: playbook.id,
      origemPlaybookId: playbook.origemPlaybookId,
      responsavel: playbook.responsavel,
      titulo: `Teste entre versões do playbook de ${playbook.responsavel}`,
      hipotese: `Se a melhoria proposta for aplicada, a Versão B deve superar a Versão A em pelo menos 8 p.p. de efetividade.`,
      criterioSucesso:
        "Uma versão é considerada bem-sucedida ao alcançar 80% de efetividade no conjunto sintético.",
      valorCriterio: 80,
      versoes: [
        {
          id: "versao-a",
          rotulo: "Versão A — prática atual",
          titulo: playbook.praticaBase,
          descricao: "Repete a prática eficaz sem incorporar o refinamento do novo ciclo.",
        },
        {
          id: "versao-b",
          rotulo: "Versão B — prática aprimorada",
          titulo: playbook.titulo,
          descricao: playbook.objetivoMelhoria,
        },
      ],
      criadoEm: "Agora, nesta sessão",
    },
  };
}

export function registrarResultadoVersaoExperimentoSintetico({
  experimentos,
  experimentoId,
  versaoId,
  faixa,
}: {
  experimentos: ExperimentosPlaybooksSinteticos;
  experimentoId: string;
  versaoId: VersaoExperimentoPlaybookSintetico["id"];
  faixa: FaixaResultadoExperimentoSintetico;
}): ExperimentosPlaybooksSinteticos {
  const experimento = experimentos[experimentoId];
  const versao = experimento?.versoes.find((item) => item.id === versaoId);
  if (!experimento || !versao) return experimentos;
  const efetividade = RESULTADO_EXPERIMENTO_POR_VERSAO[versaoId][faixa];
  const diferencaCriterio = efetividade - experimento.valorCriterio;
  const recomendacao: RecomendacaoVersaoExperimentoSintetico =
    faixa === "Acima do critério"
      ? "Manter"
      : faixa === "Próximo do critério"
        ? "Ajustar"
        : "Encerrar";
  const justificativaPorRecomendacao: Record<RecomendacaoVersaoExperimentoSintetico, string> = {
    Manter: `A versão superou o critério em ${diferencaCriterio} p.p. e pode seguir como referência para o próximo teste fictício.`,
    Ajustar: `A versão ficou a ${Math.abs(diferencaCriterio)} p.p. do critério; um refinamento pequeno deve ser testado antes de nova comparação.`,
    Encerrar: `A versão ficou ${Math.abs(diferencaCriterio)} p.p. abaixo do critério e não justifica ampliar este caminho na simulação.`,
  };
  const experimentoRevalidado: ExperimentoPlaybookSintetico = {
    ...experimento,
    versoes: experimento.versoes.map((item) =>
      item.id === versaoId
        ? {
            ...item,
            resultado: {
              faixa,
              efetividade,
              atingiuCriterio: efetividade >= experimento.valorCriterio,
              resultadoFicticio: `${efetividade}% de efetividade em 20 oportunidades exclusivamente sintéticas.`,
              leituraExplicavel:
                diferencaCriterio >= 0
                  ? `O resultado ficou ${diferencaCriterio} p.p. acima do critério de ${experimento.valorCriterio}%.`
                  : `O resultado ficou ${Math.abs(diferencaCriterio)} p.p. abaixo do critério de ${experimento.valorCriterio}%.`,
              recomendacao,
              justificativaRecomendacao: justificativaPorRecomendacao[recomendacao],
              registradoEm: "Agora, nesta sessão",
            },
          }
        : item,
    ),
  };
  delete experimentoRevalidado.decisaoOwner;
  return {
    ...experimentos,
    [experimentoId]: experimentoRevalidado,
  };
}

export function calcularResumoExperimentosPlaybooksSinteticos(
  experimentos: ExperimentosPlaybooksSinteticos,
) {
  const lista = Object.values(experimentos);
  const versoesAvaliadas = lista.reduce(
    (total, experimento) =>
      total + experimento.versoes.filter((versao) => Boolean(versao.resultado)).length,
    0,
  );
  return {
    experimentosAtivos: lista.length,
    versoesAvaliadas,
    comparacoesConcluidas: lista.filter((experimento) =>
      experimento.versoes.every((versao) => Boolean(versao.resultado)),
    ).length,
  };
}

export function calcularPortfolioExperimentosSinteticos(
  experimentos: ExperimentosPlaybooksSinteticos,
): ItemPortfolioExperimentoSintetico[] {
  return Object.values(experimentos)
    .map((experimento) => {
      const [versaoA, versaoB] = experimento.versoes;
      const resultadosRegistrados = experimento.versoes.filter((versao) => versao.resultado).length;
      const comparacaoConcluida = resultadosRegistrados === experimento.versoes.length;
      const diferencaVersaoB = comparacaoConcluida
        ? versaoB.resultado!.efetividade - versaoA.resultado!.efetividade
        : null;
      const pontuacaoConfianca =
        resultadosRegistrados === 2 ? 90 : resultadosRegistrados === 1 ? 55 : 20;
      const confianca: NivelConfiancaPortfolioSintetica =
        pontuacaoConfianca >= 80 ? "Alta" : pontuacaoConfianca >= 50 ? "Média" : "Baixa";
      const pontuacaoImpacto =
        diferencaVersaoB === null
          ? 20
          : diferencaVersaoB >= 8
            ? 95
            : diferencaVersaoB > 0
              ? 65
              : 30;
      const impacto: NivelPortfolioSintetico =
        pontuacaoImpacto >= 80 ? "Alto" : pontuacaoImpacto >= 50 ? "Médio" : "Baixo";
      const pontuacaoPrioridade = Math.round(pontuacaoImpacto * 0.6 + pontuacaoConfianca * 0.4);
      const prioridade: NivelPortfolioSintetico =
        pontuacaoPrioridade >= 80 ? "Alto" : pontuacaoPrioridade >= 50 ? "Médio" : "Baixo";
      const podeEscalar =
        comparacaoConcluida &&
        versaoB.resultado!.efetividade >= experimento.valorCriterio &&
        diferencaVersaoB! >= 8;
      const deveArquivar =
        comparacaoConcluida &&
        versaoB.resultado!.efetividade < experimento.valorCriterio &&
        diferencaVersaoB! <= 0;
      const recomendacaoAtual: DecisaoOwnerPortfolioSintetica = podeEscalar
        ? "Escalar"
        : deveArquivar
          ? "Arquivar"
          : "Repetir";
      const justificativaRecomendacao = !comparacaoConcluida
        ? `Ainda faltam ${2 - resultadosRegistrados} resultados fictícios para concluir a comparação com confiança.`
        : podeEscalar
          ? `A Versão B atingiu ${versaoB.resultado!.efetividade}% e superou a Versão A em ${diferencaVersaoB} p.p.; os dois critérios de escala foram atendidos.`
          : deveArquivar
            ? `A Versão B atingiu ${versaoB.resultado!.efetividade}% e ficou ${Math.abs(diferencaVersaoB!)} p.p. atrás da Versão A; o teste não sustenta continuidade.`
            : `A Versão B atingiu ${versaoB.resultado!.efetividade}% e variou ${diferencaVersaoB! >= 0 ? "+" : ""}${diferencaVersaoB} p.p.; repita antes de ampliar porque nem todos os critérios de escala foram atendidos.`;
      const impactoEsperado =
        diferencaVersaoB === null
          ? "Impacto ainda não mensurável até concluir as duas versões."
          : diferencaVersaoB > 0
            ? `Potencial fictício de elevar a efetividade em ${diferencaVersaoB} p.p. sobre a prática atual.`
            : `Sem ganho demonstrado: a Versão B ficou ${Math.abs(diferencaVersaoB)} p.p. atrás da prática atual.`;
      return {
        experimentoId: experimento.id,
        responsavel: experimento.responsavel,
        titulo: experimento.titulo,
        comparacaoConcluida,
        diferencaVersaoB,
        impacto,
        pontuacaoImpacto,
        impactoEsperado,
        confianca,
        pontuacaoConfianca,
        prioridade,
        pontuacaoPrioridade,
        recomendacaoAtual,
        justificativaRecomendacao,
        decisaoOwner: experimento.decisaoOwner,
      };
    })
    .sort(
      (a, b) =>
        b.pontuacaoPrioridade - a.pontuacaoPrioridade ||
        a.responsavel.localeCompare(b.responsavel, "pt-BR"),
    );
}

export function calcularResumoPortfolioExperimentosSinteticos(
  experimentos: ExperimentosPlaybooksSinteticos,
) {
  const portfolio = calcularPortfolioExperimentosSinteticos(experimentos);
  return {
    experimentosNoPortfolio: portfolio.length,
    prioridadesAltas: portfolio.filter((item) => item.prioridade === "Alto").length,
    prontosParaEscalar: portfolio.filter((item) => item.recomendacaoAtual === "Escalar").length,
    decisoesDoOwner: portfolio.filter((item) => Boolean(item.decisaoOwner)).length,
  };
}

export function registrarDecisaoOwnerPortfolioSintetica({
  experimentos,
  experimentoId,
  decisao,
}: {
  experimentos: ExperimentosPlaybooksSinteticos;
  experimentoId: string;
  decisao: DecisaoOwnerPortfolioSintetica;
}): ExperimentosPlaybooksSinteticos {
  const experimento = experimentos[experimentoId];
  if (!experimento || !experimento.versoes.every((versao) => Boolean(versao.resultado))) {
    return experimentos;
  }
  return {
    ...experimentos,
    [experimentoId]: {
      ...experimento,
      decisaoOwner: { decisao, registradoEm: "Agora, nesta sessão" },
    },
  };
}

export function sincronizarRolloutComDecisaoOwnerSintetica({
  rollouts,
  experimento,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  experimento: ExperimentoPlaybookSintetico;
}): RolloutsExperimentosSinteticos {
  const id = `rollout:${experimento.id}`;
  const itemPortfolio = calcularPortfolioExperimentosSinteticos({
    [experimento.id]: experimento,
  })[0];
  const aprovadoParaRollout =
    itemPortfolio?.comparacaoConcluida &&
    itemPortfolio.recomendacaoAtual === "Escalar" &&
    experimento.decisaoOwner?.decisao === "Escalar";

  if (!aprovadoParaRollout) {
    if (!rollouts[id]) return rollouts;
    const atualizados = { ...rollouts };
    delete atualizados[id];
    return atualizados;
  }
  if (rollouts[id]) return rollouts;

  return {
    ...rollouts,
    [id]: {
      id,
      experimentoId: experimento.id,
      responsavel: experimento.responsavel,
      titulo: `Expansão governada do playbook de ${experimento.responsavel}`,
      estado: "Não iniciado",
      etapas: [
        {
          id: "piloto-interno",
          titulo: "Piloto interno",
          publicoFicticio: "Equipe sintética reduzida",
          percentualPublico: 10,
          criterioAvanco:
            "Concluir 20 oportunidades fictícias com efetividade mínima de 80% e sem violar limites.",
          concluida: false,
        },
        {
          id: "expansao-controlada",
          titulo: "Expansão controlada",
          publicoFicticio: "Carteira sintética segmentada",
          percentualPublico: 40,
          criterioAvanco:
            "Manter ganho mínimo de 8 p.p. sobre a versão anterior em dois ciclos fictícios.",
          concluida: false,
        },
        {
          id: "cobertura-ampliada",
          titulo: "Cobertura ampliada",
          publicoFicticio: "Público fictício completo",
          percentualPublico: 100,
          criterioAvanco:
            "Confirmar estabilidade dos indicadores sintéticos e revisão final do owner.",
          concluida: false,
        },
      ],
      limitesSeguranca: [
        "Máximo de 20 oportunidades exclusivamente sintéticas por ciclo de avaliação.",
        "Nenhum contato, campanha, integração, cobrança ou dado real pode ser acionado.",
        "A mudança de etapa exige confirmação humana e evidência fictícia dentro do critério.",
      ],
      criteriosPausa: [
        "Pausar se a efetividade simulada cair abaixo de 80%.",
        "Pausar diante de divergência entre os indicadores fictícios e o histórico do teste.",
      ],
      criteriosReversao: [
        "Reverter se a versão aprovada perder 8 p.p. ou mais contra a prática de referência.",
        "Reverter imediatamente se qualquer limite de segurança for violado na simulação.",
      ],
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function registrarResultadoEtapaRolloutSintetico({
  rollouts,
  rolloutId,
  etapaId,
  faixa,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  etapaId: EtapaRolloutExperimentoSintetico["id"];
  faixa: FaixaResultadoEtapaRolloutSintetico;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const etapa = rollout?.etapas.find((item) => item.id === etapaId);
  if (!rollout || !etapa?.concluida) return rollouts;
  const resultadoPorFaixa: Record<
    FaixaResultadoEtapaRolloutSintetico,
    Omit<ResultadoEtapaRolloutSintetico, "faixa" | "registradoEm">
  > = {
    "Dentro do limite": {
      efetividade: 86,
      desvioDoLimite: 6,
      alertasSeguranca: 0,
      leituraExplicavel:
        "Efetividade fictícia 6 p.p. acima do limite de 80%, sem alertas simulados.",
    },
    Atenção: {
      efetividade: 76,
      desvioDoLimite: -4,
      alertasSeguranca: 1,
      leituraExplicavel:
        "Efetividade fictícia 4 p.p. abaixo do limite de 80%, com um alerta preventivo simulado.",
    },
    "Limite violado": {
      efetividade: 68,
      desvioDoLimite: -12,
      alertasSeguranca: 2,
      leituraExplicavel:
        "Efetividade fictícia 12 p.p. abaixo do limite de 80%, com dois alertas de segurança simulados.",
    },
  };
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      etapas: rollout.etapas.map((item) =>
        item.id === etapaId
          ? {
              ...item,
              resultado: {
                faixa,
                ...resultadoPorFaixa[faixa],
                registradoEm: "Agora, nesta sessão",
              },
            }
          : item,
      ),
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function calcularMonitoramentoResultadosRolloutSintetico(
  rollout: RolloutExperimentoSintetico,
) {
  const resultados = rollout.etapas.flatMap((etapa) =>
    etapa.resultado ? [{ etapa, resultado: etapa.resultado }] : [],
  );
  const violacoes = resultados.filter(
    ({ resultado }) => resultado.faixa === "Limite violado",
  ).length;
  const atencoes = resultados.filter(({ resultado }) => resultado.faixa === "Atenção").length;
  const alertasSeguranca = resultados.reduce(
    (total, { resultado }) => total + resultado.alertasSeguranca,
    0,
  );
  const efetividadeMedia =
    resultados.length > 0
      ? Math.round(
          resultados.reduce((total, { resultado }) => total + resultado.efetividade, 0) /
            resultados.length,
        )
      : null;
  const recomendacao: RecomendacaoMonitoramentoRolloutSintetico =
    violacoes > 0 || rollout.estado === "Revertido"
      ? "Reverter"
      : atencoes > 0 || rollout.estado === "Pausado"
        ? "Pausar"
        : "Continuar";
  const explicacaoRecomendacao =
    recomendacao === "Reverter"
      ? `${violacoes} violação(ões) fictícia(s) ou reversão registrada exigem retorno ao ponto seguro.`
      : recomendacao === "Pausar"
        ? `${atencoes} resultado(s) em atenção pedem revisão humana antes de nova expansão.`
        : resultados.length === 0
          ? "Ainda não há resultado de etapa; prossiga somente após registrar evidência fictícia."
          : "Os resultados fictícios permanecem dentro dos limites e sustentam continuidade controlada.";
  const dentroDoLimite = resultados.length - atencoes - violacoes;
  const aprendizadoConsolidado =
    resultados.length === 0
      ? "Aguardando resultados fictícios para consolidar aprendizado."
      : `${dentroDoLimite} etapa(s) dentro do limite, ${atencoes} em atenção e ${violacoes} com violação. ${alertasSeguranca} alerta(s) simulado(s) no total.`;
  return {
    resultadosRegistrados: resultados.length,
    efetividadeMedia,
    alertasSeguranca,
    violacoes,
    recomendacao,
    explicacaoRecomendacao,
    aprendizadoConsolidado,
  };
}

export function calcularResumoMonitoramentoRolloutsSinteticos(
  rollouts: RolloutsExperimentosSinteticos,
) {
  const resultados = Object.values(rollouts).flatMap((rollout) =>
    rollout.etapas.flatMap((etapa) => (etapa.resultado ? [etapa.resultado] : [])),
  );
  return {
    resultadosMonitorados: resultados.length,
    dentroDoLimite: resultados.filter((resultado) => resultado.faixa === "Dentro do limite").length,
    emAtencao: resultados.filter((resultado) => resultado.faixa === "Atenção").length,
    limitesViolados: resultados.filter((resultado) => resultado.faixa === "Limite violado").length,
  };
}


export function calcularHistoricoDecisoesRolloutsSinteticos(
  rollouts: RolloutsExperimentosSinteticos,
) {
  const recomendacaoPorFaixa: Record<
    FaixaResultadoEtapaRolloutSintetico,
    RecomendacaoMonitoramentoRolloutSintetico
  > = {
    "Dentro do limite": "Continuar",
    Atenção: "Pausar",
    "Limite violado": "Reverter",
  };
  return Object.values(rollouts).flatMap((rollout) =>
    rollout.etapas.flatMap((etapa) =>
      etapa.resultado
        ? [{
            id: `${rollout.id}:${etapa.id}`,
            rolloutId: rollout.id,
            experimentoId: rollout.experimentoId,
            responsavel: rollout.responsavel,
            titulo: rollout.titulo,
            etapa: etapa.titulo,
            faixa: etapa.resultado.faixa,
            efetividade: etapa.resultado.efetividade,
            recomendacao: recomendacaoPorFaixa[etapa.resultado.faixa],
            explicacao: etapa.resultado.leituraExplicavel,
            registradoEm: etapa.resultado.registradoEm,
          }]
        : [],
    ),
  );
}

export function calcularAprendizadoCruzadoRolloutsSinteticos(
  rollouts: RolloutsExperimentosSinteticos,
) {
  const comparacoes = Object.values(rollouts)
    .map((rollout) => {
      const monitoramento = calcularMonitoramentoResultadosRolloutSintetico(rollout);
      return {
        rolloutId: rollout.id,
        experimentoId: rollout.experimentoId,
        responsavel: rollout.responsavel,
        titulo: rollout.titulo,
        resultados: monitoramento.resultadosRegistrados,
        efetividadeMedia: monitoramento.efetividadeMedia,
        alertas: monitoramento.alertasSeguranca,
        violacoes: monitoramento.violacoes,
        recomendacao: monitoramento.recomendacao,
        explicacao: monitoramento.explicacaoRecomendacao,
      };
    })
    .filter((item) => item.resultados > 0);
  const historico = calcularHistoricoDecisoesRolloutsSinteticos(rollouts);
  const sucesso = historico.filter((item) => item.faixa === "Dentro do limite").length;
  const atencao = historico.filter((item) => item.faixa === "Atenção").length;
  const risco = historico.filter((item) => item.faixa === "Limite violado").length;
  const fonteRecomendada =
    [...comparacoes]
      .filter((item) => item.recomendacao === "Continuar" && item.efetividadeMedia !== null)
      .sort(
        (a, b) =>
          (b.efetividadeMedia ?? 0) - (a.efetividadeMedia ?? 0) ||
          a.titulo.localeCompare(b.titulo, "pt-BR"),
      )[0] ?? null;
  return {
    comparacoes,
    padroes: {
      sucesso,
      atencao,
      risco,
      explicacao:
        historico.length === 0
          ? "Aguardando resultados fictícios para identificar padrões entre experimentos."
          : `${sucesso} sinal(is) de sucesso, ${atencao} ponto(s) de atenção e ${risco} risco(s) explicável(is) no histórico.`,
    },
    fonteRecomendada,
  };
}

export function simularReaplicacaoAprendizadoEntreRolloutsSinteticos({
  rollouts,
  origemRolloutId,
  destinoRolloutId,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  origemRolloutId: string;
  destinoRolloutId: string;
}): RolloutsExperimentosSinteticos {
  const origem = rollouts[origemRolloutId];
  const destino = rollouts[destinoRolloutId];
  if (!origem || !destino || origemRolloutId === destinoRolloutId) return rollouts;
  const monitoramento = calcularMonitoramentoResultadosRolloutSintetico(origem);
  if (monitoramento.resultadosRegistrados === 0 || monitoramento.recomendacao !== "Continuar") {
    return rollouts;
  }
  return {
    ...rollouts,
    [destinoRolloutId]: {
      ...destino,
      aprendizadoReaplicado: {
        origemRolloutId,
        origemTitulo: origem.titulo,
        recomendacaoRastreada: monitoramento.recomendacao,
        criterioPreservado:
          "Preservar limite fictício de 80%, exposição gradual e confirmação humana antes de cada etapa.",
        simuladoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}


export function calcularCatalogoAprendizadosSinteticos(
  rollouts: RolloutsExperimentosSinteticos,
) {
  return Object.values(rollouts).flatMap((rollout) => {
    const monitoramento = calcularMonitoramentoResultadosRolloutSintetico(rollout);
    if (monitoramento.resultadosRegistrados === 0) return [];
    const criterios = [
      {
        rotulo: "Existe evidência fictícia registrada",
        atendido: monitoramento.resultadosRegistrados > 0,
      },
      {
        rotulo: "Efetividade média igual ou superior a 80%",
        atendido:
          monitoramento.efetividadeMedia !== null && monitoramento.efetividadeMedia >= 80,
      },
      {
        rotulo: "Nenhum limite de segurança violado",
        atendido: monitoramento.violacoes === 0,
      },
      {
        rotulo: "Recomendação consolidada é continuar",
        atendido: monitoramento.recomendacao === "Continuar",
      },
    ];
    const elegivel = criterios.every((criterio) => criterio.atendido);
    const pontuacaoImpacto = Math.max(
      0,
      Math.min(
        100,
        50 +
          ((monitoramento.efetividadeMedia ?? 0) - 80) * 4 +
          monitoramento.resultadosRegistrados * 5 -
          monitoramento.alertasSeguranca * 10,
      ),
    );
    const nivelImpacto =
      pontuacaoImpacto >= 70 ? "Alto" : pontuacaoImpacto >= 45 ? "Médio" : "Baixo";
    const versao = `v1.${monitoramento.resultadosRegistrados}`;
    const historico = rollout.historicoPoliticaAprendizado ?? [];
    const ultimaDecisao = historico[historico.length - 1];
    const estadoPolitica =
      ultimaDecisao?.decisao === "Promover"
        ? "Promovido"
        : ultimaDecisao?.decisao === "Rejeitar"
          ? "Rejeitado"
          : ultimaDecisao?.decisao === "Retirar"
            ? "Retirado"
            : "Em avaliação";
    return [{
      rolloutId: rollout.id,
      experimentoId: rollout.experimentoId,
      responsavel: rollout.responsavel,
      titulo: rollout.titulo,
      versao,
      elegivel,
      criterios,
      recomendacao: monitoramento.recomendacao,
      efetividadeMedia: monitoramento.efetividadeMedia,
      pontuacaoImpacto,
      nivelImpacto,
      impactoProjetado:
        `${nivelImpacto}: índice fictício ${pontuacaoImpacto}/100, calculado por efetividade, volume de evidências e alertas.`,
      estadoPolitica,
      historico,
    }];
  });
}

export function registrarDecisaoPoliticaAprendizadoSintetica({
  rollouts,
  rolloutId,
  decisao,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  decisao: DecisaoOwnerPoliticaAprendizadoSintetica;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const item = calcularCatalogoAprendizadosSinteticos(rollouts).find(
    (catalogado) => catalogado.rolloutId === rolloutId,
  );
  if (!rollout || !item) return rollouts;
  const podePromover = decisao === "Promover" && item.elegivel;
  const podeRejeitar = decisao === "Rejeitar";
  const podeRetirar =
    decisao === "Retirar" &&
    item.historico[item.historico.length - 1]?.decisao === "Promover";
  if (!podePromover && !podeRejeitar && !podeRetirar) return rollouts;
  const justificativaExplicavel =
    decisao === "Promover"
      ? "Todos os quatro critérios fictícios de elegibilidade foram atendidos."
      : decisao === "Rejeitar"
        ? "O owner simulou a rejeição após revisar evidências, critérios e impacto projetado."
        : "O owner simulou a retirada de uma política previamente promovida.";
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      historicoPoliticaAprendizado: [
        ...(rollout.historicoPoliticaAprendizado ?? []),
        {
          decisao,
          versao: item.versao,
          justificativaExplicavel,
          impactoProjetado: item.impactoProjetado,
          decididoEm: "Agora, nesta sessão",
        },
      ],
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function calcularTrilhaPoliticasAprendizadoSinteticas(
  rollouts: RolloutsExperimentosSinteticos,
) {
  return Object.values(rollouts).flatMap((rollout) =>
    (rollout.historicoPoliticaAprendizado ?? []).map((registro, indice) => ({
      id: `${rollout.id}:${indice}:${registro.decisao}`,
      rolloutId: rollout.id,
      responsavel: rollout.responsavel,
      titulo: rollout.titulo,
      ...registro,
    })),
  );
}


export function sincronizarAdocaoComPoliticaPromovidaSintetica(
  rollouts: RolloutsExperimentosSinteticos,
): RolloutsExperimentosSinteticos {
  return Object.fromEntries(
    Object.entries(rollouts).map(([rolloutId, rollout]) => {
      const historico = rollout.historicoPoliticaAprendizado ?? [];
      const ultimaDecisao = historico[historico.length - 1];
      if (ultimaDecisao?.decisao !== "Promover") {
        if (!rollout.adocaoPolitica) return [rolloutId, rollout];
        const { adocaoPolitica: _removida, ...semAdocao } = rollout;
        return [rolloutId, semAdocao];
      }
      if (rollout.adocaoPolitica?.politicaVersao === ultimaDecisao.versao) {
        return [rolloutId, rollout];
      }
      return [rolloutId, {
        ...rollout,
        adocaoPolitica: {
          politicaVersao: ultimaDecisao.versao,
          estado: "Não iniciada" as const,
          etapas: [
            { id: "orientacao-interna" as const, titulo: "Orientação interna", publicoInternoFicticio: "Equipe piloto fictícia", percentualPublico: 25, concluida: false },
            { id: "adocao-assistida" as const, titulo: "Adoção assistida", publicoInternoFicticio: "Núcleo comercial fictício", percentualPublico: 60, concluida: false },
            { id: "cobertura-simulada" as const, titulo: "Cobertura simulada", publicoInternoFicticio: "Equipe interna fictícia completa", percentualPublico: 100, concluida: false },
          ],
          criteriosConformidade: [
            "Índice fictício de aderência igual ou superior a 85%.",
            "Nenhum desvio crítico ou alerta de segurança não revisado.",
            "Confirmação humana antes de ampliar a adoção.",
          ],
          motivoEstado: "Política promovida e pronta para adoção simulada.",
          atualizadoEm: "Agora, nesta sessão",
        },
        atualizadoEm: "Agora, nesta sessão",
      }];
    }),
  ) as RolloutsExperimentosSinteticos;
}

export function avancarEtapaAdocaoPoliticaSintetica({
  rollouts,
  rolloutId,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  if (!rollout || !adocao || ["Pausada", "Revogada", "Concluída"].includes(adocao.estado)) return rollouts;
  const proxima = adocao.etapas.find((etapa) => !etapa.concluida);
  if (!proxima) return rollouts;
  const etapas = adocao.etapas.map((etapa) =>
    etapa.id === proxima.id ? { ...etapa, concluida: true } : etapa,
  );
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        etapas,
        estado: etapas.every((etapa) => etapa.concluida) ? "Concluída" : "Em andamento",
        motivoEstado: `Etapa ${proxima.titulo.toLocaleLowerCase("pt-BR")} concluída na simulação.`,
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function registrarAderenciaEtapaAdocaoPoliticaSintetica({
  rollouts,
  rolloutId,
  etapaId,
  faixa,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  etapaId: EtapaAdocaoPoliticaSintetica["id"];
  faixa: FaixaAderenciaPoliticaSintetica;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  const etapa = adocao?.etapas.find((item) => item.id === etapaId);
  if (!rollout || !adocao || !etapa?.concluida || adocao.estado === "Revogada") return rollouts;
  const resultado = {
    Conforme: { indice: 92, desvioDoLimite: 7, alertas: 0, explicacao: "Aderência fictícia 7 p.p. acima do limite de conformidade de 85%." },
    Atenção: { indice: 82, desvioDoLimite: -3, alertas: 1, explicacao: "Aderência fictícia 3 p.p. abaixo do limite, com um alerta preventivo." },
    "Desvio crítico": { indice: 68, desvioDoLimite: -17, alertas: 2, explicacao: "Aderência fictícia 17 p.p. abaixo do limite, com dois alertas críticos." },
  }[faixa];
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        etapas: adocao.etapas.map((item) =>
          item.id === etapaId
            ? { ...item, aderencia: { faixa, ...resultado, registradoEm: "Agora, nesta sessão" } }
            : item,
        ),
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}


export function calcularMonitoramentoConformidadePoliticaSintetica(
  rollout: RolloutExperimentoSintetico,
) {
  const resultados =
    rollout.adocaoPolitica?.etapas.flatMap((etapa) =>
      etapa.aderencia ? [etapa.aderencia] : [],
    ) ?? [];
  const atencoes = resultados.filter((resultado) => resultado.faixa === "Atenção").length;
  const desviosCriticos = resultados.filter(
    (resultado) => resultado.faixa === "Desvio crítico",
  ).length;
  const alertas = resultados.reduce((total, resultado) => total + resultado.alertas, 0);
  const aderenciaMedia =
    resultados.length > 0
      ? Math.round(
          resultados.reduce((total, resultado) => total + resultado.indice, 0) /
            resultados.length,
        )
      : null;
  const recomendacao: DecisaoOwnerAdocaoPoliticaSintetica =
    desviosCriticos > 0 ? "Revogar" : atencoes > 0 ? "Pausar" : "Continuar";
  return {
    resultadosRegistrados: resultados.length,
    aderenciaMedia,
    alertas,
    desviosIdentificados: atencoes + desviosCriticos,
    desviosCriticos,
    recomendacao,
    explicacao:
      recomendacao === "Revogar"
        ? `${desviosCriticos} desvio(s) crítico(s) exigem revogação simulada da política.`
        : recomendacao === "Pausar"
          ? `${atencoes} ponto(s) de atenção exigem revisão humana antes de continuar.`
          : resultados.length === 0
            ? "Aguardando evidência fictícia de aderência; nenhuma decisão é automática."
            : "A aderência fictícia permanece conforme e permite continuidade controlada.",
  };
}

export function decidirAdocaoPoliticaSintetica({
  rollouts,
  rolloutId,
  decisao,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  decisao: DecisaoOwnerAdocaoPoliticaSintetica;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  if (!rollout || !adocao || adocao.estado === "Revogada") return rollouts;
  const monitoramento = calcularMonitoramentoConformidadePoliticaSintetica(rollout);
  const permitido =
    (decisao === "Continuar" && monitoramento.recomendacao === "Continuar") ||
    (decisao === "Pausar" &&
      monitoramento.recomendacao === "Pausar" &&
      adocao.estado === "Em andamento") ||
    (decisao === "Revogar" && monitoramento.recomendacao === "Revogar");
  if (!permitido) return rollouts;
  const estado: EstadoAdocaoPoliticaSintetica =
    decisao === "Continuar" ? "Em andamento" : decisao === "Pausar" ? "Pausada" : "Revogada";
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        estado,
        motivoEstado: `${decisao} registrado pelo owner na simulação: ${monitoramento.explicacao}`,
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function calcularResumoAdocoesPoliticasSinteticas(
  rollouts: RolloutsExperimentosSinteticos,
) {
  const adocoes = Object.values(rollouts).flatMap((rollout) =>
    rollout.adocaoPolitica ? [{ rollout, adocao: rollout.adocaoPolitica }] : [],
  );
  return {
    politicasEmAdocao: adocoes.length,
    emAndamento: adocoes.filter(({ adocao }) => adocao.estado === "Em andamento").length,
    pausadas: adocoes.filter(({ adocao }) => adocao.estado === "Pausada").length,
    revogadas: adocoes.filter(({ adocao }) => adocao.estado === "Revogada").length,
    desvios: adocoes.reduce(
      (total, { rollout }) =>
        total + calcularMonitoramentoConformidadePoliticaSintetica(rollout).desviosIdentificados,
      0,
    ),
  };
}

export function registrarRevisaoEficaciaPoliticaSintetica({
  rollouts,
  rolloutId,
  faixa,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  faixa: FaixaEficaciaPoliticaSintetica;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  const politicaVigente =
    rollout?.historicoPoliticaAprendizado?.at(-1)?.decisao === "Promover";
  if (
    !rollout ||
    !adocao ||
    !politicaVigente ||
    adocao.estado === "Revogada" ||
    adocao.estadoCicloVida === "Aposentada"
  ) {
    return rollouts;
  }

  const perfis: Record<
    FaixaEficaciaPoliticaSintetica,
    { impactoObservado: number; explicacao: string }
  > = {
    "Eficácia sustentada": {
      impactoObservado: 92,
      explicacao:
        "O impacto fictício permaneceu acima da projeção e a política preservou sua eficácia no ciclo.",
    },
    "Atenção de eficácia": {
      impactoObservado: 79,
      explicacao:
        "O impacto fictício ficou abaixo da projeção e requer ajuste antes do próximo ciclo.",
    },
    "Deterioração crítica": {
      impactoObservado: 61,
      explicacao:
        "A eficácia fictícia deteriorou de forma crítica e exige avaliação de aposentadoria.",
    },
  };
  const revisoesAtuais = adocao.revisoesEficacia ?? [];
  const perfil = perfis[faixa];
  const impactoProjetado = 88;
  const anterior = revisoesAtuais.at(-1);
  const variacaoCicloAnterior = anterior
    ? perfil.impactoObservado - anterior.impactoObservado
    : null;
  const aderenciaObservada =
    calcularMonitoramentoConformidadePoliticaSintetica(rollout).aderenciaMedia;
  const deterioracaoDetectada =
    faixa === "Deterioração crítica" ||
    perfil.impactoObservado < 85 ||
    (variacaoCicloAnterior !== null && variacaoCicloAnterior <= -8) ||
    (aderenciaObservada !== null && aderenciaObservada < 85);
  const revisao: RegistroRevisaoEficaciaPoliticaSintetica = {
    ciclo: revisoesAtuais.length + 1,
    faixa,
    aderenciaObservada,
    impactoProjetado,
    impactoObservado: perfil.impactoObservado,
    diferencaImpacto: perfil.impactoObservado - impactoProjetado,
    variacaoCicloAnterior,
    deterioracaoDetectada,
    explicacao: perfil.explicacao,
    registradoEm: "Agora, nesta sessão",
  };

  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        estadoCicloVida: adocao.estadoCicloVida ?? "Ativa",
        revisoesEficacia: [...revisoesAtuais, revisao],
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function calcularRevisaoCicloVidaPoliticaSintetica(
  rollout: RolloutExperimentoSintetico,
) {
  const adocao = rollout.adocaoPolitica;
  const revisoes = adocao?.revisoesEficacia ?? [];
  const ultima = revisoes.at(-1);
  const deterioracoes = revisoes.filter((revisao) => revisao.deterioracaoDetectada).length;
  const impactoMedio =
    revisoes.length > 0
      ? Math.round(
          revisoes.reduce((total, revisao) => total + revisao.impactoObservado, 0) /
            revisoes.length,
        )
      : null;
  const aderenciaMedia =
    calcularMonitoramentoConformidadePoliticaSintetica(rollout).aderenciaMedia;
  const recomendacao: DecisaoOwnerCicloVidaPoliticaSintetica | null =
    !ultima
      ? null
      : ultima.impactoObservado <= 65 ||
          deterioracoes >= 2 ||
          adocao?.estado === "Revogada"
        ? "Aposentar"
        : ultima.deterioracaoDetectada ||
            ultima.impactoObservado < 85 ||
            (aderenciaMedia !== null && aderenciaMedia < 85)
          ? "Ajustar"
          : "Manter";
  const explicacao =
    recomendacao === null
      ? "Aguardando o primeiro ciclo fictício; nenhuma decisão pode ser tomada sem evidência."
      : recomendacao === "Aposentar"
        ? "Deterioração crítica ou recorrente atingiu o critério explicável de aposentadoria."
        : recomendacao === "Ajustar"
          ? "Aderência ou impacto ficaram abaixo dos limites e exigem ajuste simulado."
          : "Aderência e impacto preservam os limites e sustentam a manutenção simulada.";

  return {
    ciclosRevisados: revisoes.length,
    aderenciaMedia,
    impactoProjetado: ultima?.impactoProjetado ?? 88,
    impactoMedio,
    diferencaAtual: ultima?.diferencaImpacto ?? null,
    deterioracoes,
    recomendacao,
    explicacao,
  };
}

export function decidirCicloVidaPoliticaSintetica({
  rollouts,
  rolloutId,
  decisao,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  decisao: DecisaoOwnerCicloVidaPoliticaSintetica;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  if (!rollout || !adocao || adocao.estadoCicloVida === "Aposentada") return rollouts;
  const revisao = calcularRevisaoCicloVidaPoliticaSintetica(rollout);
  if (!revisao.recomendacao || revisao.recomendacao !== decisao) return rollouts;
  const estadoCicloVida: EstadoCicloVidaPoliticaSintetica =
    decisao === "Aposentar" ? "Aposentada" : decisao === "Ajustar" ? "Em ajuste" : "Ativa";
  const registro: RegistroDecisaoCicloVidaPoliticaSintetica = {
    ciclo: revisao.ciclosRevisados,
    decisao,
    justificativaExplicavel: revisao.explicacao,
    decididoEm: "Agora, nesta sessão",
  };
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        estadoCicloVida,
        historicoDecisoesCicloVida: [
          ...(adocao.historicoDecisoesCicloVida ?? []),
          registro,
        ],
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function calcularResumoRevisoesCicloVidaPoliticasSinteticas(
  rollouts: RolloutsExperimentosSinteticos,
) {
  const adocoes = Object.values(rollouts).flatMap((rollout) =>
    rollout.adocaoPolitica ? [rollout] : [],
  );
  return {
    politicasRevisadas: adocoes.filter(
      (rollout) => (rollout.adocaoPolitica?.revisoesEficacia?.length ?? 0) > 0,
    ).length,
    ciclosRegistrados: adocoes.reduce(
      (total, rollout) => total + (rollout.adocaoPolitica?.revisoesEficacia?.length ?? 0),
      0,
    ),
    deterioracoes: adocoes.reduce(
      (total, rollout) =>
        total + calcularRevisaoCicloVidaPoliticaSintetica(rollout).deterioracoes,
      0,
    ),
    emAjuste: adocoes.filter(
      (rollout) => rollout.adocaoPolitica?.estadoCicloVida === "Em ajuste",
    ).length,
    aposentadas: adocoes.filter(
      (rollout) => rollout.adocaoPolitica?.estadoCicloVida === "Aposentada",
    ).length,
  };
}

function calcularProximaVersaoPoliticaSintetica(versao: string) {
  const partes = /^v(\d+)\.(\d+)$/.exec(versao);
  if (!partes) return `${versao}-ajuste-1`;
  return `v${partes[1]}.${Number(partes[2]) + 1}`;
}

export function sincronizarPropostaAjustePoliticaSintetica(
  rollouts: RolloutsExperimentosSinteticos,
  rolloutId: string,
): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  if (!rollout || !adocao || adocao.propostaAjuste) return rollouts;
  const revisao = calcularRevisaoCicloVidaPoliticaSintetica(rollout);
  if (adocao.estadoCicloVida !== "Em ajuste" || revisao.recomendacao !== "Ajustar") {
    return rollouts;
  }
  const versaoProposta = calcularProximaVersaoPoliticaSintetica(adocao.politicaVersao);
  const impactoAtual = revisao.impactoMedio ?? 0;
  const impactoProjetado = Math.min(95, impactoAtual + 9);
  const riscosProjetados = [
    "A regra ajustada pode reduzir temporariamente a aderência fictícia durante a transição.",
    "O ganho projetado depende de validação em um novo ciclo exclusivamente simulado.",
  ];
  const criterios: CriterioPropostaAjustePoliticaSintetica[] = [
    {
      id: "ajuste-recomendado",
      descricao: "A revisão de eficácia recomenda ajuste, não aposentadoria.",
      atendido: revisao.recomendacao === "Ajustar",
    },
    {
      id: "versao-incremental",
      descricao: "A versão proposta sucede a vigente sem sobrescrevê-la.",
      atendido: versaoProposta !== adocao.politicaVersao,
    },
    {
      id: "impacto-explicado",
      descricao: "O impacto projetado possui comparação quantitativa com o ciclo atual.",
      atendido: impactoProjetado > impactoAtual,
    },
    {
      id: "riscos-mapeados",
      descricao: "Riscos e dependência de nova validação fictícia estão explicitados.",
      atendido: riscosProjetados.length >= 2,
    },
  ];
  const proposta: PropostaAjustePoliticaSintetica = {
    id: `proposta:${rolloutId}:${versaoProposta}`,
    versaoVigente: adocao.politicaVersao,
    versaoProposta,
    regraVigente: "Manter a política vigente sem alterar seus limites de eficácia.",
    regraProposta:
      "Recalibrar o critério de revisão e exigir novo ciclo fictício antes de confirmar eficácia.",
    impactoAtual,
    impactoProjetado,
    riscosProjetados,
    criterios,
    estado: "Em avaliação",
    historicoDecisoes: [],
    criadoEm: "Agora, nesta sessão",
    atualizadoEm: "Agora, nesta sessão",
  };
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        propostaAjuste: proposta,
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function calcularComparacaoPropostaAjustePoliticaSintetica(
  rollout: RolloutExperimentoSintetico,
) {
  const proposta = rollout.adocaoPolitica?.propostaAjuste;
  if (!proposta) return null;
  const criteriosAtendidos = proposta.criterios.filter((criterio) => criterio.atendido).length;
  return {
    versaoVigente: proposta.versaoVigente,
    versaoProposta: proposta.versaoProposta,
    ganhoProjetado: proposta.impactoProjetado - proposta.impactoAtual,
    criteriosAtendidos,
    totalCriterios: proposta.criterios.length,
    elegivel: criteriosAtendidos === proposta.criterios.length,
    leituraExplicavel:
      criteriosAtendidos === proposta.criterios.length
        ? "A proposta atende todos os critérios e pode receber decisão simulada do owner."
        : "A proposta falha fechada enquanto houver critério não atendido.",
  };
}

export function decidirPropostaAjustePoliticaSintetica({
  rollouts,
  rolloutId,
  decisao,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  decisao: DecisaoOwnerPropostaAjustePoliticaSintetica;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  const proposta = adocao?.propostaAjuste;
  if (!rollout || !adocao || !proposta) return rollouts;
  const comparacao = calcularComparacaoPropostaAjustePoliticaSintetica(rollout);
  const permitido =
    (decisao === "Aprovar" && proposta.estado === "Em avaliação" && comparacao?.elegivel) ||
    (decisao === "Rejeitar" && proposta.estado === "Em avaliação") ||
    (decisao === "Retirar" && proposta.estado === "Aprovada");
  if (!permitido) return rollouts;

  const estado: EstadoPropostaAjustePoliticaSintetica =
    decisao === "Aprovar" ? "Aprovada" : decisao === "Rejeitar" ? "Rejeitada" : "Retirada";
  const justificativaExplicavel =
    decisao === "Aprovar"
      ? `Sucessão ${proposta.versaoVigente} → ${proposta.versaoProposta} aprovada somente na simulação.`
      : decisao === "Rejeitar"
        ? "Proposta rejeitada pelo owner; a versão vigente permanece preservada."
        : "Proposta retirada antes de qualquer aplicação; a versão vigente permanece preservada.";
  const registro: RegistroDecisaoPropostaAjustePoliticaSintetica = {
    decisao,
    justificativaExplicavel,
    decididoEm: "Agora, nesta sessão",
  };
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        propostaAjuste: {
          ...proposta,
          estado,
          transicaoSimulada:
            decisao === "Aprovar"
              ? {
                  de: proposta.versaoVigente,
                  para: proposta.versaoProposta,
                  estado: "Aprovada para sucessão",
                }
              : decisao === "Retirar"
                ? {
                    de: proposta.versaoVigente,
                    para: proposta.versaoProposta,
                    estado: "Retirada antes de aplicação",
                  }
                : proposta.transicaoSimulada,
          historicoDecisoes: [...proposta.historicoDecisoes, registro],
          atualizadoEm: "Agora, nesta sessão",
        },
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function calcularResumoPropostasAjustePoliticasSinteticas(
  rollouts: RolloutsExperimentosSinteticos,
) {
  const propostas = Object.values(rollouts).flatMap((rollout) =>
    rollout.adocaoPolitica?.propostaAjuste
      ? [rollout.adocaoPolitica.propostaAjuste]
      : [],
  );
  return {
    propostas: propostas.length,
    emAvaliacao: propostas.filter((proposta) => proposta.estado === "Em avaliação").length,
    aprovadas: propostas.filter((proposta) => proposta.estado === "Aprovada").length,
    rejeitadas: propostas.filter((proposta) => proposta.estado === "Rejeitada").length,
    retiradas: propostas.filter((proposta) => proposta.estado === "Retirada").length,
    transicoesSimuladas: propostas.filter((proposta) => proposta.transicaoSimulada).length,
  };
}

export function sincronizarValidacaoSucessoraPoliticaSintetica(
  rollouts: RolloutsExperimentosSinteticos,
  rolloutId: string,
): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  const proposta = adocao?.propostaAjuste;
  if (!rollout || !adocao || !proposta || proposta.validacaoSucessora) return rollouts;
  if (proposta.estado !== "Aprovada" || proposta.transicaoSimulada?.estado !== "Aprovada para sucessão") {
    return rollouts;
  }
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        propostaAjuste: {
          ...proposta,
          validacaoSucessora: {
            estado: "Em validação",
            ciclos: [],
            limitesRisco: [
              "Concluir três ciclos fictícios antes de considerar ativação.",
              "Manter eficácia sucessora igual ou superior à política vigente em todos os ciclos.",
              "Bloquear ativação diante de qualquer risco crítico ou mais de um ciclo em atenção.",
            ],
            historicoDecisoes: [],
            atualizadoEm: "Agora, nesta sessão",
          },
          atualizadoEm: "Agora, nesta sessão",
        },
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function registrarCicloValidacaoSucessoraPoliticaSintetica({
  rollouts,
  rolloutId,
  faixa,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  faixa: FaixaCicloValidacaoSucessoraSintetica;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  const proposta = adocao?.propostaAjuste;
  const validacao = proposta?.validacaoSucessora;
  if (!rollout || !adocao || !proposta || !validacao || validacao.estado !== "Em validação") {
    return rollouts;
  }
  if (validacao.ciclos.length >= 3) return rollouts;
  const ciclo = validacao.ciclos.length + 1;
  const eficaciaVigente = Math.max(60, proposta.impactoAtual - 2 + ciclo);
  const resultado = {
    "Dentro dos limites": { delta: 9, alertas: 0 },
    Atenção: { delta: 2, alertas: 1 },
    "Risco crítico": { delta: -8, alertas: 3 },
  }[faixa];
  const eficaciaSucessora = Math.min(100, eficaciaVigente + resultado.delta);
  const novoCiclo: CicloValidacaoSucessoraSintetica = {
    ciclo,
    faixa,
    eficaciaVigente,
    eficaciaSucessora,
    ganhoSucessora: eficaciaSucessora - eficaciaVigente,
    alertasRisco: resultado.alertas,
    dentroDosLimites: faixa === "Dentro dos limites",
    explicacao:
      faixa === "Dentro dos limites"
        ? "A sucessora superou a vigente sem alertas no ciclo fictício."
        : faixa === "Atenção"
          ? "A sucessora manteve ganho reduzido e exige evidência adicional antes de ativar."
          : "A sucessora ficou abaixo da vigente e excedeu o limite de risco simulado.",
    registradoEm: "Agora, nesta sessão",
  };
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        propostaAjuste: {
          ...proposta,
          validacaoSucessora: {
            ...validacao,
            ciclos: [...validacao.ciclos, novoCiclo],
            atualizadoEm: "Agora, nesta sessão",
          },
          atualizadoEm: "Agora, nesta sessão",
        },
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function calcularProntidaoAtivacaoSucessoraPoliticaSintetica(
  rollout: RolloutExperimentoSintetico,
) {
  const proposta = rollout.adocaoPolitica?.propostaAjuste;
  const validacao = proposta?.validacaoSucessora;
  if (!proposta || !validacao) return null;
  const ciclosConcluidos = validacao.ciclos.length;
  const riscosCriticos = validacao.ciclos.filter((ciclo) => ciclo.faixa === "Risco crítico").length;
  const ciclosAtencao = validacao.ciclos.filter((ciclo) => ciclo.faixa === "Atenção").length;
  const ganhos = validacao.ciclos.map((ciclo) => ciclo.ganhoSucessora);
  const ganhoMedio = ganhos.length
    ? Math.round(ganhos.reduce((total, ganho) => total + ganho, 0) / ganhos.length)
    : 0;
  const criterios = [
    { descricao: "A proposta sucessora permanece aprovada.", atendido: proposta.estado === "Aprovada" },
    { descricao: "Os três ciclos fictícios foram concluídos.", atendido: ciclosConcluidos === 3 },
    { descricao: "Nenhum ciclo registrou risco crítico.", atendido: riscosCriticos === 0 },
    { descricao: "No máximo um ciclo ficou em atenção.", atendido: ciclosAtencao <= 1 },
    { descricao: "A sucessora manteve ganho médio positivo sobre a vigente.", atendido: ganhoMedio > 0 },
  ];
  const criteriosAtendidos = criterios.filter((criterio) => criterio.atendido).length;
  const recomendacao: DecisaoOwnerValidacaoSucessoraSintetica =
    riscosCriticos > 0 ? "Reverter" : criteriosAtendidos === criterios.length ? "Ativar" : "Adiar";
  return {
    ciclosConcluidos,
    riscosCriticos,
    ciclosAtencao,
    ganhoMedio,
    criterios,
    criteriosAtendidos,
    totalCriterios: criterios.length,
    recomendacao,
    explicacao:
      recomendacao === "Ativar"
        ? "Todos os critérios de prontidão foram atendidos; a ativação continua apenas simulada."
        : recomendacao === "Reverter"
          ? "Um risco crítico exige reversão simulada e preservação da política vigente."
          : "A evidência ainda é insuficiente ou requer atenção; a sucessora deve ser adiada.",
  };
}

export function decidirValidacaoSucessoraPoliticaSintetica({
  rollouts,
  rolloutId,
  decisao,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  decisao: DecisaoOwnerValidacaoSucessoraSintetica;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  const proposta = adocao?.propostaAjuste;
  const validacao = proposta?.validacaoSucessora;
  if (!rollout || !adocao || !proposta || !validacao || validacao.estado !== "Em validação") {
    return rollouts;
  }
  const prontidao = calcularProntidaoAtivacaoSucessoraPoliticaSintetica(rollout);
  if (!prontidao || decisao !== prontidao.recomendacao) return rollouts;
  const estado: ValidacaoSucessoraPoliticaSintetica["estado"] =
    decisao === "Ativar" ? "Pronta para ativação" : decisao === "Adiar" ? "Adiada" : "Revertida";
  const justificativaExplicavel =
    decisao === "Ativar"
      ? "Owner marcou a sucessora como pronta apenas na simulação; nenhuma ativação real foi executada."
      : decisao === "Adiar"
        ? "Owner adiou a sucessora até que novos ciclos fictícios possam reduzir a incerteza."
        : "Owner reverteu a sucessora na simulação após violação do limite de risco.";
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        propostaAjuste: {
          ...proposta,
          validacaoSucessora: {
            ...validacao,
            estado,
            historicoDecisoes: [
              ...validacao.historicoDecisoes,
              { decisao, justificativaExplicavel, decididoEm: "Agora, nesta sessão" },
            ],
            atualizadoEm: "Agora, nesta sessão",
          },
          atualizadoEm: "Agora, nesta sessão",
        },
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function calcularResumoValidacoesSucessorasPoliticasSinteticas(
  rollouts: RolloutsExperimentosSinteticos,
) {
  const validacoes = Object.values(rollouts).flatMap((rollout) => {
    const validacao = rollout.adocaoPolitica?.propostaAjuste?.validacaoSucessora;
    return validacao ? [validacao] : [];
  });
  return {
    validacoes: validacoes.length,
    ciclos: validacoes.reduce((total, validacao) => total + validacao.ciclos.length, 0),
    prontas: validacoes.filter((validacao) => validacao.estado === "Pronta para ativação").length,
    adiadas: validacoes.filter((validacao) => validacao.estado === "Adiada").length,
    revertidas: validacoes.filter((validacao) => validacao.estado === "Revertida").length,
  };
}

export function sincronizarAtivacaoControladaPoliticaSucessoraSintetica(
  rollouts: RolloutsExperimentosSinteticos,
  rolloutId: string,
): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  const proposta = adocao?.propostaAjuste;
  const validacao = proposta?.validacaoSucessora;
  if (!rollout || !adocao || !proposta || !validacao || validacao.ativacaoControlada) {
    return rollouts;
  }
  if (validacao.estado !== "Pronta para ativação" || proposta.estado !== "Aprovada") {
    return rollouts;
  }
  const checkpoints: CheckpointAtivacaoSucessoraSintetica[] = [
    {
      id: "piloto-controlado",
      titulo: "Piloto controlado",
      publicoInternoFicticio: "Equipe interna fictícia de validação",
      percentualPublico: 20,
      concluido: false,
    },
    {
      id: "expansao-assistida",
      titulo: "Expansão assistida",
      publicoInternoFicticio: "Times comerciais fictícios selecionados",
      percentualPublico: 60,
      concluido: false,
    },
    {
      id: "cobertura-simulada",
      titulo: "Cobertura simulada",
      publicoInternoFicticio: "Público interno fictício completo",
      percentualPublico: 100,
      concluido: false,
    },
  ];
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        propostaAjuste: {
          ...proposta,
          validacaoSucessora: {
            ...validacao,
            ativacaoControlada: {
              estado: "Em transição",
              versaoVigente: proposta.versaoVigente,
              versaoSucessora: proposta.versaoProposta,
              politicaVigentePreservada: true,
              checkpoints,
              limitesSeguranca: [
                "A política vigente permanece preservada durante toda a simulação.",
                "Cada checkpoint exige resultado fictício e decisão explícita do owner.",
                "Qualquer limite violado bloqueia a continuidade e recomenda rollback.",
              ],
              historicoDecisoes: [],
              atualizadoEm: "Agora, nesta sessão",
            },
            atualizadoEm: "Agora, nesta sessão",
          },
          atualizadoEm: "Agora, nesta sessão",
        },
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function registrarCheckpointAtivacaoSucessoraSintetica({
  rollouts,
  rolloutId,
  faixa,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  faixa: FaixaCheckpointAtivacaoSucessoraSintetica;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  const proposta = adocao?.propostaAjuste;
  const validacao = proposta?.validacaoSucessora;
  const ativacao = validacao?.ativacaoControlada;
  if (!rollout || !adocao || !proposta || !validacao || !ativacao) return rollouts;
  if (ativacao.estado !== "Em transição") return rollouts;
  const checkpointAtual = ativacao.checkpoints.find((checkpoint) => !checkpoint.concluido);
  if (!checkpointAtual || checkpointAtual.resultado) return rollouts;
  const resultadoPorFaixa = {
    Seguro: { aderenciaVigente: 84, aderenciaSucessora: 91, alertasSeguranca: 0 },
    Atenção: { aderenciaVigente: 84, aderenciaSucessora: 82, alertasSeguranca: 1 },
    "Limite violado": { aderenciaVigente: 84, aderenciaSucessora: 69, alertasSeguranca: 3 },
  }[faixa];
  const resultado: ResultadoCheckpointAtivacaoSucessoraSintetica = {
    faixa,
    ...resultadoPorFaixa,
    explicacao:
      faixa === "Seguro"
        ? "A sucessora superou a vigente sem alertas no público fictício deste checkpoint."
        : faixa === "Atenção"
          ? "A sucessora ficou ligeiramente abaixo da vigente e exige pausa para revisão simulada."
          : "A sucessora perdeu aderência e excedeu o limite de alertas; a continuidade foi bloqueada.",
    registradoEm: "Agora, nesta sessão",
  };
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        propostaAjuste: {
          ...proposta,
          validacaoSucessora: {
            ...validacao,
            ativacaoControlada: {
              ...ativacao,
              checkpoints: ativacao.checkpoints.map((checkpoint) =>
                checkpoint.id === checkpointAtual.id ? { ...checkpoint, resultado } : checkpoint,
              ),
              atualizadoEm: "Agora, nesta sessão",
            },
            atualizadoEm: "Agora, nesta sessão",
          },
          atualizadoEm: "Agora, nesta sessão",
        },
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function calcularGovernancaAtivacaoSucessoraSintetica(
  rollout: RolloutExperimentoSintetico,
) {
  const ativacao = rollout.adocaoPolitica?.propostaAjuste?.validacaoSucessora?.ativacaoControlada;
  if (!ativacao) return null;
  const checkpointAtual = ativacao.checkpoints.find((checkpoint) => !checkpoint.concluido);
  const resultado = checkpointAtual?.resultado;
  const progresso = Math.round(
    (ativacao.checkpoints.filter((checkpoint) => checkpoint.concluido).length /
      ativacao.checkpoints.length) *
      100,
  );
  const criterios = [
    {
      descricao: "A política vigente continua preservada como referência e retorno seguro.",
      atendido: ativacao.politicaVigentePreservada,
    },
    {
      descricao: "O checkpoint atual possui resultado fictício registrado.",
      atendido: Boolean(resultado),
    },
    {
      descricao: "A sucessora mantém aderência igual ou superior à vigente.",
      atendido: Boolean(resultado && resultado.aderenciaSucessora >= resultado.aderenciaVigente),
    },
    {
      descricao: "Nenhum alerta de segurança foi registrado no checkpoint.",
      atendido: Boolean(resultado && resultado.alertasSeguranca === 0),
    },
  ];
  const recomendacao: DecisaoOwnerAtivacaoSucessoraSintetica | null = !resultado
    ? null
    : resultado.faixa === "Limite violado"
      ? "Rollback"
      : resultado.faixa === "Atenção"
        ? "Pausar"
        : "Continuar";
  return {
    checkpointAtual,
    progresso,
    criterios,
    criteriosAtendidos: criterios.filter((criterio) => criterio.atendido).length,
    totalCriterios: criterios.length,
    recomendacao,
    explicacao: !resultado
      ? "Aguardando resultado fictício para liberar uma decisão do owner."
      : recomendacao === "Continuar"
        ? "Todos os limites do checkpoint foram atendidos; a transição simulada pode continuar."
        : recomendacao === "Pausar"
          ? "O checkpoint exige pausa simulada antes de ampliar o público fictício."
          : "O limite foi violado; o rollback simulado preserva integralmente a política vigente.",
  };
}

export function decidirAtivacaoControladaPoliticaSucessoraSintetica({
  rollouts,
  rolloutId,
  decisao,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  decisao: DecisaoOwnerAtivacaoSucessoraSintetica;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  const proposta = adocao?.propostaAjuste;
  const validacao = proposta?.validacaoSucessora;
  const ativacao = validacao?.ativacaoControlada;
  if (!rollout || !adocao || !proposta || !validacao || !ativacao) return rollouts;
  if (ativacao.estado !== "Em transição") return rollouts;
  const governanca = calcularGovernancaAtivacaoSucessoraSintetica(rollout);
  const checkpointAtual = governanca?.checkpointAtual;
  if (!governanca || !checkpointAtual || decisao !== governanca.recomendacao) return rollouts;
  const checkpoints =
    decisao === "Continuar"
      ? ativacao.checkpoints.map((checkpoint) =>
          checkpoint.id === checkpointAtual.id ? { ...checkpoint, concluido: true } : checkpoint,
        )
      : ativacao.checkpoints;
  const concluida = checkpoints.every((checkpoint) => checkpoint.concluido);
  const estado: AtivacaoControladaPoliticaSucessoraSintetica["estado"] =
    decisao === "Pausar"
      ? "Pausada"
      : decisao === "Rollback"
        ? "Rollback concluído"
        : concluida
          ? "Concluída"
          : "Em transição";
  const justificativaExplicavel =
    decisao === "Continuar"
      ? concluida
        ? "Owner concluiu a ativação somente na simulação após todos os checkpoints seguros."
        : `Owner liberou o próximo público fictício após o checkpoint ${checkpointAtual.titulo}.`
      : decisao === "Pausar"
        ? "Owner pausou a transição simulada; a política vigente permanece preservada."
        : "Owner executou rollback somente na simulação; a política vigente permaneceu preservada.";
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      adocaoPolitica: {
        ...adocao,
        propostaAjuste: {
          ...proposta,
          validacaoSucessora: {
            ...validacao,
            ativacaoControlada: {
              ...ativacao,
              estado,
              checkpoints,
              historicoDecisoes: [
                ...ativacao.historicoDecisoes,
                {
                  checkpointId: checkpointAtual.id,
                  decisao,
                  justificativaExplicavel,
                  decididoEm: "Agora, nesta sessão",
                },
              ],
              atualizadoEm: "Agora, nesta sessão",
            },
            atualizadoEm: "Agora, nesta sessão",
          },
          atualizadoEm: "Agora, nesta sessão",
        },
        atualizadoEm: "Agora, nesta sessão",
      },
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

// Read-only projection: recommendations never execute or rewrite owner decisions.
export function calcularMonitoramentoTransicaoSucessoraSintetica(
  rollout: RolloutExperimentoSintetico,
) {
  const ativacao = rollout.adocaoPolitica?.propostaAjuste?.validacaoSucessora?.ativacaoControlada;
  if (!ativacao) return null;
  const checkpoints = ativacao.checkpoints.map((checkpoint, indice) => {
    const resultado = checkpoint.resultado;
    const anterior = indice > 0 ? ativacao.checkpoints[indice - 1].resultado : undefined;
    const deltaVigente = resultado
      ? resultado.aderenciaSucessora - resultado.aderenciaVigente : null;
    const variacaoAnterior = resultado && anterior
      ? resultado.aderenciaSucessora - anterior.aderenciaSucessora : null;
    const variacaoAlertas = resultado && anterior
      ? resultado.alertasSeguranca - anterior.alertasSeguranca : null;
    const deterioracao = Boolean(resultado && (
      (deltaVigente ?? 0) < 0 || (variacaoAnterior ?? 0) < 0 || (variacaoAlertas ?? 0) > 0
    ));
    const recomendacao: DecisaoOwnerAtivacaoSucessoraSintetica | null = !resultado ? null
      : resultado.faixa === "Limite violado" || resultado.alertasSeguranca >= 3 || (deltaVigente ?? 0) <= -10
        ? "Rollback"
        : resultado.faixa === "Atenção" || resultado.alertasSeguranca > 0 || deterioracao
          ? "Pausar" : "Continuar";
    const decisaoOwner = ativacao.historicoDecisoes.find((registro) => registro.checkpointId === checkpoint.id);
    return {
      checkpointId: checkpoint.id,
      titulo: checkpoint.titulo,
      percentualPublico: checkpoint.percentualPublico,
      resultado,
      deltaVigente,
      variacaoAnterior,
      variacaoAlertas,
      deterioracao,
      recomendacao,
      decisaoOwner,
      explicacao: !resultado ? "Sem resultado: não há recomendação nem eficácia calculada."
        : `Sucessora ${resultado.aderenciaSucessora}% versus vigente ${resultado.aderenciaVigente}% (${deltaVigente} p.p.); ${resultado.alertasSeguranca} alerta(s). ` +
          (variacaoAnterior === null ? "Primeiro checkpoint, sem comparação temporal. "
            : `Variação desde o checkpoint anterior: ${variacaoAnterior} p.p. e ${variacaoAlertas} alerta(s). `) +
          `Recomendação simulada: ${recomendacao}; somente o owner decide.`,
    };
  });
  const medidos = checkpoints.filter((checkpoint) => checkpoint.resultado);
  return {
    versaoVigente: ativacao.versaoVigente,
    versaoSucessora: ativacao.versaoSucessora,
    estado: ativacao.estado,
    checkpoints,
    resultados: medidos.length,
    eficaciaMedia: medidos.length ? Math.round(medidos.reduce(
      (total, checkpoint) => total + checkpoint.resultado!.aderenciaSucessora, 0,
    ) / medidos.length) : null,
    checkpointsSeguros: medidos.filter((checkpoint) => checkpoint.recomendacao === "Continuar").length,
    deterioracoes: medidos.filter((checkpoint) => checkpoint.deterioracao).length,
    alertas: medidos.reduce((total, checkpoint) => total + checkpoint.resultado!.alertasSeguranca, 0),
  };
}

export function calcularEncerramentoTransicaoSintetica(rollout: RolloutExperimentoSintetico) {
  const ativacao = rollout.adocaoPolitica?.propostaAjuste?.validacaoSucessora?.ativacaoControlada;
  const monitoramento = calcularMonitoramentoTransicaoSucessoraSintetica(rollout);
  if (!ativacao || !monitoramento) return null;
  const criterios = [
    { descricao: "Todos os checkpoints possuem resultado e foram concluídos.", atendido: ativacao.checkpoints.length > 0 && ativacao.checkpoints.every(c => c.concluido && c.resultado) },
    { descricao: "Todos os resultados são seguros, sem deterioração.", atendido: monitoramento.resultados > 0 && monitoramento.checkpointsSeguros === ativacao.checkpoints.length && monitoramento.deterioracoes === 0 },
    { descricao: "O owner registrou continuidade em cada checkpoint.", atendido: ativacao.checkpoints.every(c => ativacao.historicoDecisoes.some(d => d.checkpointId === c.id && d.decisao === "Continuar")) },
    { descricao: "A política vigente permanece preservada.", atendido: ativacao.politicaVigentePreservada },
  ];
  const terminal = ativacao.estado !== "Em transição";
  const recomendacao: "Concluir" | "Revisar" | null = !terminal || monitoramento.resultados === 0 ? null
    : ativacao.estado === "Concluída" && criterios.every(c => c.atendido) ? "Concluir" : "Revisar";
  const aprendizados = monitoramento.checkpoints.map(c => !c.resultado
    ? `${c.titulo}: sem evidência; não permite inferir sucesso para este público.`
    : `${c.titulo} (${c.percentualPublico}% fictício): ${c.explicacao} Aprendizado: ${c.recomendacao === "Continuar" ? "resultado seguro neste público, sem garantia para pessoas reais" : "revisar aderência e alertas antes de qualquer nova simulação"}.`);
  return { monitoramento, criterios, recomendacao, aprendizados, registro: ativacao.encerramento,
    explicacao: recomendacao === null ? "Aguarde o término da transição e a decisão dos checkpoints."
      : recomendacao === "Concluir" ? "Todos os checkpoints e decisões sustentam a conclusão exclusivamente simulada."
        : "A transição terminou com evidência insuficiente ou risco; o encerramento requer revisão dos aprendizados." };
}

export function decidirEncerramentoTransicaoSintetica({ rollouts, rolloutId, decisao }: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
  decisao: "Concluir" | "Revisar";
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  const adocao = rollout?.adocaoPolitica;
  const proposta = adocao?.propostaAjuste;
  const validacao = proposta?.validacaoSucessora;
  const ativacao = validacao?.ativacaoControlada;
  if (!rollout || !adocao || !proposta || !validacao || !ativacao || ativacao.encerramento) return rollouts;
  const avaliacao = calcularEncerramentoTransicaoSintetica(rollout);
  if (!avaliacao || decisao !== avaliacao.recomendacao) return rollouts;
  return { ...rollouts, [rolloutId]: { ...rollout, adocaoPolitica: { ...adocao, propostaAjuste: {
    ...proposta, validacaoSucessora: { ...validacao, ativacaoControlada: { ...ativacao,
      encerramento: { decisao, owner: "Owner simulado", decididoEm: "Agora, nesta sessão",
        justificativa: avaliacao.explicacao, aprendizados: [...avaliacao.aprendizados] },
    } },
  } } } };
}

export function calcularResumoAtivacoesControladasSucessorasSinteticas(
  rollouts: RolloutsExperimentosSinteticos,
) {
  const ativacoes = Object.values(rollouts).flatMap((rollout) => {
    const ativacao =
      rollout.adocaoPolitica?.propostaAjuste?.validacaoSucessora?.ativacaoControlada;
    return ativacao ? [ativacao] : [];
  });
  return {
    ativacoes: ativacoes.length,
    checkpointsConcluidos: ativacoes.reduce(
      (total, ativacao) =>
        total + ativacao.checkpoints.filter((checkpoint) => checkpoint.concluido).length,
      0,
    ),
    pausadas: ativacoes.filter((ativacao) => ativacao.estado === "Pausada").length,
    concluidas: ativacoes.filter((ativacao) => ativacao.estado === "Concluída").length,
    rollbacks: ativacoes.filter((ativacao) => ativacao.estado === "Rollback concluído").length,
  };
}

export function calcularProgressoRolloutSintetico(rollout: RolloutExperimentoSintetico) {
  return rollout.etapas.length > 0
    ? Math.round(
        (rollout.etapas.filter((etapa) => etapa.concluida).length / rollout.etapas.length) * 100,
      )
    : 0;
}

export function avancarEtapaRolloutSintetico({
  rollouts,
  rolloutId,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  if (!rollout || ["Pausado", "Revertido", "Concluído"].includes(rollout.estado)) {
    return rollouts;
  }
  const proximaEtapa = rollout.etapas.find((etapa) => !etapa.concluida);
  if (!proximaEtapa) return rollouts;
  const etapas = rollout.etapas.map((etapa) =>
    etapa.id === proximaEtapa.id ? { ...etapa, concluida: true } : etapa,
  );
  const concluido = etapas.every((etapa) => etapa.concluida);
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      etapas,
      estado: concluido ? "Concluído" : "Em andamento",
      motivoEstado: concluido
        ? "Todas as etapas fictícias foram concluídas com confirmação humana."
        : `Etapa ${proximaEtapa.titulo.toLocaleLowerCase("pt-BR")} concluída na simulação.`,
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function pausarRolloutSintetico({
  rollouts,
  rolloutId,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  if (!rollout || rollout.estado !== "Em andamento") return rollouts;
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      estado: "Pausado",
      motivoEstado:
        "Pausa preventiva simulada para revisar efetividade e limites antes de continuar.",
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function retomarRolloutSintetico({
  rollouts,
  rolloutId,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  if (!rollout || rollout.estado !== "Pausado") return rollouts;
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      estado: "Em andamento",
      motivoEstado:
        "Retomada simulada após confirmação humana de que os limites permanecem atendidos.",
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function reverterRolloutSintetico({
  rollouts,
  rolloutId,
}: {
  rollouts: RolloutsExperimentosSinteticos;
  rolloutId: string;
}): RolloutsExperimentosSinteticos {
  const rollout = rollouts[rolloutId];
  if (!rollout || !["Em andamento", "Pausado"].includes(rollout.estado)) return rollouts;
  return {
    ...rollouts,
    [rolloutId]: {
      ...rollout,
      estado: "Revertido",
      motivoEstado:
        "Reversão preventiva simulada; o histórico foi preservado e nenhuma ação real ocorreu.",
      atualizadoEm: "Agora, nesta sessão",
    },
  };
}

export function calcularResumoRolloutsSinteticos(rollouts: RolloutsExperimentosSinteticos) {
  const lista = Object.values(rollouts);
  return {
    rolloutsGovernados: lista.length,
    emAndamento: lista.filter((rollout) => rollout.estado === "Em andamento").length,
    pausados: lista.filter((rollout) => rollout.estado === "Pausado").length,
    concluidos: lista.filter((rollout) => rollout.estado === "Concluído").length,
  };
}

export function removerRolloutPorExperimentoSintetico(
  rollouts: RolloutsExperimentosSinteticos,
  experimentoId: string,
) {
  const id = `rollout:${experimentoId}`;
  if (!rollouts[id]) return rollouts;
  const atualizados = { ...rollouts };
  delete atualizados[id];
  return atualizados;
}

export function removerExperimentoPorPlaybookMelhoriaSintetico(
  experimentos: ExperimentosPlaybooksSinteticos,
  playbookMelhoriaId: string,
) {
  const id = `experimento:${playbookMelhoriaId}`;
  if (!experimentos[id]) return experimentos;
  const atualizados = { ...experimentos };
  delete atualizados[id];
  return atualizados;
}

export function calcularResumoDecisoesComerciaisSinteticas({
  decisoes,
  periodo,
  recomendacoes,
}: {
  decisoes: DecisoesComerciaisSinteticas;
  periodo: PeriodoRelatorioComercial;
  recomendacoes: RecomendacaoResponsavelSintetica[];
}): Record<EstadoDecisaoComercial, number> {
  const resumo: Record<EstadoDecisaoComercial, number> = {
    Pendente: 0,
    Aceita: 0,
    Adiada: 0,
    Dispensada: 0,
  };
  recomendacoes.forEach((recomendacao) => {
    const registro = decisoes[criarChaveDecisaoComercial(periodo, recomendacao.responsavel)];
    resumo[registro?.estado ?? "Pendente"] += 1;
  });
  return resumo;
}

export type ResumoInsightsComerciaisSinteticos = {
  periodo: PeriodoRelatorioComercial;
  responsavel: FiltroResponsavelRelatorio;
  taxaConversaoAtual: number;
  taxaConversaoAnterior: number;
  variacaoConversao: number;
  coberturaMetaPrevista: number;
  distanciaMetaPrevista: number;
  insights: InsightComercialSintetico[];
  alertas: AlertaComercialSintetico[];
  recomendacoes: RecomendacaoResponsavelSintetica[];
};

const CONVERSAO_ANTERIOR_POR_PERIODO: Record<PeriodoRelatorioComercial, number> = {
  "Últimos 7 dias": 7.2,
  "Últimos 30 dias": 7.4,
  "Últimos 90 dias": 7.7,
};

const AJUSTE_CONVERSAO_ANTERIOR_POR_RESPONSAVEL: Record<
  Exclude<FiltroResponsavelRelatorio, "Toda a equipe">,
  number
> = {
  "Amanda Reis": 1.2,
  "Lucas Prado": 1.4,
  "Bruno Lima": -0.3,
  "Camila Torres": 0.4,
};

const PROXIMA_ACAO_POR_RESPONSAVEL: Record<
  Exclude<FiltroResponsavelRelatorio, "Toda a equipe">,
  { acao: string; impacto: string; resultado: string }
> = {
  "Amanda Reis": {
    acao: "Retomar propostas após visita",
    impacto: "Potencial de acelerar até 3 propostas que já passaram pela visita.",
    resultado: "Aumentar o avanço de propostas qualificadas para fechamento.",
  },
  "Lucas Prado": {
    acao: "Priorizar negociações sem retorno recente",
    impacto: "Potencial de reduzir o volume de oportunidades paradas em negociação.",
    resultado: "Reduzir o tempo parado entre proposta e decisão do cliente.",
  },
  "Bruno Lima": {
    acao: "Transformar visitas concluídas em proposta",
    impacto: "Potencial de gerar até 2 novas propostas a partir das visitas realizadas.",
    resultado: "Aproveitar melhor os contatos que já demonstraram interesse presencial.",
  },
  "Camila Torres": {
    acao: "Revisar oportunidades de maior valor",
    impacto: "Potencial de elevar em até 5 p.p. a cobertura prevista da meta.",
    resultado: "Elevar a cobertura prevista da meta com uma carteira mais focada.",
  },
};

const PLAYBOOK_POR_RESPONSAVEL: Record<
  Exclude<FiltroResponsavelRelatorio, "Toda a equipe">,
  {
    prazoFicticio: string;
    criterioConclusao: string;
    etapas: Array<{ orientacao: string; criterioConclusao: string }>;
  }
> = {
  "Amanda Reis": {
    prazoFicticio: "Até amanhã, 17h (fictício)",
    criterioConclusao: "Três propostas priorizadas com próximo passo fictício definido.",
    etapas: [
      {
        orientacao: "Reunir as propostas sintéticas de clientes que já visitaram imóveis.",
        criterioConclusao: "Lista fictícia com três propostas priorizadas.",
      },
      {
        orientacao: "Preparar uma abordagem simulada de retomada para cada proposta.",
        criterioConclusao: "Três roteiros sintéticos revisados pela equipe.",
      },
      {
        orientacao: "Simular os contatos e classificar o retorno esperado.",
        criterioConclusao: "Três retornos fictícios registrados com próximo passo.",
      },
    ],
  },
  "Lucas Prado": {
    prazoFicticio: "Hoje, 16h (fictício)",
    criterioConclusao: "Negociações paradas classificadas e ordenadas para acompanhamento.",
    etapas: [
      {
        orientacao: "Identificar negociações sintéticas sem retorno recente.",
        criterioConclusao: "Fila fictícia de negociações sem retorno criada.",
      },
      {
        orientacao: "Classificar urgência, valor e chance simulada de avanço.",
        criterioConclusao: "Cada negociação fictícia recebeu uma prioridade.",
      },
      {
        orientacao: "Definir a próxima abordagem simulada para os casos prioritários.",
        criterioConclusao: "Próximo passo fictício documentado para cada prioridade.",
      },
    ],
  },
  "Bruno Lima": {
    prazoFicticio: "Em até 2 dias úteis (fictício)",
    criterioConclusao: "Visitas com potencial convertidas em propostas apenas simuladas.",
    etapas: [
      {
        orientacao: "Revisar as visitas sintéticas concluídas no período.",
        criterioConclusao: "Visitas fictícias com interesse confirmado foram separadas.",
      },
      {
        orientacao: "Selecionar imóveis e condições para uma proposta simulada.",
        criterioConclusao: "Condições fictícias definidas para até duas oportunidades.",
      },
      {
        orientacao: "Montar e revisar as propostas sem qualquer envio real.",
        criterioConclusao: "Até duas propostas sintéticas prontas para avaliação interna.",
      },
    ],
  },
  "Camila Torres": {
    prazoFicticio: "Até sexta-feira, 12h (fictício)",
    criterioConclusao: "Carteira de maior valor revisada com foco e justificativa explicável.",
    etapas: [
      {
        orientacao: "Ordenar oportunidades sintéticas por valor e probabilidade.",
        criterioConclusao: "Ranking fictício de oportunidades concluído.",
      },
      {
        orientacao: "Revisar riscos e argumentos comerciais simulados.",
        criterioConclusao: "Riscos e argumentos documentados para as prioridades.",
      },
      {
        orientacao: "Definir um plano fictício de avanço para a carteira priorizada.",
        criterioConclusao: "Cada oportunidade prioritária recebeu próximo passo e prazo.",
      },
    ],
  },
};

type ModeloResultadoPlaybook = Omit<
  ResultadoPlaybookComercialSintetico,
  "playbookId" | "responsavel" | "faixa" | "impactoEsperado" | "registradoEm"
>;

const RESULTADO_PLAYBOOK_POR_RESPONSAVEL: Record<
  RecomendacaoResponsavelSintetica["responsavel"],
  Record<FaixaResultadoPlaybookSintetico, ModeloResultadoPlaybook>
> = {
  "Amanda Reis": {
    "Abaixo do esperado": {
      resultadoFicticio: "1 das 3 propostas priorizadas avançou para a próxima conversa.",
      comparacaoExplicavel:
        "O avanço ficou abaixo do potencial de três propostas porque duas retomadas simuladas não tiveram retorno.",
      aprendizadoExplicavel:
        "Testar horários e abordagens diferentes pode aumentar a resposta sem ampliar a carteira.",
      efetividade: 42,
    },
    "Dentro do esperado": {
      resultadoFicticio: "2 das 3 propostas priorizadas avançaram para a próxima conversa.",
      comparacaoExplicavel:
        "A maior parte do impacto esperado apareceu: duas propostas avançaram e uma permaneceu sem retorno.",
      aprendizadoExplicavel:
        "A retomada com contexto da visita funcionou; a proposta sem retorno merece uma abordagem alternativa.",
      efetividade: 76,
    },
    "Acima do esperado": {
      resultadoFicticio: "As 3 propostas priorizadas avançaram e uma ganhou urgência fictícia.",
      comparacaoExplicavel:
        "Todo o potencial esperado foi alcançado, com avanço adicional de urgência em uma oportunidade.",
      aprendizadoExplicavel:
        "Personalizar a retomada com detalhes da visita foi a prática mais eficaz desta simulação.",
      efetividade: 94,
    },
  },
  "Lucas Prado": {
    "Abaixo do esperado": {
      resultadoFicticio:
        "A fila foi organizada, mas apenas 1 negociação simulada voltou a avançar.",
      comparacaoExplicavel:
        "A organização reduziu a incerteza, porém não diminuiu de forma relevante o volume parado.",
      aprendizadoExplicavel:
        "Prioridade sem prazo curto de retorno não foi suficiente; o próximo teste deve combinar os dois.",
      efetividade: 38,
    },
    "Dentro do esperado": {
      resultadoFicticio: "3 negociações simuladas receberam retorno e 2 voltaram ao fluxo.",
      comparacaoExplicavel:
        "A fila parada diminuiu conforme esperado, embora uma negociação ainda dependa de resposta.",
      aprendizadoExplicavel:
        "Ordenar por urgência e valor ajudou a equipe a agir primeiro onde havia melhor chance de avanço.",
      efetividade: 73,
    },
    "Acima do esperado": {
      resultadoFicticio: "4 negociações simuladas voltaram ao fluxo e 1 avançou para decisão.",
      comparacaoExplicavel:
        "O volume parado caiu mais do que o previsto e uma oportunidade alcançou a etapa seguinte.",
      aprendizadoExplicavel:
        "A combinação de urgência, valor e mensagem específica deve orientar a próxima fila fictícia.",
      efetividade: 92,
    },
  },
  "Bruno Lima": {
    "Abaixo do esperado": {
      resultadoFicticio:
        "As visitas foram revisadas, mas nenhuma nova proposta fictícia foi concluída.",
      comparacaoExplicavel:
        "O potencial de duas propostas não se confirmou porque faltaram condições adequadas nos casos simulados.",
      aprendizadoExplicavel:
        "Validar condições antes de montar a proposta evita esforço em visitas com baixa aderência.",
      efetividade: 31,
    },
    "Dentro do esperado": {
      resultadoFicticio: "2 propostas fictícias foram montadas a partir das visitas priorizadas.",
      comparacaoExplicavel:
        "O resultado atingiu exatamente o potencial esperado de gerar até duas novas propostas.",
      aprendizadoExplicavel:
        "Confirmar interesse e condições logo após a visita tornou a preparação das propostas mais objetiva.",
      efetividade: 81,
    },
    "Acima do esperado": {
      resultadoFicticio:
        "2 propostas foram montadas e 1 recebeu sinal positivo fictício para negociação.",
      comparacaoExplicavel:
        "Além das duas propostas esperadas, uma delas já avançou na simulação para negociação.",
      aprendizadoExplicavel:
        "Selecionar imóvel e condição ainda durante o retorno da visita acelerou o próximo passo.",
      efetividade: 96,
    },
  },
  "Camila Torres": {
    "Abaixo do esperado": {
      resultadoFicticio:
        "A carteira foi priorizada, mas a cobertura fictícia da meta subiu apenas 1 p.p.",
      comparacaoExplicavel:
        "O ganho ficou quatro pontos abaixo do potencial porque as maiores oportunidades mantiveram riscos altos.",
      aprendizadoExplicavel:
        "Valor alto sem probabilidade suficiente distorce a prioridade; risco deve ter peso maior no próximo ciclo.",
      efetividade: 35,
    },
    "Dentro do esperado": {
      resultadoFicticio: "A cobertura fictícia da meta subiu 4 p.p. após a revisão da carteira.",
      comparacaoExplicavel:
        "O resultado ficou próximo do potencial de cinco pontos, com uma oportunidade ainda sob revisão.",
      aprendizadoExplicavel:
        "Equilibrar valor e probabilidade trouxe uma previsão mais útil para orientar o foco comercial.",
      efetividade: 78,
    },
    "Acima do esperado": {
      resultadoFicticio:
        "A cobertura fictícia da meta subiu 6 p.p. e duas prioridades ganharam próximo passo.",
      comparacaoExplicavel:
        "A elevação superou em um ponto o potencial esperado e tornou duas oportunidades acionáveis.",
      aprendizadoExplicavel:
        "Revisar risco, argumento e prazo em conjunto aumentou a qualidade da carteira priorizada.",
      efetividade: 95,
    },
  },
};

const ORIENTACAO_MELHORIA_POR_FAIXA: Record<FaixaResultadoPlaybookSintetico, string> = {
  "Abaixo do esperado": "Reformular a prática antes de ampliar seu uso.",
  "Dentro do esperado": "Padronizar a prática e testar um refinamento controlado.",
  "Acima do esperado": "Reaplicar a prática preservando os fatores que elevaram o resultado.",
};

const PRATICA_MELHORIA_POR_RESPONSAVEL: Record<
  RecomendacaoResponsavelSintetica["responsavel"],
  { pratica: string; justificativa: string; proximoTeste: string }
> = {
  "Amanda Reis": {
    pratica: "Retomada contextualizada pela visita",
    justificativa:
      "A mensagem recupera o interesse já demonstrado e reduz a distância entre visita e proposta.",
    proximoTeste: "variar o horário da retomada mantendo o contexto individual da visita.",
  },
  "Lucas Prado": {
    pratica: "Priorização por urgência, valor e chance de avanço",
    justificativa:
      "A combinação direciona o esforço para negociações paradas com maior retorno potencial.",
    proximoTeste: "adicionar um prazo curto de retorno às negociações de maior prioridade.",
  },
  "Bruno Lima": {
    pratica: "Confirmação de interesse logo após a visita",
    justificativa:
      "O contato próximo da visita preserva o contexto e antecipa a definição de condições da proposta.",
    proximoTeste: "validar condições e imóvel preferido na mesma retomada fictícia.",
  },
  "Camila Torres": {
    pratica: "Priorização equilibrada entre valor e probabilidade",
    justificativa:
      "O equilíbrio evita concentrar a previsão apenas em oportunidades valiosas, porém pouco prováveis.",
    proximoTeste: "dar peso maior ao risco antes de definir o próximo passo da carteira.",
  },
};

const RESULTADO_EXPERIMENTO_POR_VERSAO: Record<
  VersaoExperimentoPlaybookSintetico["id"],
  Record<FaixaResultadoExperimentoSintetico, number>
> = {
  "versao-a": {
    "Abaixo do critério": 58,
    "Próximo do critério": 77,
    "Acima do critério": 86,
  },
  "versao-b": {
    "Abaixo do critério": 61,
    "Próximo do critério": 79,
    "Acima do critério": 91,
  },
};

function formatarPercentualSintetico(valor: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor);
}

function formatarValorSintetico(valor: number) {
  return `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
    valor / 1_000_000,
  )} mi`;
}

export function calcularInsightsComerciaisSinteticos({
  relatorio,
}: {
  relatorio: RelatorioComercialSintetico;
}): ResumoInsightsComerciaisSinteticos {
  const ajusteResponsavel =
    relatorio.responsavel === "Toda a equipe"
      ? 0
      : AJUSTE_CONVERSAO_ANTERIOR_POR_RESPONSAVEL[relatorio.responsavel];
  const taxaConversaoAnterior =
    CONVERSAO_ANTERIOR_POR_PERIODO[relatorio.periodo] + ajusteResponsavel;
  const taxaConversaoAtual = relatorio.totais.taxaConversao;
  const variacaoConversao = taxaConversaoAtual - taxaConversaoAnterior;
  const coberturaMetaPrevista =
    relatorio.totais.meta > 0 ? (relatorio.totais.previsto / relatorio.totais.meta) * 100 : 0;
  const distanciaMetaPrevista = coberturaMetaPrevista - 100;
  const etapasDeAvanco = relatorio.conversaoEtapas.filter(
    (etapa) => etapa.etapa !== "Negócio perdido",
  );
  const maiorPerda = etapasDeAvanco.slice(1).reduce(
    (maior, etapa, indice) => {
      const anterior = etapasDeAvanco[indice];
      const perda = anterior.taxa - etapa.taxa;
      return perda > maior.perda ? { anterior, etapa, perda } : maior;
    },
    { anterior: etapasDeAvanco[0], etapa: etapasDeAvanco[1], perda: 0 },
  );

  const tendenciaPositiva = variacaoConversao >= 0;
  const insights: InsightComercialSintetico[] = [
    {
      id: "tendencia-conversao",
      titulo: tendenciaPositiva ? "Conversão avançou no período" : "Conversão recuou no período",
      leitura: `${formatarPercentualSintetico(taxaConversaoAtual)}% agora, ${tendenciaPositiva ? "+" : ""}${formatarPercentualSintetico(variacaoConversao)} p.p.`,
      explicacao:
        "A leitura divide os negócios ganhos pelos leads do recorte e compara o resultado com a referência sintética do período anterior.",
      evidencia: `${relatorio.totais.ganhos} ganhos em ${relatorio.totais.leads} leads; referência anterior de ${formatarPercentualSintetico(taxaConversaoAnterior)}%.`,
      tom: tendenciaPositiva ? "Positivo" : "Atenção",
    },
    {
      id: "cobertura-meta",
      titulo:
        coberturaMetaPrevista >= 100
          ? "Previsão cobre a meta selecionada"
          : "Previsão ainda não cobre a meta",
      leitura: `${formatarPercentualSintetico(coberturaMetaPrevista)}% da meta prevista`,
      explicacao:
        "A cobertura compara a receita prevista do cenário atual com a meta fictícia do mesmo recorte.",
      evidencia: `Previsão de ${formatarValorSintetico(relatorio.totais.previsto)} sobre meta de ${formatarValorSintetico(relatorio.totais.meta)}.`,
      tom: coberturaMetaPrevista >= 100 ? "Positivo" : "Atenção",
    },
    {
      id: "perda-entre-etapas",
      titulo: `Maior perda entre ${maiorPerda.anterior.etapa.toLocaleLowerCase("pt-BR")} e ${maiorPerda.etapa.etapa.toLocaleLowerCase("pt-BR")}`,
      leitura: `${formatarPercentualSintetico(maiorPerda.perda)} p.p. de diferença`,
      explicacao:
        "A etapa crítica é identificada pela maior queda percentual consecutiva no funil filtrado.",
      evidencia: `${formatarPercentualSintetico(maiorPerda.anterior.taxa)}% chegam à etapa anterior e ${formatarPercentualSintetico(maiorPerda.etapa.taxa)}% avançam à seguinte.`,
      tom: "Informativo",
    },
  ];

  const alertas: AlertaComercialSintetico[] = [
    {
      id: "variacao-conversao",
      titulo: tendenciaPositiva
        ? "Conversão acima da referência"
        : "Conversão abaixo da referência",
      valor: variacaoConversao,
      unidade: "p.p.",
      detalhe: `Comparação com ${formatarPercentualSintetico(taxaConversaoAnterior)}% no período anterior sintético.`,
      tom: tendenciaPositiva ? "Positivo" : "Atenção",
    },
    {
      id: "distancia-meta",
      titulo: distanciaMetaPrevista >= 0 ? "Meta prevista coberta" : "Previsão abaixo da meta",
      valor: distanciaMetaPrevista,
      unidade: "%",
      detalhe: `${formatarPercentualSintetico(coberturaMetaPrevista)}% da meta está coberta pela previsão atual.`,
      tom: distanciaMetaPrevista >= 0 ? "Positivo" : "Atenção",
    },
  ];

  const recomendacoes = relatorio.desempenho.map((desempenho) => {
    const cobertura = desempenho.meta > 0 ? (desempenho.previsto / desempenho.meta) * 100 : 0;
    const modelo = PROXIMA_ACAO_POR_RESPONSAVEL[desempenho.responsavel];
    return {
      responsavel: desempenho.responsavel,
      prioridade:
        cobertura < 60
          ? ("Alta" as const)
          : cobertura < 75
            ? ("Média" as const)
            : ("Baixa" as const),
      proximaAcao: modelo.acao,
      motivo: `${desempenho.visitas} visitas, ${desempenho.propostas} propostas e cobertura prevista de ${formatarPercentualSintetico(cobertura)}% da meta no recorte.`,
      impactoEsperado: modelo.impacto,
      resultadoEsperado: modelo.resultado,
    };
  });

  return {
    periodo: relatorio.periodo,
    responsavel: relatorio.responsavel,
    taxaConversaoAtual,
    taxaConversaoAnterior,
    variacaoConversao,
    coberturaMetaPrevista,
    distanciaMetaPrevista,
    insights,
    alertas,
    recomendacoes,
  };
}
