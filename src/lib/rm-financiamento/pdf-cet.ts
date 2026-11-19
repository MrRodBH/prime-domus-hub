import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import logoRmPrime from "@/assets/logo-rm-prime.png.asset.json";
import { formatarMoeda } from "@/lib/rm-financiamento/format";
import type { ResumoFinanciamento, SistemaFinanciamento } from "@/lib/rm-financiamento/financiamento";

export interface DadosPdfSimulacao {
  imobiliaria: { nome: string; telefone: string | null; email: string | null; endereco: string | null };
  corretor: string;
  cliente: string;
  linha: string;
  valorImovel: number;
  entrada: number;
  valorFinanciado: number;
  meses: number;
  sistema: SistemaFinanciamento;
  taxaAa: number;
  resumo: ResumoFinanciamento;
}

async function carregarLogo(): Promise<string | null> {
  try {
    const resposta = await fetch(logoRmPrime.url);
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    return await new Promise<string>((resolver, rejeitar) => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(String(leitor.result));
      leitor.onerror = () => rejeitar(new Error("logo"));
      leitor.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const dinheiro = (valor: number) => formatarMoeda(valor);
const percentual = (valor: number) => `${valor.toFixed(2).replace(".", ",")}%`;

/** Gera e baixa o PDF da simulação. `completo` inclui todas as parcelas do prazo. */
export async function gerarPdfSimulacao(dados: DadosPdfSimulacao, completo: boolean) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const logo = await carregarLogo();

  if (logo) {
    try {
      doc.addImage(logo, "PNG", 40, 28, 110, 40, undefined, "FAST");
    } catch {
      /* segue sem a logo */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Simulação de financiamento", largura - 40, 48, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Emitida em ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`,
    largura - 40,
    64,
    { align: "right" },
  );

  autoTable(doc, {
    startY: 92,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 130 } },
    body: [
      ["Cliente", dados.cliente || "—"],
      ["Corretor", dados.corretor],
      ["Linha / banco", dados.linha],
      ["Valor do imóvel", dinheiro(dados.valorImovel)],
      ["Entrada", dinheiro(dados.entrada)],
      ["Valor financiado", dinheiro(dados.valorFinanciado)],
      ["Prazo", `${dados.meses} meses (${Math.round(dados.meses / 12)} anos)`],
      ["Sistema de amortização", dados.sistema],
      ["Taxa de juros", `${percentual(dados.taxaAa)} ao ano`],
    ],
  });

  const apos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, {
    startY: apos + 16,
    head: [["Resultado", "Valor"]],
    headStyles: { fillColor: [15, 61, 56], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 4 },
    body: [
      ["Primeira parcela", dinheiro(dados.resumo.primeira)],
      ["Última parcela", dinheiro(dados.resumo.ultima)],
      ["Total de juros", dinheiro(dados.resumo.totalJuros)],
      ["Total de seguros", dinheiro(dados.resumo.totalSeguros)],
      ["Total de tarifas de administração", dinheiro(dados.resumo.totalTaxas)],
      ["Total pago no contrato", dinheiro(dados.resumo.totalPago)],
      ["CET (Custo Efetivo Total)", `${percentual(dados.resumo.cetAnual)} ao ano`],
    ],
  });

  const aposResumo = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const linhas = (completo ? dados.resumo.parcelas : dados.resumo.parcelas.slice(0, 12)).map((p) => [
    String(p.numero),
    dinheiro(p.prestacao),
    dinheiro(p.amortizacao),
    dinheiro(p.juros),
    dinheiro(p.seguros + p.taxaAdm),
    dinheiro(p.saldo),
  ]);

  autoTable(doc, {
    startY: aposResumo + 16,
    head: [["Nº", "Prestação", "Amortização", "Juros", "Seguros + tarifa", "Saldo devedor"]],
    headStyles: { fillColor: [15, 61, 56], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 34 } },
    body: linhas,
    didDrawPage: () => {
      const altura = doc.internal.pageSize.getHeight();
      const contato = [dados.imobiliaria.telefone, dados.imobiliaria.email, dados.imobiliaria.endereco]
        .filter(Boolean)
        .join(" · ");
      doc.setFontSize(7.5);
      doc.setTextColor(110);
      doc.text(`${dados.imobiliaria.nome} — ${contato}`, 40, altura - 30);
      doc.text(
        "Simulação estimativa. Valores sujeitos à análise de crédito e às condições vigentes do banco.",
        40,
        altura - 20,
      );
      doc.setTextColor(0);
    },
  });

  if (!completo && dados.resumo.parcelas.length > 12) {
    const fim = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(`Exibindo as 12 primeiras de ${dados.resumo.parcelas.length} parcelas.`, 40, fim + 14);
    doc.setTextColor(0);
  }

  const nome = `simulacao-${(dados.cliente || "cliente").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${completo ? "completa" : "resumo"}.pdf`;
  doc.save(nome);
}
