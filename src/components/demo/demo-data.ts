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
