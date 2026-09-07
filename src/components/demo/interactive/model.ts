import { normalizeCnpj } from "./formats";
// Round 46: session-only product exploration. No transport, persistence or seeded business data.
export type Fields = Record<string, string>;
export type Row = { id: string; tenant: string; createdAt: string; fields: Fields };
export type Event = {
  id: string;
  tenant: string;
  subject: string;
  at: string;
  title: string;
  detail: string;
};
export type State = { sequence: number; rows: Record<string, Row[]>; events: Event[] };
export const collections = [
  "plans",
  "tenants",
  "domains",
  "users",
  "integrations",
  "websites",
  "feeds",
  "properties",
  "leads",
  "activities",
  "tasks",
  "campaigns",
  "finance",
  "dlq",
  "decisions",
  "playbooks",
  "experiments",
  "rollouts",
  "support",
] as const;
export const stages = [
  "Novo lead",
  "Em atendimento",
  "Visita agendada",
  "Proposta enviada",
  "Negócio fechado",
  "Negócio perdido",
  "Descartado",
];
export const modules = [
  "Dashboard",
  "Implantação",
  "Usuários",
  "Integrações",
  "Website",
  "CMS",
  "Portais",
  "Imóveis",
  "Leads",
  "CRM",
  "Agenda",
  "Campanhas",
  "Análises",
  "IA",
];
export const permissions = [
  "Imóveis: visualizar",
  "Imóveis: criar",
  "Imóveis: editar",
  "Imóveis: excluir",
  "Leads: visualizar",
  "Leads: criar",
  "Leads: editar",
  "Leads: excluir",
  "CRM: gerenciar",
  "CMS: editar",
  "Campanhas: gerenciar",
  "Usuários: gerenciar",
  "Financeiro: visualizar",
];
export const emptyState = (): State => ({
  sequence: 0,
  rows: Object.fromEntries(collections.map((key) => [key, []])),
  events: [],
});
export const rowsFor = (state: State, key: string, tenant: string) =>
  (state.rows[key] ?? []).filter((row) => row.tenant === tenant);
