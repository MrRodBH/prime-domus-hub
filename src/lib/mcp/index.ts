import { auth, defineMcp } from "@lovable.dev/mcp-js";
import currentWorkspaceTool from "./tools/current-workspace";
import listImoveisTool from "./tools/list-imoveis";
import getImovelTool from "./tools/get-imovel";
import listLeadsTool from "./tools/list-leads";
import createLeadTool from "./tools/create-lead";

// O issuer OAuth precisa ser o host direto do backend; apenas o project ref
// sobrevive ao publish, e o Vite o inlina como literal em build-time.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "rm-prime-saas",
  title: "RM Prime SaaS",
  version: "0.1.0",
  instructions:
    "Ferramentas do RM Prime SaaS. O usuário conecta com sua própria conta e todas as leituras e escritas respeitam as permissões e a imobiliária (tenant) dele. Use `current_workspace` para confirmar o contexto, `list_imoveis`/`get_imovel` para o portfólio de imóveis e `list_leads`/`create_lead` para o CRM.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    currentWorkspaceTool,
    listImoveisTool,
    getImovelTool,
    listLeadsTool,
    createLeadTool,
  ],
});
