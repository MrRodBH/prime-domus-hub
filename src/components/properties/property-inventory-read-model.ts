export const PROPERTY_STATUS_KEYS = ["ativo", "rascunho", "reservado", "vendido"] as const;
export const PROPERTY_PURPOSE_KEYS = ["venda", "aluguel", "lancamento"] as const;

export type PropertyStatus = (typeof PROPERTY_STATUS_KEYS)[number];
export type PropertyPurpose = (typeof PROPERTY_PURPOSE_KEYS)[number];

export const PROPERTY_STATUS_META: Record<
  PropertyStatus,
  { label: string; tone: string; accent: string }
> = {
  ativo: {
    label: "Ativo",
    tone: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
    accent: "from-emerald-500/24 via-emerald-500/8",
  },
  rascunho: {
    label: "Rascunho",
    tone: "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300",
    accent: "from-slate-500/22 via-slate-500/7",
  },
  reservado: {
    label: "Reservado",
    tone: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
    accent: "from-amber-500/24 via-amber-500/8",
  },
  vendido: {
    label: "Vendido",
    tone: "bg-indigo-500/10 text-indigo-700 ring-indigo-500/20 dark:text-indigo-300",
    accent: "from-indigo-500/24 via-indigo-500/8",
  },
};

export const PROPERTY_PURPOSE_META: Record<PropertyPurpose, string> = {
  venda: "Venda",
  aluguel: "Aluguel",
  lancamento: "Lançamento",
};

export type PropertyInventorySource = {
  id: string;
  codigo: string | null;
  titulo: string;
  slug: string;
  finalidade: string;
  tipo: string;
  status: string;
  preco: number | null;
  destaque: boolean | null;
  updated_at: string;
  bairro?: { nome?: string | null } | null;
};

export type PropertyDetailSource = PropertyInventorySource & {
  descricao?: string | null;
  preco_sob_consulta?: boolean | null;
  condominio?: number | null;
  iptu?: number | null;
  area_total?: number | null;
  area_util?: number | null;
  quartos?: number | null;
  suites?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  endereco?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  cidade?: string | null;
  estado?: string | null;
  badge?: string | null;
  exclusivo?: boolean | null;
  caracteristicas?: string[] | null;
  imagem_capa?: string | null;
  imagens?: Array<{
    id: string;
    url: string;
    alt: string | null;
    ordem: number;
  }> | null;
};

export type PropertyInventoryReadModel = {
  id: string;
  codigo: string;
  titulo: string;
  slug: string;
  finalidade: string;
  tipo: string;
  status: string;
  preco: number | null;
  destaque: boolean;
  updated_at: string;
  bairro: string | null;
};

export type PropertyDetailReadModel = PropertyInventoryReadModel & {
  descricao: string | null;
  preco_sob_consulta: boolean;
  condominio: number | null;
  iptu: number | null;
  area_total: number | null;
  area_util: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  badge: string | null;
  exclusivo: boolean;
  caracteristicas: string[];
  imageUrl: string | null;
  imageAlt: string;
};

export type PropertyInventorySummary = {
  total: number;
  active: number;
  featured: number;
  withPrice: number;
  averagePrice: number | null;
};

export type PropertyReadErrorKind = "denied" | "unavailable" | "error";

function isPropertyStatus(value: string): value is PropertyStatus {
  return PROPERTY_STATUS_KEYS.includes(value as PropertyStatus);
}

function safeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function propertyStatusMeta(status: string) {
  return isPropertyStatus(status)
    ? PROPERTY_STATUS_META[status]
    : {
        label: "Indisponível",
        tone: "bg-state-warning/10 text-state-warning ring-state-warning/20",
        accent: "from-state-warning/20 via-state-warning/6",
      };
}

export function toPropertyInventoryReadModels(
  rows: readonly PropertyInventorySource[],
): PropertyInventoryReadModel[] {
  return rows
    .map((row) => ({
      id: row.id,
      codigo: row.codigo?.trim() || "Código indisponível",
      titulo: row.titulo,
      slug: row.slug,
      finalidade: row.finalidade,
      tipo: row.tipo,
      status: row.status,
      preco: row.preco,
      destaque: row.destaque === true,
      updated_at: row.updated_at,
      bairro: row.bairro?.nome?.trim() || null,
    }))
    .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
}

export function toPropertyDetailReadModel(row: PropertyDetailSource): PropertyDetailReadModel {
  const images = [...(row.imagens ?? [])].sort((left, right) => left.ordem - right.ordem);
  const selectedImage = safeImageUrl(row.imagem_capa) ?? safeImageUrl(images[0]?.url);
  const imageAlt = images.find((image) => safeImageUrl(image.url) === selectedImage)?.alt?.trim();
  const address = [row.rua, row.numero, row.complemento].filter(Boolean).join(", ").trim();

  return {
    ...toPropertyInventoryReadModels([row])[0]!,
    descricao: row.descricao?.trim() || null,
    preco_sob_consulta: row.preco_sob_consulta === true,
    condominio: row.condominio ?? null,
    iptu: row.iptu ?? null,
    area_total: row.area_total ?? null,
    area_util: row.area_util ?? null,
    quartos: row.quartos ?? null,
    suites: row.suites ?? null,
    banheiros: row.banheiros ?? null,
    vagas: row.vagas ?? null,
    endereco: address || row.endereco?.trim() || null,
    cidade: row.cidade?.trim() || null,
    estado: row.estado?.trim() || null,
    badge: row.badge?.trim() || null,
    exclusivo: row.exclusivo === true,
    caracteristicas: (row.caracteristicas ?? []).filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    ),
    imageUrl: selectedImage,
    imageAlt: imageAlt || `Imagem de ${row.titulo}`,
  };
}

export function filterPropertyInventoryReadModels(
  rows: readonly PropertyInventoryReadModel[],
  filters: { q?: string; status?: PropertyStatus; finalidade?: PropertyPurpose },
): PropertyInventoryReadModel[] {
  const query = filters.q?.trim().toLocaleLowerCase("pt-BR") ?? "";

  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    if (filters.finalidade && row.finalidade !== filters.finalidade) return false;
    if (!query) return true;

    return [row.codigo, row.titulo, row.tipo, row.bairro]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(query));
  });
}

export function summarizePropertyInventoryReadModels(
  rows: readonly PropertyInventoryReadModel[],
): PropertyInventorySummary {
  const prices = rows
    .map((row) => row.preco)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    total: rows.length,
    active: rows.filter((row) => row.status === "ativo").length,
    featured: rows.filter((row) => row.destaque).length,
    withPrice: prices.length,
    averagePrice:
      prices.length > 0 ? prices.reduce((total, value) => total + value, 0) / prices.length : null,
  };
}

export function classifyPropertyReadError(error: unknown): PropertyReadErrorKind {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLocaleLowerCase("pt-BR");

  if (
    normalized.includes("permission_denied") ||
    normalized.includes("permission denied") ||
    normalized.includes("forbidden") ||
    normalized.includes("acesso negado") ||
    normalized.includes("sem participação")
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

export function formatPropertyCurrency(value: number | null, underConsultation = false): string {
  if (underConsultation) return "Sob consulta";
  if (value === null) return "Preço não informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPropertyDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
