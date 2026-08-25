import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_lead",
  title: "Criar lead manual",
  description:
    "Cria um lead manual no CRM da imobiliária do usuário autenticado, usando a rotina oficial de cadastro do sistema.",
  inputSchema: {
    nome: z.string().trim().min(2).max(200).describe("Nome do lead."),
    email: z.string().trim().email().max(320).optional().describe("E-mail do lead."),
    telefone: z.string().trim().min(8).max(40).optional().describe("Telefone do lead."),
    imovel_id: z.string().uuid().optional().describe("Imóvel de interesse."),
    observacoes: z.string().trim().min(1).max(2000).optional().describe("Observações iniciais."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ nome, email, telefone, imovel_id, observacoes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("create_manual_lead", {
      p_nome: nome,
      p_email: email ?? null,
      p_telefone: telefone ?? null,
      p_imovel_id: imovel_id ?? null,
      p_observacoes: observacoes ?? null,
    });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { lead: data },
    };
  },
});
