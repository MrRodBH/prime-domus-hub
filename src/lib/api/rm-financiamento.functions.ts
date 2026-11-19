// Adaptador da tela de Taxas/Simulação SFH aprovada da RM Prime.
// Sempre requireTenant + filtro tenant_id; RLS (is_active_tenant_admin) garante que só o admin ativo da empresa lê/grava.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";

export type SistemaAmortizacao = "SAC" | "PRICE";
export interface TaxaAdmin { id: string; banco: string; modalidade: string | null; sistema: SistemaAmortizacao; taxa_aa: number; fonte: string; data_referencia: string; atualizado_em: string }
export interface RegistroScraping { id: string; banco: string; sucesso: boolean; detalhe: string | null; tentativa_em: string }
export interface FaixaMcmv { id: string; ordem: number; nome: string; renda_min: number; renda_max: number; teto_imovel: number; taxa_aa: number; prazo_max_meses: number; cota_maxima: number; observacao: string | null; ativo: boolean }

const db = (c: any) => c.supabase as any;

export const listarTaxasAdmin = createServerFn({ method: "GET" }).middleware([requireTenant]).handler(async ({ context }): Promise<{ taxas: TaxaAdmin[]; historico: RegistroScraping[] }> => {
  const { data, error } = await db(context).from("tenant_bank_rates").select("id, banco, modalidade, sistema, taxa_aa, fonte, data_referencia, atualizado_em")
    .eq("tenant_id", context.tenant.tenantId).order("banco").order("modalidade").order("sistema");
  if (error) throw new Error("Não foi possível carregar as taxas.");
  return { taxas: (data ?? []).map((l: any) => ({ ...l, taxa_aa: Number(l.taxa_aa) })), historico: [] };
});

export const excluirTaxa = createServerFn({ method: "POST" }).middleware([requireTenant])
  .inputValidator((e: { id: string }) => z.object({ id: z.string().uuid() }).parse(e))
  .handler(async ({ data, context }) => {
    const { error, count } = await db(context).from("tenant_bank_rates").delete({ count: "exact" }).eq("tenant_id", context.tenant.tenantId).eq("id", data.id);
    if (error || !count) throw new Error("Não foi possível excluir a taxa.");
    return { ok: true };
  });

const BANCOS: Record<string, string> = { "00360305": "CEF", "60701190": "Itaú", "60746948": "Bradesco", "00416968": "Inter" };
function rotularModalidade(m: string): string | null {
  const t = m.toLowerCase();
  if (!t.includes("imobili")) return null;
  const tipo = t.includes("reguladas") ? "Taxas reguladas (SFH)" : "Taxas de mercado";
  const idx = t.includes("ipca") ? "IPCA" : t.includes(" tr") ? "TR" : t.includes("prefixado") ? "Prefixado" : null;
  return idx ? `${tipo} · ${idx}` : null;
}

/** Busca as taxas públicas do Banco Central e grava somente para a empresa do usuário. */
export const atualizarTaxasAgora = createServerFn({ method: "POST" }).middleware([requireTenant]).handler(async ({ context }) => {
  const filtro = Object.keys(BANCOS).map((c) => `cnpj8 eq '${c}'`).join(" or ");
  const url = `https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosMensalPorMes?%24top=600&%24format=json&%24orderby=anoMes%20desc&%24filter=${encodeURIComponent(filtro)}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("O Banco Central não respondeu. Tente novamente mais tarde.");
  const linhas = (((await r.json()) as any).value ?? []) as { anoMes: string; Modalidade: string; TaxaJurosAoAno: number; cnpj8: string }[];
  if (!linhas.length) return { jaExecutado: false, registros: 0, referencia: null as string | null };
  const referencia = linhas.reduce((m, l) => (l.anoMes > m ? l.anoMes : m), "");
  const registros: any[] = [];
  for (const l of linhas) {
    if (l.anoMes !== referencia) continue;
    const banco = BANCOS[l.cnpj8]; const modalidade = rotularModalidade(l.Modalidade); const taxa = Number(l.TaxaJurosAoAno);
    if (!banco || !modalidade || !Number.isFinite(taxa) || taxa <= 0 || taxa > 30) continue;
    for (const sistema of ["SAC", "PRICE"]) registros.push({ tenant_id: context.tenant.tenantId, banco, modalidade, sistema, taxa_aa: taxa, fonte: "scraping", data_referencia: `${referencia}-01`, atualizado_em: new Date().toISOString() });
  }
  if (registros.length) {
    const { error } = await db(context).from("tenant_bank_rates").upsert(registros, { onConflict: "tenant_id,banco,modalidade,sistema,fonte" });
    if (error) throw new Error("Não foi possível gravar as taxas atualizadas.");
  }
  return { jaExecutado: false, registros: registros.length, referencia };
});

const faixaSchema = z.object({
  id: z.string().uuid().optional(), ordem: z.number().int().min(1).max(20), nome: z.string().trim().min(2).max(60),
  renda_min: z.number().min(0), renda_max: z.number().min(0), teto_imovel: z.number().min(0), taxa_aa: z.number().min(0).max(30),
  prazo_max_meses: z.number().int().min(12).max(480), cota_maxima: z.number().min(10).max(100),
  observacao: z.string().trim().max(500).nullable().default(null), ativo: z.boolean(),
});

export const listarFaixasMcmv = createServerFn({ method: "GET" }).middleware([requireTenant]).handler(async ({ context }): Promise<FaixaMcmv[]> => {
  const { data, error } = await db(context).from("tenant_mcmv_faixas").select("id, ordem, nome, renda_min, renda_max, teto_imovel, taxa_aa, prazo_max_meses, cota_maxima, observacao, ativo")
    .eq("tenant_id", context.tenant.tenantId).order("ordem");
  if (error) throw new Error("Não foi possível carregar as faixas do MCMV.");
  return (data ?? []).map((l: any) => ({ ...l, renda_min: Number(l.renda_min), renda_max: Number(l.renda_max), teto_imovel: Number(l.teto_imovel), taxa_aa: Number(l.taxa_aa), cota_maxima: Number(l.cota_maxima) }));
});

export const salvarFaixaMcmv = createServerFn({ method: "POST" }).middleware([requireTenant])
  .inputValidator((e: z.input<typeof faixaSchema>) => faixaSchema.parse(e))
  .handler(async ({ data, context }) => {
    const { id, ...campos } = data;
    const payload = { ...campos, atualizado_em: new Date().toISOString() };
    const q = id
      ? db(context).from("tenant_mcmv_faixas").update(payload, { count: "exact" }).eq("tenant_id", context.tenant.tenantId).eq("id", id)
      : db(context).from("tenant_mcmv_faixas").insert({ ...payload, tenant_id: context.tenant.tenantId }, { count: "exact" });
    const { error, count } = await q;
    if (error || !count) throw new Error("Não foi possível salvar a faixa.");
    return { ok: true };
  });

export const excluirFaixaMcmv = createServerFn({ method: "POST" }).middleware([requireTenant])
  .inputValidator((e: { id: string }) => z.object({ id: z.string().uuid() }).parse(e))
  .handler(async ({ data, context }) => {
    const { error, count } = await db(context).from("tenant_mcmv_faixas").delete({ count: "exact" }).eq("tenant_id", context.tenant.tenantId).eq("id", data.id);
    if (error || !count) throw new Error("Não foi possível excluir a faixa.");
    return { ok: true };
  });
