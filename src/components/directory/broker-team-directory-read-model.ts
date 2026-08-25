export type BrokerTeamDirectorySource = {
  brokers: readonly unknown[];
  teams: readonly unknown[];
};

export type BrokerDirectoryItem = {
  id: string;
  displayName: string;
  initials: string;
  title: string;
  creci: string;
  email: string;
  phone: string;
  bio: string;
  photoUrl: string | null;
  status: string;
  isActive: boolean;
  teamKey: string | null;
  teamName: string;
};

export type TeamDirectoryItem = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  totalMembers: number;
};

export type BrokerDirectoryMetric = {
  key: "brokers" | "active" | "teams" | "members";
  label: string;
  value: number;
  detail: string;
};

export type BrokerTeamDirectoryReadModel = {
  brokers: BrokerDirectoryItem[];
  teams: TeamDirectoryItem[];
  metrics: BrokerDirectoryMetric[];
  totalRecords: number;
  activeBrokerCount: number;
  totalTeamMembers: number;
};

export type BrokerTeamDirectoryReadErrorKind = "denied" | "unavailable" | "error";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

function nullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function finiteNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function initials(name: string): string {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "RM";
  const first = tokens[0]?.[0] ?? "R";
  const last = tokens.length > 1 ? tokens[tokens.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toLocaleUpperCase("pt-BR");
}

function brokerName(row: UnknownRecord): string {
  const first = text(row.nome, "Profissional");
  const last = nullableText(row.sobrenome);
  return last ? `${first} ${last}` : first;
}

export function toBrokerTeamDirectoryReadModel(
  source: BrokerTeamDirectorySource,
): BrokerTeamDirectoryReadModel {
  const teams: TeamDirectoryItem[] = source.teams.map((value, index) => {
    const row = record(value);
    return {
      id: text(row.id, `team-${index}`),
      name: text(row.nome, "Equipe sem nome"),
      description: text(row.descricao, "Contexto de equipe não informado."),
      isActive: row.ativo === true,
      totalMembers: finiteNumber(row.total_membros),
    };
  });

  const teamNameById = new Map(teams.map((team) => [team.id, team.name] as const));
  const brokers: BrokerDirectoryItem[] = source.brokers.map((value, index) => {
    const row = record(value);
    const displayName = brokerName(row);
    const teamKey = nullableText(row.team_id);
    return {
      id: text(row.id, `broker-${index}`),
      displayName,
      initials: initials(displayName),
      title: text(row.cargo, "Corretor imobiliário"),
      creci: text(row.creci, "CRECI não informado"),
      email: text(row.email, "E-mail não informado"),
      phone: text(row.whatsapp ?? row.telefone, "Contato não informado"),
      bio: text(row.bio, "Perfil profissional sem biografia cadastrada."),
      photoUrl: nullableText(row.foto_preview_url),
      status: text(row.status, "Status não informado"),
      isActive: row.ativo === true,
      teamKey,
      teamName: teamKey ? teamNameById.get(teamKey) ?? "Equipe não identificada" : "Sem equipe",
    };
  });

  const activeBrokerCount = brokers.filter((broker) => broker.isActive).length;
  const totalTeamMembers = teams.reduce((total, team) => total + team.totalMembers, 0);

  return {
    brokers,
    teams,
    metrics: [
      {
        key: "brokers",
        label: "Corretores",
        value: brokers.length,
        detail: "Perfis autorizados pelo servidor",
      },
      {
        key: "active",
        label: "Ativos",
        value: activeBrokerCount,
        detail: "Estado retornado pelo servidor",
      },
      {
        key: "teams",
        label: "Equipes",
        value: teams.length,
        detail: "Contextos disponíveis",
      },
      {
        key: "members",
        label: "Vínculos de equipe",
        value: totalTeamMembers,
        detail: "Contagem server-owned",
      },
    ],
    totalRecords: brokers.length + teams.length,
    activeBrokerCount,
    totalTeamMembers,
  };
}

export function filterBrokerDirectory(
  brokers: readonly BrokerDirectoryItem[],
  query: string | undefined,
  team: string | undefined,
): BrokerDirectoryItem[] {
  const normalized = query?.trim().toLocaleLowerCase("pt-BR") ?? "";
  return brokers.filter((broker) => {
    if (team && broker.teamKey !== team) return false;
    if (!normalized) return true;
    return [
      broker.displayName,
      broker.title,
      broker.creci,
      broker.email,
      broker.phone,
      broker.status,
      broker.teamName,
    ].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalized));
  });
}

export function classifyBrokerTeamDirectoryReadError(
  error: unknown,
): BrokerTeamDirectoryReadErrorKind {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLocaleLowerCase("pt-BR");

  if (
    normalized.includes("denied") ||
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
