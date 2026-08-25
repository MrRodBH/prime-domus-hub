import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_imoveis",
  title: "Listar imóveis",
  description:
    "Lista imóveis da imobiliária do usuário autenticado, com busca por título/código e filtros de status e finalidade.",
  inputSchema: {
    search: z.string().trim().min(1).max(120).optional().describe("Texto para buscar no título ou código."),
    status: z.string().trim().min(1).max(40).optional().describe("Filtra pelo status do imóvel (ex.: publicado)."),
    finalidade: z.string().trim().min(1).max(40).optional().describe("Filtra pela finalidade (ex.: venda, locacao)."),
    limit: z.number().int().min(1).max(50).default(20).describe("Máximo de imóveis retornados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, status, finalidade, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("imoveis")
      .select(
        "id, codigo, titulo, slug, status, finalidade, tipo, preco, cidade, quartos, suites, banheiros, vagas, area_util, destaque, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);

    if (status) query = query.eq("status", status);
    if (finalidade) query = query.eq("finalidade", finalidade);
    if (search) query = query.or(`titulo.ilike.%${search}%,codigo.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { imoveis: data ?? [], count: data?.length ?? 0 },
    };
  },
});
