import type { CrmLeadDto } from "@/lib/api/tenant-crm.functions";

export const PIPELINE_STATUS_KEYS = [
  "novo",
  "conversando",
  "visita",
  "proposta",
  "ganho",
  "perdido",
  "descartado",
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUS_KEYS)[number];

export const PIPELINE_STATUS_META: Record<
  PipelineStatus,
  { label: string; shortLabel: string; tone: string; accent: string }
> = {
  novo: {
    label: "Novo",
    shortLabel: "Novos",
    tone: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
    accent: "bg-sky-500",
  },
  conversando: {
    label: "Em conversa",
    shortLabel: "Conversas",
    tone: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
    accent: "bg-amber-500",
  },
  visita: {
    label: "Visita",
    shortLabel: "Visitas",
    tone: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
    accent: "bg-violet-500",
  },
  proposta: {
    label: "Proposta",
    shortLabel: "Propostas",
    tone: "bg-indigo-500/10 text-indigo-700 ring-indigo-500/20 dark:text-indigo-300",
    accent: "bg-indigo-500",
  },
  ganho: {
    label: "Ganho",
    shortLabel: "Ganhos",
    tone: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
    accent: "bg-emerald-500",
  },
  perdido: {
    label: "Perdido",
    shortLabel: "Perdidos",
    tone: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300",
    accent: "bg-rose-500",
  },
  descartado: {
    label: "Descartado",
    shortLabel: "Descartados",
    tone: "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300",
    accent: "bg-slate-500",
  },
};

export type PipelineLeadReadModel = Pick<
  CrmLeadDto,
  | "id"
  | "nome"
  | "email"
  | "telefone"
  | "mensagem"
  | "status"
  | "origem"
  | "valor_estimado"
  | "created_at"
  | "updated_at"
  | "imovel"
>;

export type PipelineSummary = {
  total: number;
  open: number;
  proposals: number;
  won: number;
  estimatedValue: number;
  counts: Record<PipelineStatus, number>;
};

export type PipelineReadErrorKind = "denied" | "unavailable" | "error";

export function toPipelineLeadReadModels(rows: readonly CrmLeadDto[]): PipelineLeadReadModel[] {
  return rows
    .map((row) => ({
      id: row.id,
      nome: row.nome,
      email: row.email,
      telefone: row.telefone,
      mensagem: row.mensagem,
      status: row.status,
      origem: row.origem,
      valor_estimado: row.valor_estimado,
      created_at: row.created_at,
      updated_at: row.updated_at,
      imovel: row.imovel,
    }))
    .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
}

export function filterPipelineLeadReadModels(
  rows: readonly PipelineLeadReadModel[],
  filters: { q?: string; status?: PipelineStatus; origem?: string },
): PipelineLeadReadModel[] {
  const query = filters.q?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const origin = filters.origem?.trim().toLocaleLowerCase("pt-BR") ?? "";

  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    if (origin && (row.origem ?? "").toLocaleLowerCase("pt-BR") !== origin) return false;
    if (!query) return true;

    return [row.nome, row.email, row.telefone, row.origem, row.imovel?.titulo]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(query));
  });
}

export function summarizePipelineLeadReadModels(
  rows: readonly PipelineLeadReadModel[],
): PipelineSummary {
  const counts = Object.fromEntries(PIPELINE_STATUS_KEYS.map((status) => [status, 0])) as Record<
    PipelineStatus,
    number
  >;

  let estimatedValue = 0;
  for (const row of rows) {
    counts[row.status] += 1;
    estimatedValue += row.valor_estimado ?? 0;
  }

  return {
    total: rows.length,
    open: counts.novo + counts.conversando + counts.visita + counts.proposta,
    proposals: counts.proposta,
    won: counts.ganho,
    estimatedValue,
    counts,
  };
}

export function classifyPipelineReadError(error: unknown): PipelineReadErrorKind {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLocaleLowerCase("pt-BR");

  if (
    normalized.includes("acesso negado") ||
    normalized.includes("permission") ||
    normalized.includes("forbidden") ||
    normalized.includes("sem participação") ||
    normalized.includes("no tenant membership")
  ) {
    return "denied";
  }

  if (
    normalized.includes("tenant selection required") ||
    normalized.includes("selecione") ||
    normalized.includes("workspace indisponível") ||
    normalized.includes("invalid tenant")
  ) {
    return "unavailable";
  }

  return "error";
}

export function formatPipelineCurrency(value: number | null): string {
  if (value === null) return "Não informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPipelineDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
