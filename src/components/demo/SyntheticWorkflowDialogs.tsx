import { useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileSignature,
  FileText,
  Handshake,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type ContatoSinteticoCriado = {
  nome: string;
  telefone: string;
  interesse: string;
  imovelSelecionado: string;
  origem: string;
  campanhaOrigem?: string;
  paginaOrigem?: string;
  responsavel: string;
  etapa: string;
  temperatura: string;
  encaminhadoAoFunil: boolean;
  captadoPorCampanha?: boolean;
  qualificacao: "Em qualificação" | "Qualificado";
  historicoAtendimento: HistoricoAtendimentoSintetico[];
  visitaAgendada?: VisitaSintetica;
  proposta?: PropostaSintetica;
};

export type HistoricoAtendimentoSintetico = {
  titulo: string;
  detalhe: string;
  momento: string;
  tipo:
    | "Cadastro"
    | "Captação"
    | "Atendimento"
    | "Avanço de etapa"
    | "Visita"
    | "Proposta"
    | "Negociação"
    | "Resultado";
};

export type VisitaSintetica = {
  data: string;
  dataExibicao: string;
  horario: string;
};

export type PropostaSintetica = {
  valorNumerico: number;
  valorExibicao: string;
  validade: string;
  validadeExibicao: string;
  condicoes: string;
  estado: "Em negociação" | "Ganha" | "Perdida";
  ultimaNegociacao: string;
  motivoResultado?: string;
};

export type ImovelSinteticoCriado = {
  titulo: string;
  bairro: string;
  valorNumerico: number;
  detalhes: string;
  estado: string;
};

export type CampanhaSinteticaCriada = {
  nome: string;
  canal: string;
  paginaDestino: string;
  paginaTitulo: string;
  estado: string;
  investimento: string;
  investimentoNumerico: number;
  leads: number;
  custo: string;
  conversao: string;
  cor: string;
};

export type CaptacaoSinteticaCriada = {
  contato: ContatoSinteticoCriado;
  campanha: CampanhaSinteticaCriada;
};

export type AcompanhamentoSinteticoCriado = {
  contato: ContatoSinteticoCriado;
  qualificacao: ContatoSinteticoCriado["qualificacao"];
  etapaDestino: string;
  registroAtendimento: string;
  visitaAgendada?: VisitaSintetica;
};

export type PropostaSinteticaAtualizada = {
  contato: ContatoSinteticoCriado;
  proposta: PropostaSintetica;
  etapaDestino: "Proposta enviada" | "Negócio fechado" | "Negócio perdido";
  novosEventos: HistoricoAtendimentoSintetico[];
};

export type PaginaSinteticaCriada = {
  titulo: string;
  caminho: string;
  objetivo: string;
  chamada: string;
};

const campoClasse =
  "h-11 rounded-xl border-[#123f47]/15 bg-white focus-visible:border-[#123f47] focus-visible:ring-[#123f47]/15";

function CampoTexto({
  id,
  rotulo,
  observacao,
  ...props
}: ComponentProps<typeof Input> & {
  id: string;
  rotulo: string;
  observacao?: string;
}) {
  return (
    <label htmlFor={id} className="grid gap-1.5 text-sm font-semibold text-[#123f47]">
      {rotulo}
      <Input id={id} className={campoClasse} {...props} />
      {observacao ? (
        <span className="text-xs font-normal leading-5 text-[#587076]">{observacao}</span>
      ) : null}
    </label>
  );
}

function CampoSelecao({
  id,
  rotulo,
  value,
  onChange,
  children,
}: {
  id: string;
  rotulo: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className="grid gap-1.5 text-sm font-semibold text-[#123f47]">
      {rotulo}
      <select
        id={id}
        className={`${campoClasse} w-full px-3 text-sm font-normal outline-none`}
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function AvisoSessaoSintetica() {
  return (
    <p className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
      Simulação segura: o registro permanece apenas nesta sessão e será descartado ao recarregar a
      página.
    </p>
  );
}

function ErroFormulario({ mensagem }: { mensagem: string }) {
  return mensagem ? (
    <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
      {mensagem}
    </p>
  ) : null;
}

function RodapeFormulario({ rotulo }: { rotulo: string }) {
  return (
    <DialogFooter className="gap-2 pt-1">
      <DialogClose asChild>
        <Button type="button" variant="outline" className="rounded-xl">
          Cancelar
        </Button>
      </DialogClose>
      <Button type="submit" className="rounded-xl bg-[#123f47] hover:bg-[#0b3036]">
        {rotulo}
      </Button>
    </DialogFooter>
  );
}

const conteudoDialogClasse =
  "max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-[#123f47]/10 p-5 sm:max-w-xl sm:p-6";

export function NovoContatoSinteticoDialog({
  onConfirmar,
  imoveisDisponiveis,
}: {
  onConfirmar: (contato: ContatoSinteticoCriado) => void;
  imoveisDisponiveis: Array<Pick<ImovelSinteticoCriado, "titulo" | "bairro">>;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [imovelSelecionado, setImovelSelecionado] = useState(imoveisDisponiveis[0]?.titulo ?? "");
  const [observacaoInteresse, setObservacaoInteresse] = useState("");
  const [origem, setOrigem] = useState("Site institucional");
  const [prioridade, setPrioridade] = useState("Novo");
  const [erro, setErro] = useState("");

  function limpar() {
    setNome("");
    setTelefone("");
    setImovelSelecionado(imoveisDisponiveis[0]?.titulo ?? "");
    setObservacaoInteresse("");
    setOrigem("Site institucional");
    setPrioridade("Novo");
    setErro("");
  }

  function alterarAberto(proximo: boolean) {
    setAberto(proximo);
    if (!proximo) limpar();
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (nome.trim().length < 3) {
      setErro("Informe o nome completo do contato.");
      return;
    }
    if (telefone.replace(/\D/g, "").length < 10) {
      setErro("Informe um telefone com DDD para continuar.");
      return;
    }
    const imovel = imoveisDisponiveis.find((item) => item.titulo === imovelSelecionado);
    if (!imovel) {
      setErro("Selecione um imóvel de interesse para continuar.");
      return;
    }

    onConfirmar({
      nome: nome.trim(),
      telefone: telefone.trim(),
      interesse: observacaoInteresse.trim() || `${imovel.titulo} · ${imovel.bairro}`,
      imovelSelecionado: imovel.titulo,
      origem,
      responsavel: "Equipe de demonstração",
      etapa: "Novo contato",
      temperatura: prioridade,
      encaminhadoAoFunil: false,
      qualificacao: "Em qualificação",
      historicoAtendimento: [
        {
          titulo: "Contato cadastrado",
          detalhe: "Registro criado manualmente na demonstração.",
          momento: "Agora",
          tipo: "Cadastro",
        },
      ],
    });
    alterarAberto(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={alterarAberto}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-[#123f47]">
          <Users className="mr-2 size-4" />
          Novo contato
        </Button>
      </DialogTrigger>
      <DialogContent className={conteudoDialogClasse}>
        <DialogHeader>
          <DialogTitle>Novo contato de demonstração</DialogTitle>
          <DialogDescription>
            Preencha os campos para visualizar a entrada de um lead no atendimento.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={enviar} noValidate>
          <AvisoSessaoSintetica />
          <CampoTexto
            id="contato-nome"
            rotulo="Nome completo"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            placeholder="Ex.: Marina Oliveira"
            autoComplete="off"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              id="contato-telefone"
              rotulo="Telefone com DDD"
              value={telefone}
              onChange={(evento) => setTelefone(evento.target.value)}
              placeholder="(31) 99999-0000"
              inputMode="tel"
              autoComplete="off"
            />
            <CampoSelecao
              id="contato-origem"
              rotulo="Origem do contato"
              value={origem}
              onChange={setOrigem}
            >
              <option>Site institucional</option>
              <option>Meta Ads</option>
              <option>Google Ads</option>
              <option>Portal imobiliário</option>
            </CampoSelecao>
          </div>
          <CampoSelecao
            id="contato-imovel"
            rotulo="Imóvel de interesse"
            value={imovelSelecionado}
            onChange={setImovelSelecionado}
          >
            {imoveisDisponiveis.map((imovel) => (
              <option key={`${imovel.titulo}-${imovel.bairro}`} value={imovel.titulo}>
                {imovel.titulo} — {imovel.bairro}
              </option>
            ))}
          </CampoSelecao>
          <CampoTexto
            id="contato-interesse"
            rotulo="Observação do interesse (opcional)"
            value={observacaoInteresse}
            onChange={(evento) => setObservacaoInteresse(evento.target.value)}
            placeholder="Ex.: Prefere visita no período da manhã"
            autoComplete="off"
          />
          <CampoSelecao
            id="contato-prioridade"
            rotulo="Prioridade inicial"
            value={prioridade}
            onChange={setPrioridade}
          >
            <option value="Novo">Contato novo</option>
            <option value="Morno">Prioridade morna</option>
            <option value="Quente">Prioridade quente</option>
          </CampoSelecao>
          <ErroFormulario mensagem={erro} />
          <RodapeFormulario rotulo="Adicionar à demonstração" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NovoImovelSinteticoDialog({
  onConfirmar,
}: {
  onConfirmar: (imovel: ImovelSinteticoCriado) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [valor, setValor] = useState("");
  const [area, setArea] = useState("");
  const [quartos, setQuartos] = useState("");
  const [erro, setErro] = useState("");

  function limpar() {
    setTitulo("");
    setLocalizacao("");
    setValor("");
    setArea("");
    setQuartos("");
    setErro("");
  }

  function alterarAberto(proximo: boolean) {
    setAberto(proximo);
    if (!proximo) limpar();
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valorNumerico = Number(valor);
    const areaNumerica = Number(area);
    const quartosNumericos = Number(quartos);
    if (titulo.trim().length < 4) {
      setErro("Informe um título claro para o imóvel.");
      return;
    }
    if (localizacao.trim().length < 4) {
      setErro("Informe o bairro e a cidade do imóvel.");
      return;
    }
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setErro("Informe um valor de venda maior que zero.");
      return;
    }
    if (!Number.isFinite(areaNumerica) || areaNumerica <= 0 || quartosNumericos < 1) {
      setErro("Informe área e quantidade de quartos válidas.");
      return;
    }

    onConfirmar({
      titulo: titulo.trim(),
      bairro: localizacao.trim(),
      valorNumerico,
      detalhes: `${areaNumerica} m² · ${quartosNumericos} quartos · cadastro sintético`,
      estado: "Disponível",
    });
    alterarAberto(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={alterarAberto}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-[#123f47]">
          <Building2 className="mr-2 size-4" />
          Cadastrar imóvel
        </Button>
      </DialogTrigger>
      <DialogContent className={conteudoDialogClasse}>
        <DialogHeader>
          <DialogTitle>Cadastrar imóvel de demonstração</DialogTitle>
          <DialogDescription>
            Crie um cartão temporário para avaliar a jornada de cadastro e o catálogo.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={enviar} noValidate>
          <AvisoSessaoSintetica />
          <CampoTexto
            id="imovel-titulo"
            rotulo="Título do imóvel"
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            placeholder="Ex.: Apartamento com vista definitiva"
            autoComplete="off"
          />
          <CampoTexto
            id="imovel-localizacao"
            rotulo="Bairro e cidade"
            value={localizacao}
            onChange={(evento) => setLocalizacao(evento.target.value)}
            placeholder="Ex.: Savassi · Belo Horizonte"
            autoComplete="off"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <CampoTexto
              id="imovel-valor"
              rotulo="Valor de venda (R$)"
              value={valor}
              onChange={(evento) => setValor(evento.target.value)}
              type="number"
              min="1"
              step="1000"
              placeholder="2500000"
            />
            <CampoTexto
              id="imovel-area"
              rotulo="Área privativa (m²)"
              value={area}
              onChange={(evento) => setArea(evento.target.value)}
              type="number"
              min="1"
              placeholder="180"
            />
            <CampoTexto
              id="imovel-quartos"
              rotulo="Quartos"
              value={quartos}
              onChange={(evento) => setQuartos(evento.target.value)}
              type="number"
              min="1"
              placeholder="4"
            />
          </div>
          <ErroFormulario mensagem={erro} />
          <RodapeFormulario rotulo="Adicionar ao catálogo" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NovaCampanhaSinteticaDialog({
  onConfirmar,
  paginasDisponiveis,
}: {
  onConfirmar: (campanha: CampanhaSinteticaCriada) => void;
  paginasDisponiveis: Array<Pick<PaginaSinteticaCriada, "titulo" | "caminho">>;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [canal, setCanal] = useState("Meta Ads");
  const [paginaDestino, setPaginaDestino] = useState(paginasDisponiveis[0]?.caminho ?? "");
  const [investimento, setInvestimento] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [erro, setErro] = useState("");

  function limpar() {
    setNome("");
    setCanal("Meta Ads");
    setPaginaDestino(paginasDisponiveis[0]?.caminho ?? "");
    setInvestimento("");
    setObjetivo("");
    setErro("");
  }

  function alterarAberto(proximo: boolean) {
    setAberto(proximo);
    if (!proximo) limpar();
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valorInvestimento = Number(investimento);
    if (nome.trim().length < 4) {
      setErro("Informe um nome claro para a campanha.");
      return;
    }
    if (!Number.isFinite(valorInvestimento) || valorInvestimento <= 0) {
      setErro("Informe um orçamento maior que zero.");
      return;
    }
    if (objetivo.trim().length < 10) {
      setErro("Descreva o objetivo da campanha com pelo menos 10 caracteres.");
      return;
    }
    const pagina = paginasDisponiveis.find((item) => item.caminho === paginaDestino);
    if (!pagina) {
      setErro("Selecione uma página de destino para continuar.");
      return;
    }

    const corPorCanal: Record<string, string> = {
      "Meta Ads": "from-violet-500 to-fuchsia-500",
      "Google Ads": "from-orange-500 to-amber-400",
      "Página de captura": "from-emerald-500 to-teal-400",
    };
    onConfirmar({
      nome: nome.trim(),
      canal,
      paginaDestino: pagina.caminho,
      paginaTitulo: pagina.titulo,
      estado: "Rascunho sintético",
      investimento: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(valorInvestimento),
      investimentoNumerico: valorInvestimento,
      leads: 0,
      custo: "—",
      conversao: "0%",
      cor: corPorCanal[canal] ?? "from-sky-500 to-cyan-400",
    });
    alterarAberto(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={alterarAberto}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-[#123f47]">
          <Target className="mr-2 size-4" />
          Planejar campanha
        </Button>
      </DialogTrigger>
      <DialogContent className={conteudoDialogClasse}>
        <DialogHeader>
          <DialogTitle>Planejar campanha de demonstração</DialogTitle>
          <DialogDescription>
            Simule canal, orçamento e objetivo sem criar campanha em um provedor.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={enviar} noValidate>
          <AvisoSessaoSintetica />
          <CampoTexto
            id="campanha-nome"
            rotulo="Nome da campanha"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            placeholder="Ex.: Imóveis em Lourdes — setembro"
            autoComplete="off"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoSelecao
              id="campanha-canal"
              rotulo="Canal de divulgação"
              value={canal}
              onChange={setCanal}
            >
              <option>Meta Ads</option>
              <option>Google Ads</option>
              <option>Página de captura</option>
            </CampoSelecao>
            <CampoTexto
              id="campanha-investimento"
              rotulo="Orçamento simulado (R$)"
              value={investimento}
              onChange={(evento) => setInvestimento(evento.target.value)}
              type="number"
              min="1"
              step="100"
              placeholder="5000"
            />
          </div>
          <CampoSelecao
            id="campanha-pagina-destino"
            rotulo="Página de destino"
            value={paginaDestino}
            onChange={setPaginaDestino}
          >
            {paginasDisponiveis.map((pagina) => (
              <option key={pagina.caminho} value={pagina.caminho}>
                {pagina.titulo} — {pagina.caminho}
              </option>
            ))}
          </CampoSelecao>
          <label
            htmlFor="campanha-objetivo"
            className="grid gap-1.5 text-sm font-semibold text-[#123f47]"
          >
            Objetivo da campanha
            <Textarea
              id="campanha-objetivo"
              className="min-h-24 rounded-xl border-[#123f47]/15 bg-white"
              value={objetivo}
              onChange={(evento) => setObjetivo(evento.target.value)}
              placeholder="Ex.: Gerar contatos interessados em apartamentos de alto padrão."
            />
          </label>
          <ErroFormulario mensagem={erro} />
          <RodapeFormulario rotulo="Criar rascunho sintético" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CapturarLeadSinteticoDialog({
  campanhasDisponiveis,
  imoveisDisponiveis,
  onConfirmar,
  rotuloAcao = "Iniciar simulação",
  className,
}: {
  campanhasDisponiveis: CampanhaSinteticaCriada[];
  imoveisDisponiveis: Array<Pick<ImovelSinteticoCriado, "titulo" | "bairro">>;
  onConfirmar: (captacao: CaptacaoSinteticaCriada) => void;
  rotuloAcao?: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [campanhaSelecionada, setCampanhaSelecionada] = useState(
    campanhasDisponiveis[0]?.nome ?? "",
  );
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [imovelSelecionado, setImovelSelecionado] = useState(imoveisDisponiveis[0]?.titulo ?? "");
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState("");

  function limpar() {
    setCampanhaSelecionada(campanhasDisponiveis[0]?.nome ?? "");
    setNome("");
    setTelefone("");
    setImovelSelecionado(imoveisDisponiveis[0]?.titulo ?? "");
    setConsentimento(false);
    setErro("");
  }

  function alterarAberto(proximo: boolean) {
    if (
      proximo &&
      !campanhasDisponiveis.some((campanha) => campanha.nome === campanhaSelecionada)
    ) {
      setCampanhaSelecionada(campanhasDisponiveis[0]?.nome ?? "");
    }
    setAberto(proximo);
    if (!proximo) limpar();
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const campanha = campanhasDisponiveis.find((item) => item.nome === campanhaSelecionada);
    const imovel = imoveisDisponiveis.find((item) => item.titulo === imovelSelecionado);
    if (!campanha) {
      setErro("Crie ou selecione uma campanha com página associada para continuar.");
      return;
    }
    if (nome.trim().length < 3) {
      setErro("Informe o nome completo do lead captado.");
      return;
    }
    if (telefone.replace(/\D/g, "").length < 10) {
      setErro("Informe um telefone com DDD para continuar.");
      return;
    }
    if (!imovel) {
      setErro("Selecione o imóvel de interesse do lead.");
      return;
    }
    if (!consentimento) {
      setErro("Confirme o consentimento fictício para concluir a simulação.");
      return;
    }

    onConfirmar({
      campanha,
      contato: {
        nome: nome.trim(),
        telefone: telefone.trim(),
        interesse: `${imovel.titulo} · ${imovel.bairro}`,
        imovelSelecionado: imovel.titulo,
        origem: campanha.canal,
        campanhaOrigem: campanha.nome,
        paginaOrigem: campanha.paginaDestino,
        responsavel: "Equipe de demonstração",
        etapa: "Novos contatos",
        temperatura: "Quente",
        encaminhadoAoFunil: true,
        captadoPorCampanha: true,
        qualificacao: "Em qualificação",
        historicoAtendimento: [
          {
            titulo: "Lead captado pela campanha",
            detalhe: `${campanha.canal} · ${campanha.nome} · ${campanha.paginaDestino}`,
            momento: "Agora",
            tipo: "Captação",
          },
        ],
      },
    });
    alterarAberto(false);
  }

  const campanhaAtual = campanhasDisponiveis.find((item) => item.nome === campanhaSelecionada);

  return (
    <Dialog open={aberto} onOpenChange={alterarAberto}>
      <DialogTrigger asChild>
        <Button
          className={className ?? "w-full rounded-xl bg-emerald-700 hover:bg-emerald-800"}
          disabled={campanhasDisponiveis.length === 0}
        >
          <Users className="mr-2 size-4" />
          {rotuloAcao}
        </Button>
      </DialogTrigger>
      <DialogContent className={conteudoDialogClasse}>
        <DialogHeader>
          <DialogTitle>Simular captação de lead</DialogTitle>
          <DialogDescription>
            Teste a jornada da campanha até o funil sem enviar dados a qualquer provedor.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={enviar} noValidate>
          <AvisoSessaoSintetica />
          <CampoSelecao
            id="captacao-campanha"
            rotulo="Campanha de origem"
            value={campanhaSelecionada}
            onChange={setCampanhaSelecionada}
          >
            {campanhasDisponiveis.map((campanha) => (
              <option key={`${campanha.nome}-${campanha.paginaDestino}`} value={campanha.nome}>
                {campanha.nome} — {campanha.canal}
              </option>
            ))}
          </CampoSelecao>
          {campanhaAtual ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-950">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-violet-700">
                Página associada à campanha
              </span>
              <strong className="mt-1 block">{campanhaAtual.paginaTitulo}</strong>
              <span className="text-xs text-violet-700">{campanhaAtual.paginaDestino}</span>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              id="captacao-nome"
              rotulo="Nome completo do lead"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="Ex.: Marina Souza"
              autoComplete="off"
            />
            <CampoTexto
              id="captacao-telefone"
              rotulo="Telefone com DDD"
              value={telefone}
              onChange={(evento) => setTelefone(evento.target.value)}
              placeholder="(31) 99999-0000"
              inputMode="tel"
              autoComplete="off"
            />
          </div>
          <CampoSelecao
            id="captacao-imovel"
            rotulo="Imóvel de interesse"
            value={imovelSelecionado}
            onChange={setImovelSelecionado}
          >
            {imoveisDisponiveis.map((imovel) => (
              <option key={imovel.titulo} value={imovel.titulo}>
                {imovel.titulo} — {imovel.bairro}
              </option>
            ))}
          </CampoSelecao>
          <label className="flex items-start gap-3 rounded-xl border border-[#123f47]/10 bg-[#f7f5f0] p-3 text-sm text-[#123f47]">
            <input
              type="checkbox"
              checked={consentimento}
              onChange={(evento) => setConsentimento(evento.target.checked)}
              className="mt-0.5 size-4 accent-[#123f47]"
            />
            <span>
              <strong className="block">Consentimento fictício confirmado</strong>
              <span className="mt-1 block text-xs leading-5 text-[#587076]">
                Representa a autorização do lead para contato somente nesta demonstração.
              </span>
            </span>
          </label>
          <ErroFormulario mensagem={erro} />
          <RodapeFormulario rotulo="Captar e enviar ao funil" />
        </form>
      </DialogContent>
    </Dialog>
  );
}

const etapasAcompanhamento = [
  "Novos contatos",
  "Em atendimento",
  "Visita agendada",
  "Proposta enviada",
  "Negócio fechado",
  "Negócio perdido",
] as const;

function etapaAtualNormalizada(contato: ContatoSinteticoCriado) {
  return contato.etapa === "Novo contato" ? "Novos contatos" : contato.etapa;
}

function proximaEtapaPermitida(contato: ContatoSinteticoCriado) {
  const etapaAtual = etapaAtualNormalizada(contato);
  const indiceAtual = etapasAcompanhamento.indexOf(etapaAtual as never);
  const indiceVisita = etapasAcompanhamento.indexOf("Visita agendada");
  if (indiceAtual < 0 || indiceAtual >= indiceVisita) return etapaAtual;
  return etapasAcompanhamento[indiceAtual + 1];
}

export function AcompanharLeadSinteticoDialog({
  contato,
  onConfirmar,
  className,
}: {
  contato: ContatoSinteticoCriado;
  onConfirmar: (acompanhamento: AcompanhamentoSinteticoCriado) => void;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [qualificacao, setQualificacao] = useState(contato.qualificacao);
  const [etapaDestino, setEtapaDestino] = useState<string>(proximaEtapaPermitida(contato));
  const [registroAtendimento, setRegistroAtendimento] = useState("");
  const [dataVisita, setDataVisita] = useState(contato.visitaAgendada?.data ?? "");
  const [horarioVisita, setHorarioVisita] = useState(contato.visitaAgendada?.horario ?? "");
  const [erro, setErro] = useState("");

  const etapaAtual = etapaAtualNormalizada(contato);
  const proximaEtapa = proximaEtapaPermitida(contato);
  const podeAvancar = proximaEtapa !== etapaAtual;
  const exigeVisita = etapaDestino === "Visita agendada";

  function prepararFormulario() {
    setQualificacao(contato.qualificacao);
    setEtapaDestino(proximaEtapaPermitida(contato));
    setRegistroAtendimento("");
    setDataVisita(contato.visitaAgendada?.data ?? "");
    setHorarioVisita(contato.visitaAgendada?.horario ?? "");
    setErro("");
  }

  function alterarAberto(proximo: boolean) {
    if (proximo) prepararFormulario();
    setAberto(proximo);
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (registroAtendimento.trim().length < 10) {
      setErro("Descreva o atendimento realizado com pelo menos 10 caracteres.");
      return;
    }
    if (etapaDestino === "Em atendimento" && qualificacao !== "Qualificado") {
      setErro("Marque o lead como qualificado antes de avançar para Em atendimento.");
      return;
    }

    let visitaAgendada = contato.visitaAgendada;
    if (exigeVisita) {
      if (!dataVisita || dataVisita < new Date().toISOString().slice(0, 10)) {
        setErro("Escolha uma data de hoje ou futura para a visita fictícia.");
        return;
      }
      if (!horarioVisita) {
        setErro("Informe o horário da visita fictícia.");
        return;
      }
      visitaAgendada = {
        data: dataVisita,
        dataExibicao: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
          new Date(`${dataVisita}T12:00:00`),
        ),
        horario: horarioVisita,
      };
    }

    onConfirmar({
      contato,
      qualificacao,
      etapaDestino,
      registroAtendimento: registroAtendimento.trim(),
      visitaAgendada,
    });
    setAberto(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={alterarAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className ?? "w-full rounded-xl"}>
          <ClipboardCheck className="mr-2 size-4" />
          Acompanhar lead
        </Button>
      </DialogTrigger>
      <DialogContent className={conteudoDialogClasse}>
        <DialogHeader>
          <DialogTitle>Acompanhar lead de demonstração</DialogTitle>
          <DialogDescription>
            Qualifique, registre o atendimento e avance uma etapa por vez, somente nesta sessão.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={enviar} noValidate>
          <AvisoSessaoSintetica />
          <div className="rounded-xl border border-[#123f47]/10 bg-[#f7f5f0] p-3">
            <strong className="block text-sm text-[#123f47]">{contato.nome}</strong>
            <span className="mt-1 block text-xs text-[#587076]">{contato.interesse}</span>
            <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#123f47]">
              Etapa atual: {etapaAtual}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoSelecao
              id="acompanhamento-qualificacao"
              rotulo="Situação da qualificação"
              value={qualificacao}
              onChange={(valor) => setQualificacao(valor as ContatoSinteticoCriado["qualificacao"])}
            >
              <option>Em qualificação</option>
              <option>Qualificado</option>
            </CampoSelecao>
            <CampoSelecao
              id="acompanhamento-etapa"
              rotulo="Próxima etapa do funil"
              value={etapaDestino}
              onChange={setEtapaDestino}
            >
              <option value={etapaAtual}>Manter em {etapaAtual}</option>
              {podeAvancar ? (
                <option value={proximaEtapa}>Avançar para {proximaEtapa}</option>
              ) : null}
            </CampoSelecao>
          </div>
          <label
            htmlFor="acompanhamento-registro"
            className="grid gap-1.5 text-sm font-semibold text-[#123f47]"
          >
            Registro do atendimento
            <Textarea
              id="acompanhamento-registro"
              className="min-h-24 rounded-xl border-[#123f47]/15 bg-white"
              value={registroAtendimento}
              onChange={(evento) => setRegistroAtendimento(evento.target.value)}
              placeholder="Ex.: Lead confirmou interesse e disponibilidade para visita."
            />
            <span className="text-xs font-normal leading-5 text-[#587076]">
              Este texto entrará no histórico temporário do lead.
            </span>
          </label>
          {exigeVisita ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-950">
                <CalendarDays className="size-4" /> Agendamento fictício da visita
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto
                  id="acompanhamento-data-visita"
                  rotulo="Data da visita"
                  type="date"
                  value={dataVisita}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(evento) => setDataVisita(evento.target.value)}
                />
                <CampoTexto
                  id="acompanhamento-horario-visita"
                  rotulo="Horário da visita"
                  type="time"
                  value={horarioVisita}
                  onChange={(evento) => setHorarioVisita(evento.target.value)}
                />
              </div>
            </div>
          ) : null}
          {contato.historicoAtendimento.length > 0 ? (
            <section aria-label="Histórico de atendimento do lead">
              <p className="text-sm font-semibold text-[#123f47]">Histórico de atendimento</p>
              <ol className="mt-2 grid max-h-40 gap-2 overflow-y-auto">
                {[...contato.historicoAtendimento].reverse().map((item, indice) => (
                  <li
                    key={`${item.titulo}-${indice}`}
                    className="rounded-xl border border-[#123f47]/10 bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-xs text-[#123f47]">{item.titulo}</strong>
                      <span className="text-[10px] text-[#587076]">{item.momento}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#587076]">{item.detalhe}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          <ErroFormulario mensagem={erro} />
          <RodapeFormulario
            rotulo={etapaDestino === etapaAtual ? "Registrar atendimento" : "Salvar e avançar"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

const motivosGanho = [
  "Condições aceitas pelo cliente",
  "Imóvel aderente às necessidades",
  "Atendimento e negociação bem-sucedidos",
];

const motivosPerda = [
  "Valor acima do esperado",
  "Cliente escolheu outro imóvel",
  "Desistência ou adiamento da compra",
  "Financiamento não aprovado",
];

const formatadorMoedaProposta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function PropostaEFechamentoSinteticoDialog({
  contato,
  onConfirmar,
  className,
}: {
  contato: ContatoSinteticoCriado;
  onConfirmar: (atualizacao: PropostaSinteticaAtualizada) => void;
  className?: string;
}) {
  const criandoProposta = !contato.proposta;
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(
    contato.proposta ? String(contato.proposta.valorNumerico) : "",
  );
  const [validade, setValidade] = useState(contato.proposta?.validade ?? "");
  const [condicoes, setCondicoes] = useState(contato.proposta?.condicoes ?? "");
  const [registroNegociacao, setRegistroNegociacao] = useState("");
  const [resultado, setResultado] = useState<
    "Continuar em negociação" | "Negócio ganho" | "Negócio perdido"
  >("Continuar em negociação");
  const [motivoResultado, setMotivoResultado] = useState("");
  const [erro, setErro] = useState("");

  const motivosDisponiveis = resultado === "Negócio ganho" ? motivosGanho : motivosPerda;

  function prepararFormulario() {
    setValor(contato.proposta ? String(contato.proposta.valorNumerico) : "");
    setValidade(contato.proposta?.validade ?? "");
    setCondicoes(contato.proposta?.condicoes ?? "");
    setRegistroNegociacao("");
    setResultado("Continuar em negociação");
    setMotivoResultado("");
    setErro("");
  }

  function alterarAberto(proximo: boolean) {
    if (proximo) prepararFormulario();
    setAberto(proximo);
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (criandoProposta) {
      const valorNumerico = Number(valor);
      if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
        setErro("Informe um valor de proposta maior que zero.");
        return;
      }
      if (!validade || validade < new Date().toISOString().slice(0, 10)) {
        setErro("Escolha uma validade de hoje ou futura para a proposta fictícia.");
        return;
      }
      if (condicoes.trim().length < 10) {
        setErro("Descreva as condições da proposta com pelo menos 10 caracteres.");
        return;
      }

      const validadeExibicao = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
        new Date(`${validade}T12:00:00`),
      );
      const valorExibicao = formatadorMoedaProposta.format(valorNumerico);
      onConfirmar({
        contato,
        etapaDestino: "Proposta enviada",
        proposta: {
          valorNumerico,
          valorExibicao,
          validade,
          validadeExibicao,
          condicoes: condicoes.trim(),
          estado: "Em negociação",
          ultimaNegociacao: "Proposta criada e enviada na demonstração.",
        },
        novosEventos: [
          {
            titulo: "Proposta fictícia criada",
            detalhe: `${valorExibicao} · válida até ${validadeExibicao} · ${condicoes.trim()}`,
            momento: "Agora",
            tipo: "Proposta",
          },
          {
            titulo: "Avanço de etapa",
            detalhe: "Visita agendada → Proposta enviada",
            momento: "Agora",
            tipo: "Avanço de etapa",
          },
        ],
      });
      setAberto(false);
      return;
    }

    if (registroNegociacao.trim().length < 10) {
      setErro("Descreva a negociação com pelo menos 10 caracteres.");
      return;
    }
    if (resultado !== "Continuar em negociação" && !motivoResultado) {
      setErro("Selecione um motivo amigável para registrar o resultado.");
      return;
    }

    const estado: PropostaSintetica["estado"] =
      resultado === "Negócio ganho"
        ? "Ganha"
        : resultado === "Negócio perdido"
          ? "Perdida"
          : "Em negociação";
    const etapaDestino =
      estado === "Ganha"
        ? ("Negócio fechado" as const)
        : estado === "Perdida"
          ? ("Negócio perdido" as const)
          : ("Proposta enviada" as const);
    const novosEventos: HistoricoAtendimentoSintetico[] = [
      {
        titulo: "Negociação registrada",
        detalhe: registroNegociacao.trim(),
        momento: "Agora",
        tipo: "Negociação",
      },
    ];
    if (estado !== "Em negociação") {
      novosEventos.push(
        {
          titulo: estado === "Ganha" ? "Negócio ganho" : "Negócio perdido",
          detalhe: motivoResultado,
          momento: "Agora",
          tipo: "Resultado",
        },
        {
          titulo: "Avanço de etapa",
          detalhe: `Proposta enviada → ${etapaDestino}`,
          momento: "Agora",
          tipo: "Avanço de etapa",
        },
      );
    }

    onConfirmar({
      contato,
      etapaDestino,
      proposta: {
        ...contato.proposta!,
        estado,
        ultimaNegociacao: registroNegociacao.trim(),
        motivoResultado: estado === "Em negociação" ? undefined : motivoResultado,
      },
      novosEventos,
    });
    setAberto(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={alterarAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className ?? "w-full rounded-xl"}>
          {criandoProposta ? (
            <FileSignature className="mr-2 size-4" />
          ) : (
            <Handshake className="mr-2 size-4" />
          )}
          {criandoProposta ? "Criar proposta" : "Atualizar negociação"}
        </Button>
      </DialogTrigger>
      <DialogContent className={conteudoDialogClasse}>
        <DialogHeader>
          <DialogTitle>
            {criandoProposta
              ? "Criar proposta de demonstração"
              : "Atualizar negociação de demonstração"}
          </DialogTitle>
          <DialogDescription>
            {criandoProposta
              ? "Registre valor, validade e condições sem gerar documento ou envio real."
              : "Registre a conversa e mantenha, ganhe ou encerre a oportunidade fictícia."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={enviar} noValidate>
          <AvisoSessaoSintetica />
          <div className="rounded-xl border border-[#123f47]/10 bg-[#f7f5f0] p-3">
            <strong className="block text-sm text-[#123f47]">{contato.nome}</strong>
            <span className="mt-1 block text-xs text-[#587076]">{contato.imovelSelecionado}</span>
          </div>
          {criandoProposta ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto
                  id="proposta-valor"
                  rotulo="Valor proposto (R$)"
                  type="number"
                  min="1"
                  step="1000"
                  value={valor}
                  onChange={(evento) => setValor(evento.target.value)}
                  placeholder="1850000"
                />
                <CampoTexto
                  id="proposta-validade"
                  rotulo="Validade da proposta"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={validade}
                  onChange={(evento) => setValidade(evento.target.value)}
                />
              </div>
              <label
                htmlFor="proposta-condicoes"
                className="grid gap-1.5 text-sm font-semibold text-[#123f47]"
              >
                Condições da proposta
                <Textarea
                  id="proposta-condicoes"
                  className="min-h-24 rounded-xl border-[#123f47]/15 bg-white"
                  value={condicoes}
                  onChange={(evento) => setCondicoes(evento.target.value)}
                  placeholder="Ex.: Entrada de 30% e saldo por financiamento fictício."
                />
              </label>
            </>
          ) : (
            <>
              <div className="grid gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-950 sm:grid-cols-2">
                <span>
                  <strong className="block">Valor proposto</strong>
                  {contato.proposta?.valorExibicao}
                </span>
                <span>
                  <strong className="block">Validade</strong>
                  {contato.proposta?.validadeExibicao}
                </span>
                <span className="sm:col-span-2">
                  <strong className="block">Condições</strong>
                  {contato.proposta?.condicoes}
                </span>
              </div>
              <label
                htmlFor="negociacao-registro"
                className="grid gap-1.5 text-sm font-semibold text-[#123f47]"
              >
                Registro da negociação
                <Textarea
                  id="negociacao-registro"
                  className="min-h-24 rounded-xl border-[#123f47]/15 bg-white"
                  value={registroNegociacao}
                  onChange={(evento) => setRegistroNegociacao(evento.target.value)}
                  placeholder="Ex.: Cliente analisou as condições e confirmou sua decisão."
                />
              </label>
              <CampoSelecao
                id="negociacao-resultado"
                rotulo="Resultado da negociação"
                value={resultado}
                onChange={(valorSelecionado) => {
                  setResultado(
                    valorSelecionado as
                      | "Continuar em negociação"
                      | "Negócio ganho"
                      | "Negócio perdido",
                  );
                  setMotivoResultado("");
                }}
              >
                <option>Continuar em negociação</option>
                <option>Negócio ganho</option>
                <option>Negócio perdido</option>
              </CampoSelecao>
              {resultado !== "Continuar em negociação" ? (
                <CampoSelecao
                  id="negociacao-motivo"
                  rotulo="Motivo do resultado"
                  value={motivoResultado}
                  onChange={setMotivoResultado}
                >
                  <option value="">Selecione o motivo</option>
                  {motivosDisponiveis.map((motivo) => (
                    <option key={motivo}>{motivo}</option>
                  ))}
                </CampoSelecao>
              ) : null}
            </>
          )}
          <ErroFormulario mensagem={erro} />
          <RodapeFormulario
            rotulo={criandoProposta ? "Criar proposta fictícia" : "Salvar negociação"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NovaPaginaSinteticaDialog({
  onConfirmar,
}: {
  onConfirmar: (pagina: PaginaSinteticaCriada) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [caminho, setCaminho] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [chamada, setChamada] = useState("");
  const [erro, setErro] = useState("");

  function limpar() {
    setTitulo("");
    setCaminho("");
    setObjetivo("");
    setChamada("");
    setErro("");
  }

  function alterarAberto(proximo: boolean) {
    setAberto(proximo);
    if (!proximo) limpar();
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (titulo.trim().length < 4) {
      setErro("Informe um título claro para a página.");
      return;
    }
    if (!/^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(caminho.trim())) {
      setErro("Use um endereço iniciado por /, com letras minúsculas, números e hífens.");
      return;
    }
    if (objetivo.trim().length < 10) {
      setErro("Descreva o objetivo da página com pelo menos 10 caracteres.");
      return;
    }
    if (chamada.trim().length < 3) {
      setErro("Informe o texto principal do botão da página.");
      return;
    }

    onConfirmar({
      titulo: titulo.trim(),
      caminho: caminho.trim(),
      objetivo: objetivo.trim(),
      chamada: chamada.trim(),
    });
    alterarAberto(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={alterarAberto}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-[#123f47]">
          <FileText className="mr-2 size-4" />
          Criar página
        </Button>
      </DialogTrigger>
      <DialogContent className={conteudoDialogClasse}>
        <DialogHeader>
          <DialogTitle>Criar página de demonstração</DialogTitle>
          <DialogDescription>
            Monte um rascunho temporário para avaliar conteúdo e chamada principal.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={enviar} noValidate>
          <AvisoSessaoSintetica />
          <CampoTexto
            id="pagina-titulo"
            rotulo="Título da página"
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            placeholder="Ex.: Coberturas em Belo Horizonte"
            autoComplete="off"
          />
          <CampoTexto
            id="pagina-caminho"
            rotulo="Endereço da página"
            value={caminho}
            onChange={(evento) => setCaminho(evento.target.value)}
            placeholder="/coberturas-belo-horizonte"
            observacao="Este endereço é apenas uma prévia e não será publicado."
            autoComplete="off"
          />
          <label
            htmlFor="pagina-objetivo"
            className="grid gap-1.5 text-sm font-semibold text-[#123f47]"
          >
            Objetivo da página
            <Textarea
              id="pagina-objetivo"
              className="min-h-24 rounded-xl border-[#123f47]/15 bg-white"
              value={objetivo}
              onChange={(evento) => setObjetivo(evento.target.value)}
              placeholder="Ex.: Apresentar imóveis selecionados e captar pedidos de visita."
            />
          </label>
          <CampoTexto
            id="pagina-chamada"
            rotulo="Texto do botão principal"
            value={chamada}
            onChange={(evento) => setChamada(evento.target.value)}
            placeholder="Ex.: Quero conhecer os imóveis"
            autoComplete="off"
          />
          <ErroFormulario mensagem={erro} />
          <RodapeFormulario rotulo="Criar rascunho da página" />
        </form>
      </DialogContent>
    </Dialog>
  );
}
