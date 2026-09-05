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
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Globe2,
  Home,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  Menu,
  MessageCircle,
  MousePointerClick,
  Network,
  Search,
  Send,
  Settings2,
  Sparkles,
  Target,
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
  PALETA_GRAFICOS,
  campanhasSinteticas,
  etapasDoFunil,
  evolucaoComercial,
  integracoesSinteticas,
  leadsSinteticos,
  origemDosLeads,
} from "./demo-data";
import {
  CapturarLeadSinteticoDialog,
  NovaCampanhaSinteticaDialog,
  NovaPaginaSinteticaDialog,
  NovoContatoSinteticoDialog,
  NovoImovelSinteticoDialog,
  type CampanhaSinteticaCriada,
  type CaptacaoSinteticaCriada,
  type ContatoSinteticoCriado,
  type ImovelSinteticoCriado,
  type PaginaSinteticaCriada,
} from "./SyntheticWorkflowDialogs";

type ModuloId =
  | "visao-geral"
  | "funil"
  | "imoveis"
  | "leads"
  | "campanhas"
  | "analises"
  | "ia"
  | "sites"
  | "integracoes";

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

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

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
              <VisaoGeral captacoesSinteticas={captacoesSinteticas} />
            ) : null}
            {moduloAtivo === "funil" ? (
              <FunilDeVendas
                leadsCriados={leadsCriados}
                onAdicionarLead={() => selecionarModulo("leads")}
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
              />
            ) : null}
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
            {moduloAtivo === "analises" ? <Analises /> : null}
            {moduloAtivo === "ia" ? <InteligenciaArtificial /> : null}
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

