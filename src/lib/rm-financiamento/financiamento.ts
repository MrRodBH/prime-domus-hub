/**
 * Cálculo de financiamento imobiliário (SAC e PRICE) com tabela mês a mês e CET.
 * Módulo puro: roda no navegador, não grava nada.
 */

export type SistemaFinanciamento = "SAC" | "PRICE";

export interface ParametrosFinanciamento {
  valorFinanciado: number;
  meses: number;
  taxaAa: number;
  sistema: SistemaFinanciamento;
  /** Tarifa mensal de administração do contrato (R$). */
  taxaAdmMensal: number;
  /** Seguros (MIP + DFI) como % do saldo devedor por mês. */
  seguroMensalPct: number;
}

export interface ParcelaFinanciamento {
  numero: number;
  juros: number;
  amortizacao: number;
  seguros: number;
  taxaAdm: number;
  prestacao: number;
  saldo: number;
}

export interface ResumoFinanciamento {
  parcelas: ParcelaFinanciamento[];
  taxaMensal: number;
  primeira: number;
  ultima: number;
  totalJuros: number;
  totalSeguros: number;
  totalTaxas: number;
  totalPago: number;
  cetMensal: number;
  cetAnual: number;
}

/** Taxa interna de retorno mensal do fluxo de caixa, por bisseção. */
function calcularIrr(valorLiberado: number, fluxos: number[]): number {
  const vpl = (i: number) =>
    fluxos.reduce((soma, valor, indice) => soma + valor / Math.pow(1 + i, indice + 1), 0) - valorLiberado;

  let baixo = 0;
  let alto = 1;
  if (vpl(baixo) < 0) return 0;
  while (vpl(alto) > 0 && alto < 10) alto *= 2;

  for (let passo = 0; passo < 200; passo += 1) {
    const meio = (baixo + alto) / 2;
    if (vpl(meio) > 0) baixo = meio;
    else alto = meio;
  }
  return (baixo + alto) / 2;
}

export function simularFinanciamento(p: ParametrosFinanciamento): ResumoFinanciamento | null {
  const { valorFinanciado, meses, taxaAa, sistema } = p;
  const i = Math.pow(1 + taxaAa / 100, 1 / 12) - 1;
  if (valorFinanciado <= 0 || meses <= 0 || i <= 0) return null;

  const parcelas: ParcelaFinanciamento[] = [];
  let saldo = valorFinanciado;
  const prestacaoPrice = (valorFinanciado * i) / (1 - Math.pow(1 + i, -meses));
  const amortizacaoSac = valorFinanciado / meses;

  for (let numero = 1; numero <= meses; numero += 1) {
    const juros = saldo * i;
    const amortizacao =
      sistema === "SAC" ? Math.min(amortizacaoSac, saldo) : Math.min(prestacaoPrice - juros, saldo);
    const seguros = (saldo * p.seguroMensalPct) / 100;
    const taxaAdm = p.taxaAdmMensal;
    saldo = Math.max(0, saldo - amortizacao);
    parcelas.push({
      numero,
      juros,
      amortizacao,
      seguros,
      taxaAdm,
      prestacao: juros + amortizacao + seguros + taxaAdm,
      saldo,
    });
  }

  const totalJuros = parcelas.reduce((s, x) => s + x.juros, 0);
  const totalSeguros = parcelas.reduce((s, x) => s + x.seguros, 0);
  const totalTaxas = parcelas.reduce((s, x) => s + x.taxaAdm, 0);
  const totalPago = parcelas.reduce((s, x) => s + x.prestacao, 0);

  const cetMensal = calcularIrr(
    valorFinanciado,
    parcelas.map((x) => x.prestacao),
  );

  return {
    parcelas,
    taxaMensal: i,
    primeira: parcelas[0]?.prestacao ?? 0,
    ultima: parcelas[parcelas.length - 1]?.prestacao ?? 0,
    totalJuros,
    totalSeguros,
    totalTaxas,
    totalPago,
    cetMensal,
    cetAnual: (Math.pow(1 + cetMensal, 12) - 1) * 100,
  };
}
