// Tela de CRM aprovada da RM Prime (cópia de src/components/painel/CrmPage.tsx), alimentada por funções tenant-scoped.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ptBR } from "date-fns/locale";
import {
  Building2,
  Check,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  CalendarDays,
  Clock3,
  Handshake,
  MoreHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PainelLayout } from "@/components/painel-rm/PainelLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputMascarado } from "@/components/ui/input-mascarado";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { useRmCrmPapel } from "@/components/painel-rm/useRmCrmPapel";
import {
  agendarProximaAcao,
  atualizarEtapaLead,
  concluirProximaAcao,
  criarAtividadeCrm,
  criarLeadManual,
  listarCorretoresAtribuiveis,
  listarLeadsCrm,
  listarMotivosDescarte,
  obterAtividades,
  reatribuirLead,
} from "@/lib/api/rm-crm.functions";
import { formatarDataHora } from "@/lib/rm-crm/format";
import {
  ETAPAS_CRM,
  ETAPAS_SEM_PROXIMA_ACAO,
  ROTULOS_ATIVIDADE,
  ORIGENS_MANUAIS,
  ROTULOS_ORIGEM,
  TIPOS_OBRIGATORIOS_DESCARTE,
  TIPOS_PROXIMA_ACAO,
  type EtapaCrm,
  type LeadCrm,
} from "@/lib/rm-crm/types";

const inputClasse =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring";

type TipoAtividadeManual = "ligacao" | "whatsapp" | "email" | "visita" | "reuniao" | "outros";

/** Sinalização complementar do card; a cor principal é sempre definida pela etapa atual. */
function destaqueCard(item: LeadCrm, ehAdminOuGestor: boolean): { texto: string; rotulo: string } {
  if (item.sem_atendimento) {
    return { texto: "text-destructive", rotulo: "Sem atendimento" };
  }
  if (!ehAdminOuGestor && item.novo_para_mim) {
    return { texto: "text-primary", rotulo: "Novo para você" };
  }
  if (item.etapa_crm === "Proposta") {
    return { texto: "text-crm-proposta", rotulo: "Em proposta" };
  }
  return { texto: "", rotulo: "" };
}

/** Linha do card com a próxima ação agendada; pendências vencidas ficam em vermelho e negrito. */
function textoProximaAcao(item: LeadCrm): { texto: string; classe: string } {
  if (ETAPAS_SEM_PROXIMA_ACAO.includes(item.etapa_crm)) return { texto: "", classe: "" };
  const acao = item.proxima_acao;
  if (!acao) return { texto: "Sem próximo passo agendado", classe: "font-bold text-destructive" };
  const atrasada = new Date(acao.data_hora).getTime() < Date.now();
  const rotulo = `${ROTULOS_ATIVIDADE[acao.tipo] ?? acao.tipo} · ${formatarDataHora(acao.data_hora)}`;
  return atrasada
    ? { texto: `Atrasada: ${rotulo}`, classe: "font-bold text-destructive" }
    : { texto: `Próximo passo: ${rotulo}`, classe: "text-muted-foreground" };
}

/** Converte a data ISO para o formato aceito pelo campo de data e hora do navegador. */
function paraCampoLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dataDoCampoLocal(valor: string) {
  if (!valor) return undefined;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? undefined : data;
}

function atualizarDataHora(valorAtual: string, alteracao: { data?: Date; hora?: number; minuto?: number }) {
  const atual = dataDoCampoLocal(valorAtual);
  const base = alteracao.data ? new Date(alteracao.data) : atual ? new Date(atual) : new Date();

  if (!atual && alteracao.data) {
    const proximaHora = new Date(Date.now() + 60 * 60_000);
    base.setHours(proximaHora.getHours(), 0, 0, 0);
  }
  if (alteracao.hora !== undefined) base.setHours(alteracao.hora);
  if (alteracao.minuto !== undefined) base.setMinutes(alteracao.minuto);
  base.setSeconds(0, 0);
  return paraCampoLocal(base.toISOString());
}

function rotuloDataAgendamento(data?: Date) {
  if (!data) return "Escolha a data";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(data);
}

