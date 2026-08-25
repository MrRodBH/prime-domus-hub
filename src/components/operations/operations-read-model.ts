export type OperationsRegistrySource = {
  schemaVersion?: unknown;
  capabilities?: unknown;
  timezone?: unknown;
  externalCommunication?: unknown;
};

export type OperationsSource = {
  registry: OperationsRegistrySource;
  contacts: readonly unknown[];
  calendar: readonly unknown[];
  visits: readonly unknown[];
  proposals: readonly unknown[];
  automation: readonly unknown[];
  sla: readonly unknown[];
  alerts: readonly unknown[];
};

export type OperationsRecord = {
  id: string;
  title: string;
  description: string;
  state: string;
  meta: string;
};

export type OperationsMetric = {
  key: string;
  label: string;
  value: number;
  detail: string;
  tone: "brand" | "info" | "success" | "warning";
};

export type OperationsReadModel = {
  metrics: OperationsMetric[];
  contacts: OperationsRecord[];
  calendar: OperationsRecord[];
  visits: OperationsRecord[];
  proposals: OperationsRecord[];
  automation: OperationsRecord[];
  sla: OperationsRecord[];
  alerts: OperationsRecord[];
  capabilityCount: number;
  timezone: string;
  communicationAvailability: "unavailable";
  totalRecords: number;
};

export type OperationsReadErrorKind = "denied" | "unavailable" | "error";

type UnknownRecord = Record<string, unknown>;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(value: unknown, fallback = "Não informado"): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

function boolean(value: unknown): boolean {
  return value === true;
}

