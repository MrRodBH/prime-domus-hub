import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_imovel",
  title: "Detalhar imóvel",
  description: "Retorna o detalhe completo de um imóvel pelo id ou pelo slug.",
  inputSchema: {
    id: z.string().uuid().optional().describe("Identificador do imóvel."),
    slug: z.string().trim().min(1).max(200).optional().describe("Slug do imóvel."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, slug }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    if (!id && !slug) {
      return {
        content: [{ type: "text", text: "Informe `id` ou `slug`." }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("imoveis").select("*").limit(1);
    query = id ? query.eq("id", id) : query.eq("slug", slug!);
    const { data, error } = await query.maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: "Imóvel não encontrado." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { imovel: data },
    };
  },
});