/** Link para adicionar a tarefa no Google Agenda com lembrete padrão de 30 minutos. */
function linkGoogleAgenda(lead: LeadCrm, acao: { tipo: string; descricao: string; data_hora: string }) {
  const inicio = new Date(acao.data_hora);
  const fim = new Date(inicio.getTime() + 30 * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${ROTULOS_ATIVIDADE[acao.tipo] ?? acao.tipo} — ${lead.nome}`,
    dates: `${fmt(inicio)}/${fmt(fim)}`,
    details: `${acao.descricao || "Próxima ação com o lead."}\nTelefone: ${lead.telefone}`,
    trp: "false",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function CrmPage() {
  const { ehAdminOuGestor } = useRmCrmPapel();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [origemFiltro, setOrigemFiltro] = useState<string>("");
  const [corretorFiltro, setCorretorFiltro] = useState<string>("");
  const [etapaFiltro, setEtapaFiltro] = useState<string>("");
  const [motivoFiltro, setMotivoFiltro] = useState<string>("");
  const [semAtendimentoFiltro, setSemAtendimentoFiltro] = useState(false);
  const [leadSelecionado, setLeadSelecionado] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<EtapaCrm | null>(null);
  const [novoLeadAberto, setNovoLeadAberto] = useState(false);

  // Permite abrir direto um lead vindo da agenda do dashboard (/painel/crm?lead=...).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("lead");
    if (id) setLeadSelecionado(id);
  }, []);

  const criarLead = useMutation({
    mutationFn: criarLeadManual,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      setNovoLeadAberto(false);
      toast.success("Lead cadastrado na etapa Novo.");
    },
    onError: (erro) => toast.error(erro instanceof Error ? erro.message : "Não foi possível cadastrar o lead."),
  });

  function aoSalvarNovoLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const valor = (nome: string) => String(form.get(nome) ?? "").trim();
    if (form.get("consentimento") !== "on") {
      toast.error("Confirme que o contato autorizou ser contatado pela imobiliária.");
      return;
    }
    criarLead.mutate({
      data: {
        nome: valor("nome"),
        telefone: valor("telefone"),
        email: valor("email") || undefined,
        mensagem: valor("mensagem") || undefined,
        consentimento_lgpd: true,
        corretor_atribuido_id: valor("corretor") || undefined,
        origem: (valor("origem") || "manual") as
          | "manual"
          | "google"
          | "meta"
          | "instagram"
          | "indicacao"
          | "portal"
          | "site"
          | "outros",
      },
    });
  }



  const { data: leads, isLoading, error } = useQuery({
    queryKey: ["crm", "leads"],
    queryFn: () => listarLeadsCrm(),
  });

  // Corretores para o filtro e para atribuição (apenas admin/gestor).
  const { data: corretores } = useQuery({
    queryKey: ["crm", "corretores"],
    queryFn: () => listarCorretoresAtribuiveis(),
    enabled: ehAdminOuGestor,
  });

  const { data: motivos } = useQuery({
    queryKey: ["crm", "motivos"],
    queryFn: () => listarMotivosDescarte(),
  });

  const buscaNormalizada = busca.trim().toLowerCase();

  const leadsFiltrados = useMemo(() => {
    let lista = leads ?? [];
    if (origemFiltro) lista = lista.filter((l) => l.origem === origemFiltro);
    if (corretorFiltro) lista = lista.filter((l) => l.corretor_nome === corretorFiltro);
    if (etapaFiltro) lista = lista.filter((l) => l.etapa_crm === etapaFiltro);
    if (motivoFiltro) {
      lista = lista.filter((l) => (l.motivo_descarte ?? "").startsWith(motivoFiltro));
    }
    if (semAtendimentoFiltro) lista = lista.filter((l) => l.sem_atendimento);
    if (buscaNormalizada) {
      lista = lista.filter((l) =>
        [l.nome, l.telefone, l.email ?? ""].some((campo) => campo.toLowerCase().includes(buscaNormalizada)),
      );
    }
    return lista;
  }, [leads, buscaNormalizada, origemFiltro, corretorFiltro, etapaFiltro, motivoFiltro, semAtendimentoFiltro]);

  const etapasVisiveis = etapaFiltro
    ? ETAPAS_CRM.filter((e) => e === etapaFiltro)
    : motivoFiltro
      ? ETAPAS_CRM.filter((e) => e === "Perdido" || e === "Descartado")
      : ETAPAS_CRM;

  const metricas = useMemo(() => {
    const todos = leads ?? [];
    const seteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const novos7 = todos.filter((l) => new Date(l.criado_em).getTime() >= seteDiasAtras).length;
    const emNegociacao = todos.filter((l) =>
      ["Conversando", "Visita", "Proposta"].includes(l.etapa_crm),
    ).length;
    const fechados = todos.filter((l) => l.etapa_crm === "Negócio Fechado").length;
    const conversao = todos.length > 0 ? Math.round((fechados / todos.length) * 100) : 0;
    return { total: todos.length, novos7, emNegociacao, fechados, conversao };
  }, [leads]);

  const lead = (leads ?? []).find((l) => l.id === leadSelecionado) ?? null;

  const moverEtapa = useMutation({
    mutationFn: atualizarEtapaLead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      toast.success("Etapa atualizada.");
    },
    onError: (erro) => toast.error(erro instanceof Error ? erro.message : "Não foi possível mover o lead."),
  });

  function soltarEm(etapa: EtapaCrm) {
    const id = arrastando;
    setArrastando(null);
    if (!id) return;
    const alvo = (leads ?? []).find((l) => l.id === id);
    if (!alvo || alvo.etapa_crm === etapa) return;
    moverEtapa.mutate({ data: { lead_id: id, etapa } });
  }


  return (
    <PainelLayout
      titulo="CRM"
      descricao="Acompanhe os leads no funil de vendas e registre cada interação."
      acoes={
        <Button onClick={() => setNovoLeadAberto(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo lead
        </Button>
      }
    >
      {error ? (
        <p className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar os leads."}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { rotulo: "Leads visíveis", valor: String(metricas.total) },
          { rotulo: "Novos nos últimos 7 dias", valor: String(metricas.novos7) },
          { rotulo: "Em negociação", valor: String(metricas.emNegociacao) },
          { rotulo: "Conversão em fechamento", valor: `${metricas.conversao}%` },
        ].map((cartao) => (
          <div key={cartao.rotulo} className="superficie-cartao p-5">
            <p className="font-heading text-2xl font-bold">{cartao.valor}</p>
            <p className="mt-1 text-sm text-muted-foreground">{cartao.rotulo}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail"
            className="pl-9"
            aria-label="Buscar leads"
          />
        </div>
        <select
          value={origemFiltro}
          onChange={(e) => setOrigemFiltro(e.target.value)}
          className={`${inputClasse} max-w-52`}
          aria-label="Filtrar por origem"
        >
          <option value="">Todas as origens</option>
          {Object.entries(ROTULOS_ORIGEM).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
        {ehAdminOuGestor && (corretores ?? []).length > 0 ? (
          <select
            value={corretorFiltro}
            onChange={(e) => setCorretorFiltro(e.target.value)}
            className={`${inputClasse} max-w-52`}
            aria-label="Filtrar por corretor"
          >
            <option value="">Todos os corretores</option>
            {corretores?.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome || "Sem nome"}
              </option>
            ))}
          </select>
        ) : null}
        <select
          value={etapaFiltro}
          onChange={(e) => setEtapaFiltro(e.target.value)}
          className={`${inputClasse} max-w-52`}
          aria-label="Filtrar por etapa"
        >
          <option value="">Todas as etapas</option>
          {ETAPAS_CRM.map((etapa) => (
            <option key={etapa} value={etapa}>
              {etapa}
            </option>
          ))}
        </select>
        {(motivos ?? []).length > 0 ? (
          <select
            value={motivoFiltro}
            onChange={(e) => setMotivoFiltro(e.target.value)}
            className={`${inputClasse} max-w-52`}
            aria-label="Filtrar por motivo de descarte"
          >
            <option value="">Todos os motivos</option>
            {motivos?.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : null}
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm">
          <input
            type="checkbox"
            checked={semAtendimentoFiltro}
            onChange={(e) => setSemAtendimentoFiltro(e.target.checked)}
          />
          Sem atendimento
        </label>
        {origemFiltro || corretorFiltro || etapaFiltro || motivoFiltro || semAtendimentoFiltro ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOrigemFiltro("");
              setCorretorFiltro("");
              setEtapaFiltro("");
              setMotivoFiltro("");
              setSemAtendimentoFiltro(false);
            }}
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>

      {!isLoading && (leads ?? []).length === 0 ? (
        <div className="mt-6 rounded-lg border border-primary/25 bg-primary/5 px-5 py-4">
          <p className="font-medium text-primary">O Kanban está pronto para receber seus leads.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Novos contatos enviados pelo site aparecerão automaticamente na coluna Novo.
          </p>
        </div>
      ) : null}

      <p className="mt-6 text-xs text-muted-foreground">
        Arraste um lead e solte em outra coluna para mudar a etapa, ou clique para abrir o histórico.
      </p>

      <div className="crm-kanban mt-3 grid min-h-72 auto-cols-[minmax(260px,300px)] grid-flow-col gap-4 overflow-x-auto pb-4">
        {isLoading
          ? ETAPAS_CRM.map((etapa) => (
              <section key={etapa} className="rounded-lg border border-border bg-muted/30 p-3">
                <h2 className="text-sm font-semibold">{etapa}</h2>
                <div className="mt-3 space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </section>
            ))
          : etapasVisiveis.map((etapa) => {
              const itens = leadsFiltrados.filter((l) => l.etapa_crm === etapa);
               return (
                 <section
                   key={etapa}
                   onDragOver={(e) => { e.preventDefault(); setColunaAlvo(etapa); }}
                   onDragLeave={() => setColunaAlvo((atual) => (atual === etapa ? null : atual))}
                   onDrop={(e) => { e.preventDefault(); setColunaAlvo(null); soltarEm(etapa); }}
                   className={`min-h-72 rounded-lg border p-3 transition-colors ${colunaAlvo === etapa ? "border-primary bg-primary/10" : "border-border bg-muted/40"}`}
                 >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">{etapa}</h2>
                    <Badge variant="secondary">{itens.length}</Badge>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    {itens.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum lead</p>
                    ) : (
                      itens.map((item) => (
                         <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          draggable
                          onDragStart={() => setArrastando(item.id)}
                          onDragEnd={() => { setArrastando(null); setColunaAlvo(null); }}
                          onClick={() => setLeadSelecionado(item.id)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLeadSelecionado(item.id); } }}
                            data-etapa={item.etapa_crm}
                            className={`crm-card flex h-48 w-full cursor-grab flex-col rounded-lg border p-3 text-left shadow-[var(--shadow-cartao)] transition-[border-color,background-color,opacity] hover:ring-2 hover:ring-ring/35 active:cursor-grabbing ${arrastando === item.id ? "opacity-50" : ""}`}
                        >
                          <p className="truncate text-sm font-medium">{item.nome}</p>
                          <p className="truncate text-sm font-medium">{item.telefone}</p>
                          <p className={`mt-0.5 h-4 text-[11px] font-medium ${destaqueCard(item, ehAdminOuGestor).texto}`}>
                            {destaqueCard(item, ehAdminOuGestor).rotulo}
                          </p>
                          <p className={`mt-0.5 h-4 truncate text-[11px] ${textoProximaAcao(item).classe}`}>
                            {textoProximaAcao(item).texto}
                          </p>
                          <p className="mt-1 flex h-4 items-center gap-1 truncate text-xs text-muted-foreground">
                            {item.imovel ? (
                              <>
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">{item.imovel.titulo}</span>
                              </>
                            ) : null}
                          </p>
                          <div className="mt-auto space-y-0.5 border-t border-border pt-1.5">
                            <p className="truncate text-[11px] text-muted-foreground">
                              Origem: {ROTULOS_ORIGEM[item.origem]}
                            </p>
                            {ehAdminOuGestor ? (
                              <p className="truncate text-[11px] text-muted-foreground">
                                Corretor: {item.corretor_nome ?? "não atribuído"}
                              </p>
                            ) : null}
                          </div>
                         </div>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
      </div>


      {lead ? (
        <PainelLead
          lead={lead}
          motivos={motivos ?? []}
          ehAdminOuGestor={ehAdminOuGestor}
          onFechar={() => setLeadSelecionado(null)}
        />
      ) : null}

      <Dialog open={novoLeadAberto} onOpenChange={setNovoLeadAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo lead</DialogTitle>
            <DialogDescription>
              Cadastre um contato captado por você ou pela empresa. Ele entra na etapa Novo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={aoSalvarNovoLead} className="grid gap-4">
            <div>
              <Label htmlFor="lead-nome">Nome</Label>
              <Input id="lead-nome" name="nome" required className="mt-2" placeholder="Nome completo" />
            </div>
            <div>
              <Label htmlFor="lead-telefone">Telefone / WhatsApp</Label>
              <InputMascarado id="lead-telefone" name="telefone" mascara="telefone" required className="mt-2" placeholder="(31) 99999-0000" />
            </div>
            <div>
              <Label htmlFor="lead-email">E-mail (opcional)</Label>
              <Input id="lead-email" name="email" type="email" className="mt-2" placeholder="email@exemplo.com" />
            </div>
            {ehAdminOuGestor ? (
              <div>
                <Label htmlFor="lead-corretor">Corretor responsável</Label>
                <select id="lead-corretor" name="corretor" className={`${inputClasse} mt-2`} defaultValue="">
                  <option value="">Atribuir a mim</option>
                  {(corretores ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="lead-origem">Origem do lead</Label>
              <select id="lead-origem" name="origem" className={`${inputClasse} mt-2`} defaultValue="manual">
                {ORIGENS_MANUAIS.map((o) => (
                  <option key={o} value={o}>
                    {ROTULOS_ORIGEM[o]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="lead-mensagem">Observações (opcional)</Label>
              <Textarea id="lead-mensagem" name="mensagem" rows={3} className="mt-2" placeholder="Ex.: procura apartamento de 3 quartos na Savassi" />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="consentimento" className="mt-1" />
              <span>O contato autorizou ser contatado pela RM Prime Imóveis (consentimento LGPD).</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNovoLeadAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={criarLead.isPending}>
                {criarLead.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cadastrar lead
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PainelLayout>
  );
}

function PainelLead({
  lead,
  motivos,
  ehAdminOuGestor,
  onFechar,
}: {
  lead: LeadCrm;
  motivos: string[];
  ehAdminOuGestor: boolean;
  onFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [etapaSelecionada, setEtapaSelecionada] = useState<EtapaCrm>(lead.etapa_crm);
  const [motivo, setMotivo] = useState(lead.motivo_descarte ?? "");
  const [motivoSelecionado, setMotivoSelecionado] = useState("");
  const [motivoOutros, setMotivoOutros] = useState("");
  const [tipoAtividade, setTipoAtividade] = useState<TipoAtividadeManual>("ligacao");
  const [descricaoAtividade, setDescricaoAtividade] = useState("");
  const [novoCorretor, setNovoCorretor] = useState("");
  const [tipoProximaAcao, setTipoProximaAcao] = useState<TipoAtividadeManual>(
    (lead.proxima_acao?.tipo as TipoAtividadeManual) ?? "ligacao",
  );
  const [quandoProximaAcao, setQuandoProximaAcao] = useState(
    lead.proxima_acao ? paraCampoLocal(lead.proxima_acao.data_hora) : "",
  );
  const [notaProximaAcao, setNotaProximaAcao] = useState(lead.proxima_acao?.descricao ?? "");

  const { data: atividades, isLoading: carregandoAtividades } = useQuery({
    queryKey: ["crm", "atividades", lead.id],
    queryFn: () => obterAtividades({ data: { lead_id: lead.id } }),
  });

  const { data: corretoresReatribuicao } = useQuery({
    queryKey: ["crm", "corretores"],
    queryFn: () => listarCorretoresAtribuiveis(),
    enabled: ehAdminOuGestor,
  });

  const TIPOS_INTERACAO = ["ligacao", "whatsapp", "email", "visita", "reuniao", "outros"];
  const interacoes = (atividades ?? []).filter((a) => TIPOS_INTERACAO.includes(a.tipo));
  const registros = (atividades ?? []).filter((a) => !TIPOS_INTERACAO.includes(a.tipo));

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ["crm"] });
  };

  const mudarEtapa = useMutation({
    mutationFn: atualizarEtapaLead,
    onSuccess: () => {
      toast.success("Etapa atualizada.");
      invalidar();
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const novaAtividade = useMutation({
    mutationFn: criarAtividadeCrm,
    onSuccess: () => {
      toast.success("Atividade registrada.");
      setDescricaoAtividade("");
      invalidar();
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const agendar = useMutation({
    mutationFn: agendarProximaAcao,
    onSuccess: () => {
      toast.success("Próxima ação agendada.");
      invalidar();
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const concluir = useMutation({
    mutationFn: concluirProximaAcao,
    onSuccess: () => {
      toast.success("Tarefa concluída e registrada no histórico.");
      setQuandoProximaAcao("");
      setNotaProximaAcao("");
      invalidar();
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const reatribuir = useMutation({
    mutationFn: reatribuirLead,
    onSuccess: () => {
      toast.success("Lead reatribuído.");
      setNovoCorretor("");
      invalidar();
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const ehDescartado = etapaSelecionada === "Descartado";
  const ehPerdido = etapaSelecionada === "Perdido";
  const ehOutros = motivoSelecionado.toLowerCase().startsWith("outro");
  const motivoFinal = ehDescartado
    ? ehOutros
      ? `${motivoSelecionado}: ${motivoOutros.trim()}`
      : motivoSelecionado
    : ehPerdido
      ? motivo
      : "";
  const faltando = TIPOS_OBRIGATORIOS_DESCARTE.filter((t) => !lead.atendimentos.includes(t));
  const bloqueiaDescarte = ehDescartado && !ehAdminOuGestor && faltando.length > 0;
  const descarteIncompleto =
    ehDescartado && (!motivoSelecionado || (ehOutros && motivoOutros.trim().length < 3));
  const mudouEtapa = etapaSelecionada !== lead.etapa_crm || motivoFinal !== (lead.motivo_descarte ?? "");
  const digitosTelefone = lead.telefone.replace(/\D/g, "");
  const dataProximaAcao = dataDoCampoLocal(quandoProximaAcao);
  const horaProximaAcao = String(dataProximaAcao?.getHours() ?? 9).padStart(2, "0");
  const minutoProximaAcao = String(dataProximaAcao?.getMinutes() ?? 0).padStart(2, "0");
  const minutosDisponiveis = Array.from(new Set([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, Number(minutoProximaAcao)])).sort(
    (a, b) => a - b,
  );

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar detalhes do lead"
        onClick={onFechar}
        className="absolute inset-0 bg-foreground/40"
      />
      <aside className="absolute top-0 right-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-card p-4 shadow-lg sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold">
              {lead.nome}
              {lead.telefone ? ` - ${lead.telefone}` : ""}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recebido em {formatarDataHora(lead.criado_em)}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`tel:+55${digitosTelefone}`}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted"
          >
            <Phone className="h-4 w-4" /> Ligar
          </a>
          <a
            href={`https://wa.me/55${digitosTelefone}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          {lead.email ? (
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted"
            >
              <Mail className="h-4 w-4" /> E-mail
            </a>
          ) : null}
        </div>

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground">Origem</dt>
            <dd>{ROTULOS_ORIGEM[lead.origem]}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground">Corretor</dt>
            <dd>{lead.corretor_nome ?? "Não atribuído"}</dd>
          </div>
          {lead.imovel ? (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-muted-foreground">Imóvel</dt>
              <dd>{lead.imovel.titulo}</dd>
            </div>
          ) : null}
          {lead.mensagem ? (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-muted-foreground">Mensagem</dt>
              <dd className="whitespace-pre-line">{lead.mensagem}</dd>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <dt className="w-28 shrink-0 text-muted-foreground">Consentimento</dt>
            <dd className="inline-flex items-center gap-1 text-xs">
              {lead.consentimento_lgpd ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" /> aceito em{" "}
                  {formatarDataHora(lead.criado_em)}
                </>
              ) : (
                "não registrado"
              )}
            </dd>
          </div>
        </dl>

        {ehAdminOuGestor ? (
          <div className="mt-4 rounded-md border border-border p-3">
            <h3 className="text-sm font-semibold">Atribuir a outro corretor</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={novoCorretor}
                onChange={(e) => setNovoCorretor(e.target.value)}
                className={`${inputClasse} max-w-64`}
                aria-label="Novo corretor responsável"
              >
                <option value="">Selecione o corretor</option>
                {(corretoresReatribuicao ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                disabled={!novoCorretor || reatribuir.isPending}
                onClick={() =>
                  reatribuir.mutate({ data: { lead_id: lead.id, corretor_id: novoCorretor } })
                }
              >
                {reatribuir.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Reatribuir
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-sm font-semibold">Etapa do funil</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={etapaSelecionada}
              onChange={(e) => setEtapaSelecionada(e.target.value as EtapaCrm)}
              className={`${inputClasse} max-w-52`}
              aria-label="Etapa do lead"
            >
              {ETAPAS_CRM.map((etapa) => (
                <option key={etapa} value={etapa}>
                  {etapa}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!mudouEtapa || mudarEtapa.isPending || bloqueiaDescarte || descarteIncompleto}
              onClick={() =>
                mudarEtapa.mutate({
                  data: {
                    lead_id: lead.id,
                    etapa: etapaSelecionada,
                    motivo_descarte: motivoFinal || undefined,
                  },
                })
              }
            >
              {mudarEtapa.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Salvar etapa
            </Button>
          </div>

          {ehPerdido ? (
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo de perda (opcional)"
              className="mt-3"
              rows={2}
            />
          ) : null}

          {ehDescartado ? (
            <div className="mt-3 space-y-2">
              {bloqueiaDescarte ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                  Para descartar este lead é preciso registrar ligação, WhatsApp e e-mail. Faltam:{" "}
                  {faltando.map((t) => ROTULOS_ATIVIDADE[t] ?? t).join(", ")}.
                </p>
              ) : null}
              <select
                value={motivoSelecionado}
                onChange={(e) => setMotivoSelecionado(e.target.value)}
                className={inputClasse}
                aria-label="Motivo do descarte"
              >
                <option value="">Selecione o motivo do descarte…</option>
                {motivos.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {motivos.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum motivo cadastrado. O administrador cadastra os motivos em Conteúdo do site.
                </p>
              ) : null}
              {ehOutros ? (
                <div>
                  <Textarea
                    value={motivoOutros}
                    onChange={(e) => setMotivoOutros(e.target.value.slice(0, 254))}
                    placeholder="Descreva o motivo (até 254 caracteres)"
                    rows={2}
                    maxLength={254}
                  />
                  <p className="mt-1 text-right text-[11px] text-muted-foreground">
                    {motivoOutros.length}/254
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-sm font-semibold">Próxima ação</h3>
          {lead.proxima_acao ? (
            <div
              className={`mt-3 rounded-md border p-3 ${
                new Date(lead.proxima_acao.data_hora).getTime() < Date.now()
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border bg-muted/40"
              }`}
            >
              <p
                className={`text-sm ${
                  new Date(lead.proxima_acao.data_hora).getTime() < Date.now()
                    ? "font-bold text-destructive"
                    : "font-medium"
                }`}
              >
                {ROTULOS_ATIVIDADE[lead.proxima_acao.tipo] ?? lead.proxima_acao.tipo} ·{" "}
                {formatarDataHora(lead.proxima_acao.data_hora)}
                {new Date(lead.proxima_acao.data_hora).getTime() < Date.now() ? " (atrasada)" : ""}
              </p>
              {lead.proxima_acao.descricao ? (
                <p className="mt-1 text-sm whitespace-pre-line">{lead.proxima_acao.descricao}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={concluir.isPending}
                  onClick={() =>
                    concluir.mutate({
                      data: {
                        tarefa_id: lead.proxima_acao!.id,
                        descricao: descricaoAtividade.trim() || undefined,
                      },
                    })
                  }
                >
                  {concluir.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Concluir tarefa
                </Button>
                <a
                  href={linkGoogleAgenda(lead, lead.proxima_acao)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-input px-3 text-xs hover:bg-muted"
                >
                  <CalendarDays className="h-3.5 w-3.5" /> Google Agenda
                </a>
              </div>
            </div>
          ) : ETAPAS_SEM_PROXIMA_ACAO.includes(lead.etapa_crm) ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Esta etapa dispensa o agendamento de uma próxima ação.
            </p>
          ) : (
            <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs font-bold text-destructive">
              Sem próximo passo agendado. Agende abaixo para poder mover o lead no funil.
            </p>
          )}

          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!quandoProximaAcao) {
                toast.error("Escolha a data e a hora da próxima ação.");
                return;
              }
              agendar.mutate({
                data: {
                  lead_id: lead.id,
                  tipo: tipoProximaAcao,
                  descricao: notaProximaAcao.trim() || undefined,
                  data_hora: new Date(quandoProximaAcao).toISOString(),
                },
              });
            }}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={tipoProximaAcao}
                onChange={(e) => setTipoProximaAcao(e.target.value as TipoAtividadeManual)}
                className={inputClasse}
                aria-label="Tipo da próxima ação"
              >
                {TIPOS_PROXIMA_ACAO.map((t) => (
                  <option key={t} value={t}>
                    {ROTULOS_ATIVIDADE[t] ?? t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start font-normal"
                      aria-label="Escolher data da próxima ação"
                    >
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className={dataProximaAcao ? "capitalize" : "text-muted-foreground"}>
                        {rotuloDataAgendamento(dataProximaAcao)}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      locale={ptBR}
                      selected={dataProximaAcao}
                      onSelect={(data) => {
                        if (data) setQuandoProximaAcao(atualizarDataHora(quandoProximaAcao, { data }));
                      }}
                      disabled={{
                        before: new Date(new Date().setHours(0, 0, 0, 0)),
                        after: new Date(Date.now() + 180 * 86_400_000),
                      }}
                      startMonth={new Date()}
                      endMonth={new Date(Date.now() + 180 * 86_400_000)}
                      captionLayout="dropdown"
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Horário</Label>
                <div className="flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Select
                    value={horaProximaAcao}
                    disabled={!dataProximaAcao}
                    onValueChange={(hora) =>
                      setQuandoProximaAcao(atualizarDataHora(quandoProximaAcao, { hora: Number(hora) }))
                    }
                  >
                    <SelectTrigger className="w-[4.25rem]" aria-label="Hora da próxima ação">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, hora) => String(hora).padStart(2, "0")).map((hora) => (
                        <SelectItem key={hora} value={hora}>{hora}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="font-semibold text-muted-foreground">:</span>
                  <Select
                    value={minutoProximaAcao}
                    disabled={!dataProximaAcao}
                    onValueChange={(minuto) =>
                      setQuandoProximaAcao(atualizarDataHora(quandoProximaAcao, { minuto: Number(minuto) }))
                    }
                  >
                    <SelectTrigger className="w-[4.25rem]" aria-label="Minutos da próxima ação">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {minutosDisponiveis.map((minuto) => {
                        const valor = String(minuto).padStart(2, "0");
                        return <SelectItem key={valor} value={valor}>{valor}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Textarea
              value={notaProximaAcao}
              onChange={(e) => setNotaProximaAcao(e.target.value.slice(0, 500))}
              placeholder="O que será feito? Ex.: retornar ligação para confirmar a visita."
              rows={2}
            />
            <Button type="submit" size="sm" variant="outline" disabled={agendar.isPending}>
              {agendar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
              {lead.proxima_acao ? "Reagendar próxima ação" : "Agendar próxima ação"}
            </Button>
          </form>
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-sm font-semibold">Registrar atividade</h3>
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (descricaoAtividade.trim().length < 2) {
                toast.error("Descreva a interação antes de registrar.");
                return;
              }
              novaAtividade.mutate({
                data: { lead_id: lead.id, tipo: tipoAtividade, descricao: descricaoAtividade },
              });
            }}
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select
                value={tipoAtividade}
                onChange={(e) => setTipoAtividade(e.target.value as typeof tipoAtividade)}
                className={inputClasse}
                aria-label="Tipo de interação"
              >
                <option value="ligacao">Ligação</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="visita">Visita</option>
                <option value="reuniao">Reunião</option>
                <option value="outros">Outros</option>
              </select>
              <Button type="submit" size="sm" disabled={novaAtividade.isPending}>
                {novaAtividade.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Registrar
              </Button>
            </div>
            <Textarea
              value={descricaoAtividade}
              onChange={(e) => setDescricaoAtividade(e.target.value)}
              placeholder="Ex.: Tentei contato, mas o lead não atendeu."
              rows={3}
            />
          </form>

          <h3 className="mt-6 text-sm font-semibold">Histórico de atividades</h3>
          <ol className="mt-4 space-y-3">
            {carregandoAtividades ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : interacoes.length === 0 ? (
              <li className="text-sm text-muted-foreground">Nenhuma interação registrada ainda.</li>
            ) : (
              interacoes.map((a) => (
                <li key={a.id} className="rounded-md border border-border bg-muted/40 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     {a.tipo === "visita" ? <CalendarDays className="h-3.5 w-3.5" /> : null}
                     {a.tipo === "reuniao" ? <Handshake className="h-3.5 w-3.5" /> : null}
                     {a.tipo === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5" /> : null}
                     {!["visita", "reuniao", "whatsapp"].includes(a.tipo) ?
                       (a.tipo === "outros" ? <MoreHorizontal className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />) : null}
                     <span className="font-medium">{ROTULOS_ATIVIDADE[a.tipo] ?? a.tipo}</span>
                    <span aria-hidden>·</span>
                    <span>{formatarDataHora(a.data)}</span>
                    {a.autor_nome ? <span>· {a.autor_nome}</span> : null}
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-line">{a.descricao}</p>
                </li>
              ))
            )}
          </ol>

          <details className="mt-6 rounded-md border border-border bg-muted/20 p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Registro do sistema ({registros.length})
            </summary>
            <p className="mt-1 text-xs text-muted-foreground">
              Movimentações automáticas: cadastro, mudanças de etapa e atribuições.
            </p>
            <ol className="mt-3 space-y-2">
              {registros.length === 0 ? (
                <li className="text-sm text-muted-foreground">Nenhum registro ainda.</li>
              ) : (
                registros.map((a) => (
                  <li key={a.id} className="rounded-md border border-border bg-background p-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-medium">{ROTULOS_ATIVIDADE[a.tipo] ?? a.tipo}</span>
                      <span aria-hidden>·</span>
                      <span>{formatarDataHora(a.data)}</span>
                      {a.autor_nome ? <span>· {a.autor_nome}</span> : null}
                    </div>
                    <p className="mt-1 text-xs whitespace-pre-line">{a.descricao}</p>
                  </li>
                ))
              )}
            </ol>
          </details>
        </div>
      </aside>
    </div>
  );
}
