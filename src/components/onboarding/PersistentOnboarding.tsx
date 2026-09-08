import { formatPlanPrice, maskPlanPrice, parsePlanPrice, newPlanCode } from "@/lib/onboarding/plan-presentation";
import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadSuperOnboarding,
  saveSuperCompany,
  saveSuperPlan,
  lookupSuperPostalCode,
} from "@/lib/api/super-onboarding.functions";
import {
  companySchema,
  savePlanSchema,
  type Company,
  type CompanyRow,
  type PlanRow,
} from "@/lib/onboarding/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInput, planFeatures, type Mask } from "@/components/demo/interactive/formats";

const queryKey = ["super-onboarding"];
const fieldClass = "grid gap-1 text-sm";
function Field({
  name,
  label,
  value,
  type = "text",
  required = true,
  mask,
  disabled = false,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  mask?: Mask;
  disabled?: boolean;
}) {
  return (
    <label className={fieldClass}>
      {label}
      <Input
        name={name}
        type={type}
        required={required}
        disabled={disabled}
        defaultValue={mask ? formatInput(String(value ?? ""), mask) : (value ?? "")}
        onInput={
          mask
            ? (e) => {
                e.currentTarget.value = formatInput(e.currentTarget.value, mask);
              }
            : undefined
        }
      />
    </label>
  );
}
function Address({ prefix, value }: { prefix: string; value?: Company["address"] | null }) {
  const version = useRef(0),
    container = useRef<HTMLDivElement>(null);
  const [postalStatus, setPostalStatus] = useState("");
  async function lookup() {
    const element = container.current;
    const zip = element?.querySelector<HTMLInputElement>(`[name="${prefix}.zip"]`);
    const cep = zip?.value.replace(/\D/g, "") ?? "";
    if (cep.length !== 8) return;
    const current = ++version.current;
    setPostalStatus("Consultando CEP…");
    try {
      const result = await lookupSuperPostalCode({ data: { cep } });
      if (current !== version.current || !element?.isConnected) return;
      for (const [key, value] of Object.entries(result)) {
        const input = element.querySelector<HTMLInputElement>(`[name="${prefix}.${key}"]`);
        if (input) input.value = value;
      }
      setPostalStatus("Endereço consultado. Confira e complete o número.");
    } catch {
      if (current === version.current)
        setPostalStatus("Consulta indisponível. Preencha o endereço manualmente.");
    }
  }
  return (
    <div
      ref={container}
      className="grid gap-3 sm:grid-cols-2"
      onInput={() => {
        version.current++;
        setPostalStatus("");
      }}
      onBlur={(e) => {
        if (e.target instanceof HTMLInputElement && e.target.name === `${prefix}.zip`)
          void lookup();
      }}
    >
      <div>
        <Field name={`${prefix}.zip`} label="CEP" value={value?.zip} mask="cep" />
        <p className="text-xs text-muted-foreground">
          Digite o CEP e use Tab. Apenas o CEP será enviado ao ViaCEP.
        </p>
        <span role="status" className="text-sm">
          {postalStatus}
        </span>
      </div>
      <Field name={`${prefix}.street`} label="Logradouro" value={value?.street} />
      <Field name={`${prefix}.number`} label="Número" value={value?.number} />
      <Field
        name={`${prefix}.complement`}
        label="Complemento"
        value={value?.complement}
        required={false}
      />
      <Field name={`${prefix}.district`} label="Bairro" value={value?.district} />
      <Field name={`${prefix}.city`} label="Cidade" value={value?.city} />
      <Field name={`${prefix}.region`} label="UF" value={value?.region} />
    </div>
  );
}
function getAddress(form: FormData, prefix: string) {
  return Object.fromEntries(
    ["zip", "street", "number", "complement", "district", "city", "region"].map((key) => [
      key,
      String(form.get(`${prefix}.${key}`) ?? ""),
    ]),
  );
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function PersistentOnboarding({ onEnterTenant }: { onEnterTenant?: (id: string) => void }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: () => loadSuperOnboarding(),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const [view, setView] = useState<"dashboard" | "plans" | "tenants">("dashboard");
  const [filter, setFilter] = useState("");
  const [plan, setPlan] = useState<PlanRow | "new" | null>(null);
  const [tenant, setTenant] = useState<CompanyRow | null>(null);
  const [message, setMessage] = useState("");
  function done() {
    setPlan(null);
    setTenant(null);
    setView("dashboard");
    setMessage("Cadastro salvo no banco. Ele estará disponível após novo login.");
    void client.invalidateQueries({ queryKey });
    void client.invalidateQueries({ queryKey: ["super-tenants"] });
    void client.invalidateQueries({ queryKey: ["super-control-plane"] });
  }
  return (
    <section className="space-y-5" aria-label="Cadastros persistentes">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">
            {view === "dashboard"
              ? "Gestão da plataforma"
              : view === "plans"
                ? "Planos"
                : "Empresas clientes"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastros gravados no banco. Selecione o tenant existente para completar seus dados.
          </p>
        </div>
        <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
          Recarregar cadastros
        </Button>
      </div>
      <nav aria-label="Gestão do SaaS" className="flex flex-wrap gap-2">
        {(
          [
            ["dashboard", "Dashboard"],
            ["plans", "Planos"],
            ["tenants", "Tenants"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={view === id ? "default" : "outline"}
            aria-current={view === id ? "page" : undefined}
            disabled={!!plan || !!tenant}
            onClick={() => setView(id)}
          >
            {label}
          </Button>
        ))}
      </nav>
      {view === "dashboard" && (
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              ["tenants", "Tenants", query.data?.tenants.length],
              ["plans", "Planos", query.data?.plans.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              type="button"
              key={id}
              onClick={() => setView(id)}
              className="rounded-xl border border-t-4 border-t-teal-600 bg-card p-6 text-left shadow-sm hover:shadow-md"
            >
              <span className="block text-sm text-muted-foreground">{label}</span>
              <strong className="my-3 block font-display text-4xl">
                {query.isError ? "Indisponível" : (count ?? "…")}
              </strong>
              <span className="text-sm">Explorar {label} →</span>
            </button>
          ))}
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {query.isPending && <p role="status">Carregando cadastros…</p>}
      {query.isError && (
        <p role="alert" className="text-destructive">
          Não foi possível carregar os cadastros. Tente recarregar; isso não significa que foram
          excluídos.
        </p>
      )}
      {query.data && (
        <>
          {view === "plans" && (
            <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Planos</h3>
                <Button
                  disabled={!!plan || !!tenant}
                  onClick={() => {
                    setMessage("");
                    setPlan("new");
                  }}
                >
                  Criar plano
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Plano</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-right p-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.plans.map((p) => (
                      <tr className="border-t" key={p.id}>
                        <td className="p-2">
                          {p.name}
                        </td>
                        <td className="p-2">
                          {(
                            { active: "Ativo", draft: "Rascunho", archived: "Arquivado" } as Record<
                              string,
                              string
                            >
                          )[p.status] ?? p.status}
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            variant="outline"
                            disabled={!!plan || !!tenant}
                            onClick={() => setPlan(p)}
                          >
                            Editar plano
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!query.isError && !query.data.plans.length && (
                      <tr>
                        <td colSpan={3} className="p-3">
                          Nenhum plano cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {plan && (
                <PlanForm
                  key={plan === "new" ? "new" : plan.id}
                  plan={plan}
                  onDone={done}
                  onCancel={() => setPlan(null)}
                />
              )}
            </div>
          )}
          {view === "tenants" && (
            <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="font-semibold">Cadastro completo dos tenants</h3>
              <label className="grid gap-1 text-sm">
                Buscar empresa ou domínio
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Digite o nome ou domínio"
                />
              </label>
              <p className="text-sm text-muted-foreground">
                Registros existentes no banco, incluindo ambientes de homologação. Use a busca para
                localizar sua empresa.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Empresa</th>
                      <th className="text-left p-2">Domínio cadastrado</th>
                      <th className="text-right p-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.tenants
                      .filter((t) =>
                        `${t.nome} ${t.dominio_principal ?? ""}`
                          .toLocaleLowerCase("pt-BR")
                          .includes(filter.trim().toLocaleLowerCase("pt-BR")),
                      )
                      .map((t) => (
                        <tr className="border-t" key={t.id}>
                          <td className="p-2">{t.nome}</td>
                          <td className="p-2">{t.dominio_principal ?? "Ainda não informado"}</td>
                          <td className="p-2 text-right">
                            <Button
                              variant="outline"
                              disabled={!!plan || !!tenant}
                              onClick={() => {
                                setMessage("");
                                setTenant(t);
                              }}
                            >
                              Editar tenant
                            </Button>
                            {onEnterTenant && <Button className="ml-2" variant="outline" disabled={!!plan || !!tenant} onClick={() => onEnterTenant(t.id)}>Acessar empresa</Button>}
                          </td>
                        </tr>
                      ))}
                    {!query.isError && !query.data.tenants.length && (
                      <tr>
                        <td colSpan={3} className="p-3">
                          Nenhum tenant cadastrado. Utilize o cadastro de novo tenant abaixo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filter &&
                !query.data.tenants.some((t) =>
                  `${t.nome} ${t.dominio_principal ?? ""}`
                    .toLocaleLowerCase("pt-BR")
                    .includes(filter.trim().toLocaleLowerCase("pt-BR")),
                ) && <p>Nenhuma empresa encontrada para esta busca.</p>}
              {tenant && (
                <CompanyForm
                  key={tenant.id}
                  tenant={tenant}
                  plans={query.data.plans}
                  onDone={done}
                  onCancel={() => setTenant(null)}
                />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
function useSave() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(action: () => Promise<unknown>, done: () => void) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      done();
    } catch (e) {
      setError(
        e instanceof Error && !e.message.startsWith("[")
          ? e.message
          : "Confira os campos obrigatórios e seus formatos. Nenhuma alteração foi confirmada.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run };
}
function PlanForm({
  plan,
  onDone,
  onCancel,
}: {
  plan: PlanRow | "new";
  onDone: () => void;
  onCancel: () => void;
}) {
  const existing = plan === "new" ? null : plan;
  const [id] = useState(() => existing?.id ?? crypto.randomUUID());
  const values = object(existing?.metadata?.onboarding);
  const save = useSave();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await save.run(async () => {
      const data = savePlanSchema.parse({
        id,
        expectedUpdatedAt: existing?.updated_at ?? null,
        code: existing?.code ?? newPlanCode(id),
        name: f.get("name"),
        description: f.get("description"),
        status: f.get("status"),
        monthlyPriceCents: parsePlanPrice(String(f.get("price") ?? "")),
        propertyLimit: Number(f.get("limit")),
        features: f.getAll("features"),
        portal: String(values.portal ?? ""),
        productId: String(values.productId ?? ""),
      });
      await saveSuperPlan({ data });
    }, onDone);
  }
  return (
    <form onSubmit={submit} aria-label="Salvar plano" className="rounded-lg border p-4 space-y-4">
      <h3 className="font-semibold">{existing ? "Editar plano" : "Criar plano"}</h3>
      <fieldset disabled={save.busy} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="name" label="Nome do plano" value={existing?.name} />
          <Field
            name="description"
            label="Descrição"
            value={existing?.description ?? ""}
            required={false}
          />
          <label className={fieldClass}>
            Mensalidade (R$)
            <Input name="price" inputMode="decimal" required placeholder="0,00"
              defaultValue={formatPlanPrice(Number(values.monthlyPriceCents ?? 0))}
              onInput={e => { e.currentTarget.value = maskPlanPrice(e.currentTarget.value); }} />
          </label>
          <Field
            name="limit"
            label="Limite de imóveis"
            value={Number(values.propertyLimit ?? 0)}
            type="number"
          />
          <label className={fieldClass}>
            Status
            <select
              name="status"
              defaultValue={existing?.status ?? "active"}
              className="rounded-md border bg-background p-2"
            >
              <option value="active">Ativo</option>
              <option value="draft">Rascunho</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="mb-2 font-medium">Recursos incluídos</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {planFeatures.map((feature) => (
              <label key={feature} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  name="features"
                  value={feature}
                  defaultChecked={
                    Array.isArray(values.features) && values.features.includes(feature)
                  }
                />
                {feature}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-2">
          <Button type="submit">{save.busy ? "Salvando…" : "Salvar plano no banco"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </fieldset>
      {save.error && (
        <p role="alert" className="text-destructive">
          {save.error}
        </p>
      )}
    </form>
  );
}
function CompanyForm({
  tenant,
  plans,
  onDone,
  onCancel,
}: {
  tenant: CompanyRow;
  plans: PlanRow[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const profile = object(tenant.metadata?.company_profile) as Partial<Company>;
  const [same, setSame] = useState(profile.billingSame ?? true);
  const save = useSave();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await save.run(async () => {
      const company = companySchema.parse({
        ...Object.fromEntries(
          ["legalName", "cnpj", "responsible", "cpf", "email", "whatsapp", "phone"].map((k) => [
            k,
            f.get(k),
          ]),
        ),
        address: getAddress(f, "address"),
        billingSame: same,
        billingAddress: same ? null : getAddress(f, "billing"),
      });
      await saveSuperCompany({
        data: {
          tenantId: tenant.id,
          expectedUpdatedAt: tenant.updated_at,
          planId: String(f.get("planId")),
          company,
        },
      });
    }, onDone);
  }
  return (
    <form
      onSubmit={submit}
      aria-label="Cadastro empresarial"
      className="rounded-lg border p-4 space-y-4"
    >
      <h3 className="font-semibold">Editar {tenant.nome}</h3>
      <fieldset disabled={save.busy} className="space-y-4">
        <Address prefix="address" value={profile.address} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="legalName" label="Razão social" value={profile.legalName ?? tenant.nome} />
          <Field name="cnpj" label="CNPJ" value={profile.cnpj} mask="cnpj" />
          <Field name="responsible" label="Responsável" value={profile.responsible} />
          <Field name="cpf" label="CPF do responsável" value={profile.cpf} mask="cpf" />
          <Field name="whatsapp" label="WhatsApp" value={profile.whatsapp} mask="phone" />
          <Field
            name="phone"
            label="Telefone 2"
            value={profile.phone}
            mask="phone"
            required={false}
          />
          <Field name="email" label="E-mail" value={profile.email} type="email" />
          <label className={fieldClass}>
            Plano adquirido
            <select
              required
              name="planId"
              defaultValue={
                plans.find((p) => p.code === tenant.plano_codigo && p.status === "active")?.id ?? ""
              }
              className="rounded-md border bg-background p-2"
            >
              <option value="">Selecione</option>
              {plans
                .filter((p) => p.status === "active")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} />
          Endereço de cobrança igual ao da empresa
        </label>
        {!same && <Address prefix="billing" value={profile.billingAddress} />}
        <div className="flex gap-2">
          <Button type="submit">{save.busy ? "Salvando…" : "Salvar cadastro no banco"}</Button>
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </fieldset>
      {save.error && (
        <p role="alert" className="text-destructive">
          {save.error}
        </p>
      )}
    </form>
  );
}
