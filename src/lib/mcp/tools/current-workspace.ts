import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "current_workspace",
  title: "Workspace atual",
  description:
    "Retorna o usuário autenticado e a imobiliária (tenant) cujo contexto será usado pelas demais ferramentas.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tenants")
      .select("id, nome, slug, status, dominio_principal")
      .limit(10);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const payload = {
      user_email: ctx.getUserEmail() ?? null,
      tenants: data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
