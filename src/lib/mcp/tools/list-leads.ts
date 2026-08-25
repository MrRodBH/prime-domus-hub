import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "Listar leads",
  description:
    "Lista os leads do CRM visíveis para o usuário autenticado, com filtro por status e busca por nome, e-mail ou telefone.",
  inputSchema: {
    search: z.string().trim().min(1).max(120).optional().describe("Texto para buscar em nome, e-mail ou telefone."),
    status: z.string().trim().min(1).max(40).optional().describe("Filtra pelo status do lead no pipeline."),
    limit: z.number().int().min(1).max(50).default(20).describe("Máximo de leads retornados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("leads")
      .select(
        "id, nome, email, telefone, status, origem, imovel_id, assigned_to, valor_estimado, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(
        `nome.ilike.%${search}%,email.ilike.%${search}%,telefone.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { leads: data ?? [], count: data?.length ?? 0 },
    };
  },
});