export const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function domainName(value: string) {
  const result = value.trim().toLowerCase();
  if (result.length > 253 || result.split(".").some((label) => label.length > 63))
    throw Error("Domínio excede o tamanho permitido.");
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(result))
    throw Error("Informe somente o domínio, sem https, caminho ou espaços.");
  return result;
}
const required = (fields: Fields, keys: string[]) => {
  for (const key of keys) if (!fields[key]?.trim()) throw Error(`Preencha o campo: ${key}.`);
};
const numeric = (fields: Fields, keys: string[], minimum = 0) => {
  for (const key of keys)
    if (fields[key] && (!Number.isFinite(Number(fields[key])) || Number(fields[key]) < minimum))
      throw Error(`Valor inválido: ${key}.`);
};
export function command(
  state: State,
  kind: string,
  tenant: string,
  fields: Fields,
  subject = "",
  at = new Date().toISOString(),
): State {
  const next: State = {
    sequence: state.sequence + 1,
    rows: { ...state.rows },
    events: [...state.events],
  };
  const id = `session-${next.sequence}`;
  const tenantRow = state.rows.tenants.find((row) => row.id === tenant);
  if (!["plans", "tenants", "webhook"].includes(kind) && !tenantRow)
    throw Error("Cadastre e selecione um tenant primeiro.");
  const data = { ...fields };
  let collection = kind;
  let title = `Registro em ${kind}`;
  function own(key: string, target = subject) {
    const row = state.rows[key]?.find((row) => row.id === target && row.tenant === tenant);
    if (!row) throw Error("Registro indisponível para o tenant selecionado.");
    return row;
  }
  function update(key: string, row: Row, changes: Fields) {
    next.rows[key] = state.rows[key].map((item) =>
      item.id === row.id ? { ...row, fields: { ...row.fields, ...changes } } : item,
    );
  }
  const domain = rowsFor(state, "domains", tenant)[0];
  const website = rowsFor(state, "websites", tenant)[0];
  if (kind === "plans") {
    required(data, ["name", "price", "users", "properties"]);
    numeric(data, ["price", "users", "properties"]);
    title = "Plano definido pela equipe";
  } else if (kind === "tenants" || kind === "webhook" || kind === "tenantEdit") {
    required(data, [
      "name",
      "cnpj",
      "responsible",
      "cpf",
      "address",
      "number",
      "district",
      "city",
      "region",
      "zip",
      "whatsapp",
      "email",
      "plan",
    ]);
    if (!state.rows.plans.some((row) => row.id === data.plan))
      throw Error("Cadastre e selecione um plano válido.");
    if (
      state.rows.tenants.some(
        (row) =>
          row.id !== (kind === "tenantEdit" ? tenant : "") &&
          normalizeCnpj(row.fields.cnpj) === normalizeCnpj(data.cnpj),
      )
    )
      throw Error("Este CNPJ já foi cadastrado na sessão.");
    if (data.sameBilling !== "true")
      required(data, [
        "billingAddress",
        "billingNumber",
        "billingDistrict",
        "billingCity",
        "billingRegion",
        "billingZip",
      ]);
    if (kind === "webhook") {
      required(data, ["eventId", "product"]);
      const plan = state.rows.plans.find((row) => row.id === data.plan);
      if (!plan?.fields.product || plan.fields.product !== data.product)
        throw Error("O produto informado no evento não corresponde a um plano configurado.");
      if (state.rows.tenants.some((row) => row.fields.eventId === data.eventId))
        throw Error("Este evento já foi processado na sessão.");
    }
    if (kind === "tenantEdit") {
      if (subject !== tenant || !tenantRow) throw Error("Tenant indisponível para edição.");
      update("tenants", tenantRow, data);
    }
    collection = kind === "tenantEdit" ? "tenantEdit" : "tenants";
    title =
      kind === "tenantEdit"
        ? "Cadastro do tenant atualizado"
        : kind === "webhook"
          ? "Compra demonstrativa recebida"
          : "Tenant cadastrado";
  } else if (kind === "domains" || kind === "domainEdit") {
    required(data, ["name", "provider"]);
    data.name = domainName(data.name);
    if (state.rows.domains.some((row) => row.fields.name === data.name && row.tenant !== tenant))
      throw Error("Domínio já utilizado nesta sessão.");
    if (kind === "domains" && domain) throw Error("O tenant já possui configuração de domínio.");
    data.status = "Pendente de verificação real";
    if (kind === "domainEdit")
      update("domains", own("domains"), { ...data, lastCheck: "", checkResult: "" });
    title = "Dados do domínio salvos; conexão não comprovada";
  } else if (kind === "domainTest") {
    const row = own("domains");
    domainName(row.fields.name);
    update("domains", row, {
      status: "Pendente de verificação real",
      lastCheck: at,
      checkResult:
        "Formato válido. DNS, propriedade e SSL não verificados: integração canônica indisponível nesta demonstração.",
    });
    title = "Formato revisado; verificações reais indisponíveis";
  } else if (kind === "users") {
    required(data, ["name", "email", "role"]);
    if (
      rowsFor(state, "users", tenant).some(
        (row) => row.fields.email.toLowerCase() === data.email.toLowerCase(),
      )
    )
      throw Error("E-mail já cadastrado no tenant.");
    if (data.role === "Outro") required(data, ["customRole"]);
    title = "Usuário demonstrativo cadastrado, sem identidade Auth";
  } else if (kind === "permissions") {
    const row = own("users");
    update("users", row, { permissions: data.permissions || "" });
    title = "Permissões demonstrativas ajustadas";
  } else if (kind === "integrations") {
    required(data, ["name", "provider", "account"]);
    data.status = "Configurada na sessão";
    title = "Integração configurada sem OAuth ou envio";
  } else if (kind === "integrationTest") {
    own("integrations");
    title = "Configuração revisada localmente; provedor não consultado";
  } else if (kind === "websites") {
    if (!domain) throw Error("Configure o domínio primeiro.");
    if (website) throw Error("Website já criado. Personalize no CMS.");
    required(data, ["name", "theme", "color"]);
    title = "Website criado na sessão; CMS habilitado";
  } else if (kind === "cms") {
    if (!website) throw Error("Crie o website antes de habilitar o CMS.");
    required(data, ["name", "headline"]);
    update("websites", website, data);
    title = "Conteúdo do website atualizado na sessão";
  } else if (kind === "feeds") {
    required(data, ["name", "format"]);
    data.status = "Configurado";
    title = "Portal configurado sem transmissão";
  } else if (kind === "feedTest") {
    const row = own("feeds");
    const count = rowsFor(state, "properties", tenant).length;
    if (!count) throw Error("Cadastre um imóvel para testar a composição do feed.");
    update("feeds", row, { status: `Estrutura local revisada: ${count} imóvel(is)` });
    title = "Teste local de estrutura do feed; homologação do portal pendente";
  } else if (kind === "properties") {
    required(data, [
      "name",
      "purpose",
      "type",
      "price",
      "area",
      "address",
      "number",
      "district",
      "city",
      "region",
      "zip",
      "description",
    ]);
    numeric(data, ["price", "area"], 0.01);
    numeric(data, ["rooms", "suites", "baths", "parking", "condo", "tax"]);
    if (data.latitude && (!Number.isFinite(+data.latitude) || Math.abs(+data.latitude) > 90))
      throw Error("Latitude inválida.");
    if (data.longitude && (!Number.isFinite(+data.longitude) || Math.abs(+data.longitude) > 180))
      throw Error("Longitude inválida.");
    data.status = "Rascunho";
    title = "Imóvel cadastrado";
  } else if (kind === "propertyEdit") {
    const row = own("properties");
    required(data, ["name", "description", "price"]);
    numeric(data, ["price"], 0.01);
    update("properties", row, data);
    title = "Ficha do imóvel atualizada";
  } else if (kind === "leadEdit") {
    const row = own("leads");
    if (data.user) own("users", data.user);
    if (data.property) own("properties", data.property);
    update("leads", row, {
      user: data.user || "",
      property: data.property || "",
      notes: data.notes || "",
    });
    title = "Responsável e contexto do lead atualizados";
  } else if (kind === "lp") {
    const row = own("properties");
    if (!domain || !website) throw Error("Configure domínio e website antes de criar a LP.");
    const path = slug(data.path || row.fields.name);
    if (!path) throw Error("Informe um título para a LP.");
    if (rowsFor(state, "properties", tenant).some((p) => p.id !== subject && p.fields.lp === path))
      throw Error("Este caminho já pertence a outro imóvel.");
    update("properties", row, { lp: path, lpStatus: "Prévia na sessão" });
    title = "LP preparada na sessão, sem publicação";
  } else if (kind === "leads") {
    required(data, ["name", "whatsapp"]);
    if (data.user) own("users", data.user);
    if (data.property) own("properties", data.property);
    data.stage = stages[0];
    title = "Lead entrou na primeira etapa do Kanban";
  } else if (kind === "stage") {
    const row = own("leads");
    if (!stages.includes(data.stage)) throw Error("Etapa inválida.");
    if (["Descartado", "Negócio perdido"].includes(data.stage)) required(data, ["reason"]);
    if (row.fields.stage === data.stage) return state;
    update("leads", row, { stage: data.stage, reason: data.reason || "" });
    title = `Etapa: ${row.fields.stage} → ${data.stage}`;
  } else if (kind === "activities") {
    own("leads", data.lead);
    required(data, ["type", "result", "date"]);
    if (!["Ligação", "WhatsApp", "Email"].includes(data.type))
      throw Error("Tipo de atividade inválido.");
    if (Number.isNaN(Date.parse(data.date))) throw Error("Data da atividade inválida.");
    title = `${data.type}: ${data.result}`;
  } else if (kind === "tasks") {
    required(data, ["name", "date"]);
    if (data.lead) own("leads", data.lead);
    if (data.user) own("users", data.user);
    data.status = "Pendente";
    title = "Atividade agendada";
  } else if (kind === "taskDone") {
    const row = own("tasks");
    update("tasks", row, { status: "Concluída" });
    title = "Tarefa concluída";
  } else if (kind === "campaigns") {
    required(data, ["name", "account", "property", "budget"]);
    const account = own("integrations", data.account);
    if (!["Meta Ads", "Google Ads"].includes(account.fields.provider))
      throw Error("Selecione uma conta de anúncios.");
    own("properties", data.property);
    numeric(data, ["budget"]);
    data.status = "Rascunho";
    title = "Campanha preparada sem anúncio real";
  } else if (kind === "finance") {
    required(data, ["name", "amount", "date", "status"]);
    numeric(data, ["amount"]);
    title = "Lançamento financeiro demonstrativo registrado";
  } else if (kind === "support") {
    required(data, ["name", "detail"]);
    data.status = "Aberto";
    title = "Solicitação de suporte registrada na sessão";
  } else if (
    kind === "decisions" ||
    kind === "playbooks" ||
    kind === "experiments" ||
    kind === "rollouts"
  ) {
    required(data, ["name", "detail"]);
    data.status = "Planejado";
    title = "Planejamento registrado pela equipe";
  } else if (kind === "planningUpdate") {
    if (!["decisions", "playbooks", "experiments", "rollouts"].includes(data.collection))
      throw Error("Coleção inválida.");
    const row = own(data.collection);
    if (!["Planejado", "Em andamento", "Pausado", "Concluído", "Arquivado"].includes(data.status))
      throw Error("Situação inválida.");
    numeric(data, ["a", "b", "aConverted", "bConverted"]);
    if (
      Number(data.aConverted || 0) > Number(data.a || 0) ||
      Number(data.bConverted || 0) > Number(data.b || 0)
    )
      throw Error("Conversões não podem superar a base informada.");
    update(data.collection, row, data);
    title = "Execução e resultado informados pela equipe";
  } else if (kind === "dlq") {
    required(data, ["name", "detail"]);
    data.status = "Pendente";
    title = "Falha de integração informada pela equipe";
  } else if (kind === "retry") {
    const row = own("dlq");
    update("dlq", row, { status: "Revisada localmente" });
    title = "Item da DLQ revisado sem reenviar a provedores";
  } else throw Error("Operação demonstrativa não disponível.");
  if (collections.includes(collection as (typeof collections)[number]))
    next.rows[collection] = [
      ...state.rows[collection],
      { id, tenant: collection === "tenants" ? id : tenant, createdAt: at, fields: data },
    ];
  next.events.push({
    id,
    tenant: collection === "tenants" ? id : tenant,
    subject: subject || data.lead || id,
    at,
    title,
    detail: data.reason || data.detail || "",
  });
  return next;
}
export function metrics(state: State, tenant: string, from = "", to = "") {
  const scoped = (key: string) =>
    state.rows[key].filter(
      (row) =>
        (!tenant || row.tenant === tenant) &&
        (!from || (row.fields.date || row.createdAt).slice(0, 10) >= from) &&
        (!to || (row.fields.date || row.createdAt).slice(0, 10) <= to),
    );
  const leads = scoped("leads"),
    won = leads.filter((row) => row.fields.stage === "Negócio fechado");
  const finance = scoped("finance");
  return {
    tenants: tenant
      ? state.rows.tenants.filter((t) => t.id === tenant).length
      : state.rows.tenants.length,
    users: scoped("users").length,
    properties: scoped("properties").length,
    leads: leads.length,
    activities: scoped("activities").length,
    won: won.length,
    conversion: leads.length ? won.length / leads.length : null,
    expected: finance
      .filter((row) => row.fields.status === "Previsto")
      .reduce((sum, row) => sum + Number(row.fields.amount), 0),
    received: finance
      .filter((row) => row.fields.status === "Realizado")
      .reduce((sum, row) => sum + Number(row.fields.amount), 0),
    discarded: leads.filter((row) => row.fields.stage === "Descartado").length,
  };
}
export function insights(state: State, tenant: string): string[] {
  const leads = rowsFor(state, "leads", tenant),
    properties = rowsFor(state, "properties", tenant),
    activities = rowsFor(state, "activities", tenant);
  if (!leads.length && !properties.length)
    return ["Ainda não há dados para gerar insights. Cadastre imóveis e leads para começar."];
  const noActivity = leads.filter(
    (lead) =>
      !activities.some((activity) => activity.fields.lead === lead.id) &&
      !["Descartado", "Negócio perdido", "Negócio fechado"].includes(lead.fields.stage),
  );
  const noOwner = leads.filter((lead) => !lead.fields.user);
  const result = [];
  if (noActivity.length)
    result.push(
      `${noActivity.length} lead(s) sem atividade registrada: priorize o primeiro atendimento.`,
    );
  if (noOwner.length) result.push(`${noOwner.length} lead(s) sem responsável definido.`);
  if (properties.some((p) => !p.fields.lp))
    result.push(
      `${properties.filter((p) => !p.fields.lp).length} imóvel(is) ainda sem prévia de landing page.`,
    );
  if (!result.length)
    result.push("Nenhuma pendência identificada pelas regras locais de atendimento e LP.");
  return result;
}
export function feedText(rows: Row[], format: string): string {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  if (format === "XML")
    return (
      "<imoveis>" +
      rows
        .map(
          (row) =>
            `<imovel><titulo>${escape(row.fields.name)}</titulo><valor>${escape(row.fields.price)}</valor></imovel>`,
        )
        .join("") +
      "</imoveis>"
    );
  return [
    "titulo\tvalor",
    ...rows.map((row) => `${row.fields.name.replace(/[\t\n\r]/g, " ")}\t${row.fields.price}`),
  ].join("\n");
}
