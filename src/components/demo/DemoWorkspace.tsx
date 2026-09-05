import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  CalendarDays,
  BellRing,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  Clock3,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Globe2,
  Home,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Menu,
  MessageCircle,
  MousePointerClick,
  Network,
  Search,
  Send,
  Settings2,
  Sparkles,
  Target,
  TriangleAlert,
  TrendingUp,
  UserRound,
  Users,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-rm-prime.png";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import {
  CONTEXTO_DEMONSTRACAO,
  CENARIOS_PREVISAO,
  PALETA_GRAFICOS,
  PERIODOS_RELATORIO_COMERCIAL,
  RESPONSAVEIS_RELATORIO_COMERCIAL,
  aplicarDecisaoComercialSintetica,
  calcularResumoDecisoesComerciaisSinteticas,
  calcularInsightsComerciaisSinteticos,
  calcularPrevisaoSintetica,
  calcularRelatorioComercialSintetico,
  campanhasSinteticas,
  etapasDoFunil,
  evolucaoComercial,
  integracoesSinteticas,
  leadsSinteticos,
  origemDosLeads,
  criarChaveDecisaoComercial,
  type AcaoDecisaoComercial,
  type CenarioPrevisao,
  type DecisoesComerciaisSinteticas,
  type EstadoDecisaoComercial,
  type FiltroResponsavelRelatorio,
  type PeriodoRelatorioComercial,
  type RecomendacaoResponsavelSintetica,
  type RegistroDecisaoComercial,
  type RelatorioComercialSintetico,
  type ResumoInsightsComerciaisSinteticos,
  type ResumoPrevisaoSintetica,
} from "./demo-data";
import {
  AcompanharLeadSinteticoDialog,
  CapturarLeadSinteticoDialog,
  GerenciarTarefasSinteticasDialog,
  NovaCampanhaSinteticaDialog,
  NovaPaginaSinteticaDialog,
  NovoContatoSinteticoDialog,
  NovoImovelSinteticoDialog,
  PropostaEFechamentoSinteticoDialog,
  type AcompanhamentoSinteticoCriado,
  type CampanhaSinteticaCriada,
  type CaptacaoSinteticaCriada,
  type ContatoSinteticoCriado,
  type ImovelSinteticoCriado,
  type PaginaSinteticaCriada,
  type PropostaSinteticaAtualizada,
  type TarefaSintetica,
  type TarefaSinteticaAtualizada,
} from "./SyntheticWorkflowDialogs";
type ModuloId =
  | "visao-geral"
  | "funil"
  | "imoveis"
  | "leads"
  | "agenda"
  | "campanhas"
  | "analises"
  | "ia"
  | "sites"
  | "integracoes";

type RecomendacaoComercialSintetica = RecomendacaoResponsavelSintetica;

type ItemNavegacao = {
  id: ModuloId;
  rotulo: string;
  descricao: string;
  icone: LucideIcon;
};

const itensNavegacao: ItemNavegacao[] = [
  {
    id: "visao-geral",
    rotulo: "Visão geral",
    descricao: "Indicadores da operação",
    icone: LayoutDashboard,
  },
  { id: "funil", rotulo: "Funil de vendas", descricao: "Oportunidades por etapa", icone: Inbox },
  { id: "imoveis", rotulo: "Imóveis", descricao: "Catálogo e disponibilidade", icone: Building2 },
  { id: "leads", rotulo: "Leads", descricao: "Contatos e atendimento", icone: Users },
  {
    id: "agenda",
    rotulo: "Agenda da equipe",
    descricao: "Visitas, tarefas e carga",
    icone: CalendarDays,
  },
  { id: "campanhas", rotulo: "Campanhas", descricao: "Aquisição e conversão", icone: Target },
  { id: "analises", rotulo: "Análises", descricao: "Resultados e tendências", icone: BarChart3 },
  {
    id: "ia",
    rotulo: "Inteligência artificial",
    descricao: "Assistente e recomendações",
    icone: Sparkles,
  },
  { id: "sites", rotulo: "Sites e páginas", descricao: "Conteúdo e publicação", icone: Globe2 },
  { id: "integracoes", rotulo: "Integrações", descricao: "Canais e portais", icone: Network },
];

const propriedades = [
  {
    titulo: "Cobertura contemporânea",
    bairro: "Lourdes · Belo Horizonte",
    valor: "R$ 4.850.000",
    detalhes: "312 m² · 4 suítes · 5 vagas",
    imagem: property1,
    estado: "Disponível",
    valorNumerico: 4_850_000,
    ordemRecente: 0,
  },
  {
    titulo: "Apartamento com vista definitiva",
    bairro: "Vila da Serra · Nova Lima",
    valor: "R$ 3.290.000",
    detalhes: "248 m² · 4 quartos · 4 vagas",
    imagem: property2,
    estado: "Em negociação",
    valorNumerico: 3_290_000,
    ordemRecente: 1,
  },
  {
    titulo: "Residência autoral",
    bairro: "Belvedere · Belo Horizonte",
    valor: "R$ 6.780.000",
    detalhes: "480 m² · 5 suítes · 6 vagas",
    imagem: property3,
    estado: "Exclusividade",
    valorNumerico: 6_780_000,
    ordemRecente: 2,
  },
];

const paginaCatalogoDemonstracao = {
  titulo: "Catálogo principal de imóveis",
  caminho: "/imoveis",
};

const estiloTooltip = {
  background: "#ffffff",
  border: "1px solid rgba(18, 63, 71, 0.12)",
  borderRadius: "14px",
  boxShadow: "0 18px 50px -24px rgba(18, 63, 71, 0.35)",
  color: "#123f47",
};

type EventoAgendaSintetica = {
  id: string;
  tipo: "Visita" | "Tarefa";
  titulo: string;
  contatoNome: string;
  responsavel: string;
  data: string;
  dataExibicao: string;
  horario: string;
  estado: "Pendente" | "Concluída";
  prioridade?: TarefaSintetica["prioridade"];
};

type CargaEquipeSintetica = {
  responsavel: string;
  compromissos: number;
  classificacao: "Livre" | "Carga equilibrada" | "Atenção à carga";
};

function criarEventosAgendaSintetica(leads: ContatoSinteticoCriado[]): EventoAgendaSintetica[] {
  return leads.flatMap((lead) => [
    ...(lead.visitaAgendada
      ? [
          {
            id: `visita-${lead.nome}-${lead.visitaAgendada.data}-${lead.visitaAgendada.horario}`,
            tipo: "Visita" as const,
            titulo: `Visita · ${lead.imovelSelecionado}`,
            contatoNome: lead.nome,
            responsavel: lead.responsavel,
            data: lead.visitaAgendada.data,
            dataExibicao: lead.visitaAgendada.dataExibicao,
            horario: lead.visitaAgendada.horario,
            estado: "Pendente" as const,
          },
        ]
      : []),
    ...(lead.tarefas ?? []).map((tarefa) => ({
      id: tarefa.id,
      tipo: "Tarefa" as const,
      titulo: tarefa.titulo,
      contatoNome: lead.nome,
      responsavel: tarefa.responsavel,
      data: tarefa.prazo,
      dataExibicao: tarefa.prazoExibicao,
      horario: tarefa.horario,
      estado: tarefa.estado,
      prioridade: tarefa.prioridade,
    })),
  ]);
}

function identificarConflitosAgenda(eventos: EventoAgendaSintetica[]) {
  const grupos = new Map<string, EventoAgendaSintetica[]>();
  eventos
    .filter((evento) => evento.estado === "Pendente")
    .forEach((evento) => {
      const chave = `${evento.responsavel}|${evento.data}|${evento.horario}`;
      grupos.set(chave, [...(grupos.get(chave) ?? []), evento]);
    });
  const gruposComConflito = [...grupos.values()].filter((grupo) => grupo.length > 1);
  return {
    total: gruposComConflito.length,
    ids: new Set(gruposComConflito.flatMap((grupo) => grupo.map((evento) => evento.id))),
  };
}

function calcularCargaEquipeSintetica(eventos: EventoAgendaSintetica[]): CargaEquipeSintetica[] {
  const porResponsavel = new Map<string, number>();
  eventos
    .filter((evento) => evento.estado === "Pendente")
    .forEach((evento) =>
      porResponsavel.set(evento.responsavel, (porResponsavel.get(evento.responsavel) ?? 0) + 1),
    );
  return [...porResponsavel.entries()]
    .map(([responsavel, compromissos]) => ({
      responsavel,
      compromissos,
      classificacao:
        compromissos >= 3
          ? ("Atenção à carga" as const)
          : compromissos > 0
            ? ("Carga equilibrada" as const)
            : ("Livre" as const),
    }))
    .sort((a, b) => b.compromissos - a.compromissos || a.responsavel.localeCompare(b.responsavel));
}

function somarDias(data: string, quantidade: number) {
  const valor = new Date(`${data}T12:00:00`);
  valor.setDate(valor.getDate() + quantidade);
  return valor.toISOString().slice(0, 10);
}

function inicioDaSemana(data: string) {
  const valor = new Date(`${data}T12:00:00`);
  const deslocamento = valor.getDay() === 0 ? -6 : 1 - valor.getDay();
  return somarDias(data, deslocamento);
}

function exibirDataAgenda(data: string, formato: "curto" | "completo" = "completo") {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: formato === "completo" ? "short" : undefined,
    day: "2-digit",
    month: formato === "completo" ? "long" : "2-digit",
  }).format(new Date(`${data}T12:00:00`));
}

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const formatadorPercentual = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

function formatarValorCompacto(valor: number) {
  if (valor >= 1_000_000) {
    return `R$ ${new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(valor / 1_000_000)} mi`;
  }
  return formatadorMoeda.format(valor);
}

function confirmarAcaoSintetica(titulo: string, detalhe: string) {
  toast.success(titulo, {
    description: `${detalhe} Nenhum dado real foi alterado.`,
  });
}

