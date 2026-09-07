import { DomainConnectionChecklist } from "../../domains/presentation/DomainConnectionChecklist";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { formatInput, maskFor, planFeatures } from "./formats";
import { usePostalAddress } from "./usePostalAddress";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Home,
  Workflow,
  Globe,
  Sparkles,
  Menu,
  ArrowRight,
} from "lucide-react";
import {
  command,
  emptyState,
  feedText,
  insights,
  metrics,
  modules,
  permissions,
  rowsFor,
  stages,
  type Fields,
  type Row,
  type State,
} from "./model";

type Field = {
  key: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  wide?: boolean;
  help?: string;
  postal?: "zip" | "billingZip";
};
const f = (key: string, label: string, type = "text", required = true): Field => ({
  key,
  label,
  type,
  required,
});
const select = (
  key: string,
  label: string,
  options: string[] | { value: string; label: string }[],
  required = true,
): Field => ({
  key,
  label,
  type: "select",
  required,
  options: options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  ),
});
const choices = (rows: Row[]) => rows.map((row) => ({ value: row.id, label: row.fields.name }));
const money = (number: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(number);
const box = "rounded-2xl border border-[#123f47]/10 bg-white p-5 shadow-sm";
const input =
  "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#123f47] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-40";
const secondary =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-600";
function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
      {children}
    </p>
  );
}
const tenantFields = (plans: Row[]): Field[] => [
  { ...f("zip", "CEP"), postal: "zip" },
  f("address", "Logradouro"),
  f("number", "Número"),
  f("complement", "Complemento", "text", false),
  f("district", "Bairro"),
  f("city", "Cidade"),
  f("region", "UF"),
  f("name", "Razão Social"),
  f("cnpj", "CNPJ"),
  f("responsible", "Responsável"),
  f("cpf", "CPF do responsável"),
  f("sameBilling", "Endereço de cobrança igual ao da empresa", "checkbox", false),
  {
    ...f("billingZip", "Cobrança — CEP", "text", false),
    postal: "billingZip",
  },
  f("billingAddress", "Cobrança — logradouro", "text", false),
  f("billingNumber", "Cobrança — número", "text", false),
  f("billingDistrict", "Cobrança — bairro", "text", false),
  f("billingCity", "Cobrança — cidade", "text", false),
  f("billingRegion", "Cobrança — UF", "text", false),
  f("whatsapp", "WhatsApp", "tel"),
  f("phone", "Telefone 2", "tel", false),
  f("email", "E-mail", "email"),
  select("plan", "Plano adquirido", choices(plans)),
];
const domainFields: Field[] = [
  { ...f("name", "Domínio próprio"), placeholder: "rmprimeimoveis.com.br" },
  select("provider", "Gestão de DNS", ["Cloudflare", "Provedor próprio"]),
  {
    ...f("target", "Destino DNS fornecido pela plataforma", "text", false),
    help: "Preencha somente se já recebeu o destino oficial. Este campo não cria um apontamento nem comprova conexão.",
  },
];
function Form({
  title,
  fields,
  onSave,
  label = "Salvar na sessão",
  defaults = {},
  children,
  media,
}: {
  title: string;
  fields: Field[];
  onSave: (data: Fields) => boolean;
  label?: string;
  defaults?: Fields;
  children?: ReactNode;
  media?: (files: FileList) => string;
}) {
  const [values, setValues] = useState<Fields>(defaults),
    [error, setError] = useState("");
  const postal = usePostalAddress(values, setValues);
  const formId = useId();
  return (
    <form
      aria-label={title}
      className={box + " space-y-4"}
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        try {
          if (onSave(values)) {
            postal.clear();
            setValues(defaults);
            event.currentTarget.reset();
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : "Não foi possível salvar.");
        }
      }}
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {fields
          .filter((field) => !field.key.startsWith("billing") || values.sameBilling !== "true")
          .map((field) => (
            <div
              key={field.key}
              className={
                "min-w-0 space-y-1 text-sm font-medium " +
                (field.type === "textarea" ? "md:col-span-2" : "")
              }
            >
              <label htmlFor={`${formId}-${field.key}`}>
                {field.label}
                {field.required ? " *" : ""}
              </label>
              {field.type === "checks" ? (
                <fieldset
                  className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2"
                  id={`${formId}-${field.key}`}
                  aria-label={field.label}
                >
                  <legend className="sr-only">{field.label}</legend>
                  {field.options?.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 text-sm font-normal"
                    >
                      <input
                        type="checkbox"
                        checked={(values[field.key] || "").split("|").includes(option.value)}
                        onChange={(event) => {
                          const selected = (values[field.key] || "").split("|").filter(Boolean);
                          postal.change(
                            field.key,
                            (event.target.checked
                              ? [...selected, option.value]
                              : selected.filter((value) => value !== option.value)
                            ).join("|"),
                          );
                        }}
                      />
                      {option.label}
                    </label>
                  ))}
                </fieldset>
              ) : field.type === "select" ? (
                <select
                  className={input}
                  id={`${formId}-${field.key}`}
                  aria-label={field.label}
                  required={field.required}
                  value={values[field.key] || ""}
                  onChange={(event) => postal.change(field.key, event.target.value)}
                >
                  <option value="">Selecione</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  className={input + " min-h-28"}
                  id={`${formId}-${field.key}`}
                  aria-label={field.label}
                  required={field.required}
                  value={values[field.key] || ""}
                  onChange={(event) => postal.change(field.key, event.target.value)}
                />
              ) : field.type === "checkbox" ? (
                <input
                  className="ml-3 size-5 accent-teal-800"
                  id={`${formId}-${field.key}`}
                  aria-label={field.label}
                  type="checkbox"
                  checked={values[field.key] === "true"}
                  onChange={(event) =>
                    setValues({ ...values, [field.key]: String(event.target.checked) })
                  }
                />
              ) : field.type === "file" ? (
                <input
                  className={input}
                  id={`${formId}-${field.key}`}
                  aria-label={field.label}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                  multiple
                  onChange={(event) => {
                    try {
                      if (event.target.files && media)
                        setValues({ ...values, [field.key]: media(event.target.files) });
                      setError("");
                    } catch (error) {
                      setError(String(error));
                      event.target.value = "";
                    }
                  }}
                />
              ) : (
                <input
                  className={input}
                  id={`${formId}-${field.key}`}
                  aria-label={field.label}
                  type={field.type}
                  step={field.type === "number" ? "any" : undefined}
                  required={field.required}
                  placeholder={field.placeholder}
                  aria-describedby={field.help ? `${formId}-help-${field.key}` : undefined}
                  inputMode={
                    maskFor(field.key) && maskFor(field.key) !== "cnpj" ? "numeric" : undefined
                  }
                  autoCapitalize={maskFor(field.key) === "cnpj" ? "characters" : undefined}
                  value={values[field.key] || ""}
                  onBlur={() => {
                    if (field.postal) void postal.lookup(field.postal);
                  }}
                  onChange={(event) => {
                    const element = event.currentTarget,
                      raw = element.value,
                      caret = element.selectionStart;
                    const formatted = formatInput(raw, maskFor(field.key));
                    postal.change(field.key, formatted);
                    if (maskFor(field.key) && caret !== null && caret < raw.length) {
                      const count = raw
                        .slice(0, caret)
                        .replace(maskFor(field.key) === "cnpj" ? /[^a-z0-9]/gi : /\D/g, "").length;
                      let position = 0,
                        seen = 0;
                      while (position < formatted.length && seen < count) {
                        if (/[a-z0-9]/i.test(formatted[position])) seen++;
                        position++;
                      }
                      requestAnimationFrame(() => {
                        if (document.activeElement === element)
                          element.setSelectionRange(position, position);
                      });
                    }
                  }}
                />
              )}
              {field.help && (
                <p
                  id={`${formId}-help-${field.key}`}
                  className="text-xs font-normal text-slate-500"
                >
                  {field.help}
                </p>
              )}
              {field.postal && (
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    className={secondary}
                    disabled={postal.status[field.postal]?.loading}
                    onClick={() => void postal.lookup(field.postal!, true)}
                  >
                    Consultar {field.label} novamente
                  </button>
                  <p
                    role={postal.status[field.postal]?.error ? "alert" : "status"}
                    className="text-xs font-normal text-slate-600"
                  >
                    {postal.status[field.postal]?.message ||
                      "Digite o CEP e use Tab para buscar rua, bairro, cidade e UF. Apenas o CEP é enviado ao ViaCEP."}
                  </p>
                </div>
              )}
            </div>
          ))}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button className={button} type="submit">
        {label}
      </button>
    </form>
  );
}
function Records({
  rows,
  children,
  empty = "Nenhum registro cadastrado.",
}: {
  rows: Row[];
  children?: (row: Row) => ReactNode;
  empty?: string;
}) {
  return rows.length ? (
    <div className="grid gap-3">
      {rows.map((row) => (
        <details className={box + " min-w-0"} key={row.id}>
          <summary className="cursor-pointer break-words font-semibold">
            {row.fields.name || row.fields.type || row.fields.result || row.id}{" "}
            <span className="ml-2 text-xs font-normal text-slate-500">Abrir detalhes</span>
          </summary>
          <div className="mt-4 space-y-4">
            {children ? (
              children(row)
            ) : (
              <dl className="grid gap-2 text-sm">
                {Object.entries(row.fields).map(([key, value]) => (
                  <div className="break-words" key={key}>
                    <dt className="font-medium">
                      {(
                        { name: "Nome", detail: "Descrição", status: "Situação" } as Record<
                          string,
                          string
                        >
                      )[key] || key}
                    </dt>
                    <dd>{value || "Não informado"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </details>
      ))}
    </div>
  ) : (
    <Empty>{empty}</Empty>
  );
}
function Media({ value }: { value?: string }) {
  let list: { url: string; name: string; type: string }[] = [];
  try {
    list = JSON.parse(value || "[]");
  } catch {}
  return (
    <div className="grid grid-cols-2 gap-3">
      {list.map((item) =>
        item.type.startsWith("image/") ? (
          <img
            key={item.url}
            src={item.url}
            alt={item.name}
            className="aspect-video w-full rounded-xl object-cover"
          />
        ) : (
          <video
            key={item.url}
            src={item.url}
            controls
            preload="metadata"
            className="w-full"
            aria-label={item.name}
          />
        ),
      )}
    </div>
  );
}

export function EmptyDemoWorkspace() {
  const [state, setState] = useState<State>(emptyState),
    [tenant, setTenant] = useState(""),
    [scope, setScope] = useState("saas"),
    [tab, setTab] = useState("Dashboard"),
    [message, setMessage] = useState(""),
    [menu, setMenu] = useState(false),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [filterTenant, setFilterTenant] = useState("");
  const [property, setProperty] = useState(""),
    [lead, setLead] = useState(""),
    [lp, setLp] = useState(""),
    [dragging, setDragging] = useState(""),
    [pendingMove, setPendingMove] = useState<{ id: string; stage: string } | null>(null);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [editingTenant, setEditingTenant] = useState("");
  const [editingDomain, setEditingDomain] = useState("");
  const [resetting, setResetting] = useState(false);
  const stateRef = useRef(state),
    urls = useRef<string[]>([]);
  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  function media(files: FileList) {
    if (files.length > 12) throw Error("Escolha até 12 arquivos por seleção.");
    const list = Array.from(files);
    if (
      list.some(
        (file) =>
          !["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"].includes(
            file.type,
          ) || file.size > 25 * 1024 * 1024,
      )
    )
      throw Error("Use imagens PNG/JPEG/WebP ou vídeo MP4/WebM de até 25 MB por arquivo.");
    return JSON.stringify(
      list.map((file) => {
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        return { url, name: file.name, type: file.type };
      }),
    );
  }
  function save(kind: string, data: Fields, subject = "", target = tenant) {
    try {
      const next = command(stateRef.current, kind, target, data, subject);
      stateRef.current = next;
      setState(next);
      setMessage("Alteração registrada somente nesta sessão.");
      if (kind === "tenants" || kind === "webhook") {
        setTenant(next.rows.tenants.at(-1)!.id);
        go("Dashboard");
        setMessage("Tenant cadastrado nesta sessão.");
      }
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir.");
      return false;
    }
  }
  function go(next: string) {
    setCreatingTenant(false);
    setEditingTenant("");
    setEditingDomain("");
    setTab(next);
    setMenu(false);
    setMessage("");
    setProperty("");
    setLead("");
    setLp("");
    setPendingMove(null);
  }
  const own = (key: string) => rowsFor(state, key, tenant);
  const tenantToEdit = state.rows.tenants.find((row) => row.id === editingTenant);
  const currentTenant = state.rows.tenants.find((row) => row.id === tenant);
  const currentPlan = state.rows.plans.find((row) => row.id === currentTenant?.fields.plan);
  const currentDomain = own("domains")[0],
    website = own("websites")[0];
  const props = own("properties"),
    leads = own("leads");
  const selectedProperty = props.find((row) => row.id === property),
    selectedLead = leads.find((row) => row.id === lead),
    previewProperty = props.find((row) => row.id === lp);
  const filtered = metrics(state, scope === "saas" ? filterTenant : tenant, from, to);
  const navigation =
    scope === "saas"
      ? [
          "Dashboard",
          "Tenants",
          "Planos",
          "Financeiro",
          "Consumo",
          "Observabilidade",
          "DLQ",
          "Suporte",
        ]
      : modules;
  const sectionTitle: Record<string, string> = {
    Implantação: "Prepare a operação do tenant",
    Tenants: "Empresas clientes",
    CRM: "Relacionamentos em movimento",
    Imóveis: "Portfólio de imóveis",
    Dashboard: scope === "saas" ? "A visão completa do seu SaaS" : "O pulso da sua operação",
    IA: "Inteligência a partir da sua operação",
  };
  function move(id: string, stage: string) {
    if (["Descartado", "Negócio perdido"].includes(stage)) {
      setPendingMove({ id, stage });
      return;
    }
    save("stage", { stage }, id);
  }
  const steps = [
    ["Domínio próprio", "Implantação", own("domains").length],
    ["Equipe e permissões", "Usuários", own("users").length],
    ["Redes sociais e anúncios", "Integrações", own("integrations").length],
    ["Website e identidade", "Website", own("websites").length],
    ["Personalização do CMS", "CMS", website?.fields.headline ? 1 : 0],
    ["Portais imobiliários", "Portais", own("feeds").length],
    ["Primeiro imóvel", "Imóveis", props.length],
    ["Primeiro lead", "Leads", leads.length],
  ] as const;
  const timeline = (subject: string) => (
    <ol className="space-y-3 border-l-2 border-teal-200 pl-4">
      {state.events
        .filter((event) => event.tenant === tenant && event.subject === subject)
        .map((event) => (
          <li key={event.id}>
            <p className="font-medium">{event.title}</p>
            <time className="text-xs text-slate-500">
              {new Date(event.at).toLocaleString("pt-BR")}
            </time>
            <p>{event.detail}</p>
          </li>
        ))}
    </ol>
  );
  return (
    <div
      className="min-h-screen bg-[#f6f4ef] text-[#123f47] font-sans"
      data-demo-mode="empty-session-only"
    >
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">
        Ambiente de demonstração • Começa vazio • Use somente dados fictícios • Alterações se perdem
        ao recarregar • Sem operações comerciais reais; consultas públicas de CEP e DNS
      </div>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#123f47]/10 bg-[#fbfaf7]/90 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#123f47] p-2.5 text-white">
            <Building2 />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight">
              Real One <span className="text-xs font-normal text-slate-500">RM Prime SaaS</span>
            </p>
            <p className="text-xs text-slate-500">Seu negócio, do primeiro cadastro à gestão</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/auth" className={button}>
            Entrar no painel autenticado
          </a>
          <label className="text-xs">
            Visão
            <select
              aria-label="Visão"
              className={input}
              value={scope}
              onChange={(event) => {
                setScope(event.target.value);
                go("Dashboard");
              }}
            >
              <option value="saas">Super Admin — gestão do SaaS</option>
              <option value="tenant">Administração do tenant</option>
            </select>
          </label>
          <label className="text-xs">
            Tenant selecionado
            <select
              aria-label="Tenant selecionado"
              className={input}
              value={tenant}
              onChange={(event) => {
                setTenant(event.target.value);
                go("Dashboard");
              }}
            >
              <option value="">Selecione um tenant</option>
              {state.rows.tenants.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.fields.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className={secondary + " lg:hidden"}
            aria-expanded={menu}
            aria-label="Abrir menu"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1800px] lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside
          className={
            (menu ? "block" : "hidden") +
            " border-r border-[#123f47]/10 bg-[#113b42] p-4 text-white lg:block"
          }
        >
          <div className="mb-5 rounded-xl bg-white/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              {scope === "saas" ? "Gestão da plataforma" : "Operação imobiliária"}
            </p>
            <p className="mt-1 break-words text-sm">
              {scope === "saas"
                ? "Super Admin demonstrativo"
                : currentTenant?.fields.name || "Cadastre seu tenant"}
            </p>
          </div>
          <nav aria-label="Módulos da demonstração" className="grid gap-1">
            {navigation.map((item) => (
              <button
                key={item}
                onClick={() => go(item)}
                aria-current={tab === item ? "page" : undefined}
                className={
                  "min-h-11 rounded-xl px-3 py-2 text-left text-sm " +
                  (tab === item
                    ? "bg-white/15 font-semibold text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white")
                }
              >
                {item}
              </button>
            ))}
          </nav>
          <button className={secondary + " mt-8 w-full"} onClick={() => setResetting(true)}>
            Reiniciar demonstração
          </button>
        </aside>
        <main className="mx-auto w-full max-w-[1560px] min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-teal-700">
                {tab}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {sectionTitle[tab] || tab}
              </h1>
            </div>
            <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs text-teal-900">
              {scope === "saas"
                ? `${state.rows.tenants.length} tenant(s) na sessão`
                : currentDomain?.fields.name || "Domínio ainda não configurado"}
            </span>
          </div>
          {message && (
            <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm">
              {message}
            </p>
          )}
          {resetting && (
            <section role="group" aria-label="Confirmar reinício" className={box}>
              <h2 className="font-semibold">Apagar todos os registros desta sessão?</h2>
              <p className="my-3 text-sm">Esta ação não afeta nenhum backend.</p>
              <button
                className={button}
                onClick={() => {
                  const next = emptyState();
                  stateRef.current = next;
                  setState(next);
                  setTenant("");
                  setScope("saas");
                  go("Dashboard");
                  setResetting(false);
                  urls.current.forEach((url) => URL.revokeObjectURL(url));
                  urls.current = [];
                }}
              >
                Confirmar reinício
              </button>{" "}
              <button className={secondary} onClick={() => setResetting(false)}>
                Cancelar
              </button>
            </section>
          )}
          {scope === "tenant" && !currentTenant ? (
            <Empty>
              Cadastre o tenant na visão Super Admin e selecione-o para começar pelo domínio
              próprio.
            </Empty>
          ) : (
            <>
              {tab === "Dashboard" && (
                <>
                  <section
                    className={box + " flex flex-wrap items-end gap-3"}
                    aria-label="Filtros do Dashboard"
                  >
                    {scope === "saas" && (
                      <label className="text-sm">
                        Empresa
                        <select
                          className={input}
                          aria-label="Filtro de tenant"
                          value={filterTenant}
                          onChange={(event) => setFilterTenant(event.target.value)}
                        >
                          <option value="">Todos os tenants</option>
                          {state.rows.tenants.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.fields.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="text-sm">
                      De
                      <input
                        className={input}
                        aria-label="Data inicial"
                        type="date"
                        value={from}
                        onChange={(event) => setFrom(event.target.value)}
                      />
                    </label>
                    <label className="text-sm">
                      Até
                      <input
                        className={input}
                        aria-label="Data final"
                        type="date"
                        value={to}
                        onChange={(event) => setTo(event.target.value)}
                      />
                    </label>
                    <button
                      className={secondary}
                      onClick={() => {
                        setFrom("");
                        setTo("");
                        setFilterTenant("");
                      }}
                    >
                      Limpar filtros
                    </button>
                  </section>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {(scope === "saas"
                      ? [
                          ["Tenants", filtered.tenants, "Tenants"],
                          ["Usuários", filtered.users, "Consumo"],
                          ["Financeiro previsto", money(filtered.expected), "Financeiro"],
                          ["Financeiro realizado", money(filtered.received), "Financeiro"],
                        ]
                      : [
                          ["Imóveis", filtered.properties, "Imóveis"],
                          ["Leads", filtered.leads, "Leads"],
                          ["Atividades", filtered.activities, "CRM"],
                          [
                            "Conversão",
                            filtered.conversion === null
                              ? "Sem base"
                              : `${(filtered.conversion * 100).toFixed(1)}%`,
                            "Análises",
                          ],
                        ]
                    ).map(([label, value, target], i) => (
                      <button
                        key={label}
                        aria-label={`Explorar ${label}`}
                        className={
                          box +
                          " border-t-4 text-left " +
                          [
                            "border-t-teal-600",
                            "border-t-violet-500",
                            "border-t-amber-500",
                            "border-t-rose-500",
                          ][i]
                        }
                        onClick={() => go(String(target))}
                      >
                        <span className="text-sm text-slate-500">{label}</span>
                        <strong className="my-3 block text-3xl">{value}</strong>
                        <span className="flex items-center gap-2 text-xs text-teal-800">
                          Explorar <ArrowRight className="size-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                  {scope === "saas" ? (
                    <section className={box}>
                      <h2 className="text-xl font-semibold">Comece pela estrutura do SaaS</h2>
                      <p className="my-3 text-sm text-slate-600">
                        Nenhuma empresa, conta, imóvel, permissão ou integração é pré-cadastrada.
                        Defina um plano e cadastre a empresa com dados fictícios.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button className={button} onClick={() => go("Planos")}>
                          Definir plano
                        </button>
                        <button
                          className={secondary}
                          onClick={() => {
                            go("Tenants");
                            setCreatingTenant(true);
                          }}
                        >
                          Cadastrar tenant
                        </button>
                      </div>
                    </section>
                  ) : (
                    <section className={box}>
                      <h2 className="font-semibold">Sua próxima etapa</h2>
                      <p className="my-3 text-sm">
                        {steps.find((step) => !step[2])?.[0] ||
                          "Implantação demonstrativa preenchida. Explore a operação."}
                      </p>
                      <button className={button} onClick={() => go("Implantação")}>
                        Continuar implantação
                      </button>
                    </section>
                  )}
                  <section className={box}>
                    <h2 className="font-semibold">Leitura dos indicadores</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Os números são calculados exclusivamente dos registros desta sessão. Zero
                      representa ausência de registros; “Sem base” indica que não há dados para
                      calcular uma taxa. Receita de anúncios, métricas externas, latência e
                      disponibilidade não são inventadas.
                    </p>
                  </section>
                </>
              )}
              {tab === "Planos" && (
                <>
                  <Form
                    key="plans"
                    title="Definir plano"
                    fields={[
                      f("name", "Nome do plano"),
                      f("price", "Mensalidade (R$)", "number"),
                      f("users", "Limite de usuários", "number"),
                      f("properties", "Limite de imóveis", "number"),
                      {
                        ...f("product", "ID do produto no portal", "text", false),
                        help: "Opcional. É o identificador do produto/plano cadastrado no portal de vendas (por exemplo, Hotmart ou Eduzz). Ele permite associar a compra recebida ao plano. Não é CNPJ, chave de API ou senha. Se ainda não vende por um portal, deixe em branco.",
                      },
                      {
                        ...select("features", "Recursos incluídos", [...planFeatures], false),
                        type: "checks",
                        help: "Marque os recursos incluídos neste plano. A quantidade de imóveis é definida no campo Limite de imóveis.",
                      },
                    ]}
                    onSave={(data) => save("plans", data)}
                  />
                  <Records rows={state.rows.plans}>
                    {(row) => (
                      <>
                        <p>
                          {money(+row.fields.price)} / mês · {row.fields.users} usuários ·{" "}
                          {row.fields.properties} imóveis
                        </p>
                        <p>
                          {row.fields.features
                            ? row.fields.features.split("|").join(" · ")
                            : "Nenhum recurso selecionado"}
                        </p>
                        <p>
                          ID para mapear compra demonstrativa:{" "}
                          {row.fields.product || "Não definido"}
                        </p>
                      </>
                    )}
                  </Records>
                </>
              )}
              {tab === "Tenants" && (
                <>
                  {!creatingTenant && !tenantToEdit && (
                    <>
                      <button className={button} onClick={() => setCreatingTenant(true)}>
                        Novo tenant
                      </button>
                      {!state.rows.tenants.length ? (
                        <Empty>Nenhum tenant cadastrado. Use Novo tenant para começar.</Empty>
                      ) : (
                        <div className={box + " overflow-x-auto"}>
                          <table
                            className="w-full text-left text-sm"
                            aria-label="Tenants cadastrados"
                          >
                            <caption className="mb-4 text-left font-semibold">
                              Tenants cadastrados
                            </caption>
                            <thead>
                              <tr className="border-b">
                                <th scope="col" className="p-3">
                                  Empresa
                                </th>
                                <th scope="col" className="p-3">
                                  CNPJ
                                </th>
                                <th scope="col" className="p-3">
                                  Plano
                                </th>
                                <th scope="col" className="p-3">
                                  Contato
                                </th>
                                <th scope="col" className="p-3 text-right">
                                  Ações
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {state.rows.tenants.map((row) => (
                                <tr key={row.id} className="border-b last:border-0">
                                  <th scope="row" className="p-3 font-medium">
                                    {row.fields.name}
                                  </th>
                                  <td className="whitespace-nowrap p-3">{row.fields.cnpj}</td>
                                  <td className="p-3">
                                    {state.rows.plans.find((plan) => plan.id === row.fields.plan)
                                      ?.fields.name || "Não informado"}
                                  </td>
                                  <td className="p-3">
                                    <p>{row.fields.email}</p>
                                    <p>{row.fields.whatsapp}</p>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        className={secondary}
                                        onClick={() => {
                                          setTenant(row.id);
                                          setScope("tenant");
                                          go("Implantação");
                                        }}
                                      >
                                        Iniciar pelo domínio próprio
                                      </button>
                                      <button
                                        className={button}
                                        aria-label={`Editar tenant ${row.fields.name}`}
                                        onClick={() => setEditingTenant(row.id)}
                                      >
                                        Editar
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                  {creatingTenant && (
                    <>
                      {!state.rows.plans.length ? (
                        <>
                          <Empty>
                            Defina um plano na opção Planos antes de cadastrar o tenant.
                          </Empty>
                          <button className={secondary} onClick={() => setCreatingTenant(false)}>
                            Voltar para tenants
                          </button>
                        </>
                      ) : (
                        <Form
                          key="tenants"
                          title="Cadastrar tenant"
                          defaults={{ sameBilling: "true" }}
                          fields={tenantFields(state.rows.plans)}
                          onSave={(data) => save("tenants", data)}
                        >
                          <p className="text-xs text-slate-500">
                            Use dados fictícios. O cadastro será mantido somente nesta sessão.
                          </p>
                          <button
                            type="button"
                            className={secondary}
                            onClick={() => setCreatingTenant(false)}
                          >
                            Cancelar cadastro do tenant
                          </button>
                        </Form>
                      )}
                      <details className={box}>
                        <summary className="cursor-pointer font-semibold">
                          Entrada por compra em portal — evento demonstrativo
                        </summary>
                        <p className="my-3 text-sm">
                          Hotmart, Eduzz e outros portais serão integrados pelo backend. Aqui, a
                          equipe fornece um evento de teste normalizado; o plano é localizado pelo
                          ID do produto, sem escolher plano no evento.
                        </p>
                        <Form
                          title="Receber compra demonstrativa"
                          fields={[f("payload", "Evento JSON demonstrativo", "textarea")]}
                          onSave={(data) => {
                            try {
                              const payload = JSON.parse(data.payload);
                              if (
                                !payload ||
                                typeof payload !== "object" ||
                                Array.isArray(payload) ||
                                !payload.tenant ||
                                typeof payload.tenant !== "object"
                              )
                                throw Error(
                                  "Informe eventId, product e tenant com os mesmos campos do cadastro.",
                                );
                              const plan = state.rows.plans.find(
                                (plan) =>
                                  plan.fields.product && plan.fields.product === payload.product,
                              );
                              if (!plan) throw Error("Produto sem plano correspondente.");
                              const fields = Object.fromEntries(
                                Object.entries(payload.tenant).filter(
                                  ([, v]) => typeof v === "string",
                                ),
                              ) as Fields;
                              return save("webhook", {
                                ...fields,
                                eventId: String(payload.eventId || ""),
                                product: String(payload.product || ""),
                                plan: plan.id,
                              });
                            } catch (error) {
                              setMessage(String(error));
                              return false;
                            }
                          }}
                        />
                      </details>
                    </>
                  )}
                  {tenantToEdit && (
                    <Form
                      key={tenantToEdit.id + "edit"}
                      title="Editar tenant"
                      label="Salvar alterações do tenant"
                      defaults={{ ...tenantToEdit.fields }}
                      fields={tenantFields(state.rows.plans)}
                      onSave={(data) => {
                        const saved = save("tenantEdit", data, tenantToEdit.id, tenantToEdit.id);
                        if (saved) setEditingTenant("");
                        return saved;
                      }}
                    >
                      <button
                        type="button"
                        className={secondary}
                        onClick={() => setEditingTenant("")}
                      >
                        Cancelar edição do tenant
                      </button>
                    </Form>
                  )}
                </>
              )}
              {tab === "Implantação" && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {steps.map(([label, target, count], index) => (
                      <button
                        className={box + " text-left"}
                        key={label}
                        onClick={() => {
                          if (target !== "Implantação") go(target);
                          else
                            document
                              .getElementById("domain-form")
                              ?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <span className="text-xs text-teal-700">Etapa {index + 1}</span>
                        <strong className="my-2 block">{label}</strong>
                        <span className="text-xs">
                          {label === "Domínio próprio"
                            ? currentDomain
                              ? "Pendente de verificação real"
                              : "A configurar"
                            : count
                              ? "Preenchido na sessão"
                              : "A configurar"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <section id="domain-form" className="space-y-4">
                    <h2 className="text-xl font-semibold">Conectar domínio próprio</h2>
                    {currentDomain ? (
                      <div className={box}>
                        <p className="font-semibold">{currentDomain.fields.name}</p>
                        <p className="my-2">
                          {currentDomain.fields.provider} · {currentDomain.fields.status}
                        </p>
                        <p className="my-2 break-all">
                          Destino informado:{" "}
                          {currentDomain.fields.target || "Não fornecido pela plataforma"}
                        </p>
                        <button
                          className={secondary}
                          onClick={() => setEditingDomain(currentDomain.id)}
                        >
                          Editar domínio
                        </button>
                        {editingDomain === currentDomain.id && (
                          <Form
                            key={currentDomain.id + "edit"}
                            title="Editar domínio"
                            label="Salvar alterações do domínio"
                            defaults={{ ...currentDomain.fields }}
                            fields={domainFields}
                            onSave={(data) => {
                              const saved = save("domainEdit", data, currentDomain.id);
                              if (saved) setEditingDomain("");
                              return saved;
                            }}
                          >
                            <p className="text-sm">
                              Corrigir o domínio ou o apontamento exige nova verificação. Salvar não
                              altera DNS.
                            </p>
                            <button
                              type="button"
                              className={secondary}
                              onClick={() => setEditingDomain("")}
                            >
                              Cancelar edição do domínio
                            </button>
                          </Form>
                        )}
                        <DomainConnectionChecklist
                          key={
                            currentDomain.id +
                            currentDomain.fields.name +
                            currentDomain.fields.provider +
                            currentDomain.fields.target
                          }
                          hostname={currentDomain.fields.name}
                        />
                        <p className="mt-3 font-medium">
                          Conexão pendente. Nenhum resultado manual conclui esta etapa.
                        </p>
                      </div>
                    ) : (
                      <Form
                        title="Configurar domínio"
                        fields={domainFields}
                        onSave={(data) => save("domains", data)}
                      />
                    )}
                  </section>
                  <section className={box}>
                    <h2 className="font-semibold">Instruções de conexão</h2>
                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                      <li>
                        Defina o domínio do tenant e quem gerencia a zona DNS: Cloudflare ou seu
                        provedor.
                      </li>
                      <li>
                        Na integração real, a plataforma deve fornecer os registros exatos de
                        verificação e apontamento. Não há destino DNS emitido nesta demonstração.
                      </li>
                      <li>
                        Com os registros fornecidos, o responsável configura a zona no provedor e
                        preserva os registros de e-mail existentes.
                      </li>
                      <li>
                        A confirmação real deve verificar propriedade, DNS e certificado HTTPS. O
                        checklist desta sessão não realiza essas verificações.
                      </li>
                    </ol>
                    <p className="mt-3 text-sm font-medium text-amber-800">
                      Não altere DNS durante este roteiro demonstrativo.
                    </p>
                  </section>
                </>
              )}
              {tab === "Usuários" && (
                <>
                  <Form
                    key={tenant + "users"}
                    title="Cadastrar usuário demonstrativo"
                    fields={[
                      f("name", "Nome do usuário"),
                      f("email", "E-mail do usuário", "email"),
                      select("role", "Função", [
                        "Admin do tenant",
                        "Gerente",
                        "Corretor",
                        "Secretária",
                        "Captador",
                        "Outro",
                      ]),
                      f("customRole", "Nome da outra função", "text", false),
                    ]}
                    onSave={(data) => save("users", { ...data, permissions: "" })}
                  />
                  <Records rows={own("users")}>
                    {(row) => (
                      <>
                        <p>
                          {row.fields.email} ·{" "}
                          {row.fields.role === "Outro" ? row.fields.customRole : row.fields.role}
                        </p>
                        <p className="text-sm text-slate-500">
                          Nenhum acesso real é concedido. Configure explicitamente as opções
                          demonstrativas.
                        </p>
                        <PermissionEditor
                          row={row}
                          onSave={(value) => save("permissions", { permissions: value }, row.id)}
                        />
                      </>
                    )}
                  </Records>
                </>
              )}
              {tab === "Integrações" && (
                <>
                  <Form
                    key={tenant + "integrations"}
                    title="Configurar integração demonstrativa"
                    fields={[
                      f("name", "Nome da conexão"),
                      select("provider", "Provedor", [
                        "Facebook — perfil",
                        "Instagram — perfil",
                        "Meta Ads",
                        "Google — perfil",
                        "Google Ads",
                        "Meta Pixel",
                        "API de Conversões Meta",
                        "Google Tag Manager",
                      ]),
                      f("account", "ID público da conta, perfil, pixel ou container"),
                      f("detail", "Observações da configuração", "textarea", false),
                    ]}
                    onSave={(data) => save("integrations", data)}
                  >
                    <p className="text-sm text-slate-500">
                      Não informe senhas, tokens ou chaves. OAuth, Pixel, CAPI e GTM não são
                      executados nesta demonstração.
                    </p>
                  </Form>
                  <Records rows={own("integrations")}>
                    {(row) => (
                      <>
                        <p>
                          {row.fields.provider} · {row.fields.account}
                        </p>
                        <p>{row.fields.status}</p>
                        <button
                          className={secondary}
                          onClick={() => save("integrationTest", {}, row.id)}
                        >
                          Revisar configuração local
                        </button>
                      </>
                    )}
                  </Records>
                </>
              )}
              {tab === "Website" && (
                <>
                  {!website ? (
                    <Form
                      key={tenant + "website"}
                      title="Criar website"
                      fields={[
                        f("name", "Nome do website"),
                        select("theme", "Tema", ["Editorial", "Contemporâneo", "Minimalista"]),
                        f("color", "Cor principal", "color"),
                        select("font", "Tipografia", ["Sem serifa", "Serifada"]),
                        f("logo", "Logomarca local", "file", false),
                      ]}
                      defaults={{ color: "#123f47" }}
                      media={media}
                      onSave={(data) => save("websites", data)}
                    />
                  ) : (
                    <div className={box}>
                      <p className="text-lg font-semibold">{website.fields.name}</p>
                      <p className="my-3">
                        Tema {website.fields.theme} · CMS habilitado na sessão.
                      </p>
                      <button className={button} onClick={() => go("CMS")}>
                        Personalizar no CMS
                      </button>
                    </div>
                  )}
                  <Empty>
                    A escolha do tema e das opções visuais é local. Nenhum site externo é publicado.
                  </Empty>
                </>
              )}
              {tab === "CMS" && (
                <>
                  {!website ? (
                    <Empty>Crie o website para habilitar o CMS.</Empty>
                  ) : (
                    <>
                      <Form
                        key={website.id + "cms"}
                        title="Personalizar website"
                        defaults={website.fields}
                        fields={[
                          f("name", "Nome do website"),
                          f("headline", "Título principal"),
                          f("description", "Descrição da empresa", "textarea", false),
                          f("about", "Sobre a empresa", "textarea", false),
                          f("contact", "Texto de contato", "textarea", false),
                          f("color", "Cor principal", "color"),
                          select("theme", "Tema", ["Editorial", "Contemporâneo", "Minimalista"]),
                          select("font", "Tipografia", ["Sem serifa", "Serifada"]),
                          f("logo", "Logomarca local", "file", false),
                        ]}
                        media={media}
                        onSave={(data) => save("cms", data)}
                      />
                      <SitePreview
                        website={website}
                        domain={currentDomain?.fields.name || ""}
                        properties={props}
                        onProperty={(id) => {
                          go("Imóveis");
                          setProperty(id);
                        }}
                      />
                    </>
                  )}
                </>
              )}
              {tab === "Portais" && (
                <>
                  <Form
                    key={tenant + "feeds"}
                    title="Configurar portal imobiliário"
                    fields={[
                      f("name", "Nome do portal"),
                      select("format", "Formato do feed", ["XML", "TXT"]),
                      f("endpoint", "Endereço de entrega — somente referência", "text", false),
                      f("mapping", "Mapeamento de campos exigido pelo portal", "textarea", false),
                    ]}
                    onSave={(data) => save("feeds", data)}
                  />
                  <Records rows={own("feeds")}>
                    {(row) => (
                      <>
                        <p>
                          {row.fields.format} · {row.fields.status}
                        </p>
                        <p className="text-sm">
                          A estrutura abaixo é demonstrativa; cada portal exige seu próprio contrato
                          e homologação.
                        </p>
                        <button className={secondary} onClick={() => save("feedTest", {}, row.id)}>
                          Testar composição local
                        </button>
                        <pre className="max-h-60 overflow-auto rounded-xl bg-slate-100 p-4 text-xs">
                          {feedText(props, row.fields.format)}
                        </pre>
                      </>
                    )}
                  </Records>
                </>
              )}
              {tab === "Imóveis" && (
                <>
                  <PropertyForm
                    key={tenant + "propertyform"}
                    onSave={(data) => save("properties", data)}
                    media={media}
                    portals={own("feeds")}
                  />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {props.map((row) => (
                      <button
                        key={row.id}
                        className={box + " text-left"}
                        onClick={() => {
                          setProperty(row.id);
                          setLp("");
                        }}
                      >
                        <div className="mb-3 flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-slate-100">
                          <Home className="size-12 text-teal-300" />
                        </div>
                        <p className="text-xs text-teal-800">{row.fields.status}</p>
                        <h2 className="my-2 font-semibold">{row.fields.name}</h2>
                        <p>{money(+row.fields.price)}</p>
                        <p className="mt-2 text-sm text-slate-500">
                          {row.fields.district} · {row.fields.city}
                        </p>
                        <span className="mt-3 block text-xs text-teal-700">
                          Abrir ficha completa
                        </span>
                      </button>
                    ))}
                  </div>
                  {!props.length && (
                    <Empty>Nenhum imóvel cadastrado. Preencha a ficha para começar.</Empty>
                  )}
                  {selectedProperty && (
                    <section className={box + " space-y-4"} aria-label="Ficha completa do imóvel">
                      <h2 className="text-xl font-semibold">{selectedProperty.fields.name}</h2>
                      <p>{selectedProperty.fields.description}</p>
                      <p>
                        {selectedProperty.fields.address}, {selectedProperty.fields.number} ·{" "}
                        {selectedProperty.fields.district} · {selectedProperty.fields.city}/
                        {selectedProperty.fields.region}
                      </p>
                      <p>
                        {selectedProperty.fields.area} m² · {selectedProperty.fields.rooms || "0"}{" "}
                        quartos · {selectedProperty.fields.baths || "0"} banheiros ·{" "}
                        {selectedProperty.fields.parking || "0"} vagas
                      </p>
                      <p>
                        {money(+selectedProperty.fields.price)} · {selectedProperty.fields.purpose}{" "}
                        · {selectedProperty.fields.type}
                      </p>
                      <Media value={selectedProperty.fields.media} />
                      <Form
                        key={selectedProperty.id + "edit"}
                        title="Editar ficha do imóvel"
                        defaults={selectedProperty.fields}
                        media={media}
                        fields={[
                          f("name", "Editar título do imóvel"),
                          f("description", "Editar descrição", "textarea"),
                          f("price", "Editar preço (R$)", "number"),
                          f("media", "Substituir galeria e vídeo locais", "file", false),
                        ]}
                        onSave={(data) => save("propertyEdit", data, selectedProperty.id)}
                      />
                      <p className="break-words text-sm">
                        Vídeo de referência (não carregado externamente):{" "}
                        {selectedProperty.fields.video || "Não informado"}
                      </p>
                      <div className="rounded-xl border border-dashed border-teal-300 bg-teal-50 p-5">
                        <Globe className="mb-2 text-teal-700" />
                        <p>
                          Localização informada:{" "}
                          {selectedProperty.fields.latitude || "latitude não informada"},{" "}
                          {selectedProperty.fields.longitude || "longitude não informada"}
                        </p>
                        <p className="text-xs">
                          Prévia esquemática de localização; nenhum serviço de mapas foi consultado.
                        </p>
                      </div>
                      <p>
                        Portal selecionado:{" "}
                        {own("feeds").find((feed) => feed.id === selectedProperty.fields.portal)
                          ?.fields.name || "Nenhum"}
                      </p>
                      <Form
                        title="Preparar landing page do imóvel"
                        fields={[f("path", "Título no endereço da LP", "text", false)]}
                        onSave={(data) => save("lp", data, selectedProperty.id)}
                      />
                      {selectedProperty.fields.lp && (
                        <button className={secondary} onClick={() => setLp(selectedProperty.id)}>
                          Visualizar LP — {currentDomain?.fields.name}/lp/
                          {selectedProperty.fields.lp}
                        </button>
                      )}
                      <button className={button} onClick={() => go("Campanhas")}>
                        Adicionar campanha para imóvel
                      </button>
                      {timeline(selectedProperty.id)}
                    </section>
                  )}
                  {previewProperty && website && (
                    <section className={box} aria-label="Prévia da landing page">
                      <p className="mb-3 break-words text-xs">
                        Endereço planejado: {currentDomain?.fields.name}/lp/
                        {previewProperty.fields.lp} · não publicado
                      </p>
                      <SitePreview
                        website={website}
                        domain={currentDomain?.fields.name || ""}
                        properties={[previewProperty]}
                        onProperty={(id) => setProperty(id)}
                      />
                    </section>
                  )}
                </>
              )}
              {tab === "Leads" && (
                <>
                  <Form
                    key={tenant + "leads"}
                    title="Cadastrar lead"
                    fields={[
                      f("name", "Nome do lead"),
                      f("whatsapp", "WhatsApp do lead", "tel"),
                      f("email", "E-mail do lead", "email", false),
                      select("user", "Responsável pelo lead", choices(own("users")), false),
                      select("property", "Imóvel de interesse", choices(props), false),
                      f("source", "Origem do lead", "text", false),
                    ]}
                    onSave={(data) => save("leads", data)}
                  />
                  <div className="grid gap-3">
                    {leads.map((row) => (
                      <button
                        className={box + " text-left"}
                        key={row.id}
                        onClick={() => {
                          go("CRM");
                          setLead(row.id);
                        }}
                      >
                        <strong>{row.fields.name}</strong>
                        <p className="text-sm">
                          {row.fields.whatsapp} · {row.fields.stage}
                        </p>
                        <span className="text-xs text-teal-700">Abrir atendimento e histórico</span>
                      </button>
                    ))}
                  </div>
                  {!leads.length && (
                    <Empty>
                      Nenhum lead cadastrado. Nome e WhatsApp são suficientes para começar.
                    </Empty>
                  )}
                </>
              )}
              {tab === "CRM" && (
                <>
                  <p className="text-sm text-slate-600">
                    Arraste os cartões ou use o seletor de etapa. O descarte exige motivo e permite
                    reativação; negócio perdido é um encerramento de negociação.
                  </p>
                  <div className="flex gap-4 overflow-x-auto pb-4" aria-label="Kanban de leads">
                    {stages.map((stage, index) => (
                      <section
                        key={stage}
                        aria-label={"Etapa " + stage}
                        className="w-64 shrink-0 rounded-2xl bg-slate-200/60 p-3"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (dragging) move(dragging, stage);
                          setDragging("");
                        }}
                      >
                        <h2
                          className="mb-3 border-t-4 border-teal-600 pt-3 text-sm font-semibold"
                          style={{
                            borderColor: [
                              "#7c3aed",
                              "#0284c7",
                              "#d97706",
                              "#ea580c",
                              "#059669",
                              "#e11d48",
                              "#64748b",
                            ][index],
                          }}
                        >
                          {stage}{" "}
                          <span className="float-right">
                            {leads.filter((row) => row.fields.stage === stage).length}
                          </span>
                        </h2>
                        {leads
                          .filter((row) => row.fields.stage === stage)
                          .map((row) => (
                            <article
                              key={row.id}
                              className="mb-3 space-y-3 rounded-xl bg-white p-3 shadow-sm"
                              draggable
                              onDragStart={() => setDragging(row.id)}
                              onDragEnd={() => setDragging("")}
                            >
                              <button
                                className="text-left text-sm font-semibold underline-offset-4 hover:underline"
                                onClick={() => setLead(row.id)}
                              >
                                {row.fields.name}
                              </button>
                              <p className="text-xs text-slate-500">{row.fields.whatsapp}</p>
                              <label className="block text-xs">
                                Mover etapa
                                <select
                                  aria-label={"Mover " + row.fields.name}
                                  className={input + " mt-1"}
                                  value={row.fields.stage}
                                  onChange={(event) => move(row.id, event.target.value)}
                                >
                                  {stages.map((stage) => (
                                    <option key={stage}>{stage}</option>
                                  ))}
                                </select>
                              </label>
                            </article>
                          ))}
                      </section>
                    ))}
                  </div>
                  {pendingMove && (
                    <section className={box}>
                      <Form
                        key={pendingMove.id + pendingMove.stage}
                        title={"Confirmar " + pendingMove.stage}
                        fields={[f("reason", "Motivo", "textarea")]}
                        onSave={(data) => {
                          const done = save(
                            "stage",
                            { stage: pendingMove.stage, ...data },
                            pendingMove.id,
                          );
                          if (done) setPendingMove(null);
                          return done;
                        }}
                      />
                      <button className={secondary + " mt-3"} onClick={() => setPendingMove(null)}>
                        Cancelar movimentação
                      </button>
                    </section>
                  )}
                  {selectedLead && (
                    <section className={box + " space-y-4"} aria-label="Atendimento do lead">
                      <h2 className="text-xl font-semibold">{selectedLead.fields.name}</h2>
                      <p>
                        {selectedLead.fields.whatsapp} ·{" "}
                        {selectedLead.fields.email || "E-mail não informado"}
                      </p>
                      <p>
                        Etapa: {selectedLead.fields.stage} · Responsável:{" "}
                        {own("users").find((row) => row.id === selectedLead.fields.user)?.fields
                          .name || "Não definido"}
                      </p>
                      {selectedLead.fields.reason && (
                        <p>Motivo do encerramento: {selectedLead.fields.reason}</p>
                      )}
                      <Form
                        key={selectedLead.id + "context"}
                        title="Atualizar contexto do lead"
                        defaults={selectedLead.fields}
                        fields={[
                          select("user", "Atribuir responsável", choices(own("users")), false),
                          select("property", "Associar imóvel", choices(props), false),
                          f("notes", "Notas do atendimento", "textarea", false),
                        ]}
                        onSave={(data) => save("leadEdit", data, selectedLead.id)}
                      />
                      <Form
                        key={selectedLead.id + "activity"}
                        title="Registrar atividade"
                        fields={[
                          select("type", "Tipo de atividade", ["Ligação", "WhatsApp", "Email"]),
                          f("result", "Resultado da atividade", "textarea"),
                          f("date", "Data e hora da atividade", "datetime-local"),
                        ]}
                        onSave={(data) => save("activities", { ...data, lead: selectedLead.id })}
                      />
                      <h3 className="font-semibold">Atividades realizadas</h3>
                      {own("activities")
                        .filter((row) => row.fields.lead === selectedLead.id)
                        .map((row) => (
                          <div key={row.id} className="rounded-xl bg-slate-50 p-3">
                            <strong>{row.fields.type}</strong>
                            <p>{row.fields.result}</p>
                            <time className="text-xs">
                              {new Date(row.fields.date).toLocaleString("pt-BR")}
                            </time>
                          </div>
                        ))}
                      <h3 className="font-semibold">Histórico do atendimento</h3>
                      {timeline(selectedLead.id)}
                    </section>
                  )}
                  {!leads.length && (
                    <Empty>
                      Os novos leads aparecerão na primeira etapa. Cadastre um lead para
                      experimentar o fluxo.
                    </Empty>
                  )}
                </>
              )}
              {tab === "Agenda" && (
                <>
                  <Form
                    key={tenant + "tasks"}
                    title="Agendar atividade"
                    fields={[
                      f("name", "Descrição da tarefa"),
                      f("date", "Data e hora", "datetime-local"),
                      select("lead", "Lead relacionado", choices(leads), false),
                      select("user", "Responsável pela tarefa", choices(own("users")), false),
                    ]}
                    onSave={(data) => save("tasks", data)}
                  />
                  <Records rows={own("tasks")}>
                    {(row) => (
                      <>
                        <p>
                          {row.fields.date} · {row.fields.status}
                        </p>
                        {row.fields.status !== "Concluída" && (
                          <button
                            className={secondary}
                            onClick={() => save("taskDone", {}, row.id)}
                          >
                            Concluir tarefa
                          </button>
                        )}
                      </>
                    )}
                  </Records>
                </>
              )}
              {tab === "Campanhas" && (
                <>
                  <Form
                    key={tenant + "campaigns"}
                    title="Preparar campanha do imóvel"
                    fields={[
                      f("name", "Nome da campanha"),
                      select(
                        "account",
                        "Conta de anúncios",
                        choices(
                          own("integrations").filter((row) =>
                            ["Meta Ads", "Google Ads"].includes(row.fields.provider),
                          ),
                        ),
                      ),
                      select("property", "Imóvel da campanha", choices(props)),
                      f("budget", "Orçamento planejado (R$)", "number"),
                      f("detail", "Público, mensagem e objetivo", "textarea", false),
                    ]}
                    onSave={(data) => save("campaigns", data)}
                  />
                  <Records rows={own("campaigns")}>
                    {(row) => (
                      <>
                        <p>
                          Orçamento planejado: {money(+row.fields.budget)} · {row.fields.status}
                        </p>
                        <p>{row.fields.detail}</p>
                        <p>
                          Conta:{" "}
                          {
                            own("integrations").find((account) => account.id === row.fields.account)
                              ?.fields.name
                          }
                        </p>
                        <button
                          className={secondary}
                          onClick={() => {
                            go("Imóveis");
                            setProperty(row.fields.property);
                          }}
                        >
                          Ver imóvel e landing page
                        </button>
                        <p className="text-xs text-slate-500">
                          Nenhum anúncio enviado. Impressões, cliques e custo realizado: sem dados
                          de provedor.
                        </p>
                      </>
                    )}
                  </Records>
                </>
              )}
              {(tab === "Análises" || tab === "IA") && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <section className={box}>
                      <h2 className="font-semibold">Funil da sessão</h2>
                      {leads.length > 0 && (
                        <div
                          className="max-w-full overflow-x-auto"
                          aria-label="Gráfico do funil da sessão"
                        >
                          <ResponsiveContainer
                            width="100%"
                            height={280}
                            initialDimension={{ width: 640, height: 280 }}
                          >
                            <BarChart
                              data={stages.map((name) => ({
                                name,
                                total: leads.filter((row) => row.fields.stage === name).length,
                              }))}
                            >
                              <XAxis dataKey="name" hide />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="total" name="Leads">
                                {stages.map((name, index) => (
                                  <Cell
                                    key={name}
                                    fill={
                                      [
                                        "#123f47",
                                        "#7c3aed",
                                        "#f06449",
                                        "#d6a84b",
                                        "#16a56b",
                                        "#db3f8d",
                                        "#2694d1",
                                      ][index]
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {stages.map((stage, stageIndex) => {
                        const count = leads.filter((row) => row.fields.stage === stage).length;
                        return (
                          <div key={stage} className="mt-3">
                            <p className="flex justify-between text-sm">
                              <span>{stage}</span>
                              <span>{count}</span>
                            </p>
                            <div className="mt-1 h-2 rounded bg-slate-100">
                              <div
                                className="h-2 rounded bg-teal-600"
                                style={{
                                  backgroundColor: [
                                    "#123f47",
                                    "#7c3aed",
                                    "#f06449",
                                    "#d6a84b",
                                    "#16a56b",
                                    "#db3f8d",
                                    "#2694d1",
                                  ][stageIndex],
                                  width: `${leads.length ? (count / leads.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </section>
                    <section className={box}>
                      <h2 className="flex items-center gap-2 font-semibold">
                        <Sparkles className="size-5 text-violet-600" />
                        Insights explicáveis
                      </h2>
                      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm">
                        {insights(state, tenant).map((insight) => (
                          <li key={insight}>{insight}</li>
                        ))}
                      </ul>
                      <p className="mt-4 text-xs text-slate-500">
                        Regras locais transparentes. Sem geração por IA externa ou métricas
                        presumidas.
                      </p>
                    </section>
                  </div>
                  <section className={box}>
                    <h2 className="font-semibold">Indicadores dependentes de integração</h2>
                    <p className="mt-3 text-sm">
                      CAC, ROAS, custo por lead, alcance, cliques, atribuição, receita recorrente
                      recebida e previsão ponderada: sem base suficiente. Esses indicadores exigem
                      eventos e dados efetivos, não números aleatórios.
                    </p>
                  </section>
                  {(
                    [
                      ["decisions", "Decisões"],
                      ["playbooks", "Playbooks"],
                      ["experiments", "Experimentos"],
                      ["rollouts", "Rollouts"],
                    ] as const
                  ).map(([key, title]) => (
                    <details className={box} key={key}>
                      <summary className="cursor-pointer font-semibold">{title} da equipe</summary>
                      <div className="mt-4 space-y-4">
                        <Form
                          title={"Registrar " + title.toLowerCase()}
                          fields={[
                            f("name", "Título de " + title),
                            f("detail", "Critérios e plano de " + title, "textarea"),
                          ]}
                          onSave={(data) => save(key, data)}
                        />
                        <Records rows={own(key)}>
                          {(row) => (
                            <>
                              <p>{row.fields.detail}</p>
                              <p>{row.fields.status}</p>
                              <Form
                                key={row.id + "result"}
                                title={"Acompanhar " + row.fields.name}
                                defaults={row.fields}
                                fields={[
                                  select("status", "Situação de " + row.fields.name, [
                                    "Planejado",
                                    "Em andamento",
                                    "Pausado",
                                    "Concluído",
                                    "Arquivado",
                                  ]),
                                  f(
                                    "result",
                                    "Resultado informado de " + row.fields.name,
                                    "textarea",
                                    false,
                                  ),
                                  ...(key === "experiments"
                                    ? [
                                        f("a", "Base da versão A", "number", false),
                                        f("aConverted", "Conversões da versão A", "number", false),
                                        f("b", "Base da versão B", "number", false),
                                        f("bConverted", "Conversões da versão B", "number", false),
                                      ]
                                    : []),
                                ]}
                                onSave={(data) =>
                                  save("planningUpdate", { ...data, collection: key }, row.id)
                                }
                              />
                              {key === "experiments" && (
                                <p>
                                  Taxa A:{" "}
                                  {Number(row.fields.a) > 0
                                    ? (
                                        (Number(row.fields.aConverted || 0) /
                                          Number(row.fields.a)) *
                                        100
                                      ).toFixed(1) + "%"
                                    : "Sem base"}{" "}
                                  · Taxa B:{" "}
                                  {Number(row.fields.b) > 0
                                    ? (
                                        (Number(row.fields.bConverted || 0) /
                                          Number(row.fields.b)) *
                                        100
                                      ).toFixed(1) + "%"
                                    : "Sem base"}
                                  . Comparação descritiva; não comprova significância estatística.
                                </p>
                              )}
                              {row.fields.result && <p>{row.fields.result}</p>}
                              {timeline(row.id)}
                            </>
                          )}
                        </Records>
                      </div>
                    </details>
                  ))}
                </>
              )}
              {(tab === "Financeiro" ||
                tab === "Consumo" ||
                tab === "Observabilidade" ||
                tab === "DLQ" ||
                tab === "Suporte") && (
                <>
                  {tab === "Financeiro" && (
                    <>
                      <p className="text-sm">
                        Lançamentos inseridos pela equipe, sem cobrança ou conciliação real. O
                        filtro usa a data do lançamento.
                      </p>
                      <Form
                        title="Registrar lançamento demonstrativo"
                        fields={[
                          f("name", "Descrição do lançamento"),
                          f("amount", "Valor (R$)", "number"),
                          f("date", "Data do lançamento", "date"),
                          select("status", "Situação financeira", ["Previsto", "Realizado"]),
                        ]}
                        onSave={(data) => save("finance", data)}
                      />
                      <div className={box + " flex flex-wrap gap-3"}>
                        <label>
                          De
                          <input
                            aria-label="Financeiro de"
                            className={input}
                            type="date"
                            value={from}
                            onChange={(event) => setFrom(event.target.value)}
                          />
                        </label>
                        <label>
                          Até
                          <input
                            aria-label="Financeiro até"
                            className={input}
                            type="date"
                            value={to}
                            onChange={(event) => setTo(event.target.value)}
                          />
                        </label>
                      </div>
                      <Records
                        rows={state.rows.finance.filter(
                          (row) =>
                            (!tenant || row.tenant === tenant) &&
                            (!from || row.fields.date >= from) &&
                            (!to || row.fields.date <= to),
                        )}
                      >
                        {(row) => (
                          <p>
                            {money(+row.fields.amount)} · {row.fields.status} · {row.fields.date} ·{" "}
                            {
                              state.rows.tenants.find((tenant) => tenant.id === row.tenant)?.fields
                                .name
                            }
                          </p>
                        )}
                      </Records>
                    </>
                  )}
                  {tab === "Consumo" && (
                    <>
                      <p className="text-sm">
                        Uso contado a partir dos cadastros da sessão; limites definidos nos planos.
                        Não há telemetria de infraestrutura.
                      </p>
                      <Records rows={state.rows.tenants}>
                        {(row) => {
                          const m = metrics(state, row.id),
                            plan = state.rows.plans.find((plan) => plan.id === row.fields.plan);
                          return (
                            <>
                              <p>Plano: {plan?.fields.name}</p>
                              <p>
                                Usuários: {m.users} / {plan?.fields.users} · Imóveis: {m.properties}{" "}
                                / {plan?.fields.properties}
                              </p>
                              <p className="text-xs">
                                Os limites são apresentados para avaliação; não alteram permissões
                                reais.
                              </p>
                            </>
                          );
                        }}
                      </Records>
                    </>
                  )}
                  {tab === "Observabilidade" && (
                    <>
                      <p className="text-sm">
                        Eventos locais da sessão. Saúde de provedores, disponibilidade, latência e
                        erros de produção: não monitorados nesta demonstração.
                      </p>
                      {!state.events.length ? (
                        <Empty>Nenhum evento registrado.</Empty>
                      ) : (
                        <ol className="space-y-2">
                          {state.events
                            .filter((event) => !tenant || event.tenant === tenant)
                            .map((event) => (
                              <li className={box} key={event.id}>
                                <p className="font-medium">{event.title}</p>
                                <time className="text-xs">
                                  {new Date(event.at).toLocaleString("pt-BR")}
                                </time>
                                <p className="text-xs">
                                  {state.rows.tenants.find((row) => row.id === event.tenant)?.fields
                                    .name || "Plataforma"}
                                </p>
                              </li>
                            ))}
                        </ol>
                      )}
                    </>
                  )}
                  {tab === "DLQ" && (
                    <>
                      <Form
                        title="Registrar falha de teste informada pela equipe"
                        fields={[
                          f("name", "Identificador do evento de teste"),
                          f("detail", "Descrição da falha", "textarea"),
                        ]}
                        onSave={(data) => save("dlq", data)}
                      />
                      <Records
                        rows={state.rows.dlq.filter((row) => !tenant || row.tenant === tenant)}
                      >
                        {(row) => (
                          <>
                            <p>
                              {row.fields.detail} · {row.fields.status}
                            </p>
                            <button
                              className={secondary}
                              onClick={() => save("retry", {}, row.id, row.tenant)}
                            >
                              Revisar item localmente
                            </button>
                          </>
                        )}
                      </Records>
                    </>
                  )}
                  {tab === "Suporte" && (
                    <>
                      <Form
                        title="Abrir solicitação demonstrativa"
                        fields={[
                          f("name", "Assunto"),
                          f("detail", "Descrição da solicitação", "textarea"),
                        ]}
                        onSave={(data) => save("support", data)}
                      />
                      <Records
                        rows={state.rows.support.filter((row) => !tenant || row.tenant === tenant)}
                      >
                        {(row) => (
                          <p>
                            {row.fields.detail} · {row.fields.status}
                          </p>
                        )}
                      </Records>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function PermissionEditor({ row, onSave }: { row: Row; onSave: (value: string) => boolean }) {
  const [selected, setSelected] = useState<string[]>(
    row.fields.permissions?.split("|").filter(Boolean) || [],
  );
  return (
    <fieldset className="space-y-3">
      <legend className="font-semibold">Opções de permissão</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {permissions.map((permission) => (
          <label className="flex items-center gap-2 text-sm" key={permission}>
            <input
              type="checkbox"
              checked={selected.includes(permission)}
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? [...selected, permission]
                    : selected.filter((item) => item !== permission),
                )
              }
            />
            {permission}
          </label>
        ))}
      </div>
      <button className={button} onClick={() => onSave(selected.join("|"))}>
        Salvar permissões demonstrativas
      </button>
    </fieldset>
  );
}
function PropertyForm({
  onSave,
  media,
  portals,
}: {
  onSave: (data: Fields) => boolean;
  media: (files: FileList) => string;
  portals: Row[];
}) {
  return (
    <details className={box} open>
      <summary className="cursor-pointer text-lg font-semibold">
        Cadastrar imóvel — ficha completa
      </summary>
      <div className="mt-4">
        <Form
          title="Ficha do novo imóvel"
          label="Adicionar imóvel ao catálogo"
          media={media}
          fields={[
            f("name", "Título do imóvel"),
            f("reference", "Código de referência", "text", false),
            select("purpose", "Finalidade", ["Venda", "Locação", "Venda e locação"]),
            select("type", "Tipo de imóvel", [
              "Apartamento",
              "Casa",
              "Cobertura",
              "Terreno",
              "Comercial",
              "Rural",
              "Lançamento",
            ]),
            f("price", "Preço (R$)", "number"),
            f("condo", "Condomínio (R$)", "number", false),
            f("tax", "IPTU (R$)", "number", false),
            f("area", "Área (m²)", "number"),
            f("rooms", "Quartos", "number", false),
            f("suites", "Suítes", "number", false),
            f("baths", "Banheiros", "number", false),
            f("parking", "Vagas", "number", false),
            f("description", "Descrição completa", "textarea"),
            f("features", "Diferenciais e comodidades", "textarea", false),
            f("address", "Logradouro do imóvel"),
            f("number", "Número do imóvel"),
            f("complement", "Complemento do imóvel", "text", false),
            f("district", "Bairro do imóvel"),
            f("city", "Cidade do imóvel"),
            f("region", "UF do imóvel"),
            f("zip", "CEP do imóvel"),
            f("latitude", "Latitude", "number", false),
            f("longitude", "Longitude", "number", false),
            f("media", "Fotos e vídeo locais", "file", false),
            f("video", "URL de vídeo — somente referência", "text", false),
            select("portal", "Portal para distribuição", choices(portals), false),
          ]}
          onSave={onSave}
        >
          <p className="text-xs text-slate-500">
            Os arquivos ficam apenas na memória do navegador. LP e campanha podem ser preparadas
            após o cadastro, na ficha do imóvel.
          </p>
        </Form>
      </div>
    </details>
  );
}
function SitePreview({
  website,
  domain,
  properties,
  onProperty,
}: {
  website: Row;
  domain: string;
  properties: Row[];
  onProperty: (id: string) => void;
}) {
  const color = /^#[0-9a-f]{6}$/i.test(website.fields.color) ? website.fields.color : "#123f47";
  return (
    <section
      aria-label="Prévia do website"
      className="overflow-hidden rounded-2xl border border-slate-200"
      style={{ fontFamily: website.fields.font === "Serifada" ? "Georgia, serif" : "inherit" }}
    >
      <header className="p-6 text-white" style={{ backgroundColor: color }}>
        <Media value={website.fields.logo} />
        <p className="text-xs">{domain} · Prévia local</p>
        <h2 className="mt-4 text-3xl font-semibold">
          {website.fields.headline || website.fields.name}
        </h2>
        <p className="mt-3">{website.fields.description}</p>
      </header>
      <div
        className={
          "grid gap-4 bg-white p-5 " +
          (website.fields.theme === "Editorial" ? "sm:grid-cols-2" : "sm:grid-cols-3")
        }
      >
        {properties.map((row) => (
          <button
            key={row.id}
            className="rounded-xl border border-slate-200 p-4 text-left"
            onClick={() => onProperty(row.id)}
          >
            <Media value={row.fields.media} />
            <h3 className="my-2 font-semibold">{row.fields.name}</h3>
            <p>{money(+row.fields.price)}</p>
            <p className="text-sm">{row.fields.description}</p>
          </button>
        ))}
        {!properties.length && <p>Nenhum imóvel cadastrado.</p>}
      </div>
      <footer className="border-t border-slate-200 bg-white p-5 text-sm">
        <p>{website.fields.about}</p>
        <p>{website.fields.contact}</p>
      </footer>
    </section>
  );
}
