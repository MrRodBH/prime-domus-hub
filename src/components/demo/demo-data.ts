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