export function DemoWorkspace() {
  const [moduloAtivo, setModuloAtivo] = useState<ModuloId>("visao-geral");
  const [menuAberto, setMenuAberto] = useState(false);
  const [imoveisCriados, setImoveisCriados] = useState<ImovelSinteticoCriado[]>([]);
  const [leadsCriados, setLeadsCriados] = useState<ContatoSinteticoCriado[]>([]);
  const [campanhasCriadas, setCampanhasCriadas] = useState<CampanhaSinteticaCriada[]>([]);
  const [paginasCriadas, setPaginasCriadas] = useState<PaginaSinteticaCriada[]>([]);
  const [cenarioPrevisao, setCenarioPrevisao] = useState<CenarioPrevisao>("Realista");
  const [periodoRelatorio, setPeriodoRelatorio] =
    useState<PeriodoRelatorioComercial>("Últimos 30 dias");
  const [responsavelRelatorio, setResponsavelRelatorio] =
    useState<FiltroResponsavelRelatorio>("Toda a equipe");
  const [decisoesComerciais, setDecisoesComerciais] = useState<DecisoesComerciaisSinteticas>({});
  const modulo = useMemo(
    () => itensNavegacao.find((item) => item.id === moduloAtivo) ?? itensNavegacao[0],
    [moduloAtivo],
  );

  useEffect(() => {
    function sincronizarModuloComEndereco() {
      const id = window.location.hash.slice(1);
      if (itensNavegacao.some((item) => item.id === id)) {
        setModuloAtivo(id as ModuloId);
      }
    }

    sincronizarModuloComEndereco();
    window.addEventListener("hashchange", sincronizarModuloComEndereco);
    return () => window.removeEventListener("hashchange", sincronizarModuloComEndereco);
  }, []);

  function selecionarModulo(id: ModuloId) {
    setModuloAtivo(id);
    setMenuAberto(false);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${id}`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const imoveisDisponiveis = [
    ...imoveisCriados.map(({ titulo, bairro }) => ({ titulo, bairro })),
    ...propriedades.map(({ titulo, bairro }) => ({ titulo, bairro })),
  ];
  const paginasDisponiveis = [
    ...paginasCriadas.map(({ titulo, caminho }) => ({ titulo, caminho })),
    paginaCatalogoDemonstracao,
  ];
  const captacoesSinteticas = leadsCriados.filter((lead) => lead.captadoPorCampanha).length;
  const qualificacoesSinteticas = leadsCriados.filter(
    (lead) => lead.qualificacao === "Qualificado",
  ).length;
  const visitasAgendadasSinteticas = leadsCriados.filter((lead) => lead.visitaAgendada).length;
  const avancosFunilSinteticos = leadsCriados.reduce(
    (total, lead) =>
      total + lead.historicoAtendimento.filter((item) => item.tipo === "Avanço de etapa").length,
    0,
  );
  const propostasSinteticas = leadsCriados.filter((lead) => lead.proposta).length;
  const propostasEmNegociacaoSinteticas = leadsCriados.filter(
    (lead) => lead.proposta?.estado === "Em negociação",
  ).length;
  const negociosGanhosSinteticos = leadsCriados.filter(
    (lead) => lead.proposta?.estado === "Ganha",
  ).length;
  const negociosPerdidosSinteticos = leadsCriados.filter(
    (lead) => lead.proposta?.estado === "Perdida",
  ).length;
  const valorNegociosGanhosSinteticos = leadsCriados.reduce(
    (total, lead) => total + (lead.proposta?.estado === "Ganha" ? lead.proposta.valorNumerico : 0),
    0,
  );
  const hoje = new Date().toISOString().slice(0, 10);
  const tarefasSinteticas = leadsCriados.flatMap((lead) =>
    (lead.tarefas ?? []).map((tarefa) => ({
      ...tarefa,
      contatoNome: lead.nome,
      etapaContato: lead.etapa,
    })),
  );
  const tarefasPendentesSinteticas = tarefasSinteticas.filter(
    (tarefa) => tarefa.estado === "Pendente",
  );
  const tarefasConcluidasSinteticas = tarefasSinteticas.filter(
    (tarefa) => tarefa.estado === "Concluída",
  ).length;
  const tarefasAltaPrioridadeSinteticas = tarefasPendentesSinteticas.filter(
    (tarefa) => tarefa.prioridade === "Alta",
  ).length;
  const tarefasVencendoHojeSinteticas = tarefasPendentesSinteticas.filter(
    (tarefa) => tarefa.prazo === hoje,
  ).length;
  const ordemPrioridade: Record<TarefaSintetica["prioridade"], number> = {
    Alta: 0,
    Média: 1,
    Baixa: 2,
  };
  const alertasTarefasSinteticas = [...tarefasPendentesSinteticas]
    .sort(
      (a, b) =>
        ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade] ||
        a.prazo.localeCompare(b.prazo),
    )
    .slice(0, 4);
  const eventosAgendaSintetica = criarEventosAgendaSintetica(leadsCriados);
  const conflitosAgendaSintetica = identificarConflitosAgenda(eventosAgendaSintetica);
  const cargaEquipeSintetica = calcularCargaEquipeSintetica(eventosAgendaSintetica);
  const compromissosAgendaSinteticos = eventosAgendaSintetica.filter(
    (evento) => evento.estado === "Pendente",
  ).length;
  const valoresImoveis = Object.fromEntries([
    ...propriedades.map((imovel) => [imovel.titulo, imovel.valorNumerico] as const),
    ...imoveisCriados.map((imovel) => [imovel.titulo, imovel.valorNumerico] as const),
  ]);
  const resumoPrevisaoSintetica = calcularPrevisaoSintetica({
    cenario: cenarioPrevisao,
    contatos: leadsCriados,
    valoresImoveis,
  });
  const relatorioComercialSintetico = calcularRelatorioComercialSintetico({
    periodo: periodoRelatorio,
    responsavel: responsavelRelatorio,
    resumoPrevisao: resumoPrevisaoSintetica,
    contatos: leadsCriados,
  });
  const insightsComerciaisSinteticos = calcularInsightsComerciaisSinteticos({
    relatorio: relatorioComercialSintetico,
  });

  function registrarDecisaoComercial(
    recomendacao: RecomendacaoComercialSintetica,
    estado: AcaoDecisaoComercial,
  ) {
    setDecisoesComerciais((atuais) =>
      aplicarDecisaoComercialSintetica({
        decisoes: atuais,
        periodo: periodoRelatorio,
        recomendacao,
        estado,
      }),
    );
    const tituloPorEstado: Record<AcaoDecisaoComercial, string> = {
      Aceita: "Recomendação aceita na simulação",
      Adiada: "Recomendação adiada na simulação",
      Dispensada: "Recomendação dispensada na simulação",
    };
    confirmarAcaoSintetica(
      tituloPorEstado[estado],
      `${recomendacao.proximaAcao} para ${recomendacao.responsavel} não gerou nenhuma ação real.`,
    );
  }

  function encaminharContatoAoFunil(contato: ContatoSinteticoCriado) {
    setLeadsCriados((atuais) =>
      atuais.map((item) =>
        item === contato ? { ...item, etapa: "Novos contatos", encaminhadoAoFunil: true } : item,
      ),
    );
    confirmarAcaoSintetica(
      "Contato encaminhado ao funil",
      `${contato.nome} entrou na etapa Novos contatos somente nesta sessão.`,
    );
    selecionarModulo("funil");
  }

  function captarLeadDaCampanha({ contato, campanha }: CaptacaoSinteticaCriada) {
    setLeadsCriados((atuais) => [contato, ...atuais]);
    setCampanhasCriadas((atuais) =>
      atuais.map((item) => {
        if (item !== campanha) return item;
        const totalLeads = item.leads + 1;
        const conversao = new Intl.NumberFormat("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).format(totalLeads * 1.2);
        return {
          ...item,
          leads: totalLeads,
          custo: formatadorMoeda.format(item.investimentoNumerico / totalLeads),
          conversao: `${conversao}%`,
        };
      }),
    );
    confirmarAcaoSintetica(
      "Lead captado e enviado ao funil",
      `${contato.nome} veio de ${campanha.nome} e entrou em Novos contatos nesta sessão.`,
    );
    selecionarModulo("funil");
  }

  function salvarAcompanhamento({
    contato,
    qualificacao,
    etapaDestino,
    registroAtendimento,
    visitaAgendada,
  }: AcompanhamentoSinteticoCriado) {
    const etapaAnterior = contato.etapa === "Novo contato" ? "Novos contatos" : contato.etapa;
    const mudouEtapa = etapaDestino !== etapaAnterior;
    const qualificouAgora =
      contato.qualificacao !== "Qualificado" && qualificacao === "Qualificado";
    const agendouAgora =
      Boolean(visitaAgendada) &&
      `${contato.visitaAgendada?.data}-${contato.visitaAgendada?.horario}` !==
        `${visitaAgendada?.data}-${visitaAgendada?.horario}`;

    setLeadsCriados((atuais) =>
      atuais.map((item) => {
        if (item !== contato) return item;
        const novosEventos = [
          {
            titulo: "Atendimento registrado",
            detalhe: registroAtendimento,
            momento: "Agora",
            tipo: "Atendimento" as const,
          },
          ...(qualificouAgora
            ? [
                {
                  titulo: "Lead qualificado",
                  detalhe: "Interesse e disponibilidade confirmados pela equipe.",
                  momento: "Agora",
                  tipo: "Atendimento" as const,
                },
              ]
            : []),
          ...(mudouEtapa
            ? [
                {
                  titulo: "Avanço de etapa",
                  detalhe: `${etapaAnterior} → ${etapaDestino}`,
                  momento: "Agora",
                  tipo: "Avanço de etapa" as const,
                },
              ]
            : []),
          ...(agendouAgora && visitaAgendada
            ? [
                {
                  titulo: "Visita agendada",
                  detalhe: `${visitaAgendada.dataExibicao} às ${visitaAgendada.horario} · ${contato.imovelSelecionado}`,
                  momento: "Agora",
                  tipo: "Visita" as const,
                },
              ]
            : []),
        ];
        return {
          ...item,
          qualificacao,
          etapa: etapaDestino,
          visitaAgendada,
          historicoAtendimento: [...item.historicoAtendimento, ...novosEventos],
        };
      }),
    );
    confirmarAcaoSintetica(
      mudouEtapa ? "Atendimento salvo e etapa avançada" : "Atendimento salvo no histórico",
      `${contato.nome} permanece somente na sessão de demonstração.`,
    );
  }

  function salvarPropostaSintetica({
    contato,
    proposta,
    etapaDestino,
    novosEventos,
  }: PropostaSinteticaAtualizada) {
    setLeadsCriados((atuais) =>
      atuais.map((item) =>
        item === contato
          ? {
              ...item,
              proposta,
              etapa: etapaDestino,
              historicoAtendimento: [...item.historicoAtendimento, ...novosEventos],
            }
          : item,
      ),
    );
    const titulo =
      proposta.estado === "Ganha"
        ? "Negócio fictício concluído como ganho"
        : proposta.estado === "Perdida"
          ? "Negócio fictício concluído como perdido"
          : contato.proposta
            ? "Negociação registrada"
            : "Proposta fictícia criada";
    confirmarAcaoSintetica(titulo, `${contato.nome} permanece somente na sessão de demonstração.`);
  }

  function salvarTarefaSintetica({
    contato,
    tarefa,
    acao,
    novosEventos,
  }: TarefaSinteticaAtualizada) {
    setLeadsCriados((atuais) =>
      atuais.map((item) => {
        if (item !== contato) return item;
        const tarefasAtuais = item.tarefas ?? [];
        const tarefas =
          acao === "Criar"
            ? [...tarefasAtuais, tarefa]
            : tarefasAtuais.map((existente) => (existente.id === tarefa.id ? tarefa : existente));
        return {
          ...item,
          responsavel: acao === "Criar" ? tarefa.responsavel : item.responsavel,
          tarefas,
          historicoAtendimento: [...item.historicoAtendimento, ...novosEventos],
        };
      }),
    );
    confirmarAcaoSintetica(
      acao === "Criar" ? "Tarefa fictícia distribuída" : "Tarefa fictícia concluída",
      `${tarefa.titulo} permanece somente na sessão de demonstração.`,
    );
  }

  return (
    <div className="min-h-dvh bg-[#f6f4ef] text-[#123f47]">
      <a
        href="#conteudo-demonstracao"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        Ir para o conteúdo principal
      </a>

      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-[272px] shrink-0 flex-col border-r border-[#123f47]/10 bg-[#113b42] text-white lg:flex">
          <Navegacao selecionarModulo={selecionarModulo} moduloAtivo={moduloAtivo} />
        </aside>

        {menuAberto ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              className="absolute inset-0 bg-[#09282d]/60 backdrop-blur-sm"
              onClick={() => setMenuAberto(false)}
            />
            <aside className="relative flex h-full w-[min(88vw,320px)] flex-col bg-[#113b42] text-white shadow-2xl">
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                className="absolute right-3 top-3 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Fechar navegação"
              >
                <X className="size-5" />
              </button>
              <Navegacao selecionarModulo={selecionarModulo} moduloAtivo={moduloAtivo} />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-[#123f47]/10 bg-[#fbfaf7]/90 px-4 backdrop-blur-xl sm:px-6">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="rounded-xl border border-[#123f47]/10 bg-white p-2.5 lg:hidden"
              aria-label="Abrir navegação"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{modulo.rotulo}</p>
              <p className="hidden truncate text-xs text-[#587076] sm:block">{modulo.descricao}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <Badge
                variant="outline"
                className="hidden border-[#123f47]/15 bg-white text-[#123f47] hover:bg-white xl:inline-flex"
              >
                Empresa demonstrativa: {CONTEXTO_DEMONSTRACAO.tenant.nome}
              </Badge>
              <Badge className="hidden border-emerald-600/20 bg-emerald-50 text-emerald-800 hover:bg-emerald-50 md:inline-flex">
                <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500" /> Dados de
                demonstração
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="hidden rounded-xl sm:inline-flex"
                asChild
              >
                <Link to="/design-system">Ver padrões visuais</Link>
              </Button>
              <button
                type="button"
                onClick={() =>
                  confirmarAcaoSintetica(
                    "Conta de demonstração",
                    "Esta é uma representação visual do acesso da equipe.",
                  )
                }
                className="flex size-10 items-center justify-center rounded-full bg-[#123f47] text-sm font-semibold text-white"
                aria-label="Conta de demonstração da equipe"
              >
                EQ
              </button>
            </div>
          </header>

          <main
            id="conteudo-demonstracao"
            className="mx-auto w-full max-w-[1560px] p-4 sm:p-6 lg:p-8"
            tabIndex={-1}
          >
            <AvisoDemonstracao />
            {moduloAtivo === "visao-geral" ? (
              <VisaoGeral
                captacoesSinteticas={captacoesSinteticas}
                qualificacoesSinteticas={qualificacoesSinteticas}
                visitasAgendadasSinteticas={visitasAgendadasSinteticas}
                avancosFunilSinteticos={avancosFunilSinteticos}
                propostasSinteticas={propostasSinteticas}
                propostasEmNegociacaoSinteticas={propostasEmNegociacaoSinteticas}
                negociosGanhosSinteticos={negociosGanhosSinteticos}
                negociosPerdidosSinteticos={negociosPerdidosSinteticos}
                valorNegociosGanhosSinteticos={valorNegociosGanhosSinteticos}
                tarefasPendentesSinteticas={tarefasPendentesSinteticas.length}
                tarefasAltaPrioridadeSinteticas={tarefasAltaPrioridadeSinteticas}
                tarefasVencendoHojeSinteticas={tarefasVencendoHojeSinteticas}
                tarefasConcluidasSinteticas={tarefasConcluidasSinteticas}
                alertasTarefasSinteticas={alertasTarefasSinteticas}
                compromissosAgendaSinteticos={compromissosAgendaSinteticos}
                conflitosAgendaSinteticos={conflitosAgendaSintetica.total}
                cargaEquipeSintetica={cargaEquipeSintetica}
                resumoPrevisaoSintetica={resumoPrevisaoSintetica}
                onSelecionarCenario={setCenarioPrevisao}
                relatorioComercialSintetico={relatorioComercialSintetico}
                periodoRelatorio={periodoRelatorio}
                responsavelRelatorio={responsavelRelatorio}
                onSelecionarPeriodoRelatorio={setPeriodoRelatorio}
                onSelecionarResponsavelRelatorio={setResponsavelRelatorio}
                insightsComerciaisSinteticos={insightsComerciaisSinteticos}
                decisoesComerciais={decisoesComerciais}
                onRegistrarDecisao={registrarDecisaoComercial}
              />
            ) : null}
            {moduloAtivo === "funil" ? (
              <FunilDeVendas
                leadsCriados={leadsCriados}
                onAdicionarLead={() => selecionarModulo("leads")}
                onAcompanharLead={salvarAcompanhamento}
                onSalvarProposta={salvarPropostaSintetica}
                onSalvarTarefa={salvarTarefaSintetica}
                resumoPrevisaoSintetica={resumoPrevisaoSintetica}
                onSelecionarCenario={setCenarioPrevisao}
              />
            ) : null}
            {moduloAtivo === "imoveis" ? (
              <Imoveis
                imoveisCriados={imoveisCriados}
                onCriarImovel={(imovel) => setImoveisCriados((atuais) => [imovel, ...atuais])}
              />
            ) : null}
            {moduloAtivo === "leads" ? (
              <Leads
                leadsCriados={leadsCriados}
                imoveisDisponiveis={imoveisDisponiveis}
                onCriarContato={(contato) => setLeadsCriados((atuais) => [contato, ...atuais])}
                onEncaminharAoFunil={encaminharContatoAoFunil}
                onAcompanharLead={salvarAcompanhamento}
                onSalvarProposta={salvarPropostaSintetica}
                onSalvarTarefa={salvarTarefaSintetica}
              />
            ) : null}
            {moduloAtivo === "agenda" ? <AgendaDaEquipe leadsCriados={leadsCriados} /> : null}
            {moduloAtivo === "campanhas" ? (
              <Campanhas
                campanhasCriadas={campanhasCriadas}
                paginasDisponiveis={paginasDisponiveis}
                imoveisDisponiveis={imoveisDisponiveis}
                onCriarCampanha={(campanha) =>
                  setCampanhasCriadas((atuais) => [campanha, ...atuais])
                }
                onCaptarLead={captarLeadDaCampanha}
              />
            ) : null}
            {moduloAtivo === "analises" ? (
              <Analises
                relatorio={relatorioComercialSintetico}
                periodo={periodoRelatorio}
                responsavel={responsavelRelatorio}
                onSelecionarPeriodo={setPeriodoRelatorio}
                onSelecionarResponsavel={setResponsavelRelatorio}
                insights={insightsComerciaisSinteticos}
                decisoesComerciais={decisoesComerciais}
                onRegistrarDecisao={registrarDecisaoComercial}
              />
            ) : null}
            {moduloAtivo === "ia" ? (
              <InteligenciaArtificial
                insights={insightsComerciaisSinteticos}
                periodo={periodoRelatorio}
                responsavel={responsavelRelatorio}
                onSelecionarPeriodo={setPeriodoRelatorio}
                onSelecionarResponsavel={setResponsavelRelatorio}
                decisoesComerciais={decisoesComerciais}
                onRegistrarDecisao={registrarDecisaoComercial}
              />
            ) : null}
            {moduloAtivo === "sites" ? (
              <SitesEPaginas
                paginasCriadas={paginasCriadas}
                campanhasCriadas={campanhasCriadas}
                onCriarPagina={(pagina) => setPaginasCriadas((atuais) => [pagina, ...atuais])}
              />
            ) : null}
            {moduloAtivo === "integracoes" ? <Integracoes /> : null}
          </main>
        </div>
      </div>
    </div>
  );
}

function Navegacao({
  selecionarModulo,
  moduloAtivo,
}: {
  selecionarModulo: (id: ModuloId) => void;
  moduloAtivo: ModuloId;
}) {
  return (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#d6a84b] text-sm font-black tracking-tight text-[#123f47]">
          R1
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-[0.16em] text-white">REAL ONE</p>
          <p className="truncate text-[10px] text-white/50">Plataforma SaaS imobiliária</p>
        </div>
      </div>
      <div className="px-4 pb-3 pt-4">
        <p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9dd7d2]">
          Empresa demonstrativa
        </p>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/7 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
            <img src={logo} alt="RM Prime Imóveis" className="h-full w-full object-contain" />
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-xs text-white">RM Prime Imóveis</strong>
            <span className="block truncate text-[10px] text-white/45">rmprimeimoveis.com.br</span>
          </span>
        </div>
      </div>
      <nav
        className="flex-1 space-y-1 overflow-y-auto px-3 pb-5"
        aria-label="Módulos da demonstração"
      >
        {itensNavegacao.map((item) => {
          const Icone = item.icone;
          const ativo = item.id === moduloAtivo;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selecionarModulo(item.id)}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                ativo
                  ? "bg-white text-[#123f47] shadow-lg shadow-black/10"
                  : "text-white/70 hover:bg-white/8 hover:text-white",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  ativo ? "bg-[#e6f4f1] text-[#123f47]" : "bg-white/8 text-[#9dd7d2]",
                )}
              >
                <Icone className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{item.rotulo}</span>
                <span
                  className={cn(
                    "block truncate text-[11px]",
                    ativo ? "text-[#587076]" : "text-white/45",
                  )}
                >
                  {item.descricao}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <Link
          to="/auth"
          className="flex items-center gap-3 rounded-xl bg-white/7 p-3 text-sm text-white/80 transition hover:bg-white/12 hover:text-white"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-[#d6a84b] text-[#123f47]">
            <UserRound className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate">Acesso da equipe</strong>
            <span className="block truncate text-[11px] text-white/45">
              Entrar com conta autorizada
            </span>
          </span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </>
  );
}

function AvisoDemonstracao() {
  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-50 to-white">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <Lightbulb className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-950">
            Ambiente visual com dados inteiramente fictícios
          </p>
          <p className="mt-0.5 text-xs leading-5 text-amber-900/70">
            Use a navegação para avaliar design, gráficos, jornadas e nomenclaturas. Nenhuma ação
            alcança clientes ou campanhas reais.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-amber-500/30 bg-white text-amber-900">
          Homologação visual
        </Badge>
      </div>
      <div
        className="grid border-t border-amber-400/20 bg-white/65 sm:grid-cols-2"
        aria-label="Separação entre a plataforma e a empresa demonstrativa"
      >
        <div className="flex items-center gap-3 px-4 py-3 sm:border-r sm:border-amber-400/20">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#123f47] text-white">
            <Globe2 className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#587076]">
              Plataforma SaaS
            </p>
            <p className="truncate text-sm font-semibold">
              {CONTEXTO_DEMONSTRACAO.plataforma.nome}
            </p>
            <p className="truncate text-[11px] text-[#587076]">
              {CONTEXTO_DEMONSTRACAO.plataforma.dominio}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-amber-400/20 px-4 py-3 sm:border-t-0">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#d6a84b] text-[#123f47]">
            <Building2 className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#587076]">
              Empresa demonstrativa
            </p>
            <p className="truncate text-sm font-semibold">{CONTEXTO_DEMONSTRACAO.tenant.nome}</p>
            <p className="truncate text-[11px] text-[#587076]">
              {CONTEXTO_DEMONSTRACAO.tenant.dominio}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CabecalhoPagina({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#b17a20]">
          Real One · empresa RM Prime Imóveis
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{titulo}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#587076]">{descricao}</p>
      </div>
      {acao}
    </div>
  );
}

function VisaoGeral({
  captacoesSinteticas,
  qualificacoesSinteticas,
  visitasAgendadasSinteticas,
  avancosFunilSinteticos,
  propostasSinteticas,
  propostasEmNegociacaoSinteticas,
  negociosGanhosSinteticos,
  negociosPerdidosSinteticos,
  valorNegociosGanhosSinteticos,
  tarefasPendentesSinteticas,
  tarefasAltaPrioridadeSinteticas,
  tarefasVencendoHojeSinteticas,
  tarefasConcluidasSinteticas,
  alertasTarefasSinteticas,
  compromissosAgendaSinteticos,
  conflitosAgendaSinteticos,
  cargaEquipeSintetica,
  resumoPrevisaoSintetica,
  onSelecionarCenario,
  relatorioComercialSintetico,
  periodoRelatorio,
  responsavelRelatorio,
  onSelecionarPeriodoRelatorio,
  onSelecionarResponsavelRelatorio,
  insightsComerciaisSinteticos,
  decisoesComerciais,
  onRegistrarDecisao,
}: {
  captacoesSinteticas: number;
  qualificacoesSinteticas: number;
  visitasAgendadasSinteticas: number;
  avancosFunilSinteticos: number;
  propostasSinteticas: number;
  propostasEmNegociacaoSinteticas: number;
  negociosGanhosSinteticos: number;
  negociosPerdidosSinteticos: number;
  valorNegociosGanhosSinteticos: number;
  tarefasPendentesSinteticas: number;
  tarefasAltaPrioridadeSinteticas: number;
  tarefasVencendoHojeSinteticas: number;
  tarefasConcluidasSinteticas: number;
  alertasTarefasSinteticas: Array<TarefaSintetica & { contatoNome: string; etapaContato: string }>;
  compromissosAgendaSinteticos: number;
  conflitosAgendaSinteticos: number;
  cargaEquipeSintetica: CargaEquipeSintetica[];
  resumoPrevisaoSintetica: ResumoPrevisaoSintetica;
  onSelecionarCenario: (cenario: CenarioPrevisao) => void;
  relatorioComercialSintetico: RelatorioComercialSintetico;
  periodoRelatorio: PeriodoRelatorioComercial;
  responsavelRelatorio: FiltroResponsavelRelatorio;
  onSelecionarPeriodoRelatorio: (periodo: PeriodoRelatorioComercial) => void;
  onSelecionarResponsavelRelatorio: (responsavel: FiltroResponsavelRelatorio) => void;
  insightsComerciaisSinteticos: ResumoInsightsComerciaisSinteticos;
  decisoesComerciais: DecisoesComerciaisSinteticas;
  onRegistrarDecisao: (
    recomendacao: RecomendacaoComercialSintetica,
    estado: AcaoDecisaoComercial,
  ) => void;
}) {
  const acompanhamentosSinteticos =
    qualificacoesSinteticas + visitasAgendadasSinteticas + avancosFunilSinteticos;
  const resultadosComerciaisSinteticos =
    propostasSinteticas +
    propostasEmNegociacaoSinteticas +
    negociosGanhosSinteticos +
    negociosPerdidosSinteticos;
  const valorGeralVendas = `R$ ${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format((38_700_000 + valorNegociosGanhosSinteticos) / 1_000_000)} mi`;

  return (
    <>
      <CabecalhoPagina
        titulo="Bom trabalho, equipe comercial"
        descricao="Acompanhe a operação comercial, identifique oportunidades e priorize as próximas ações da equipe."
        acao={
          <Button
            className="rounded-xl bg-[#123f47] hover:bg-[#0b3036]"
            onClick={() =>
              confirmarAcaoSintetica(
                "Análise sintética gerada",
                "As recomendações foram atualizadas somente nesta demonstração.",
              )
            }
          >
            <Sparkles className="mr-2 size-4" />
            Gerar análise com IA
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoMetrica
          rotulo="Leads no período"
          valor={String(421 + captacoesSinteticas)}
          variacao={
            captacoesSinteticas > 0
              ? `${captacoesSinteticas} ${captacoesSinteticas === 1 ? "captação adicionada" : "captações adicionadas"} nesta sessão`
              : "18,2% acima do período anterior"
          }
          icone={Users}
          tom="violeta"
        />
        <CartaoMetrica
          rotulo="Visitas agendadas"
          valor={String(173 + visitasAgendadasSinteticas)}
          variacao={
            visitasAgendadasSinteticas > 0
              ? `${visitasAgendadasSinteticas} ${visitasAgendadasSinteticas === 1 ? "nova visita fictícia" : "novas visitas fictícias"} nesta sessão`
              : "24 visitas nesta semana"
          }
          icone={Home}
          tom="coral"
        />
        <CartaoMetrica
          rotulo="Taxa de conversão"
          valor="8,4%"
          variacao="1,6 ponto percentual de alta"
          icone={TrendingUp}
          tom="esmeralda"
        />
        <CartaoMetrica
          rotulo="Valor geral de vendas"
          valor={valorGeralVendas}
          variacao={
            negociosGanhosSinteticos > 0
              ? `${negociosGanhosSinteticos} fechamento fictício nesta sessão`
              : "R$ 4,9 mi em negócios fechados"
          }
          icone={CircleDollarSign}
          tom="dourado"
        />
      </div>

      <PainelPrevisaoDashboard
        resumo={resumoPrevisaoSintetica}
        onSelecionarCenario={onSelecionarCenario}
      />

      <ResumoRelatorioDashboard
        relatorio={relatorioComercialSintetico}
        periodo={periodoRelatorio}
        responsavel={responsavelRelatorio}
        onSelecionarPeriodo={onSelecionarPeriodoRelatorio}
        onSelecionarResponsavel={onSelecionarResponsavelRelatorio}
        insights={insightsComerciaisSinteticos}
        decisoesComerciais={decisoesComerciais}
        onRegistrarDecisao={onRegistrarDecisao}
      />

      {captacoesSinteticas > 0 ? (
        <div
          className="mt-4 flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between"
          aria-live="polite"
        >
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-4 text-emerald-700" />
            Indicadores atualizados pela jornada sintética
          </span>
          <span className="text-xs text-emerald-800">
            {captacoesSinteticas} {captacoesSinteticas === 1 ? "lead captado" : "leads captados"} e
            enviado ao funil nesta sessão
          </span>
        </div>
      ) : null}

      {acompanhamentosSinteticos > 0 ? (
        <section
          className="mt-4 grid gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:grid-cols-3"
          aria-label="Indicadores do acompanhamento nesta sessão"
          aria-live="polite"
        >
          <IndicadorDaSessao rotulo="Leads qualificados" valor={qualificacoesSinteticas} />
          <IndicadorDaSessao rotulo="Visitas agendadas" valor={visitasAgendadasSinteticas} />
          <IndicadorDaSessao rotulo="Avanços no funil" valor={avancosFunilSinteticos} />
        </section>
      ) : null}

      {resultadosComerciaisSinteticos > 0 ? (
        <section
          className="mt-4 grid gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Indicadores da proposta e fechamento nesta sessão"
          aria-live="polite"
        >
          <IndicadorDaSessao rotulo="Propostas criadas" valor={propostasSinteticas} />
          <IndicadorDaSessao rotulo="Em negociação" valor={propostasEmNegociacaoSinteticas} />
          <IndicadorDaSessao rotulo="Negócios ganhos" valor={negociosGanhosSinteticos} />
          <IndicadorDaSessao rotulo="Negócios perdidos" valor={negociosPerdidosSinteticos} />
        </section>
      ) : null}

      {tarefasPendentesSinteticas + tarefasConcluidasSinteticas > 0 ? (
        <section
          className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"
          aria-label="Tarefas e alertas da equipe nesta sessão"
          aria-live="polite"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 font-semibold text-amber-950">
              <BellRing className="size-4 text-amber-700" /> Central de tarefas da equipe
            </span>
            <span className="text-xs text-amber-800">
              Apenas simulação local; nenhuma pessoa receberá notificação.
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <IndicadorDaSessao rotulo="Tarefas pendentes" valor={tarefasPendentesSinteticas} />
            <IndicadorDaSessao rotulo="Alta prioridade" valor={tarefasAltaPrioridadeSinteticas} />
            <IndicadorDaSessao rotulo="Vencem hoje" valor={tarefasVencendoHojeSinteticas} />
            <IndicadorDaSessao rotulo="Tarefas concluídas" valor={tarefasConcluidasSinteticas} />
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-white/80 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#123f47]">
              <ListChecks className="size-4 text-amber-700" /> Alertas ativos
            </p>
            {alertasTarefasSinteticas.length > 0 ? (
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {alertasTarefasSinteticas.map((tarefa) => (
                  <li
                    key={tarefa.id}
                    className="rounded-xl border border-[#123f47]/10 bg-white px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-xs text-[#123f47]">{tarefa.titulo}</strong>
                      <Badge
                        className={cn(
                          "text-[10px]",
                          tarefa.prioridade === "Alta"
                            ? "bg-rose-100 text-rose-800 hover:bg-rose-100"
                            : tarefa.prioridade === "Média"
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                              : "bg-sky-100 text-sky-800 hover:bg-sky-100",
                        )}
                      >
                        Prioridade {tarefa.prioridade.toLocaleLowerCase("pt-BR")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-[#587076]">
                      {tarefa.contatoNome} · {tarefa.responsavel} · prazo {tarefa.prazoExibicao}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                      {tarefa.prazo === new Date().toISOString().slice(0, 10)
                        ? "Vence hoje"
                        : tarefa.etapaContato}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-emerald-800">Nenhum alerta pendente nesta sessão.</p>
            )}
          </div>
        </section>
      ) : null}

      {compromissosAgendaSinteticos > 0 ? (
        <section
          className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4"
          aria-label="Carga da equipe nesta sessão"
          aria-live="polite"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 font-semibold text-cyan-950">
              <CalendarDays className="size-4 text-cyan-700" /> Carga da agenda da equipe
            </span>
            <span className="text-xs text-cyan-800">
              Visitas e tarefas pendentes criadas apenas nesta sessão.
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <IndicadorDaSessao
              rotulo="Compromissos na agenda"
              valor={compromissosAgendaSinteticos}
            />
            <IndicadorDaSessao rotulo="Conflitos de horário" valor={conflitosAgendaSinteticos} />
            <IndicadorDaSessao rotulo="Responsáveis ativos" valor={cargaEquipeSintetica.length} />
            <IndicadorDaSessao
              rotulo="Maior carga individual"
              valor={cargaEquipeSintetica[0]?.compromissos ?? 0}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {cargaEquipeSintetica.map((carga, indice) => (
              <div
                key={carga.responsavel}
                className="rounded-xl border border-cyan-200 bg-white/85 p-3"
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <strong className="text-[#123f47]">{carga.responsavel}</strong>
                  <span className="font-semibold text-cyan-800">
                    {carga.compromissos} {carga.compromissos === 1 ? "compromisso" : "compromissos"}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-cyan-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      ["bg-violet-500", "bg-orange-500", "bg-emerald-500", "bg-sky-500"][
                        indice % 4
                      ],
                    )}
                    style={{ width: `${Math.min(100, carga.compromissos * 25)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-[#587076]">{carga.classificacao}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
        <Card className="min-w-0 rounded-2xl border-[#123f47]/10 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Evolução comercial</CardTitle>
                <p className="mt-1 text-xs text-[#587076]">
                  Volume semanal por etapa do atendimento
                </p>
              </div>
              <Badge variant="outline">Últimos 35 dias</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="h-[310px] w-full"
              role="img"
              aria-label="Gráfico da evolução semanal de leads, visitas, propostas e vendas"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={evolucaoComercial}
                  margin={{ top: 18, right: 8, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="preenchimento-leads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PALETA_GRAFICOS.violeta} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={PALETA_GRAFICOS.violeta} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#123f4715" strokeDasharray="4 6" />
                  <XAxis
                    dataKey="periodo"
                    tick={{ fontSize: 11 }}
                    stroke="#6b7e82"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#6b7e82"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={estiloTooltip} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 14 }} />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke={PALETA_GRAFICOS.violeta}
                    fill="url(#preenchimento-leads)"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitas"
                    name="Visitas"
                    stroke={PALETA_GRAFICOS.azulCeu}
                    fill="transparent"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="propostas"
                    name="Propostas"
                    stroke={PALETA_GRAFICOS.dourado}
                    fill="transparent"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    name="Vendas"
                    stroke={PALETA_GRAFICOS.esmeralda}
                    fill="transparent"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 rounded-2xl border-[#123f47]/10 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Origem dos leads</CardTitle>
            <p className="mt-1 text-xs text-[#587076]">Participação por canal de aquisição</p>
          </CardHeader>
          <CardContent>
            <div
              className="h-[215px]"
              role="img"
              aria-label="Gráfico de rosca com a origem dos leads"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={origemDosLeads}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {origemDosLeads.map((item) => (
                      <Cell key={item.nome} fill={item.cor} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={estiloTooltip}
                    formatter={(valor) => [`${valor}%`, "Participação"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="grid gap-2">
              {origemDosLeads.map((item) => (
                <li
                  key={item.nome}
                  className="flex items-center justify-between rounded-lg bg-[#f6f4ef] px-3 py-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.cor }}
                    />
                    <span className="truncate">{item.nome}</span>
                  </span>
                  <strong>{item.valor}%</strong>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5">
        <Card className="rounded-2xl border-violet-200 bg-gradient-to-br from-violet-50 to-white">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">
                  Insight da inteligência artificial
                </p>
                <h2 className="mt-2 text-xl font-semibold text-violet-950">
                  Priorize os leads de Vila da Serra nas próximas 24 horas
                </h2>
                <p className="mt-2 text-sm leading-6 text-violet-950/65">
                  A procura aumentou 31% e três contatos quentes ainda não receberam uma proposta
                  personalizada. O potencial estimado é de R$ 8,2 milhões.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-violet-300 bg-white text-violet-800 hover:bg-violet-100"
                  onClick={() =>
                    confirmarAcaoSintetica(
                      "Contatos recomendados",
                      "Três contatos fictícios foram priorizados para avaliação visual.",
                    )
                  }
                >
                  Ver contatos recomendados <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function IndicadorDaSessao({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-xl border border-sky-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-sky-800">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold text-[#123f47]">{valor}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-[#587076]">Nesta sessão</p>
    </div>
  );
}

function CartaoMetrica({
  rotulo,
  valor,
  variacao,
  icone: Icone,
  tom,
}: {
  rotulo: string;
  valor: string;
  variacao: string;
  icone: LucideIcon;
  tom: "violeta" | "coral" | "esmeralda" | "dourado";
}) {
  const tons = {
    violeta: "bg-violet-100 text-violet-700",
    coral: "bg-orange-100 text-orange-700",
    esmeralda: "bg-emerald-100 text-emerald-700",
    dourado: "bg-amber-100 text-amber-800",
  };
  return (
    <Card className="rounded-2xl border-[#123f47]/10 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#587076]">{rotulo}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{valor}</p>
          </div>
          <span className={cn("flex size-10 items-center justify-center rounded-xl", tons[tom])}>
            <Icone className="size-5" />
          </span>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-[#587076]">
          <TrendingUp className="size-3.5 text-emerald-600" />
          {variacao}
        </p>
      </CardContent>
    </Card>
  );
}

function SeletorCenarioPrevisao({
  cenario,
  onSelecionar,
}: {
  cenario: CenarioPrevisao;
  onSelecionar: (cenario: CenarioPrevisao) => void;
}) {
  return (
    <div
      role="group"
      className="inline-flex w-full rounded-xl border border-[#123f47]/10 bg-white p-1 sm:w-auto"
      aria-label="Escolher cenário de previsão"
    >
      {(Object.keys(CENARIOS_PREVISAO) as CenarioPrevisao[]).map((opcao) => (
        <button
          key={opcao}
          type="button"
          aria-pressed={cenario === opcao}
          onClick={() => onSelecionar(opcao)}
          className={cn(
            "min-w-0 flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-none",
            cenario === opcao
              ? "bg-[#123f47] text-white shadow-sm"
              : "text-[#587076] hover:bg-[#e6f4f1] hover:text-[#123f47]",
          )}
        >
          {opcao}
        </button>
      ))}
    </div>
  );
}

function PainelPrevisaoDashboard({
  resumo,
  onSelecionarCenario,
}: {
  resumo: ResumoPrevisaoSintetica;
  onSelecionarCenario: (cenario: CenarioPrevisao) => void;
}) {
  const dadosGrafico = resumo.etapas;

  return (
    <section
      className="mt-5 overflow-hidden rounded-2xl border border-[#123f47]/10 bg-white shadow-sm"
      aria-labelledby="titulo-previsao-receita"
    >
      <div className="border-b border-[#123f47]/10 bg-gradient-to-r from-violet-50 via-white to-emerald-50 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
              Planejamento comercial fictício
            </p>
            <h2 id="titulo-previsao-receita" className="mt-1 text-xl font-semibold">
              Previsão de receita do funil
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#587076]">
              Compare hipóteses sem alterar clientes ou negociações reais. O cenário escolhido é
              compartilhado com o Funil durante esta sessão.
            </p>
          </div>
          <SeletorCenarioPrevisao cenario={resumo.cenario} onSelecionar={onSelecionarCenario} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ResumoPrevisao
            rotulo={`Previsão ${resumo.cenario.toLocaleLowerCase("pt-BR")}`}
            valor={formatarValorCompacto(resumo.totalPrevisto)}
            detalhe={resumo.descricaoCenario}
            tom="violeta"
          />
          <ResumoPrevisao
            rotulo="Potencial no funil"
            valor={formatarValorCompacto(resumo.totalPotencial)}
            detalhe="Soma de todas as oportunidades"
            tom="dourado"
          />
          <ResumoPrevisao
            rotulo="Cobertura da meta"
            valor={`${formatadorPercentual.format(resumo.coberturaMeta)}%`}
            detalhe={`Meta fictícia de ${formatarValorCompacto(resumo.metaTotal)}`}
            tom="esmeralda"
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Receita prevista por etapa</h3>
              <p className="mt-1 text-xs text-[#587076]">
                Valor em cada etapa × probabilidade ajustada pelo cenário.
              </p>
            </div>
            <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-violet-700 sm:mt-0">
              Valores exclusivamente sintéticos
            </span>
          </div>
          <div
            className="mt-4 h-[310px] w-full"
            role="img"
            aria-label={`Gráfico da previsão de receita por etapa no cenário ${resumo.cenario}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosGrafico}
                layout="vertical"
                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="#123f4715" strokeDasharray="4 6" />
                <XAxis
                  type="number"
                  tickFormatter={(valor) => `${Math.round(Number(valor) / 1_000_000)} mi`}
                  tick={{ fontSize: 10 }}
                  stroke="#6b7e82"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="nome"
                  tick={{ fontSize: 10 }}
                  stroke="#6b7e82"
                  tickLine={false}
                  axisLine={false}
                  width={108}
                />
                <Tooltip
                  contentStyle={estiloTooltip}
                  formatter={(valor) => [formatarValorCompacto(Number(valor)), "Receita prevista"]}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                <Bar
                  dataKey="valorPrevisto"
                  name="Receita prevista"
                  radius={[2, 8, 8, 2]}
                  maxBarSize={30}
                >
                  {dadosGrafico.map((etapa) => (
                    <Cell key={etapa.nome} fill={etapa.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Metas fictícias por responsável</h3>
          <p className="mt-1 text-xs leading-5 text-[#587076]">
            Projeção individual no cenário {resumo.cenario.toLocaleLowerCase("pt-BR")}.
          </p>
          <div className="mt-4 space-y-3">
            {resumo.metasResponsaveis.map((meta) => (
              <div key={meta.responsavel} className="rounded-xl bg-[#f6f4ef] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold">{meta.responsavel}</p>
                    <p className="mt-1 text-[10px] text-[#587076]">
                      Realizado {formatarValorCompacto(meta.realizado)} · Meta{" "}
                      {formatarValorCompacto(meta.meta)}
                    </p>
                  </div>
                  <div className="text-right">
                    <strong className="block text-xs">
                      {formatarValorCompacto(meta.previsao)}
                    </strong>
                    <span className="text-[10px] text-[#587076]">
                      {formatadorPercentual.format(meta.atingimentoPrevisto)}% previsto
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, meta.atingimentoPrevisto)}%`,
                      backgroundColor: meta.cor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FiltrosRelatorioComercial({
  periodo,
  responsavel,
  onSelecionarPeriodo,
  onSelecionarResponsavel,
  contexto,
}: {
  periodo: PeriodoRelatorioComercial;
  responsavel: FiltroResponsavelRelatorio;
  onSelecionarPeriodo: (periodo: PeriodoRelatorioComercial) => void;
  onSelecionarResponsavel: (responsavel: FiltroResponsavelRelatorio) => void;
  contexto: "dashboard" | "analises" | "ia";
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label
          htmlFor={`periodo-relatorio-${contexto}`}
          className="mb-1.5 block text-xs font-semibold text-[#123f47]"
        >
          Período do relatório
        </label>
        <select
          id={`periodo-relatorio-${contexto}`}
          value={periodo}
          onChange={(evento) =>
            onSelecionarPeriodo(evento.target.value as PeriodoRelatorioComercial)
          }
          className="h-10 w-full rounded-xl border border-[#123f47]/15 bg-white px-3 text-sm text-[#123f47] outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        >
          {PERIODOS_RELATORIO_COMERCIAL.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor={`responsavel-relatorio-${contexto}`}
          className="mb-1.5 block text-xs font-semibold text-[#123f47]"
        >
          Responsável comercial
        </label>
        <select
          id={`responsavel-relatorio-${contexto}`}
          value={responsavel}
          onChange={(evento) =>
            onSelecionarResponsavel(evento.target.value as FiltroResponsavelRelatorio)
          }
          className="h-10 w-full rounded-xl border border-[#123f47]/15 bg-white px-3 text-sm text-[#123f47] outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
        >
          {RESPONSAVEIS_RELATORIO_COMERCIAL.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ResumoRelatorioDashboard({
  relatorio,
  insights,
  decisoesComerciais,
  onRegistrarDecisao,
  periodo,
  responsavel,
  onSelecionarPeriodo,
  onSelecionarResponsavel,
}: {
  relatorio: RelatorioComercialSintetico;
  insights: ResumoInsightsComerciaisSinteticos;
  decisoesComerciais: DecisoesComerciaisSinteticas;
  onRegistrarDecisao: (
    recomendacao: RecomendacaoComercialSintetica,
    estado: AcaoDecisaoComercial,
  ) => void;
  periodo: PeriodoRelatorioComercial;
  responsavel: FiltroResponsavelRelatorio;
  onSelecionarPeriodo: (periodo: PeriodoRelatorioComercial) => void;
  onSelecionarResponsavel: (responsavel: FiltroResponsavelRelatorio) => void;
}) {
  return (
    <section
      className="mt-5 overflow-hidden rounded-2xl border border-[#123f47]/10 bg-white shadow-sm"
      aria-labelledby="titulo-resumo-comercial"
    >
      <div className="grid gap-5 border-b border-[#123f47]/10 bg-gradient-to-r from-orange-50 via-white to-violet-50 p-5 sm:p-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">
            Relatório exclusivamente sintético
          </p>
          <h2 id="titulo-resumo-comercial" className="mt-1 text-xl font-semibold">
            Resumo comercial do período
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#587076]">
            Os filtros são compartilhados entre Dashboard e Análises somente durante esta sessão.
          </p>
        </div>
        <FiltrosRelatorioComercial
          periodo={periodo}
          responsavel={responsavel}
          onSelecionarPeriodo={onSelecionarPeriodo}
          onSelecionarResponsavel={onSelecionarResponsavel}
          contexto="dashboard"
        />
      </div>
      <div className="p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResumoPrevisao
            rotulo="Leads no relatório"
            valor={String(relatorio.totais.leads)}
            detalhe={relatorio.periodo}
            tom="violeta"
          />
          <ResumoPrevisao
            rotulo="Conversão em ganhos"
            valor={`${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(relatorio.totais.taxaConversao)}%`}
            detalhe={`${relatorio.totais.ganhos} negócios fictícios ganhos`}
            tom="esmeralda"
          />
          <ResumoPrevisao
            rotulo="Receita realizada"
            valor={formatarValorCompacto(relatorio.totais.realizado)}
            detalhe="Resultado comercial fictício"
            tom="dourado"
          />
          <ResumoPrevisao
            rotulo="Receita prevista"
            valor={formatarValorCompacto(relatorio.totais.previsto)}
            detalhe={`Meta de ${formatarValorCompacto(relatorio.totais.meta)}`}
            tom="violeta"
          />
        </div>
        <div className="mt-5 min-w-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Meta, realizado e previsto por responsável</h3>
              <p className="mt-1 text-xs text-[#587076]">
                Comparação financeira do recorte selecionado em valores fictícios.
              </p>
            </div>
            <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-orange-700 sm:mt-0">
              {relatorio.responsavel}
            </span>
          </div>
          <div
            className="mt-4 h-[290px] w-full"
            role="img"
            aria-label="Gráfico de meta, receita realizada e receita prevista por responsável"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={relatorio.desempenho} margin={{ top: 10, right: 8, left: -10 }}>
                <CartesianGrid vertical={false} stroke="#123f4715" strokeDasharray="4 6" />
                <XAxis
                  dataKey="responsavel"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(valor) => String(valor).split(" ")[0]}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(valor) => `${Math.round(Number(valor) / 1_000_000)} mi`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={estiloTooltip}
                  formatter={(valor) => formatarValorCompacto(Number(valor))}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                <Bar
                  dataKey="meta"
                  name="Meta"
                  fill={PALETA_GRAFICOS.dourado}
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="realizado"
                  name="Realizado"
                  fill={PALETA_GRAFICOS.esmeralda}
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="previsto"
                  name="Previsto"
                  fill={PALETA_GRAFICOS.violeta}
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <PainelInsightsExplicaveis
          resumo={insights}
          modo="resumo"
          decisoesComerciais={decisoesComerciais}
          onRegistrarDecisao={onRegistrarDecisao}
        />
      </div>
    </section>
  );
}

function PainelInsightsExplicaveis({
  resumo,
  modo,
  decisoesComerciais,
  onRegistrarDecisao,
}: {
  resumo: ResumoInsightsComerciaisSinteticos;
  modo: "resumo" | "detalhado";
  decisoesComerciais: DecisoesComerciaisSinteticas;
  onRegistrarDecisao: (
    recomendacao: RecomendacaoComercialSintetica,
    estado: AcaoDecisaoComercial,
  ) => void;
}) {
  const coresPorTom = {
    Positivo: "border-emerald-200 bg-emerald-50 text-emerald-950",
    Atenção: "border-orange-200 bg-orange-50 text-orange-950",
    Informativo: "border-violet-200 bg-violet-50 text-violet-950",
  } as const;
  const insightsVisiveis = modo === "resumo" ? resumo.insights.slice(0, 2) : resumo.insights;

  return (
    <section
      className="mt-6 border-t border-[#123f47]/10 pt-6"
      aria-labelledby={`titulo-insights-${modo}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
            Leitura explicável · dados sintéticos
          </p>
          <h3 id={`titulo-insights-${modo}`} className="mt-1 text-lg font-semibold">
            Insights comerciais explicáveis
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[#587076]">
            Cada conclusão mostra como foi calculada e qual evidência fictícia sustenta a leitura.
          </p>
        </div>
        <Badge className="w-fit bg-violet-100 text-violet-800 hover:bg-violet-100">
          {resumo.periodo} · {resumo.responsavel}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {resumo.alertas.map((alerta) => {
          const positivo = alerta.valor >= 0;
          return (
            <div key={alerta.id} className={cn("rounded-2xl border p-4", coresPorTom[alerta.tom])}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  {alerta.tom === "Positivo" ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <TriangleAlert className="size-4" />
                  )}
                  Alerta de desempenho
                </span>
                <strong className="whitespace-nowrap text-lg">
                  {positivo ? "+" : ""}
                  {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
                    alerta.valor,
                  )}{" "}
                  {alerta.unidade}
                </strong>
              </div>
              <h4 className="mt-3 font-semibold">{alerta.titulo}</h4>
              <p className="mt-1 text-xs leading-5 opacity-75">{alerta.detalhe}</p>
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "mt-4 grid gap-3",
          modo === "detalhado" ? "lg:grid-cols-3" : "md:grid-cols-2",
        )}
      >
        {insightsVisiveis.map((insight) => (
          <article
            key={insight.id}
            className={cn("rounded-2xl border p-4", coresPorTom[insight.tom])}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{insight.tom}</span>
            </div>
            <h4 className="mt-3 font-semibold">{insight.titulo}</h4>
            <p className="mt-1 text-sm font-bold">{insight.leitura}</p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider opacity-70">
              Como foi calculado
            </p>
            <p className="mt-1 text-xs leading-5 opacity-80">{insight.explicacao}</p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider opacity-70">
              Evidência sintética
            </p>
            <p className="mt-1 text-xs leading-5 opacity-80">{insight.evidencia}</p>
          </article>
        ))}
      </div>

      <CentralDecisoesComerciais
        resumo={resumo}
        modo={modo}
        decisoesComerciais={decisoesComerciais}
        onRegistrarDecisao={onRegistrarDecisao}
      />
    </section>
  );
}

function CentralDecisoesComerciais({
  resumo,
  modo,
  decisoesComerciais,
  onRegistrarDecisao,
}: {
  resumo: ResumoInsightsComerciaisSinteticos;
  modo: "resumo" | "detalhado";
  decisoesComerciais: DecisoesComerciaisSinteticas;
  onRegistrarDecisao: (
    recomendacao: RecomendacaoComercialSintetica,
    estado: AcaoDecisaoComercial,
  ) => void;
}) {
  const recomendacoesVisiveis =
    modo === "resumo" ? resumo.recomendacoes.slice(0, 2) : resumo.recomendacoes;
  const obterRegistro = (recomendacao: RecomendacaoComercialSintetica) =>
    decisoesComerciais[criarChaveDecisaoComercial(resumo.periodo, recomendacao.responsavel)];
  const resumoEstados = calcularResumoDecisoesComerciaisSinteticas({
    decisoes: decisoesComerciais,
    periodo: resumo.periodo,
    recomendacoes: resumo.recomendacoes,
  });
  const indicadores: Array<{
    estado: EstadoDecisaoComercial;
    rotulo: string;
    classe: string;
  }> = [
    { estado: "Pendente", rotulo: "Aguardando decisão", classe: "bg-slate-100 text-slate-800" },
    { estado: "Aceita", rotulo: "Aceitas", classe: "bg-emerald-100 text-emerald-800" },
    { estado: "Adiada", rotulo: "Adiadas", classe: "bg-amber-100 text-amber-800" },
    { estado: "Dispensada", rotulo: "Dispensadas", classe: "bg-rose-100 text-rose-800" },
  ];

  return (
    <section
      className="mt-6 rounded-2xl border border-[#123f47]/10 bg-[#f8f7f3] p-4 sm:p-5"
      aria-labelledby={`titulo-central-decisoes-${modo}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">
            <UserRound className="size-4" /> Visão do owner e da equipe
          </p>
          <h3 id={`titulo-central-decisoes-${modo}`} className="mt-1 text-lg font-semibold">
            Central de decisões comerciais
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[#587076]">
            Consolide as próximas ações sugeridas e simule aceitar, adiar ou dispensar cada uma.
            Nenhuma ação será executada automaticamente.
          </p>
        </div>
        <Badge className="w-fit bg-[#123f47] text-white hover:bg-[#123f47]">
          {resumo.recomendacoes.length} decisões no recorte
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {indicadores.map((indicador) => (
          <div key={indicador.estado} className={cn("rounded-xl p-3", indicador.classe)}>
            <strong className="block text-xl">{resumoEstados[indicador.estado]}</strong>
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {indicador.rotulo}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold">Próximas ações sugeridas</h4>
        <p className="mt-1 text-xs text-[#587076]">
          Prioridade, impacto esperado e justificativa explicável por responsável.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {recomendacoesVisiveis.map((recomendacao) => (
            <CartaoRecomendacaoResponsavel
              key={recomendacao.responsavel}
              recomendacao={recomendacao}
              registro={obterRegistro(recomendacao)}
              onRegistrarDecisao={onRegistrarDecisao}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CartaoRecomendacaoResponsavel({
  recomendacao,
  registro,
  onRegistrarDecisao,
}: {
  recomendacao: RecomendacaoComercialSintetica;
  registro?: RegistroDecisaoComercial;
  onRegistrarDecisao: (
    recomendacao: RecomendacaoComercialSintetica,
    estado: AcaoDecisaoComercial,
  ) => void;
}) {
  const corPrioridade = {
    Alta: "bg-rose-100 text-rose-800 hover:bg-rose-100",
    Média: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    Baixa: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  } as const;
  const estado = registro?.estado ?? "Pendente";
  const corEstado: Record<EstadoDecisaoComercial, string> = {
    Pendente: "border-slate-200 bg-slate-50 text-slate-700",
    Aceita: "border-emerald-200 bg-emerald-50 text-emerald-800",
    Adiada: "border-amber-200 bg-amber-50 text-amber-800",
    Dispensada: "border-rose-200 bg-rose-50 text-rose-800",
  };
  return (
    <article className="rounded-2xl border border-[#123f47]/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>{recomendacao.responsavel}</strong>
        <div className="flex flex-wrap gap-2">
          <Badge className={corPrioridade[recomendacao.prioridade]}>
            Prioridade {recomendacao.prioridade.toLocaleLowerCase("pt-BR")}
          </Badge>
          <Badge variant="outline" className={corEstado[estado]}>
            {estado === "Pendente" ? "Aguardando decisão" : estado}
          </Badge>
        </div>
      </div>
      <h4 className="mt-3 font-semibold text-violet-800">{recomendacao.proximaAcao}</h4>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#587076]">
        Justificativa explicável
      </p>
      <p className="mt-1 text-xs leading-5 text-[#587076]">{recomendacao.motivo}</p>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#587076]">
        Impacto esperado
      </p>
      <p className="mt-1 text-xs leading-5 text-[#587076]">{recomendacao.impactoEsperado}</p>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#587076]">
        Resultado esperado
      </p>
      <p className="mt-1 text-xs leading-5 text-[#587076]">{recomendacao.resultadoEsperado}</p>
      <div
        className="mt-4 grid grid-cols-3 gap-2"
        aria-label={`Decisão sobre ${recomendacao.responsavel}`}
      >
        <Button
          type="button"
          size="sm"
          className="rounded-xl bg-emerald-600 px-2 hover:bg-emerald-700"
          aria-label={`Aceitar recomendação de ${recomendacao.responsavel}`}
          aria-pressed={estado === "Aceita"}
          onClick={() => onRegistrarDecisao(recomendacao, "Aceita")}
        >
          <CheckCircle2 className="mr-1 size-3.5" /> Aceitar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl border-amber-300 px-2 text-amber-800 hover:bg-amber-50"
          aria-label={`Adiar recomendação de ${recomendacao.responsavel}`}
          aria-pressed={estado === "Adiada"}
          onClick={() => onRegistrarDecisao(recomendacao, "Adiada")}
        >
          <Clock3 className="mr-1 size-3.5" /> Adiar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl border-rose-300 px-2 text-rose-800 hover:bg-rose-50"
          aria-label={`Dispensar recomendação de ${recomendacao.responsavel}`}
          aria-pressed={estado === "Dispensada"}
          onClick={() => onRegistrarDecisao(recomendacao, "Dispensada")}
        >
          <X className="mr-1 size-3.5" /> Dispensar
        </Button>
      </div>
      <p className="mt-3 text-center text-[10px] text-[#587076]" aria-live="polite">
        Decisão atual: {estado.toLocaleLowerCase("pt-BR")}
        {registro ? ` · ${registro.atualizadoEm}` : " · ainda não avaliada"}
      </p>
    </article>
  );
}

function ResumoPrevisao({
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  tom: "violeta" | "dourado" | "esmeralda";
}) {
  const cores = {
    violeta: "border-violet-200 bg-violet-50 text-violet-950",
    dourado: "border-amber-200 bg-amber-50 text-amber-950",
    esmeralda: "border-emerald-200 bg-emerald-50 text-emerald-950",
  };
  return (
    <div className={cn("rounded-xl border p-4", cores[tom])}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{valor}</p>
      <p className="mt-1 text-[11px] opacity-70">{detalhe}</p>
    </div>
  );
}

function FunilDeVendas({
  leadsCriados,
  onAdicionarLead,
  onAcompanharLead,
  onSalvarProposta,
  onSalvarTarefa,
  resumoPrevisaoSintetica,
  onSelecionarCenario,
}: {
  leadsCriados: ContatoSinteticoCriado[];
  onAdicionarLead: () => void;
  onAcompanharLead: (acompanhamento: AcompanhamentoSinteticoCriado) => void;
  onSalvarProposta: (atualizacao: PropostaSinteticaAtualizada) => void;
  onSalvarTarefa: (atualizacao: TarefaSinteticaAtualizada) => void;
  resumoPrevisaoSintetica: ResumoPrevisaoSintetica;
  onSelecionarCenario: (cenario: CenarioPrevisao) => void;
}) {
  const contatosEncaminhados = leadsCriados.filter((lead) => lead.encaminhadoAoFunil);

  return (
    <>
      <CabecalhoPagina
        titulo="Funil de vendas"
        descricao="Visualize o avanço das oportunidades e direcione a equipe para os atendimentos com maior potencial."
        acao={
          <Button
            className="rounded-xl bg-[#123f47]"
            onClick={() => {
              confirmarAcaoSintetica(
                "Gestão de leads aberta",
                "Use Novo contato, escolha um imóvel e depois selecione Enviar ao funil.",
              );
              onAdicionarLead();
            }}
          >
            <Users className="mr-2 size-4" />
            Adicionar lead
          </Button>
        }
      />
      <section
        className="mb-5 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-emerald-50 p-4 sm:p-5"
        aria-label="Resumo da previsão do funil"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">
              Previsão compartilhada com o Dashboard
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <strong className="text-2xl tracking-tight">
                {formatarValorCompacto(resumoPrevisaoSintetica.totalPrevisto)}
              </strong>
              <span className="text-xs text-[#587076]">
                {formatadorPercentual.format(resumoPrevisaoSintetica.coberturaMeta)}% da meta no
                cenário {resumoPrevisaoSintetica.cenario.toLocaleLowerCase("pt-BR")}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#587076]">
              Cada etapa combina seu valor potencial com uma chance amigável de fechamento.
            </p>
          </div>
          <SeletorCenarioPrevisao
            cenario={resumoPrevisaoSintetica.cenario}
            onSelecionar={onSelecionarCenario}
          />
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        {etapasDoFunil.map((etapa, indice) => {
          const previsaoEtapa = resumoPrevisaoSintetica.etapas.find(
            (item) => item.nome === etapa.nome,
          );
          const contatosCriadosNaEtapa = contatosEncaminhados.filter((contato) => {
            const etapaDoContato =
              contato.etapa === "Novo contato" ? "Novos contatos" : contato.etapa;
            return etapaDoContato === etapa.nome;
          });
          const contatosDaEtapa = [
            ...contatosCriadosNaEtapa,
            ...(etapa.nome === "Negócio perdido"
              ? []
              : leadsSinteticos.slice(0, Math.max(2, 4 - indice))),
          ];
          return (
            <section key={etapa.nome} className="min-w-0">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-2.5 rounded-full", etapa.cor)} />
                  {etapa.nome}
                </span>
                <Badge variant="secondary">
                  {etapa.quantidade + contatosCriadosNaEtapa.length}
                </Badge>
              </div>
              {previsaoEtapa ? (
                <div className="mb-3 rounded-xl border border-[#123f47]/10 bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#587076]">
                    Probabilidade de fechamento
                  </p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <strong className="text-sm">{previsaoEtapa.leituraAmigavel}</strong>
                    <span className="text-lg font-bold" style={{ color: previsaoEtapa.cor }}>
                      {formatadorPercentual.format(previsaoEtapa.probabilidadeAjustada * 100)}%
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-[#587076]">
                    Receita prevista: {formatarValorCompacto(previsaoEtapa.valorPrevisto)}
                  </p>
                </div>
              ) : null}
              <div className="space-y-3">
                {contatosDaEtapa.map((lead, leadIndice) => {
                  const contatoCriado = contatosCriadosNaEtapa.find((contato) => contato === lead);
                  const criadoNestaSessao = Boolean(contatoCriado);
                  return (
                    <Card
                      key={`${etapa.nome}-${lead.nome}-${leadIndice}`}
                      className={cn(
                        "rounded-xl border-[#123f47]/10 transition hover:-translate-y-0.5 hover:shadow-md",
                        criadoNestaSessao && "border-violet-300 bg-violet-50/60",
                      )}
                    >
                      <CardContent className="p-4">
                        {criadoNestaSessao ? (
                          <Badge className="mb-2 bg-violet-100 text-violet-800 hover:bg-violet-100">
                            Jornada sintética
                          </Badge>
                        ) : null}
                        <p className="text-sm font-semibold">
                          {criadoNestaSessao || leadIndice === 0
                            ? lead.nome
                            : (["Fernanda Costa", "André Moura", "Paula Azevedo"][leadIndice - 1] ??
                              lead.nome)}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#587076]">{lead.interesse}</p>
                        {contatoCriado?.campanhaOrigem ? (
                          <p className="mt-2 rounded-lg bg-white/80 px-2 py-1.5 text-[10px] font-semibold text-violet-800">
                            Campanha: {contatoCriado.campanhaOrigem} · Página:{" "}
                            {contatoCriado.paginaOrigem}
                          </p>
                        ) : null}
                        {contatoCriado ? (
                          <div className="mt-2 grid gap-1 rounded-lg bg-white/80 px-2 py-1.5 text-[10px] text-[#587076]">
                            <span className="font-semibold text-[#123f47]">
                              Qualificação: {contatoCriado.qualificacao}
                            </span>
                            {contatoCriado.visitaAgendada ? (
                              <span>
                                Visita: {contatoCriado.visitaAgendada.dataExibicao} às{" "}
                                {contatoCriado.visitaAgendada.horario}
                              </span>
                            ) : null}
                            {contatoCriado.proposta ? (
                              <span className="font-semibold text-violet-800">
                                Proposta: {contatoCriado.proposta.valorExibicao} ·{" "}
                                {contatoCriado.proposta.estado}
                              </span>
                            ) : null}
                            {contatoCriado.proposta?.motivoResultado ? (
                              <span>Motivo: {contatoCriado.proposta.motivoResultado}</span>
                            ) : null}
                            <ResumoTarefasSinteticas contato={contatoCriado} />
                            <span>
                              {contatoCriado.historicoAtendimento.length}{" "}
                              {contatoCriado.historicoAtendimento.length === 1
                                ? "registro no histórico"
                                : "registros no histórico"}
                            </span>
                          </div>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between border-t border-[#123f47]/8 pt-3">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#587076]">
                            {lead.origem}
                          </span>
                          <span className="size-6 rounded-full bg-[#e2d7c4] text-center text-[9px] font-bold leading-6">
                            {lead.responsavel
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </div>
                        {contatoCriado ? (
                          <AcoesLeadSintetico
                            contato={contatoCriado}
                            onAcompanharLead={onAcompanharLead}
                            onSalvarProposta={onSalvarProposta}
                            onSalvarTarefa={onSalvarTarefa}
                            className="mt-3"
                          />
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg border border-dashed border-[#123f47]/15 p-3 text-center text-xs text-[#587076]">
                {previsaoEtapa ? formatarValorCompacto(previsaoEtapa.valorPotencial) : etapa.valor}{" "}
                em oportunidades
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function AcoesLeadSintetico({
  contato,
  onAcompanharLead,
  onSalvarProposta,
  onSalvarTarefa,
  className,
}: {
  contato: ContatoSinteticoCriado;
  onAcompanharLead: (acompanhamento: AcompanhamentoSinteticoCriado) => void;
  onSalvarProposta: (atualizacao: PropostaSinteticaAtualizada) => void;
  onSalvarTarefa: (atualizacao: TarefaSinteticaAtualizada) => void;
  className?: string;
}) {
  const propostaDisponivel =
    (contato.etapa === "Visita agendada" && !contato.proposta) ||
    (contato.etapa === "Proposta enviada" && contato.proposta?.estado === "Em negociação");
  const jornadaConcluida =
    contato.etapa === "Negócio fechado" || contato.etapa === "Negócio perdido";

  return (
    <div className={cn("grid gap-2", className)}>
      <AcompanharLeadSinteticoDialog
        contato={contato}
        onConfirmar={onAcompanharLead}
        className="w-full rounded-xl border-violet-300 bg-white text-violet-800 hover:bg-violet-100"
      />
      {propostaDisponivel ? (
        <PropostaEFechamentoSinteticoDialog
          contato={contato}
          onConfirmar={onSalvarProposta}
          className="w-full rounded-xl border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100"
        />
      ) : null}
      <GerenciarTarefasSinteticasDialog
        contato={contato}
        onConfirmar={onSalvarTarefa}
        className="w-full rounded-xl border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
      />
      {jornadaConcluida ? (
        <Badge
          className={cn(
            "justify-center py-1.5",
            contato.etapa === "Negócio fechado"
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
              : "bg-rose-100 text-rose-800 hover:bg-rose-100",
          )}
        >
          Jornada concluída: {contato.proposta?.estado}
        </Badge>
      ) : null}
    </div>
  );
}

function ResumoTarefasSinteticas({ contato }: { contato: ContatoSinteticoCriado }) {
  const tarefas = contato.tarefas ?? [];
  if (tarefas.length === 0) return null;
  const pendentes = tarefas.filter((tarefa) => tarefa.estado === "Pendente");
  const concluidas = tarefas.length - pendentes.length;
  const proximaTarefa = [...pendentes].sort((a, b) => a.prazo.localeCompare(b.prazo))[0];

  return (
    <div
      className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-950"
      aria-label={`Resumo de tarefas de ${contato.nome}`}
    >
      <strong className="block">
        Tarefas: {pendentes.length} {pendentes.length === 1 ? "pendente" : "pendentes"} ·{" "}
        {concluidas} {concluidas === 1 ? "concluída" : "concluídas"}
      </strong>
      {proximaTarefa ? (
        <span className="mt-1 block">
          Próxima: {proximaTarefa.titulo} · {proximaTarefa.responsavel} · prioridade{" "}
          {proximaTarefa.prioridade.toLocaleLowerCase("pt-BR")} · prazo{" "}
          {proximaTarefa.prazoExibicao} às {proximaTarefa.horario}
        </span>
      ) : (
        <span className="mt-1 block text-emerald-800">Todas as tarefas foram concluídas.</span>
      )}
    </div>
  );
}

function AgendaDaEquipe({ leadsCriados }: { leadsCriados: ContatoSinteticoCriado[] }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [tipoVisao, setTipoVisao] = useState<"dia" | "semana">("dia");
  const [dataReferencia, setDataReferencia] = useState(hoje);
  const [responsavelSelecionado, setResponsavelSelecionado] = useState("todos");
  const eventos = criarEventosAgendaSintetica(leadsCriados);
  const responsaveis = [...new Set(eventos.map((evento) => evento.responsavel))].sort((a, b) =>
    a.localeCompare(b),
  );
  const primeiraData = tipoVisao === "dia" ? dataReferencia : inicioDaSemana(dataReferencia);
  const datasExibidas = Array.from({ length: tipoVisao === "dia" ? 1 : 7 }, (_, indice) =>
    somarDias(primeiraData, indice),
  );
  const eventosDoPeriodo = eventos
    .filter((evento) => datasExibidas.includes(evento.data))
    .filter(
      (evento) =>
        responsavelSelecionado === "todos" || evento.responsavel === responsavelSelecionado,
    )
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) ||
        a.horario.localeCompare(b.horario) ||
        a.titulo.localeCompare(b.titulo),
    );
  const conflitos = identificarConflitosAgenda(eventosDoPeriodo);
  const cargaEquipe = calcularCargaEquipeSintetica(eventosDoPeriodo);
  const rotuloPeriodo =
    tipoVisao === "dia"
      ? exibirDataAgenda(primeiraData)
      : `${exibirDataAgenda(primeiraData, "curto")} a ${exibirDataAgenda(datasExibidas[6], "curto")}`;

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda da equipe"
        descricao="Reúna visitas e tarefas em uma visão clara, identifique choques de horário e distribua melhor a carga da equipe."
        acao={
          <Badge className="w-fit border-cyan-200 bg-cyan-50 px-3 py-1.5 text-cyan-800 hover:bg-cyan-50">
            Agenda exclusivamente fictícia
          </Badge>
        }
      />

      <section className="rounded-2xl border border-[#123f47]/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(180px,0.7fr)_minmax(200px,1fr)] lg:items-end">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-[#123f47]">Formato da agenda</p>
            <div
              className="inline-flex rounded-xl border border-[#123f47]/10 bg-[#f6f4ef] p-1"
              aria-label="Escolher visão da agenda"
            >
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold transition",
                  tipoVisao === "dia" ? "bg-[#123f47] text-white" : "text-[#587076]",
                )}
                aria-pressed={tipoVisao === "dia"}
                onClick={() => setTipoVisao("dia")}
              >
                Visão diária
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold transition",
                  tipoVisao === "semana" ? "bg-[#123f47] text-white" : "text-[#587076]",
                )}
                aria-pressed={tipoVisao === "semana"}
                onClick={() => setTipoVisao("semana")}
              >
                Visão semanal
              </button>
            </div>
          </div>
          <label
            htmlFor="agenda-data-referencia"
            className="grid gap-1.5 text-sm font-semibold text-[#123f47]"
          >
            Data de referência
            <Input
              id="agenda-data-referencia"
              type="date"
              value={dataReferencia}
              onChange={(evento) => setDataReferencia(evento.target.value)}
              className="h-11 rounded-xl border-[#123f47]/15 bg-white"
            />
          </label>
          <label
            htmlFor="agenda-responsavel"
            className="grid gap-1.5 text-sm font-semibold text-[#123f47]"
          >
            Responsável
            <select
              id="agenda-responsavel"
              value={responsavelSelecionado}
              onChange={(evento) => setResponsavelSelecionado(evento.target.value)}
              className="h-11 w-full rounded-xl border border-[#123f47]/15 bg-white px-3 text-sm font-normal outline-none"
            >
              <option value="todos">Todos os responsáveis</option>
              {responsaveis.map((responsavel) => (
                <option key={responsavel} value={responsavel}>
                  {responsavel}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t border-[#123f47]/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold capitalize text-[#123f47]">{rotuloPeriodo}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-fit rounded-xl"
            onClick={() => setDataReferencia(hoje)}
          >
            Voltar para hoje
          </Button>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.5fr)]">
        <section
          className="min-w-0 rounded-2xl border border-[#123f47]/10 bg-white p-4 shadow-sm sm:p-5"
          aria-label="Compromissos da agenda sintética"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Compromissos</h2>
              <p className="mt-1 text-xs text-[#587076]">
                {eventosDoPeriodo.length}{" "}
                {eventosDoPeriodo.length === 1 ? "item encontrado" : "itens encontrados"}
              </p>
            </div>
            {conflitos.total > 0 ? (
              <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
                <TriangleAlert className="mr-1.5 size-3.5" /> {conflitos.total}{" "}
                {conflitos.total === 1 ? "conflito de horário" : "conflitos de horário"}
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                Sem conflitos neste período
              </Badge>
            )}
          </div>

          {eventosDoPeriodo.length > 0 ? (
            <div
              className={cn(
                "mt-4 grid gap-3",
                tipoVisao === "semana" && "md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7",
              )}
            >
              {datasExibidas.map((data) => {
                const eventosDaData = eventosDoPeriodo.filter((evento) => evento.data === data);
                if (eventosDaData.length === 0 && tipoVisao === "dia") return null;
                return (
                  <section key={data} className="min-w-0 rounded-xl bg-[#f7f5f0] p-3">
                    <h3 className="text-xs font-bold capitalize text-[#123f47]">
                      {exibirDataAgenda(data)}
                    </h3>
                    {eventosDaData.length > 0 ? (
                      <div className="mt-3 grid gap-2">
                        {eventosDaData.map((evento) => {
                          const possuiConflito = conflitos.ids.has(evento.id);
                          return (
                            <article
                              key={evento.id}
                              className={cn(
                                "rounded-xl border bg-white p-3",
                                possuiConflito ? "border-rose-300" : "border-[#123f47]/10",
                                evento.estado === "Concluída" && "opacity-65",
                              )}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <Badge
                                  className={cn(
                                    "text-[10px]",
                                    evento.tipo === "Visita"
                                      ? "bg-violet-100 text-violet-800 hover:bg-violet-100"
                                      : "bg-orange-100 text-orange-800 hover:bg-orange-100",
                                  )}
                                >
                                  {evento.tipo}
                                </Badge>
                                <span className="flex items-center gap-1 text-xs font-bold text-[#123f47]">
                                  <Clock3 className="size-3.5" /> {evento.horario}
                                </span>
                              </div>
                              <strong className="mt-2 block text-xs leading-5 text-[#123f47]">
                                {evento.titulo}
                              </strong>
                              <p className="mt-1 text-[11px] leading-5 text-[#587076]">
                                {evento.contatoNome} · {evento.responsavel}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {possuiConflito ? (
                                  <Badge className="bg-rose-100 text-[10px] text-rose-800 hover:bg-rose-100">
                                    Conflito de horário
                                  </Badge>
                                ) : null}
                                {evento.prioridade ? (
                                  <Badge variant="outline" className="text-[10px]">
                                    Prioridade {evento.prioridade.toLocaleLowerCase("pt-BR")}
                                  </Badge>
                                ) : null}
                                {evento.estado === "Concluída" ? (
                                  <Badge className="bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">
                                    Concluída
                                  </Badge>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-[11px] text-[#587076]">Sem compromissos.</p>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[#123f47]/20 bg-[#f7f5f0] p-6 text-center">
              <CalendarDays className="mx-auto size-7 text-[#9aadaf]" />
              <p className="mt-2 text-sm font-semibold text-[#123f47]">
                Nenhum compromisso encontrado
              </p>
              <p className="mt-1 text-xs leading-5 text-[#587076]">
                Agende uma visita ou crie uma tarefa fictícia para visualizar a agenda.
              </p>
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-[#123f47]/10 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-semibold">Carga da equipe</h2>
          <p className="mt-1 text-xs leading-5 text-[#587076]">
            Compromissos pendentes no período e no filtro selecionado.
          </p>
          {cargaEquipe.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {cargaEquipe.map((carga, indice) => (
                <div key={carga.responsavel} className="rounded-xl bg-[#f7f5f0] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-xs text-[#123f47]">{carga.responsavel}</strong>
                    <span className="text-xs font-bold text-[#123f47]">{carga.compromissos}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        ["bg-violet-500", "bg-orange-500", "bg-emerald-500", "bg-sky-500"][
                          indice % 4
                        ],
                      )}
                      style={{ width: `${Math.min(100, carga.compromissos * 25)}%` }}
                    />
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-[11px] font-semibold",
                      carga.classificacao === "Atenção à carga"
                        ? "text-rose-700"
                        : "text-emerald-700",
                    )}
                  >
                    {carga.classificacao}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              Nenhuma carga pendente neste período.
            </p>
          )}
          <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-[11px] leading-5 text-cyan-900">
            A carga é calculada somente com visitas e tarefas fictícias ainda pendentes. Nenhuma
            agenda externa é consultada.
          </div>
        </aside>
      </div>
    </>
  );
}

function Imoveis({
  imoveisCriados,
  onCriarImovel,
}: {
  imoveisCriados: ImovelSinteticoCriado[];
  onCriarImovel: (imovel: ImovelSinteticoCriado) => void;
}) {
  const [buscaImovel, setBuscaImovel] = useState("");
  const [estadoImovel, setEstadoImovel] = useState("todos");
  const [ordenacaoImovel, setOrdenacaoImovel] = useState("recentes");
  const termoBuscaImovel = buscaImovel.trim().toLocaleLowerCase("pt-BR");
  const propriedadesDaSessao = [
    ...imoveisCriados.map((imovel, indice) => ({
      ...imovel,
      valor: formatadorMoeda.format(imovel.valorNumerico),
      imagem: property1,
      ordemRecente: indice - imoveisCriados.length,
    })),
    ...propriedades,
  ];
  const propriedadesFiltradas = propriedadesDaSessao
    .filter((imovel) =>
      [imovel.titulo, imovel.bairro, imovel.detalhes, imovel.estado]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(termoBuscaImovel),
    )
    .filter((imovel) => estadoImovel === "todos" || imovel.estado === estadoImovel)
    .sort((a, b) => {
      if (ordenacaoImovel === "menor-valor") return a.valorNumerico - b.valorNumerico;
      if (ordenacaoImovel === "maior-valor") return b.valorNumerico - a.valorNumerico;
      return a.ordemRecente - b.ordemRecente;
    });

  return (
    <>
      <CabecalhoPagina
        titulo="Catálogo de imóveis"
        descricao="Gerencie disponibilidade, qualidade dos anúncios e distribuição do portfólio em uma única visão."
        acao={
          <NovoImovelSinteticoDialog
            onConfirmar={(imovel) => {
              onCriarImovel(imovel);
              confirmarAcaoSintetica(
                "Imóvel adicionado ao catálogo",
                `${imovel.titulo} ficará visível somente nesta sessão.`,
              );
            }}
          />
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#587076]" />
          <Input
            className="h-11 rounded-xl bg-white pl-10"
            placeholder="Buscar por código, bairro ou característica"
            aria-label="Buscar imóveis"
            value={buscaImovel}
            onChange={(evento) => setBuscaImovel(evento.target.value)}
          />
        </div>
        <label>
          <span className="sr-only">Filtrar imóveis por disponibilidade</span>
          <select
            aria-label="Filtrar imóveis por disponibilidade"
            className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={estadoImovel}
            onChange={(evento) => setEstadoImovel(evento.target.value)}
          >
            <option value="todos">Todos os estados</option>
            <option value="Disponível">Disponíveis</option>
            <option value="Em negociação">Em negociação</option>
            <option value="Exclusividade">Exclusividade</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Ordenar imóveis</span>
          <select
            aria-label="Ordenar imóveis"
            className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={ordenacaoImovel}
            onChange={(evento) => setOrdenacaoImovel(evento.target.value)}
          >
            <option value="recentes">Mais recentes</option>
            <option value="menor-valor">Menor valor</option>
            <option value="maior-valor">Maior valor</option>
          </select>
        </label>
      </div>
      <p className="mb-3 text-xs text-[#587076]" aria-live="polite">
        {propriedadesFiltradas.length === 1
          ? "1 imóvel encontrado"
          : `${propriedadesFiltradas.length} imóveis encontrados`}
      </p>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {propriedadesFiltradas.map((imovel, indice) => (
          <Card
            key={`${imovel.titulo}-${imovel.bairro}-${indice}`}
            className="group overflow-hidden rounded-2xl border-[#123f47]/10"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={imovel.imagem}
                alt={imovel.titulo}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <Badge className="absolute left-4 top-4 bg-white/95 text-[#123f47] hover:bg-white">
                {imovel.estado}
              </Badge>
            </div>
            <CardContent className="p-5">
              <p className="text-xs text-[#587076]">{imovel.bairro}</p>
              <h2 className="mt-1 text-xl font-semibold">{imovel.titulo}</h2>
              <p className="mt-3 text-sm text-[#587076]">{imovel.detalhes}</p>
              <div className="mt-4 flex items-center justify-between border-t border-[#123f47]/8 pt-4">
                <strong>{imovel.valor}</strong>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    confirmarAcaoSintetica(
                      "Detalhes do imóvel",
                      `${imovel.titulo} foi aberto em modo de demonstração.`,
                    )
                  }
                >
                  Ver detalhes <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {propriedadesFiltradas.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-[#123f47]/20 md:col-span-2 xl:col-span-3">
            <CardContent className="p-8 text-center">
              <Search className="mx-auto size-6 text-[#587076]" />
              <h2 className="mt-3 font-semibold">Nenhum imóvel encontrado</h2>
              <p className="mt-1 text-sm text-[#587076]">
                Tente buscar por outro bairro, característica ou estado.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}

function Leads({
  leadsCriados,
  imoveisDisponiveis,
  onCriarContato,
  onEncaminharAoFunil,
  onAcompanharLead,
  onSalvarProposta,
  onSalvarTarefa,
}: {
  leadsCriados: ContatoSinteticoCriado[];
  imoveisDisponiveis: Array<Pick<ImovelSinteticoCriado, "titulo" | "bairro">>;
  onCriarContato: (contato: ContatoSinteticoCriado) => void;
  onEncaminharAoFunil: (contato: ContatoSinteticoCriado) => void;
  onAcompanharLead: (acompanhamento: AcompanhamentoSinteticoCriado) => void;
  onSalvarProposta: (atualizacao: PropostaSinteticaAtualizada) => void;
  onSalvarTarefa: (atualizacao: TarefaSinteticaAtualizada) => void;
}) {
  const [buscaLead, setBuscaLead] = useState("");
  const [prioridadeLead, setPrioridadeLead] = useState("todas");
  const termoBuscaLead = buscaLead.trim().toLocaleLowerCase("pt-BR");
  const leadsDaSessao = [...leadsCriados, ...leadsSinteticos];
  const leadsFiltrados = leadsDaSessao
    .filter((lead) =>
      [lead.nome, lead.interesse, lead.origem, lead.responsavel, lead.etapa, lead.temperatura]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(termoBuscaLead),
    )
    .filter((lead) => prioridadeLead === "todas" || lead.temperatura === prioridadeLead);
  const contatoCriadoDaSessao = (lead: (typeof leadsDaSessao)[number]) =>
    leadsCriados.find((contato) => contato === lead);

  return (
    <>
      <CabecalhoPagina
        titulo="Gestão de leads"
        descricao="Centralize contatos, contexto de interesse, origem da campanha e responsável pelo próximo atendimento."
        acao={
          <NovoContatoSinteticoDialog
            imoveisDisponiveis={imoveisDisponiveis}
            onConfirmar={(contato) => {
              onCriarContato(contato);
              confirmarAcaoSintetica(
                "Contato adicionado ao atendimento",
                `${contato.nome} ficará visível somente nesta sessão.`,
              );
            }}
          />
        }
      />
      <Card className="overflow-hidden rounded-2xl border-[#123f47]/10">
        <div className="flex flex-col gap-3 border-b border-[#123f47]/10 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#587076]" />
            <Input
              className="rounded-xl pl-10"
              placeholder="Buscar por nome, imóvel ou origem"
              aria-label="Buscar leads"
              value={buscaLead}
              onChange={(evento) => setBuscaLead(evento.target.value)}
            />
          </div>
          <label>
            <span className="sr-only">Filtrar contatos por prioridade</span>
            <select
              aria-label="Filtrar contatos por prioridade"
              className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-auto"
              value={prioridadeLead}
              onChange={(evento) => setPrioridadeLead(evento.target.value)}
            >
              <option value="todas">Todas as prioridades</option>
              <option value="Quente">Prioridade quente</option>
              <option value="Morno">Prioridade morna</option>
              <option value="Novo">Contato novo</option>
            </select>
          </label>
        </div>
        <p
          className="border-b border-[#123f47]/10 px-4 py-2 text-xs text-[#587076]"
          aria-live="polite"
        >
          {leadsFiltrados.length === 1
            ? "1 contato encontrado"
            : `${leadsFiltrados.length} contatos encontrados`}
        </p>
        <div className="grid gap-3 p-4 md:hidden">
          {leadsFiltrados.map((lead, indice) => (
            <article
              key={`${lead.nome}-${lead.origem}-${indice}`}
              className="rounded-xl border border-[#123f47]/10 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">{lead.nome}</h2>
                  <p className="mt-1 text-xs leading-5 text-[#587076]">{lead.interesse}</p>
                  {contatoCriadoDaSessao(lead)?.imovelSelecionado ? (
                    <p className="mt-1 text-[11px] font-medium text-violet-700">
                      Imóvel vinculado: {contatoCriadoDaSessao(lead)?.imovelSelecionado}
                    </p>
                  ) : null}
                  {contatoCriadoDaSessao(lead)?.campanhaOrigem ? (
                    <p className="mt-1 text-[11px] font-medium text-emerald-700">
                      Campanha de origem: {contatoCriadoDaSessao(lead)?.campanhaOrigem} · Página:{" "}
                      {contatoCriadoDaSessao(lead)?.paginaOrigem}
                    </p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
                    lead.temperatura === "Quente"
                      ? "bg-rose-100 text-rose-800"
                      : lead.temperatura === "Morno"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-sky-100 text-sky-800",
                  )}
                >
                  {lead.temperatura}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#123f47]/8 pt-3 text-xs">
                <div>
                  <dt className="text-[#587076]">Origem</dt>
                  <dd className="mt-1 font-medium">{lead.origem}</dd>
                </div>
                <div>
                  <dt className="text-[#587076]">Responsável</dt>
                  <dd className="mt-1 font-medium">{lead.responsavel}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[#587076]">Etapa atual</dt>
                  <dd className="mt-1 font-medium">{lead.etapa}</dd>
                </div>
                {contatoCriadoDaSessao(lead) ? (
                  <div className="col-span-2">
                    <dt className="text-[#587076]">Acompanhamento</dt>
                    <dd className="mt-1 font-medium">
                      {contatoCriadoDaSessao(lead)?.qualificacao} ·{" "}
                      {contatoCriadoDaSessao(lead)?.historicoAtendimento.length} registros
                    </dd>
                    {contatoCriadoDaSessao(lead)?.visitaAgendada ? (
                      <dd className="mt-1 text-emerald-700">
                        Visita em {contatoCriadoDaSessao(lead)?.visitaAgendada?.dataExibicao} às{" "}
                        {contatoCriadoDaSessao(lead)?.visitaAgendada?.horario}
                      </dd>
                    ) : null}
                    {contatoCriadoDaSessao(lead)?.proposta ? (
                      <dd className="mt-1 font-semibold text-violet-700">
                        Proposta: {contatoCriadoDaSessao(lead)?.proposta?.valorExibicao} ·{" "}
                        {contatoCriadoDaSessao(lead)?.proposta?.estado}
                      </dd>
                    ) : null}
                    {contatoCriadoDaSessao(lead)?.proposta?.motivoResultado ? (
                      <dd className="mt-1 text-[#587076]">
                        Motivo: {contatoCriadoDaSessao(lead)?.proposta?.motivoResultado}
                      </dd>
                    ) : null}
                    <ResumoTarefasSinteticas contato={contatoCriadoDaSessao(lead)!} />
                  </div>
                ) : null}
              </dl>
              {contatoCriadoDaSessao(lead)?.encaminhadoAoFunil ? (
                <AcoesLeadSintetico
                  contato={contatoCriadoDaSessao(lead)!}
                  onAcompanharLead={onAcompanharLead}
                  onSalvarProposta={onSalvarProposta}
                  onSalvarTarefa={onSalvarTarefa}
                  className="mt-4"
                />
              ) : contatoCriadoDaSessao(lead) ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 w-full rounded-xl"
                  onClick={() => onEncaminharAoFunil(contatoCriadoDaSessao(lead)!)}
                >
                  Enviar ao funil
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              ) : null}
            </article>
          ))}
          {leadsFiltrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#123f47]/20 p-6 text-center text-sm text-[#587076]">
              Nenhum contato corresponde à busca. Tente outro nome, imóvel, origem ou prioridade.
            </div>
          ) : null}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[780px] text-sm">
            <caption className="sr-only">Leads fictícios para demonstração visual</caption>
            <thead className="bg-[#f7f5f0] text-left text-xs text-[#587076]">
              <tr>
                <th className="px-5 py-3 font-semibold">Nome e interesse</th>
                <th className="px-5 py-3 font-semibold">Origem</th>
                <th className="px-5 py-3 font-semibold">Responsável</th>
                <th className="px-5 py-3 font-semibold">Etapa atual</th>
                <th className="px-5 py-3 font-semibold">Prioridade</th>
                <th className="px-5 py-3 font-semibold">Próxima ação</th>
              </tr>
            </thead>
            <tbody>
              {leadsFiltrados.map((lead, indice) => (
                <tr
                  key={`${lead.nome}-${lead.origem}-${indice}`}
                  className="border-t border-[#123f47]/8 hover:bg-[#faf8f4]"
                >
                  <td className="px-5 py-4">
                    <strong className="block">{lead.nome}</strong>
                    <span className="mt-1 block text-xs text-[#587076]">{lead.interesse}</span>
                    {contatoCriadoDaSessao(lead)?.imovelSelecionado ? (
                      <span className="mt-1 block text-[11px] font-medium text-violet-700">
                        Imóvel vinculado: {contatoCriadoDaSessao(lead)?.imovelSelecionado}
                      </span>
                    ) : null}
                    {contatoCriadoDaSessao(lead)?.campanhaOrigem ? (
                      <span className="mt-1 block text-[11px] font-medium text-emerald-700">
                        Campanha de origem: {contatoCriadoDaSessao(lead)?.campanhaOrigem} · Página:{" "}
                        {contatoCriadoDaSessao(lead)?.paginaOrigem}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">{lead.origem}</td>
                  <td className="px-5 py-4">{lead.responsavel}</td>
                  <td className="px-5 py-4">
                    <Badge variant="outline">{lead.etapa}</Badge>
                    {contatoCriadoDaSessao(lead) ? (
                      <span className="mt-2 block text-[11px] text-[#587076]">
                        {contatoCriadoDaSessao(lead)?.qualificacao} ·{" "}
                        {contatoCriadoDaSessao(lead)?.historicoAtendimento.length} registros
                      </span>
                    ) : null}
                    {contatoCriadoDaSessao(lead)?.visitaAgendada ? (
                      <span className="mt-1 block text-[11px] font-medium text-emerald-700">
                        Visita: {contatoCriadoDaSessao(lead)?.visitaAgendada?.dataExibicao} às{" "}
                        {contatoCriadoDaSessao(lead)?.visitaAgendada?.horario}
                      </span>
                    ) : null}
                    {contatoCriadoDaSessao(lead)?.proposta ? (
                      <span className="mt-1 block text-[11px] font-semibold text-violet-700">
                        Proposta: {contatoCriadoDaSessao(lead)?.proposta?.valorExibicao} ·{" "}
                        {contatoCriadoDaSessao(lead)?.proposta?.estado}
                      </span>
                    ) : null}
                    {contatoCriadoDaSessao(lead)?.proposta?.motivoResultado ? (
                      <span className="mt-1 block text-[11px] text-[#587076]">
                        Motivo: {contatoCriadoDaSessao(lead)?.proposta?.motivoResultado}
                      </span>
                    ) : null}
                    {contatoCriadoDaSessao(lead) ? (
                      <ResumoTarefasSinteticas contato={contatoCriadoDaSessao(lead)!} />
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        lead.temperatura === "Quente"
                          ? "bg-rose-100 text-rose-800"
                          : lead.temperatura === "Morno"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-sky-100 text-sky-800",
                      )}
                    >
                      {lead.temperatura}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {contatoCriadoDaSessao(lead)?.encaminhadoAoFunil ? (
                      <AcoesLeadSintetico
                        contato={contatoCriadoDaSessao(lead)!}
                        onAcompanharLead={onAcompanharLead}
                        onSalvarProposta={onSalvarProposta}
                        onSalvarTarefa={onSalvarTarefa}
                      />
                    ) : contatoCriadoDaSessao(lead) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => onEncaminharAoFunil(contatoCriadoDaSessao(lead)!)}
                      >
                        Enviar ao funil
                      </Button>
                    ) : (
                      <span className="text-xs text-[#587076]">Somente leitura</span>
                    )}
                  </td>
                </tr>
              ))}
              {leadsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[#587076]">
                    Nenhum contato corresponde à busca. Tente outro nome, imóvel, origem ou
                    prioridade.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function Campanhas({
  campanhasCriadas,
  paginasDisponiveis,
  imoveisDisponiveis,
  onCriarCampanha,
  onCaptarLead,
}: {
  campanhasCriadas: CampanhaSinteticaCriada[];
  paginasDisponiveis: Array<Pick<PaginaSinteticaCriada, "titulo" | "caminho">>;
  imoveisDisponiveis: Array<Pick<ImovelSinteticoCriado, "titulo" | "bairro">>;
  onCriarCampanha: (campanha: CampanhaSinteticaCriada) => void;
  onCaptarLead: (captacao: CaptacaoSinteticaCriada) => void;
}) {
  const campanhasDaSessao = [...campanhasCriadas, ...campanhasSinteticas];
  const campanhaCriadaDaSessao = (campanha: (typeof campanhasDaSessao)[number]) =>
    campanhasCriadas.find((item) => item === campanha);

  return (
    <>
      <CabecalhoPagina
        titulo="Campanhas e aquisição"
        descricao="Compare canais, investimento, custo por lead e conversões sem alternar entre diferentes plataformas."
        acao={
          <NovaCampanhaSinteticaDialog
            paginasDisponiveis={paginasDisponiveis}
            onConfirmar={(campanha) => {
              onCriarCampanha(campanha);
              confirmarAcaoSintetica(
                "Rascunho de campanha criado",
                `${campanha.nome} ficará visível somente nesta sessão.`,
              );
            }}
          />
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        {campanhasDaSessao.map((campanha, indice) => (
          <Card
            key={`${campanha.nome}-${campanha.canal}-${indice}`}
            className="overflow-hidden rounded-2xl border-[#123f47]/10"
          >
            <div className={cn("h-2 bg-gradient-to-r", campanha.cor)} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="secondary">{campanha.canal}</Badge>
                  <h2 className="mt-3 text-lg font-semibold">{campanha.nome}</h2>
                </div>
                <span className="size-2.5 rounded-full bg-emerald-500" title={campanha.estado} />
              </div>
              <p className="mt-1 text-xs text-[#587076]">{campanha.estado}</p>
              {campanhaCriadaDaSessao(campanha) ? (
                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                    Página de destino
                  </p>
                  <p className="mt-1 text-sm font-semibold text-violet-950">
                    {campanhaCriadaDaSessao(campanha)?.paginaTitulo}
                  </p>
                  <p className="mt-0.5 text-xs text-violet-700">
                    {campanhaCriadaDaSessao(campanha)?.paginaDestino}
                  </p>
                </div>
              ) : null}
              <dl className="mt-5 grid grid-cols-2 gap-3">
                <DadoCompacto rotulo="Investimento" valor={campanha.investimento} />
                <DadoCompacto rotulo="Leads" valor={String(campanha.leads)} />
                <DadoCompacto rotulo="Custo por lead" valor={campanha.custo} />
                <DadoCompacto rotulo="Conversão" valor={campanha.conversao} />
              </dl>
              {campanhaCriadaDaSessao(campanha) ? (
                <CapturarLeadSinteticoDialog
                  campanhasDisponiveis={[campanhaCriadaDaSessao(campanha)!]}
                  imoveisDisponiveis={imoveisDisponiveis}
                  onConfirmar={onCaptarLead}
                  rotuloAcao="Simular captação nesta campanha"
                  className="mt-5 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"
                />
              ) : (
                <Button
                  variant="outline"
                  className="mt-5 w-full rounded-xl"
                  onClick={() =>
                    confirmarAcaoSintetica(
                      "Resultados da campanha",
                      `${campanha.nome} utiliza somente indicadores fictícios.`,
                    )
                  }
                >
                  Analisar resultados
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="rounded-2xl border-[#123f47]/10">
          <CardHeader>
            <CardTitle className="text-lg">Leads por canal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={origemDosLeads} margin={{ left: -18, right: 10 }}>
                  <CartesianGrid vertical={false} stroke="#123f4715" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={estiloTooltip} />
                  <Bar dataKey="valor" name="Participação (%)" radius={[8, 8, 0, 0]}>
                    {origemDosLeads.map((item) => (
                      <Cell key={item.nome} fill={item.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50">
          <CardContent className="p-6">
            <MousePointerClick className="size-7 text-emerald-700" />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-emerald-800">
              Simulador de captura
            </p>
            <h2 className="mt-2 text-xl font-semibold text-emerald-950">
              Teste a chegada de um lead
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900/70">
              Simule formulário, atribuição de campanha, consentimento e entrada no funil sem enviar
              dados para provedores.
            </p>
            <div className="mt-5">
              <CapturarLeadSinteticoDialog
                campanhasDisponiveis={campanhasCriadas}
                imoveisDisponiveis={imoveisDisponiveis}
                onConfirmar={onCaptarLead}
              />
            </div>
            {campanhasCriadas.length === 0 ? (
              <p className="mt-3 text-center text-xs leading-5 text-emerald-900/70">
                Planeje uma campanha com página associada para habilitar esta simulação.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DadoCompacto({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-[#f7f5f0] p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#587076]">
        {rotulo}
      </dt>
      <dd className="mt-1 text-base font-bold">{valor}</dd>
    </div>
  );
}

function Analises({
  relatorio,
  insights,
  decisoesComerciais,
  onRegistrarDecisao,
  periodo,
  responsavel,
  onSelecionarPeriodo,
  onSelecionarResponsavel,
}: {
  relatorio: RelatorioComercialSintetico;
  insights: ResumoInsightsComerciaisSinteticos;
  decisoesComerciais: DecisoesComerciaisSinteticas;
  onRegistrarDecisao: (
    recomendacao: RecomendacaoComercialSintetica,
    estado: AcaoDecisaoComercial,
  ) => void;
  periodo: PeriodoRelatorioComercial;
  responsavel: FiltroResponsavelRelatorio;
  onSelecionarPeriodo: (periodo: PeriodoRelatorioComercial) => void;
  onSelecionarResponsavel: (responsavel: FiltroResponsavelRelatorio) => void;
}) {
  return (
    <>
      <CabecalhoPagina
        titulo="Análises e desempenho"
        descricao="Compare conversão, resultados e desempenho fictício da equipe com filtros claros e visualizações responsivas."
        acao={
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() =>
              confirmarAcaoSintetica(
                "Exportação simulada pronta",
                `O relatório de ${periodo.toLocaleLowerCase("pt-BR")} para ${responsavel.toLocaleLowerCase("pt-BR")} foi apenas visualizado; nenhum arquivo foi gerado.`,
              )
            }
          >
            <FileText className="mr-2 size-4" />
            Simular exportação
          </Button>
        }
      />

      <Card className="rounded-2xl border-[#123f47]/10 bg-gradient-to-r from-orange-50 via-white to-violet-50">
        <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">
              Relatório comercial sintético
            </p>
            <h2 className="mt-1 text-lg font-semibold">Filtros do desempenho</h2>
            <p className="mt-1 text-xs leading-5 text-[#587076]">
              A seleção acompanha o Dashboard nesta sessão e nunca consulta dados reais.
            </p>
          </div>
          <FiltrosRelatorioComercial
            periodo={periodo}
            responsavel={responsavel}
            onSelecionarPeriodo={onSelecionarPeriodo}
            onSelecionarResponsavel={onSelecionarResponsavel}
            contexto="analises"
          />
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoMetrica
          rotulo="Leads analisados"
          valor={String(relatorio.totais.leads)}
          variacao={`${relatorio.totais.visitas} visitas no recorte`}
          icone={Users}
          tom="violeta"
        />
        <CartaoMetrica
          rotulo="Conversão em ganhos"
          valor={`${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(relatorio.totais.taxaConversao)}%`}
          variacao={`${relatorio.totais.ganhos} ganhos e ${relatorio.totais.perdidos} perdas`}
          icone={TrendingUp}
          tom="esmeralda"
        />
        <CartaoMetrica
          rotulo="Receita realizada"
          valor={formatarValorCompacto(relatorio.totais.realizado)}
          variacao={`Meta de ${formatarValorCompacto(relatorio.totais.meta)}`}
          icone={CircleDollarSign}
          tom="dourado"
        />
        <CartaoMetrica
          rotulo="Receita prevista"
          valor={formatarValorCompacto(relatorio.totais.previsto)}
          variacao="Projeção do cenário selecionado"
          icone={Target}
          tom="coral"
        />
      </div>

      <Card className="mt-5 rounded-2xl border-[#123f47]/10">
        <CardContent className="p-5 sm:p-6">
          <PainelInsightsExplicaveis
            resumo={insights}
            modo="detalhado"
            decisoesComerciais={decisoesComerciais}
            onRegistrarDecisao={onRegistrarDecisao}
          />
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="min-w-0 rounded-2xl border-[#123f47]/10">
          <CardHeader>
            <CardTitle className="text-lg">Conversão por etapa</CardTitle>
            <p className="text-xs text-[#587076]">
              Percentual de avanço em relação aos novos contatos do período
            </p>
          </CardHeader>
          <CardContent>
            <div
              className="h-[360px]"
              role="img"
              aria-label="Gráfico da taxa de conversão por etapa comercial"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={relatorio.conversaoEtapas}
                  layout="vertical"
                  margin={{ left: 18, right: 18 }}
                >
                  <CartesianGrid horizontal={false} stroke="#123f4715" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(valor) => `${valor}%`}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="etapa"
                    width={118}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={estiloTooltip}
                    formatter={(valor, _nome, item) => [
                      `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Number(valor))}% (${item.payload.quantidade} oportunidades)`,
                      "Taxa de conversão",
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Bar dataKey="taxa" name="Taxa de conversão (%)" radius={[0, 8, 8, 0]}>
                    {relatorio.conversaoEtapas.map((etapa) => (
                      <Cell key={etapa.etapa} fill={etapa.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-2xl border-[#123f47]/10">
          <CardHeader>
            <CardTitle className="text-lg">Meta, realizado e previsto</CardTitle>
            <p className="text-xs text-[#587076]">
              Comparação financeira por responsável no cenário atual
            </p>
          </CardHeader>
          <CardContent>
            <div
              className="h-[360px]"
              role="img"
              aria-label="Gráfico comparativo de meta, realizado e previsto por responsável"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={relatorio.desempenho} margin={{ top: 10, right: 8, left: -8 }}>
                  <CartesianGrid vertical={false} stroke="#123f4715" strokeDasharray="4 6" />
                  <XAxis
                    dataKey="responsavel"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(valor) => String(valor).split(" ")[0]}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(valor) => `${Math.round(Number(valor) / 1_000_000)} mi`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={estiloTooltip}
                    formatter={(valor) => formatarValorCompacto(Number(valor))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Bar
                    dataKey="meta"
                    name="Meta"
                    fill={PALETA_GRAFICOS.dourado}
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="realizado"
                    name="Realizado"
                    fill={PALETA_GRAFICOS.esmeralda}
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="previsto"
                    name="Previsto"
                    fill={PALETA_GRAFICOS.violeta}
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden rounded-2xl border-[#123f47]/10">
        <CardHeader>
          <CardTitle className="text-lg">Desempenho fictício por responsável</CardTitle>
          <p className="text-xs text-[#587076]">
            Volumes, resultados e atingimento da meta no período escolhido
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left text-xs">
              <thead className="bg-[#f6f4ef] text-[#587076]">
                <tr>
                  {[
                    "Responsável",
                    "Leads",
                    "Visitas",
                    "Propostas",
                    "Ganhos",
                    "Meta",
                    "Realizado",
                    "Previsto",
                    "Atingimento",
                  ].map((rotulo) => (
                    <th key={rotulo} scope="col" className="px-4 py-3 font-semibold">
                      {rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {relatorio.desempenho.map((item) => (
                  <tr key={item.responsavel} className="border-t border-[#123f47]/10 bg-white">
                    <th scope="row" className="whitespace-nowrap px-4 py-3 font-semibold">
                      <span
                        className="mr-2 inline-block size-2 rounded-full"
                        style={{ backgroundColor: item.cor }}
                      />
                      {item.responsavel}
                    </th>
                    <td className="px-4 py-3">{item.leads}</td>
                    <td className="px-4 py-3">{item.visitas}</td>
                    <td className="px-4 py-3">{item.propostas}</td>
                    <td className="px-4 py-3">{item.ganhos}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatarValorCompacto(item.meta)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-emerald-700">
                      {formatarValorCompacto(item.realizado)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-violet-700">
                      {formatarValorCompacto(item.previsto)}
                    </td>
                    <td className="px-4 py-3">{formatadorPercentual.format(item.atingimento)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <CartaoAnalise
          titulo="Velocidade de atendimento"
          valor="7 min"
          detalhe="Tempo médio sintético até o primeiro contato"
          tom="bg-violet-600"
        />
        <CartaoAnalise
          titulo="Retorno sobre mídia"
          valor="6,2×"
          detalhe="Receita potencial fictícia sobre investimento"
          tom="bg-orange-500"
        />
        <CartaoAnalise
          titulo="Qualidade dos dados"
          valor="92%"
          detalhe="Leads sintéticos com cadastro completo"
          tom="bg-emerald-600"
        />
      </div>
    </>
  );
}

function CartaoAnalise({
  titulo,
  valor,
  detalhe,
  tom,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  tom: string;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-[#123f47]/10">
      <CardContent className="flex items-center gap-4 p-5">
        <span className={cn("h-16 w-2 shrink-0 rounded-full", tom)} />
        <div>
          <p className="text-xs font-semibold text-[#587076]">{titulo}</p>
          <strong className="mt-1 block text-3xl">{valor}</strong>
          <p className="mt-1 text-xs text-[#587076]">{detalhe}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InteligenciaArtificial({
  insights,
  decisoesComerciais,
  onRegistrarDecisao,
  periodo,
  responsavel,
  onSelecionarPeriodo,
  onSelecionarResponsavel,
}: {
  insights: ResumoInsightsComerciaisSinteticos;
  decisoesComerciais: DecisoesComerciaisSinteticas;
  onRegistrarDecisao: (
    recomendacao: RecomendacaoComercialSintetica,
    estado: AcaoDecisaoComercial,
  ) => void;
  periodo: PeriodoRelatorioComercial;
  responsavel: FiltroResponsavelRelatorio;
  onSelecionarPeriodo: (periodo: PeriodoRelatorioComercial) => void;
  onSelecionarResponsavel: (responsavel: FiltroResponsavelRelatorio) => void;
}) {
  const leituraPrincipal = insights.insights[0];
  return (
    <>
      <CabecalhoPagina
        titulo="Inteligência artificial"
        descricao="Entenda por que cada prioridade comercial foi sugerida e simule a próxima ação — sempre com confirmação humana."
      />
      <Card className="rounded-2xl border-[#123f47]/10 bg-gradient-to-r from-violet-50 via-white to-orange-50">
        <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">
              Recomendações comerciais explicáveis
            </p>
            <h2 className="mt-1 text-lg font-semibold">Escolha o contexto da análise</h2>
            <p className="mt-1 text-xs leading-5 text-[#587076]">
              Filtros compartilhados com Dashboard e Análises; nenhum dado real é consultado.
            </p>
          </div>
          <FiltrosRelatorioComercial
            periodo={periodo}
            responsavel={responsavel}
            onSelecionarPeriodo={onSelecionarPeriodo}
            onSelecionarResponsavel={onSelecionarResponsavel}
            contexto="ia"
          />
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <CentralDecisoesComerciais
          resumo={insights}
          modo="detalhado"
          decisoesComerciais={decisoesComerciais}
          onRegistrarDecisao={onRegistrarDecisao}
        />

        <Card className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border-violet-200 bg-white xl:sticky xl:top-5 xl:self-start">
          <div className="flex items-center gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-violet-600 text-white">
              <Bot className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">Assistente Real One</h2>
              <p className="text-xs text-[#587076]">Contexto sintético da RM Prime Imóveis</p>
            </div>
            <Badge className="ml-auto bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              Disponível
            </Badge>
          </div>
          <div className="flex-1 space-y-4 p-5">
            <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-[#f4f0fa] p-4 text-sm leading-6">
              <strong className="mb-1 block text-violet-800">Leitura do recorte</strong>
              {leituraPrincipal.titulo}: {leituraPrincipal.leitura}
            </div>
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-[#123f47] p-4 text-sm leading-6 text-white">
              Como a IA chegou a esta leitura?
            </div>
            <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-[#f4f0fa] p-4 text-sm leading-6">
              <strong className="mb-1 block text-violet-800">Explicação do cálculo</strong>
              {leituraPrincipal.explicacao}
              <span className="mt-3 block rounded-xl border border-violet-200 bg-white p-3 text-xs text-[#587076]">
                <strong className="block text-[#123f47]">Evidência sintética</strong>
                {leituraPrincipal.evidencia}
              </span>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-xs leading-5 text-orange-950">
              <strong className="block">Controle humano obrigatório</strong>
              Nenhuma ação será executada automaticamente. Os botões apenas exibem uma confirmação
              visual nesta sessão.
            </div>
          </div>
          <div className="border-t border-[#123f47]/10 p-4">
            <div className="flex gap-2">
              <Input
                className="h-11 rounded-xl"
                placeholder="Pergunte sobre este recorte comercial"
                aria-label="Mensagem para o assistente"
              />
              <Button
                size="icon"
                className="size-11 shrink-0 rounded-xl bg-violet-600 hover:bg-violet-700"
                aria-label="Enviar mensagem"
                onClick={() =>
                  confirmarAcaoSintetica(
                    "Resposta sintética preparada",
                    "O assistente não recebeu nem armazenou uma mensagem real.",
                  )
                }
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-[#587076]">
              Conteúdo fictício e explicável. Confirme informações antes de agir.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}

function SitesEPaginas({
  paginasCriadas,
  campanhasCriadas,
  onCriarPagina,
}: {
  paginasCriadas: PaginaSinteticaCriada[];
  campanhasCriadas: CampanhaSinteticaCriada[];
  onCriarPagina: (pagina: PaginaSinteticaCriada) => void;
}) {
  return (
    <>
      <CabecalhoPagina
        titulo="Sites e páginas"
        descricao="Edite conteúdo, organize páginas de captura e acompanhe a qualidade da presença digital de cada empresa."
        acao={
          <NovaPaginaSinteticaDialog
            onConfirmar={(pagina) => {
              onCriarPagina(pagina);
              confirmarAcaoSintetica(
                "Rascunho de página criado",
                `${pagina.titulo} ficará visível somente nesta sessão.`,
              );
            }}
          />
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden rounded-2xl border-[#123f47]/10">
          <div className="flex items-center gap-2 border-b border-[#123f47]/10 bg-[#f0ede6] px-4 py-3">
            <span className="size-2.5 rounded-full bg-rose-400" />
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
            <div className="ml-3 flex-1 rounded-lg bg-white px-3 py-1.5 text-center text-[11px] text-[#587076]">
              rmprimeimoveis.com.br/imoveis
            </div>
          </div>
          <div className="relative min-h-[430px] overflow-hidden bg-[#123f47] p-7 text-white sm:p-10">
            <div className="absolute right-[-8%] top-[-20%] size-72 rounded-full bg-[#9dd7d2]/15 blur-2xl" />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#9dd7d2]">
              Seleção RM Prime
            </p>
            <h2 className="mt-5 max-w-lg text-4xl leading-tight sm:text-5xl">
              Imóveis extraordinários para histórias únicas.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/65">
              Curadoria imobiliária, tecnologia e atendimento consultivo em uma experiência
              integrada.
            </p>
            <Button
              className="mt-7 rounded-xl bg-[#d6a84b] text-[#123f47] hover:bg-[#e1b75b]"
              onClick={() =>
                confirmarAcaoSintetica(
                  "Vitrine sintética aberta",
                  "A navegação permanece dentro da prévia da RM Prime Imóveis.",
                )
              }
            >
              Explorar imóveis
            </Button>
            <div className="mt-10 grid grid-cols-3 gap-3">
              {propriedades.map((imovel) => (
                <div key={imovel.titulo} className="overflow-hidden rounded-xl bg-white/10">
                  <img src={imovel.imagem} alt="" className="aspect-[4/3] w-full object-cover" />
                  <p className="truncate px-3 py-2 text-[10px] text-white/80">
                    {imovel.bairro.split(" · ")[0]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="rounded-2xl border-[#123f47]/10">
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-[#587076]">Qualidade da página</p>
              <strong className="mt-2 block text-3xl">94/100</strong>
              <Progress value={94} className="mt-4" />
              <ul className="mt-4 space-y-2 text-xs text-[#587076]">
                <li className="flex gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Responsiva em celular e computador
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Título e descrição configurados
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Formulário conectado ao funil
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-[#123f47]/10">
            <CardContent className="p-5">
              <WandSparkles className="size-6 text-violet-600" />
              <h3 className="mt-4 font-semibold">Assistente de conteúdo</h3>
              <p className="mt-2 text-sm leading-6 text-[#587076]">
                Gere títulos, descrições, textos para redes sociais e informações para mecanismos de
                busca.
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full rounded-xl"
                onClick={() =>
                  confirmarAcaoSintetica(
                    "Conteúdo de exemplo criado",
                    "A inteligência artificial gerou apenas uma simulação visual.",
                  )
                }
              >
                Criar conteúdo com IA
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Card className="mt-5 rounded-2xl border-[#123f47]/10">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Rascunhos criados nesta sessão</CardTitle>
            <p className="mt-1 text-xs text-[#587076]">
              Prévia local para revisão; nenhuma página será publicada.
            </p>
          </div>
          <Badge variant="secondary">{paginasCriadas.length}</Badge>
        </CardHeader>
        <CardContent>
          {paginasCriadas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#123f47]/15 p-6 text-center">
              <FileText className="mx-auto size-6 text-[#587076]" />
              <p className="mt-2 text-sm font-semibold">Nenhum rascunho criado</p>
              <p className="mt-1 text-xs text-[#587076]">
                Use “Criar página” para testar a jornada completa.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {paginasCriadas.map((pagina) => (
                <article
                  key={pagina.caminho}
                  className="rounded-xl border border-[#123f47]/10 bg-[#faf8f4] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{pagina.titulo}</h2>
                      <p className="mt-1 text-xs font-medium text-violet-700">{pagina.caminho}</p>
                    </div>
                    <Badge variant="outline">Rascunho</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#587076]">{pagina.objetivo}</p>
                  <div className="mt-4 rounded-lg bg-white px-3 py-2 text-xs">
                    Botão principal: <strong>{pagina.chamada}</strong>
                  </div>
                  <p className="mt-3 text-xs font-medium text-[#587076]">
                    {campanhasCriadas.filter(
                      (campanha) => campanha.paginaDestino === pagina.caminho,
                    ).length === 1
                      ? "Associada a 1 campanha sintética"
                      : `Associada a ${
                          campanhasCriadas.filter(
                            (campanha) => campanha.paginaDestino === pagina.caminho,
                          ).length
                        } campanhas sintéticas`}
                  </p>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Integracoes() {
  return (
    <>
      <CabecalhoPagina
        titulo="Central de integrações"
        descricao="Entenda o papel de cada canal, sua situação atual e o que será necessário antes de conectá-lo com credenciais reais."
        acao={
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() =>
              confirmarAcaoSintetica(
                "Preferências de integração",
                "Nenhum token, conta ou provedor foi acessado.",
              )
            }
          >
            <Settings2 className="mr-2 size-4" />
            Preferências
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {integracoesSinteticas.map((integracao) => (
          <Card
            key={integracao.nome}
            className="group rounded-2xl border-[#123f47]/10 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl text-white",
                    integracao.cor,
                  )}
                >
                  <Network className="size-5" />
                </span>
                <Badge
                  variant="outline"
                  className="max-w-[150px] whitespace-normal text-right text-[10px] leading-4"
                >
                  {integracao.estado}
                </Badge>
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a6a35]">
                {integracao.grupo}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{integracao.nome}</h2>
              <p className="mt-2 min-h-16 text-sm leading-5 text-[#587076]">
                {integracao.descricao}
              </p>
              <Button
                variant="ghost"
                className="mt-3 w-full justify-between rounded-xl px-0 hover:bg-transparent"
                onClick={() =>
                  confirmarAcaoSintetica(
                    `Configuração de ${integracao.nome}`,
                    "A jornada foi aberta como contrato visual, sem credenciais reais.",
                  )
                }
              >
                Ver configuração{" "}
                <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-5 rounded-2xl border-sky-200 bg-gradient-to-r from-sky-50 to-white">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
            <MessageCircle className="size-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-sky-950">Conexões reais permanecem protegidas</h2>
            <p className="mt-1 text-sm leading-6 text-sky-900/65">
              Esta demonstração apresenta jornadas e contratos. Tokens, campanhas, contas e leads
              reais só serão conectados em uma etapa autorizada.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-xl border-sky-300 bg-white text-sky-900"
            onClick={() =>
              confirmarAcaoSintetica(
                "Plano de conexão protegido",
                "A ativação real permanece fora desta homologação.",
              )
            }
          >
            Ver plano de conexão <ExternalLink className="ml-2 size-4" />
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
