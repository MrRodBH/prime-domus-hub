// Tipos e constantes do CRM aprovado da RM Prime (copiados de src/lib/types.ts do projeto original).
export type EtapaCrm = "Novo" | "Conversando" | "Visita" | "Proposta" | "Negócio Fechado" | "Perdido" | "Descartado";
export type TipoAtividade = "cadastro" | "anotacao" | "ligacao" | "whatsapp" | "email" | "visita" | "reuniao" | "outros" | "etapa" | "atribuicao";
export type OrigemLead = "site" | "landing_page" | "agendamento" | "manual" | "google" | "meta" | "instagram" | "indicacao" | "portal" | "outros";

export interface ProximaAcao { id: string; lead_id: string; tipo: TipoAtividade; descricao: string; data_hora: string; concluida_em: string | null }
export interface AtividadeCrm { id: string; tipo: TipoAtividade; descricao: string; data: string; autor_nome: string | null }
export interface LeadCrm {
  id: string; nome: string; telefone: string; email: string | null; origem: OrigemLead; etapa_crm: EtapaCrm;
  motivo_descarte: string | null; mensagem: string | null; consentimento_lgpd: boolean; criado_em: string; atualizado_em: string;
  imovel: { titulo: string; slug: string } | null; corretor_nome: string | null; sem_atendimento: boolean; novo_para_mim: boolean;
  atendimentos: TipoAtividade[]; proxima_acao: ProximaAcao | null;
}

export const TIPOS_PROXIMA_ACAO: TipoAtividade[] = ["ligacao", "whatsapp", "email", "visita", "reuniao", "outros"];
export const ETAPAS_SEM_PROXIMA_ACAO: EtapaCrm[] = ["Perdido", "Descartado", "Negócio Fechado"];
export const TIPOS_OBRIGATORIOS_DESCARTE: TipoAtividade[] = ["ligacao", "whatsapp", "email"];
export const TIPOS_ATENDIMENTO: TipoAtividade[] = ["ligacao", "whatsapp", "email", "visita", "reuniao", "anotacao", "outros"];
export const ROTULOS_ATIVIDADE: Record<string, string> = {
  cadastro: "Cadastro", anotacao: "Anotação", ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail",
  visita: "Visita", reuniao: "Reunião", outros: "Outros", etapa: "Mudança de etapa", atribuicao: "Atribuição",
};
export const ETAPAS_CRM: EtapaCrm[] = ["Novo", "Conversando", "Visita", "Proposta", "Negócio Fechado", "Perdido", "Descartado"];
export const ROTULOS_ORIGEM: Record<OrigemLead, string> = {
  site: "formulário do site", landing_page: "landing page", agendamento: "agendamento de visita", manual: "cadastro manual",
  google: "Google", meta: "Meta (Facebook/Instagram Ads)", instagram: "Instagram", indicacao: "indicação", portal: "portal imobiliário", outros: "outros",
};
export const ORIGENS_MANUAIS: OrigemLead[] = ["manual", "google", "meta", "instagram", "indicacao", "portal", "site", "outros"];

/** Etapa RM Prime <-> status canônico do CRM SaaS. */
export const ETAPA_PARA_STATUS = {
  Novo: "novo", Conversando: "conversando", Visita: "visita", Proposta: "proposta",
  "Negócio Fechado": "ganho", Perdido: "perdido", Descartado: "descartado",
} as const satisfies Record<EtapaCrm, string>;
export function statusParaEtapa(status: string): EtapaCrm {
  const par = Object.entries(ETAPA_PARA_STATUS).find(([, s]) => s === status);
  return (par?.[0] as EtapaCrm) ?? "Novo";
}