function number(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function opaqueId(row: UnknownRecord, index: number, prefix: string): string {
  return typeof row.id === "string" && row.id ? row.id : `${prefix}-${index}`;
}

export function formatOperationsDate(value: unknown): string {
  if (typeof value !== "string") return "Data não informada";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Data não informada" : dateTime.format(parsed);
}

export function formatOperationsCurrency(value: unknown): string {
  return currency.format(number(value));
}

function toContacts(rows: readonly unknown[]): OperationsRecord[] {
  return rows.map((value, index) => {
    const row = record(value);
    const email = text(row.email, "");
    const phone = text(row.phone, "");
    return {
      id: opaqueId(row, index, "contact"),
      title: text(row.name, "Contato sem nome"),
      description: [email, phone].filter(Boolean).join(" · ") || "Canal de contato não informado",
      state: text(row.status, "registrado"),
      meta: `Atualizado ${formatOperationsDate(row.updated_at ?? row.created_at)}`,
    };
  });
}

function toCalendar(rows: readonly unknown[]): OperationsRecord[] {
  return rows.map((value, index) => {
    const row = record(value);
    return {
      id: opaqueId(row, index, "calendar"),
      title: text(row.title, "Compromisso operacional"),
      description: `${text(row.event_type, "evento")} · ${formatOperationsDate(row.starts_at)}`,
      state: text(row.status, "agendado"),
      meta: text(row.timezone, "America/Sao_Paulo"),
    };
  });
}

function toVisits(rows: readonly unknown[]): OperationsRecord[] {
  return rows.map((value, index) => {
    const row = record(value);
    return {
      id: opaqueId(row, index, "visit"),
      title: `Visita · ${formatOperationsDate(row.scheduled_at)}`,
      description: text(row.property_id, "Imóvel não informado"),
      state: text(row.status, "agendada"),
      meta: text(row.feedback, "Feedback pendente"),
    };
  });
}

function toProposals(rows: readonly unknown[]): OperationsRecord[] {
  return rows.map((value, index) => {
    const row = record(value);
    return {
      id: opaqueId(row, index, "proposal"),
      title: formatOperationsCurrency(row.amount),
      description: `Validade: ${text(row.valid_until, "não informada")}`,
      state: text(row.status, "registrada"),
      meta: "Condições preservadas no servidor",
    };
  });
}

function toAutomation(rows: readonly unknown[]): OperationsRecord[] {
  return rows.map((value, index) => {
    const row = record(value);
    const active = boolean(row.active);
    const configuration = record(row.configuration);
    return {
      id: opaqueId(row, index, "automation"),
      title: text(row.rule_key, "Regra operacional"),
      description: `${Object.keys(configuration).length} parâmetro(s) server-owned`,
      state: active ? "ativa" : "inativa",
      meta: "Somente leitura",
    };
  });
}

function toSla(rows: readonly unknown[]): OperationsRecord[] {
  return rows.map((value, index) => {
    const row = record(value);
    const active = boolean(row.active);
    return {
      id: opaqueId(row, index, "sla"),
      title: text(row.policy_key, "Política operacional"),
      description: `${number(row.threshold_minutes)} min`,
      state: active ? "ativa" : "inativa",
      meta: "Limite definido pelo servidor",
    };
  });
}

function toAlerts(rows: readonly unknown[]): OperationsRecord[] {
  return rows.map((value, index) => {
    const row = record(value);
    return {
      id: opaqueId(row, index, "alert"),
      title: text(row.alert_key, "Alerta operacional"),
      description: text(row.severity, "atenção"),
      state: text(row.state, "aberto"),
      meta: formatOperationsDate(row.created_at ?? row.updated_at),
    };
  });
}

export function toOperationsReadModel(source: OperationsSource): OperationsReadModel {
  const contacts = toContacts(source.contacts);
  const calendar = toCalendar(source.calendar);
  const visits = toVisits(source.visits);
  const proposals = toProposals(source.proposals);
  const automation = toAutomation(source.automation);
  const sla = toSla(source.sla);
  const alerts = toAlerts(source.alerts);
  const openAlerts = alerts.filter(
    (alert) => alert.state === "open" || alert.state === "aberto",
  ).length;
  const activeAutomation = automation.filter((item) => item.state === "ativa").length;
  const activeSla = sla.filter((item) => item.state === "ativa").length;
  const capabilities = Array.isArray(source.registry.capabilities)
    ? source.registry.capabilities.filter((item): item is string => typeof item === "string")
    : [];

  return {
    metrics: [
      {
        key: "contacts",
        label: "Contatos",
        value: contacts.length,
        detail: "Registros autorizados",
        tone: "brand",
      },
      {
        key: "calendar",
        label: "Agenda",
        value: calendar.length,
        detail: "Compromissos visíveis",
        tone: "info",
      },
      {
        key: "visits",
        label: "Visitas",
        value: visits.length,
        detail: "Acompanhamentos",
        tone: "success",
      },
      {
        key: "proposals",
        label: "Propostas",
        value: proposals.length,
        detail: "Read model comercial",
        tone: "brand",
      },
      {
        key: "automation",
        label: "Automações",
        value: activeAutomation,
        detail: `${automation.length} configuradas`,
        tone: "info",
      },
      {
        key: "sla",
        label: "SLAs ativos",
        value: activeSla,
        detail: `${sla.length} políticas`,
        tone: "success",
      },
      {
        key: "alerts",
        label: "Alertas abertos",
        value: openAlerts,
        detail: `${alerts.length} sinais`,
        tone: openAlerts > 0 ? "warning" : "success",
      },
      {
        key: "capabilities",
        label: "Capacidades",
        value: capabilities.length,
        detail: "Registry server-owned",
        tone: "info",
      },
    ],
    contacts,
    calendar,
    visits,
    proposals,
    automation,
    sla,
    alerts,
    capabilityCount: capabilities.length,
    timezone: text(source.registry.timezone, "America/Sao_Paulo"),
    communicationAvailability: "unavailable",
    totalRecords:
      contacts.length +
      calendar.length +
      visits.length +
      proposals.length +
      automation.length +
      sla.length +
      alerts.length,
  };
}

export function filterOperationsRecords(
  rows: readonly OperationsRecord[],
  query: string | undefined,
): OperationsRecord[] {
  const normalized = query?.trim().toLocaleLowerCase("pt-BR") ?? "";
  if (!normalized) return [...rows];
  return rows.filter((row) =>
    [row.title, row.description, row.state, row.meta].some((value) =>
      value.toLocaleLowerCase("pt-BR").includes(normalized),
    ),
  );
}

export function classifyOperationsReadError(error: unknown): OperationsReadErrorKind {
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
    normalized.includes("invalid tenant") ||
    normalized.includes("adapter_not_implemented")
  ) {
    return "unavailable";
  }

  return "error";
}
