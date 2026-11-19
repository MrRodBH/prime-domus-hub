import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, FileDown, FileText, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PainelLayout } from "@/components/painel-rm/PainelLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useRmCrmPapel } from "@/components/painel-rm/useRmCrmPapel";
import { meuPerfilNoTenant } from "@/lib/api/tenant.functions";
import { simularFinanciamento } from "@/lib/rm-financiamento/financiamento";
import { formatarData, formatarMoeda } from "@/lib/rm-financiamento/format";
import { mascaraMoeda } from "@/lib/rm-crm/mascaras";
import {
  excluirFaixaMcmv,
  listarFaixasMcmv,
  salvarFaixaMcmv,
  type FaixaMcmv,
} from "@/lib/api/rm-financiamento.functions";
import { gerarPdfSimulacao } from "@/lib/rm-financiamento/pdf-cet";
import {
  atualizarTaxasAgora,
  excluirTaxa,
  listarTaxasAdmin,
  type SistemaAmortizacao,
  type TaxaAdmin,
} from "@/lib/api/rm-financiamento.functions";

const numero = (texto: string) => Number(texto.replace(/\./g, "").replace(",", ".")) || 0;

export function TaxasPage() {
  const queryClient = useQueryClient();
  const { ehAdminOuGestor: ehGestor } = useRmCrmPapel();
  const { data: perfil } = useQuery({ queryKey: ["painel-perfil-crm"], queryFn: () => meuPerfilNoTenant(), staleTime: 5 * 60_000 });

  const { data, isLoading } = useQuery({
    queryKey: ["taxas", "admin"],
    queryFn: () => listarTaxasAdmin(),
  });
  const { data: faixas = [] } = useQuery({
    queryKey: ["mcmv", "faixas"],
    queryFn: () => listarFaixasMcmv(),
  });
  const config = { nome: "RM Prime Imóveis", telefone: null as string | null, email_contato: null as string | null, endereco: null as string | null };

  const taxas = useMemo(() => data?.taxas ?? [], [data]);

  // Simulação: tudo abaixo fica apenas na tela, nada é gravado no banco.
  const [sistema, setSistema] = useState<SistemaAmortizacao>("SAC");
  const [cliente, setCliente] = useState("");
  const [valorImovel, setValorImovel] = useState("0,00");
  const [entrada, setEntrada] = useState("0,00");
  const [anos, setAnos] = useState("30");
  const [taxaManual, setTaxaManual] = useState("");
  const [chaveTaxa, setChaveTaxa] = useState("");
  const [faixaId, setFaixaId] = useState("nenhuma");
  const [taxaAdm, setTaxaAdm] = useState("25");
  const [seguro, setSeguro] = useState("0,035");
  const [gerando, setGerando] = useState(false);
  const [mostrarTotal, setMostrarTotal] = useState(false);

  function chave(t: TaxaAdmin) {
    return `${t.banco}|${t.modalidade ?? ""}|${t.sistema}`;
  }

  const taxasDoSistema = taxas.filter((t) => t.sistema === sistema);
  const taxaSelecionada = taxasDoSistema.find((t) => chave(t) === chaveTaxa) ?? taxasDoSistema[0] ?? null;
  const faixaSelecionada = faixas.find((f) => f.id === faixaId) ?? null;
  const taxaManualNumero = numero(taxaManual);

  const taxaUsada = faixaSelecionada
    ? faixaSelecionada.taxa_aa
    : taxaManual.trim() && taxaManualNumero > 0
      ? taxaManualNumero
      : (taxaSelecionada?.taxa_aa ?? 0);

  const linhaUsada = faixaSelecionada
    ? `Minha Casa Minha Vida — ${faixaSelecionada.nome}`
    : taxaManual.trim() && taxaManualNumero > 0
      ? "Taxa informada na simulação"
      : taxaSelecionada
        ? `${taxaSelecionada.banco}${taxaSelecionada.modalidade ? ` — ${taxaSelecionada.modalidade}` : ""}`
        : "—";

  const valorFinanciado = Math.max(0, numero(valorImovel) - numero(entrada));
  const meses = Number(anos) * 12;

  const resumo = useMemo(
    () =>
      simularFinanciamento({
        valorFinanciado,
        meses,
        taxaAa: taxaUsada,
        sistema,
        taxaAdmMensal: numero(taxaAdm),
        seguroMensalPct: numero(seguro),
      }),
    [valorFinanciado, meses, taxaUsada, sistema, taxaAdm, seguro],
  );

  const alertasFaixa: string[] = [];
  if (faixaSelecionada) {
    if (numero(valorImovel) > faixaSelecionada.teto_imovel)
      alertasFaixa.push(
        `O valor do imóvel ultrapassa o teto de ${formatarMoeda(faixaSelecionada.teto_imovel)} desta faixa.`,
      );
    if (meses > faixaSelecionada.prazo_max_meses)
      alertasFaixa.push(`O prazo máximo desta faixa é de ${faixaSelecionada.prazo_max_meses} meses.`);
    const cota = numero(valorImovel) > 0 ? (valorFinanciado / numero(valorImovel)) * 100 : 0;
    if (cota > faixaSelecionada.cota_maxima)
      alertasFaixa.push(
        `O financiamento é de ${cota.toFixed(0)}% do imóvel; esta faixa financia até ${faixaSelecionada.cota_maxima}%.`,
      );
  }

  async function baixarPdf(completo: boolean) {
    if (!resumo) return;
    setGerando(true);
    try {
      await gerarPdfSimulacao(
        {
          imobiliaria: {
            nome: config?.nome ?? "RM Prime Imóveis",
            telefone: config?.telefone ?? null,
            email: config?.email_contato ?? null,
            endereco: config?.endereco ?? null,
          },
          corretor: perfil?.nome || "Equipe RM Prime",
          cliente,
          linha: linhaUsada,
          valorImovel: numero(valorImovel),
          entrada: numero(entrada),
          valorFinanciado,
          meses,
          sistema,
          taxaAa: taxaUsada,
          resumo,
        },
        completo,
      );
      toast.success("PDF gerado.");
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerando(false);
    }
  }

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: ["taxas"] });
  }

  const remover = useMutation({
    mutationFn: (id: string) => excluirTaxa({ data: { id } }),
    onSuccess: () => {
      invalidar();
      toast.success("Taxa removida.");
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const atualizar = useMutation({
    mutationFn: () => atualizarTaxasAgora(),
    onSuccess: (resultadoAtualizacao) => {
      invalidar();
      if (resultadoAtualizacao.jaExecutado) toast.info("A atualização já havia sido feita agora há pouco.");
      else if (resultadoAtualizacao.registros === 0)
        toast.warning("O Banco Central não devolveu taxas desta vez.");
      else
        toast.success(
          `${resultadoAtualizacao.registros} taxas atualizadas (referência ${resultadoAtualizacao.referencia}).`,
        );
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  return (
    <PainelLayout
      titulo="Taxas de financiamento"
      descricao="Consulte as taxas do Banco Central e do MCMV, simule com o cliente e envie o PDF do CET."
      acoes={
        <Button variant="secondary" onClick={() => atualizar.mutate()} disabled={atualizar.isPending}>
          {atualizar.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar do Banco Central
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Simulação rápida</CardTitle>
          <CardDescription>
            Use uma faixa do Minha Casa Minha Vida, a taxa de um banco ou uma taxa digitada só para esta
            simulação. Nada aqui é salvo: ao sair da tela os valores são descartados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="inline-flex rounded-md border border-border p-1">
            {(["SAC", "PRICE"] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setSistema(opcao)}
                className={
                  sistema === opcao
                    ? "rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    : "rounded-sm px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {opcao === "SAC" ? "SAC (parcelas decrescentes)" : "PRICE (parcelas fixas)"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="sim-cliente">Nome do cliente (sai no PDF)</Label>
              <Input id="sim-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sim-valor">Valor do imóvel</Label>
              <Input
                id="sim-valor"
                inputMode="numeric"
                value={valorImovel}
                onChange={(e) => setValorImovel(mascaraMoeda(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sim-entrada">Entrada</Label>
              <Input
                id="sim-entrada"
                inputMode="numeric"
                value={entrada}
                onChange={(e) => setEntrada(mascaraMoeda(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sim-anos">Prazo (anos)</Label>
              <Input
                id="sim-anos"
                inputMode="numeric"
                value={anos}
                onChange={(e) => setAnos(e.target.value.replace(/\D/g, "").slice(0, 2))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Minha Casa Minha Vida</Label>
              <Select value={faixaId} onValueChange={setFaixaId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Não usar MCMV</SelectItem>
                  {faixas
                    .filter((f) => f.ativo)
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome} — renda até {formatarMoeda(f.renda_max)} ({f.taxa_aa.toFixed(2)}% a.a.)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {faixaSelecionada?.observacao ? (
                <p className="text-xs text-muted-foreground">{faixaSelecionada.observacao}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Banco / linha</Label>
              <Select
                value={taxaSelecionada ? chave(taxaSelecionada) : ""}
                onValueChange={setChaveTaxa}
                disabled={taxasDoSistema.length === 0 || Boolean(faixaSelecionada)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem taxas cadastradas" />
                </SelectTrigger>
                <SelectContent>
                  {taxasDoSistema.map((t) => (
                    <SelectItem key={chave(t)} value={chave(t)}>
                      {t.banco}
                      {t.modalidade ? ` — ${t.modalidade}` : ""} ({t.taxa_aa.toFixed(2)}% a.a.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="sim-taxa">Taxa manual ao ano (%) — opcional</Label>
              <Input
                id="sim-taxa"
                inputMode="decimal"
                placeholder="Ex.: 10,49"
                value={taxaManual}
                disabled={Boolean(faixaSelecionada)}
                onChange={(e) => setTaxaManual(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sim-adm">Tarifa mensal (R$)</Label>
              <Input id="sim-adm" inputMode="decimal" value={taxaAdm} onChange={(e) => setTaxaAdm(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sim-seguro">Seguros ao mês (% do saldo)</Label>
              <Input id="sim-seguro" inputMode="decimal" value={seguro} onChange={(e) => setSeguro(e.target.value)} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Taxa aplicada: <span className="font-semibold text-foreground">{taxaUsada.toFixed(2)}% a.a.</span> ·{" "}
            {linhaUsada}
          </p>

          {alertasFaixa.length > 0 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {alertasFaixa.map((aviso) => (
                <p key={aviso}>{aviso}</p>
              ))}
            </div>
          ) : null}

          {resumo ? (
            <>
              <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-4">
                <div>
                  <p className="rotulo-secao">Primeira parcela</p>
                  <p className="mt-1 font-heading text-2xl font-bold">{formatarMoeda(resumo.primeira)}</p>
                </div>
                <div>
                  <p className="rotulo-secao">Última parcela</p>
                  <p className="mt-1 font-heading text-2xl font-bold">{formatarMoeda(resumo.ultima)}</p>
                </div>
                <div>
                  <p className="rotulo-secao">Total pago</p>
                  <p className="mt-1 flex items-center gap-2 font-heading text-2xl font-bold">
                    {mostrarTotal ? formatarMoeda(resumo.totalPago) : "••••••"}
                    <button
                      type="button"
                      onClick={() => setMostrarTotal((v) => !v)}
                      aria-label={mostrarTotal ? "Ocultar total pago" : "Mostrar total pago"}
                      title={mostrarTotal ? "Ocultar total pago" : "Mostrar total pago"}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {mostrarTotal ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </p>
                </div>
                <div>
                  <p className="rotulo-secao">CET ao ano</p>
                  <p className="mt-1 font-heading text-2xl font-bold">
                    {resumo.cetAnual.toFixed(2).replace(".", ",")}%
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void baixarPdf(false)} disabled={gerando}>
                  {gerando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  PDF resumo (12 parcelas)
                </Button>
                <Button variant="secondary" onClick={() => void baixarPdf(true)} disabled={gerando}>
                  <FileDown className="mr-2 h-4 w-4" />
                  PDF completo (todas as parcelas)
                </Button>
              </div>
            </>
          ) : (
            <p className="border-t border-border pt-5 text-sm text-muted-foreground">
              Informe os valores e escolha uma faixa, um banco ou digite uma taxa para ver a simulação.
            </p>
          )}
        </CardContent>
      </Card>

      <CardFaixasMcmv faixas={faixas} podeEditar={ehGestor} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Taxas cadastradas</CardTitle>
          <CardDescription>{isLoading ? "Carregando..." : `${taxas.length} registros.`}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>Taxa ao ano</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Referência</TableHead>
                {ehGestor ? <TableHead className="text-right">Ações</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxas.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.banco}</TableCell>
                  <TableCell className="text-muted-foreground">{item.modalidade ?? "—"}</TableCell>
                  <TableCell>{item.sistema}</TableCell>
                  <TableCell>{item.taxa_aa.toFixed(2).replace(".", ",")}%</TableCell>
                  <TableCell>
                    <Badge variant={item.fonte === "manual" ? "default" : "secondary"}>
                      {item.fonte === "manual" ? "manual" : "Banco Central"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatarData(item.data_referencia)}</TableCell>
                  {ehGestor ? (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remover.mutate(item.id)}
                        aria-label={`Excluir taxa ${item.banco}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {!isLoading && taxas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={ehGestor ? 7 : 6} className="py-10 text-center text-muted-foreground">
                    Nenhuma taxa cadastrada. Use “Atualizar do Banco Central” para buscar as taxas atuais.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {ehGestor ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Últimas atualizações automáticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.historico ?? []).map((registro) => (
              <div key={registro.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={registro.sucesso ? "secondary" : "destructive"}>
                  {registro.sucesso ? "ok" : "falhou"}
                </Badge>
                <span className="text-muted-foreground">{formatarData(registro.tentativa_em)}</span>
                <span>{registro.detalhe ?? registro.banco}</span>
              </div>
            ))}
            {(data?.historico ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atualização registrada ainda.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </PainelLayout>
  );
}

const FAIXA_VAZIA = {
  ordem: 1,
  nome: "",
  renda_min: "0",
  renda_max: "",
  teto_imovel: "",
  taxa_aa: "",
  prazo_max_meses: "420",
  cota_maxima: "80",
  observacao: "",
  ativo: true,
};

function CardFaixasMcmv({ faixas, podeEditar }: { faixas: FaixaMcmv[]; podeEditar: boolean }) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FAIXA_VAZIA });

  function abrirNovo() {
    setEditandoId(null);
    setForm({ ...FAIXA_VAZIA, ordem: faixas.length + 1 });
    setAberto(true);
  }

  function abrirEdicao(f: FaixaMcmv) {
    setEditandoId(f.id);
    setForm({
      ordem: f.ordem,
      nome: f.nome,
      renda_min: String(f.renda_min),
      renda_max: String(f.renda_max),
      teto_imovel: String(f.teto_imovel),
      taxa_aa: String(f.taxa_aa),
      prazo_max_meses: String(f.prazo_max_meses),
      cota_maxima: String(f.cota_maxima),
      observacao: f.observacao ?? "",
      ativo: f.ativo,
    });
    setAberto(true);
  }

  const salvar = useMutation({
    mutationFn: () =>
      salvarFaixaMcmv({
        data: {
          ...(editandoId ? { id: editandoId } : {}),
          ordem: Number(form.ordem) || 1,
          nome: form.nome,
          renda_min: numero(form.renda_min),
          renda_max: numero(form.renda_max),
          teto_imovel: numero(form.teto_imovel),
          taxa_aa: numero(form.taxa_aa),
          prazo_max_meses: Number(form.prazo_max_meses) || 420,
          cota_maxima: numero(form.cota_maxima),
          observacao: form.observacao.trim() || null,
          ativo: form.ativo,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mcmv"] });
      setAberto(false);
      toast.success("Faixa salva.");
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirFaixaMcmv({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mcmv"] });
      toast.success("Faixa excluída.");
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  return (
    <Card className="mt-6">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Faixas do Minha Casa Minha Vida</CardTitle>
          <CardDescription>
            Renda, teto do imóvel, taxa e prazo de cada faixa. O administrador atualiza sempre que o programa
            mudar.
          </CardDescription>
        </div>
        {podeEditar ? (
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" />
            Nova faixa
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Faixa</TableHead>
              <TableHead>Renda familiar</TableHead>
              <TableHead>Teto do imóvel</TableHead>
              <TableHead>Taxa ao ano</TableHead>
              <TableHead>Prazo máx.</TableHead>
              <TableHead>Financia até</TableHead>
              {podeEditar ? <TableHead className="text-right">Ações</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {faixas.map((f) => (
              <TableRow key={f.id} className={f.ativo ? "" : "opacity-50"}>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell>
                  {formatarMoeda(f.renda_min)} a {formatarMoeda(f.renda_max)}
                </TableCell>
                <TableCell>{formatarMoeda(f.teto_imovel)}</TableCell>
                <TableCell>{f.taxa_aa.toFixed(2).replace(".", ",")}%</TableCell>
                <TableCell>{f.prazo_max_meses} meses</TableCell>
                <TableCell>{f.cota_maxima}%</TableCell>
                {podeEditar ? (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => abrirEdicao(f)} aria-label={`Editar ${f.nome}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => excluir.mutate(f.id)}
                      aria-label={`Excluir ${f.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {faixas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={podeEditar ? 7 : 6} className="py-10 text-center text-muted-foreground">
                  Nenhuma faixa cadastrada.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar faixa" : "Nova faixa"}</DialogTitle>
            <DialogDescription>Os valores usados na simulação e no PDF vêm daqui.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="f-nome">Nome da faixa</Label>
              <Input id="f-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-min">Renda mínima (R$)</Label>
              <Input
                id="f-min"
                inputMode="decimal"
                value={form.renda_min}
                onChange={(e) => setForm({ ...form, renda_min: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-max">Renda máxima (R$)</Label>
              <Input
                id="f-max"
                inputMode="decimal"
                value={form.renda_max}
                onChange={(e) => setForm({ ...form, renda_max: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-teto">Teto do imóvel (R$)</Label>
              <Input
                id="f-teto"
                inputMode="decimal"
                value={form.teto_imovel}
                onChange={(e) => setForm({ ...form, teto_imovel: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-taxa">Taxa ao ano (%)</Label>
              <Input
                id="f-taxa"
                inputMode="decimal"
                value={form.taxa_aa}
                onChange={(e) => setForm({ ...form, taxa_aa: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-prazo">Prazo máximo (meses)</Label>
              <Input
                id="f-prazo"
                inputMode="numeric"
                value={form.prazo_max_meses}
                onChange={(e) => setForm({ ...form, prazo_max_meses: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-cota">Financia até (% do imóvel)</Label>
              <Input
                id="f-cota"
                inputMode="decimal"
                value={form.cota_maxima}
                onChange={(e) => setForm({ ...form, cota_maxima: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="f-obs">Observação</Label>
              <Textarea
                id="f-obs"
                rows={2}
                maxLength={500}
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                id="f-ativo"
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
              <Label htmlFor="f-ativo">Faixa disponível na simulação</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending || !form.nome.trim()}>
              {salvar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
