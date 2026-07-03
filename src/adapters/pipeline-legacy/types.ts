// Shared pipeline types (Bloco 2).
export type Status = "novo" | "conversando" | "visita" | "proposta" | "ganho" | "perdido" | "descartado";

export type Lead = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  mensagem: string | null;
  origem: string | null;
  status: string;
  created_at: string;
  assigned_to: string | null;
  valor_estimado: number | null;
  imovel: { titulo?: string; slug?: string; preco?: number | null; preco_sob_consulta?: boolean | null } | null;
};

export type CorretorLite = { id: string; nome: string; sobrenome: string | null; user_id: string | null };