function VisaoGeral({ captacoesSinteticas }: { captacoesSinteticas: number }) {
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
          rotulo="Visitas realizadas"
          valor="173"
          variacao="24 visitas nesta semana"
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
          valor="R$ 38,7 mi"
          variacao="R$ 4,9 mi em negócios fechados"
          icone={CircleDollarSign}
          tom="dourado"
        />
      </div>

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

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="rounded-2xl border-violet-200 bg-gradient-to-br from-violet-50 to-white lg:col-span-2">
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
        <Card className="rounded-2xl border-[#123f47]/10">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#587076]">
              Meta mensal
            </p>
            <div className="mt-3 flex items-end justify-between">
              <strong className="text-3xl">74%</strong>
              <span className="text-xs text-[#587076]">R$ 38,7 mi de R$ 52 mi</span>
            </div>
            <Progress value={74} className="mt-4 h-2.5" />
            <p className="mt-3 text-xs leading-5 text-[#587076]">
              Faltam R$ 13,3 milhões para atingir a meta definida.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
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

function FunilDeVendas({
  leadsCriados,
  onAdicionarLead,
}: {
  leadsCriados: ContatoSinteticoCriado[];
  onAdicionarLead: () => void;
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
      <div className="grid gap-4 xl:grid-cols-5">
        {etapasDoFunil.map((etapa, indice) => {
          const contatosDaEtapa = [
            ...(indice === 0 ? contatosEncaminhados : []),
            ...leadsSinteticos.slice(0, Math.max(2, 4 - indice)),
          ];
          return (
            <section key={etapa.nome} className="min-w-0">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-2.5 rounded-full", etapa.cor)} />
                  {etapa.nome}
                </span>
                <Badge variant="secondary">
                  {etapa.quantidade + (indice === 0 ? contatosEncaminhados.length : 0)}
                </Badge>
              </div>
              <div className="space-y-3">
                {contatosDaEtapa.map((lead, leadIndice) => {
                  const contatoCriado = contatosEncaminhados.find((contato) => contato === lead);
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg border border-dashed border-[#123f47]/15 p-3 text-center text-xs text-[#587076]">
                {etapa.valor} em oportunidades
              </div>
            </section>
          );
        })}
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
}: {
  leadsCriados: ContatoSinteticoCriado[];
  imoveisDisponiveis: Array<Pick<ImovelSinteticoCriado, "titulo" | "bairro">>;
  onCriarContato: (contato: ContatoSinteticoCriado) => void;
  onEncaminharAoFunil: (contato: ContatoSinteticoCriado) => void;
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
              </dl>
              {contatoCriadoDaSessao(lead) ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 w-full rounded-xl"
                  disabled={contatoCriadoDaSessao(lead)?.encaminhadoAoFunil}
                  onClick={() => onEncaminharAoFunil(contatoCriadoDaSessao(lead)!)}
                >
                  {contatoCriadoDaSessao(lead)?.encaminhadoAoFunil
                    ? "Contato no funil"
                    : "Enviar ao funil"}
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
                    {contatoCriadoDaSessao(lead) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        disabled={contatoCriadoDaSessao(lead)?.encaminhadoAoFunil}
                        onClick={() => onEncaminharAoFunil(contatoCriadoDaSessao(lead)!)}
                      >
                        {contatoCriadoDaSessao(lead)?.encaminhadoAoFunil
                          ? "Contato no funil"
                          : "Enviar ao funil"}
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

function Analises() {
  return (
    <>
      <CabecalhoPagina
        titulo="Análises e desempenho"
        descricao="Explore resultados comerciais com visualizações acessíveis, cores distintas e legendas em português."
        acao={
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() =>
              confirmarAcaoSintetica(
                "Relatório de demonstração preparado",
                "A exportação real permanece desativada nesta homologação.",
              )
            }
          >
            Exportar relatório
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="min-w-0 rounded-2xl border-[#123f47]/10">
          <CardHeader>
            <CardTitle className="text-lg">Conversão por etapa</CardTitle>
            <p className="text-xs text-[#587076]">
              Comparação entre volume de entrada e avanço no funil
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={etapasDoFunil} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid horizontal={false} stroke="#123f4715" />
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={118}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={estiloTooltip} />
                  <Bar dataKey="quantidade" name="Oportunidades" radius={[0, 8, 8, 0]}>
                    {etapasDoFunil.map((_, index) => (
                      <Cell
                        key={index}
                        fill={
                          [
                            PALETA_GRAFICOS.violeta,
                            PALETA_GRAFICOS.azulCeu,
                            PALETA_GRAFICOS.dourado,
                            PALETA_GRAFICOS.coral,
                            PALETA_GRAFICOS.esmeralda,
                          ][index]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <CartaoAnalise
            titulo="Velocidade de atendimento"
            valor="7 min"
            detalhe="Tempo médio até o primeiro contato"
            tom="bg-violet-600"
          />
          <CartaoAnalise
            titulo="Retorno sobre mídia"
            valor="6,2×"
            detalhe="Receita potencial sobre investimento"
            tom="bg-orange-500"
          />
          <CartaoAnalise
            titulo="Qualidade dos dados"
            valor="92%"
            detalhe="Leads com cadastro completo"
            tom="bg-emerald-600"
          />
        </div>
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

function InteligenciaArtificial() {
  const sugestoes = [
    {
      titulo: "Priorizar atendimentos",
      texto: "Sete leads apresentam alta intenção e aguardam retorno há mais de duas horas.",
      icone: Target,
      cor: "bg-violet-100 text-violet-700",
    },
    {
      titulo: "Otimizar investimento",
      texto: "A campanha de Vila da Serra pode receber 18% mais verba mantendo o custo por lead.",
      icone: TrendingUp,
      cor: "bg-orange-100 text-orange-700",
    },
    {
      titulo: "Completar anúncios",
      texto: "Quatro imóveis com boa procura ainda não possuem vídeo ou descrição otimizada.",
      icone: Building2,
      cor: "bg-emerald-100 text-emerald-700",
    },
  ];
  return (
    <>
      <CabecalhoPagina
        titulo="Inteligência artificial"
        descricao="Transforme dados comerciais em prioridades claras, conteúdo e apoio ao atendimento — sempre com confirmação humana."
      />
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          {sugestoes.map((item) => {
            const Icone = item.icone;
            return (
              <Card key={item.titulo} className="rounded-2xl border-[#123f47]/10">
                <CardContent className="flex gap-4 p-5">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl",
                      item.cor,
                    )}
                  >
                    <Icone className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold">{item.titulo}</h2>
                    <p className="mt-1 text-sm leading-6 text-[#587076]">{item.texto}</p>
                    <button
                      type="button"
                      className="mt-3 text-xs font-semibold text-violet-700"
                      onClick={() =>
                        confirmarAcaoSintetica(
                          "Recomendação detalhada",
                          `${item.titulo} foi aberto apenas com contexto fictício.`,
                        )
                      }
                    >
                      Ver recomendação detalhada →
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border-violet-200 bg-white">
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
              <strong className="mb-1 block text-violet-800">Resumo da manhã</strong>Há 12
              oportunidades que merecem atenção. Recomendo começar pelos três contatos de Vila da
              Serra e revisar a campanha de coberturas.
            </div>
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-[#123f47] p-4 text-sm leading-6 text-white">
              Quais imóveis possuem maior chance de visita nesta semana?
            </div>
            <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-[#f4f0fa] p-4 text-sm leading-6">
              Encontrei cinco imóveis. A cobertura de Lourdes lidera por número de visualizações,
              intenção dos contatos e disponibilidade da equipe.
            </div>
          </div>
          <div className="border-t border-[#123f47]/10 p-4">
            <div className="flex gap-2">
              <Input
                className="h-11 rounded-xl"
                placeholder="Pergunte sobre leads, imóveis ou campanhas"
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
              A IA pode cometer erros. Confirme informações antes de agir.
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
