import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
const { JSDOM, VirtualConsole } = await import(
  pathToFileURL(process.env.ROUND46_JSDOM_MODULE).href
);
const compiled = await build({
  entryPoints: ["src/components/demo/interactive/model.ts"],
  bundle: true,
  write: false,
  format: "esm",
});
const { emptyState, command, rowsFor, metrics, feedText } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64")
);
let model = emptyState();
assert.ok(Object.values(model.rows).every((rows) => rows.length === 0));
assert.equal(model.events.length, 0);
assert.equal(metrics(model, "").conversion, null);
assert.throws(
  () => command(model, "leads", "missing", { name: "Teste", whatsapp: "31000000000" }),
  /tenant/,
);
model = command(model, "plans", "", {
  name: "Plano informado",
  price: "90",
  users: "4",
  properties: "20",
  product: "produto-teste",
});
const plan = model.rows.plans[0].id;
const tenantData = {
  name: "Empresa informada",
  cnpj: "00000000000100",
  responsible: "Pessoa fictícia",
  cpf: "00000000000",
  address: "Rua fictícia",
  number: "1",
  district: "Bairro fictício",
  city: "Cidade fictícia",
  region: "MG",
  zip: "00000000",
  whatsapp: "31000000000",
  email: "teste@example.invalid",
  plan,
  sameBilling: "true",
};
assert.throws(() => command(model, "tenants", "", { ...tenantData, plan: "externo" }), /plano/);
model = command(model, "tenants", "", tenantData);
const first = model.rows.tenants[0].id;
model = command(model, "tenants", "", { ...tenantData, name: "Segunda", cnpj: "00000000000200" });
const second = model.rows.tenants[1].id;
model = command(model, "leads", first, { name: "Lead informado", whatsapp: "31000000000" });
const lead = model.rows.leads[0].id;
assert.equal(model.rows.leads[0].fields.stage, "Novo lead");
assert.equal(rowsFor(model, "leads", second).length, 0);
assert.throws(
  () => command(model, "stage", second, { stage: "Em atendimento" }, lead),
  /indisponível/,
);
assert.throws(() => command(model, "stage", first, { stage: "Descartado" }, lead), /reason/);
model = command(
  model,
  "stage",
  first,
  { stage: "Descartado", reason: "Informado pela equipe" },
  lead,
);
model = command(model, "stage", first, { stage: "Novo lead" }, lead);
assert.equal(model.rows.leads[0].fields.reason, "");
assert.equal(
  command(model, "stage", first, { stage: "Novo lead" }, lead),
  model,
  "same stage is idempotent",
);
model = command(model, "activities", first, {
  lead,
  type: "WhatsApp",
  result: "Resultado informado",
  date: "2026-09-07T10:00",
});
assert.equal(metrics(model, first).activities, 1);
assert.equal(metrics(model, second).activities, 0);
assert.throws(
  () => command(model, "websites", first, { name: "Site", theme: "Editorial", color: "#123f47" }),
  /domínio/,
);
assert.throws(
  () =>
    command(model, "domains", first, { name: "https://example.invalid/a", provider: "Cloudflare" }),
  /domínio/,
);
model = command(model, "webhook", "", {
  ...tenantData,
  cnpj: "00000000000300",
  eventId: "evt-local",
  product: "produto-teste",
});
assert.throws(
  () =>
    command(model, "webhook", "", {
      ...tenantData,
      cnpj: "00000000000400",
      eventId: "evt-local",
      product: "produto-teste",
    }),
  /evento/,
);
assert.throws(
  () =>
    command(model, "webhook", "", {
      ...tenantData,
      cnpj: "00000000000500",
      eventId: "other",
      product: "wrong",
    }),
  /produto/,
);
assert.ok(
  feedText([{ fields: { name: "<script>&", price: "10" } }], "XML").includes("&lt;script&gt;&amp;"),
);
model = command(model, "finance", first, {
  name: "Entrada informada",
  amount: "25",
  date: "2026-09-07",
  status: "Realizado",
});
assert.equal(metrics(model, first, "2026-09-07", "2026-09-07").received, 25);
assert.equal(metrics(model, first, "2026-09-08").received, 0);
console.log(
  "PASS zero seed, tenant isolation, dependencies, purchase mapping/replay, discard/reactivation, activities, finance filters, feed escaping",
);
const result = await build({
  entryPoints: ["tests/round46/entry.tsx"],
  bundle: true,
  write: false,
  metafile: true,
  jsx: "automatic",
});
assert.ok(
  !Object.keys(result.metafile.inputs).some(
    (path) =>
      /src\/lib\/api|supabase|demo-data|SyntheticWorkflowDialogs|DemoWorkspace\.tsx$/.test(path) &&
      !path.includes("EmptyDemoWorkspace"),
  ),
  "bundle must have no backend or historical seeded demo",
);
assert.equal(
  execFileSync(
    "git",
    [
      "diff",
      "a2b8e5ae2185345994302e5b239bf88f17e89eb4",
      "--",
      "src/lib/api",
      "src/integrations",
      "supabase",
      "package.json",
      "bun.lock",
    ],
    { encoding: "utf8" },
  ),
  "",
);
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (error) => errors.push(error.message));
const dom = new JSDOM('<div id="root"></div>', {
  url: "https://demo.invalid/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole: vc,
});
try {
  const w = dom.window,
    d = w.document;
  w.fetch = () => {
    throw Error("NETWORK_FORBIDDEN");
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  // Recharts requires ResizeObserver; this stub enables controlled DOM, not layout evidence.
  w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.eval(result.outputFiles[0].text);
  const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
  const text = () => d.body.textContent;
  async function until(check) {
    for (let i = 0; i < 300; i++) {
      if (check()) return;
      await tick();
    }
    throw Error("Timed out: " + text().slice(-1600));
  }
  function button(name) {
    const item = [...d.querySelectorAll("button")].find(
      (button) => button.textContent.trim() === name,
    );
    assert.ok(item, "button " + name);
    return item;
  }
  async function click(name) {
    button(name).click();
    await tick();
  }
  function field(label, value) {
    const item = d.querySelector(`[aria-label="${label}"]`);
    assert.ok(item, "field " + label);
    const prototype =
      item.tagName === "SELECT"
        ? w.HTMLSelectElement.prototype
        : item.tagName === "TEXTAREA"
          ? w.HTMLTextAreaElement.prototype
          : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(item, value);
    item.dispatchEvent(
      new w.Event(item.tagName === "SELECT" ? "change" : "input", { bubbles: true }),
    );
  }
  async function fill(values) {
    for (const [label, value] of Object.entries(values)) {
      field(label, value);
      await tick();
    }
  }
  async function submit(label) {
    const form = d.querySelector(`form[aria-label="${label}"]`);
    assert.ok(form, label);
    form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    await tick();
  }
  await until(() => text().includes("Comece pela estrutura"));
  assert.equal(d.querySelector('[aria-label="Tenant selecionado"]').options.length, 1);
  assert.ok(!text().includes("Mariana Alves"));
  assert.ok(
    ![...d.querySelectorAll("nav button")].some((button) => button.textContent === "Visão geral"),
  );
  await click("Planos");
  await fill({
    "Nome do plano": "Plano criado pela equipe",
    "Mensalidade (R$)": "100",
    "Limite de usuários": "10",
    "Limite de imóveis": "50",
    "ID do produto no portal": "product-ui",
  });
  await submit("Definir plano");
  assert.ok(text().includes("Plano criado pela equipe"));
  await click("Tenants");
  await fill({
    "Razão Social": "Tenant criado pela equipe",
    CNPJ: "00000000000100",
    Responsável: "Responsável fictício",
    "CPF do responsável": "00000000000",
    Logradouro: "Rua fictícia",
    Número: "1",
    Bairro: "Bairro fictício",
    Cidade: "Cidade fictícia",
    UF: "MG",
    CEP: "00000000",
    WhatsApp: "31000000000",
    "E-mail": "tenant@example.invalid",
    "Plano adquirido": "session-1",
  });
  await submit("Cadastrar tenant");
  assert.equal(d.querySelector('[aria-label="Tenant selecionado"]').options.length, 2);
  // Round 48: consult every field; edit preserves identity and supports cancel/failure.
  assert.ok(text().includes("CPF do responsável"));
  assert.ok(text().includes("Telefone 2"));
  await click("Editar tenant");
  const editForm = d.querySelector('form[aria-label="Editar tenant"]');
  const editField = async (label, value) => {
    const element = editForm.querySelector(`[aria-label="${label}"]`);
    Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, "value").set.call(element, value);
    element.dispatchEvent(new w.Event("input", { bubbles: true }));
    await tick();
  };
  assert.equal(
    editForm.querySelector('[aria-label="Razão Social"]').value,
    "Tenant criado pela equipe",
  );
  await editField("Razão Social", "");
  await submit("Editar tenant");
  assert.ok(d.querySelector('form[aria-label="Editar tenant"]'));
  await editField("Razão Social", "Tenant corrigido");
  await editField("Telefone 2", "3133334444");
  await submit("Editar tenant");
  assert.ok(!d.querySelector('form[aria-label="Editar tenant"]'));
  assert.ok(text().includes("Tenant corrigido"));
  assert.ok(text().includes("(31) 3333-4444"));
  assert.equal(d.querySelector('[aria-label="Tenant selecionado"]').options.length, 2);
  await click("Editar tenant");
  await click("Cancelar edição do tenant");
  assert.ok(!d.querySelector('form[aria-label="Editar tenant"]'));
  await click("Iniciar pelo domínio próprio");
  await fill({ "Domínio próprio": "https://bad.invalid", "Gestão de DNS": "Cloudflare" });
  await submit("Configurar domínio");
  assert.ok(text().includes("Informe somente o domínio"));
  assert.equal(d.querySelector('[aria-label="Domínio próprio"]').value, "https://bad.invalid");
  await fill({ "Domínio próprio": "rmprimeimoveis.com.br" });
  await submit("Configurar domínio");
  assert.ok(text().includes("Pendente de verificação real"));
  assert.ok(text().includes("Checklist de conexão do domínio"));
  assert.ok(text().includes("TXT de propriedade: aguardando emissão autenticada"));
  assert.ok(text().includes("TTL anterior"));
  await click("Check Status — Não Conectado");
  await until(() => text().includes("Consulta DNS indisponível"));
  assert.ok(text().includes("propriedade e SSL permanecem pendentes"));
  await click("Editar domínio");
  await fill({ "Domínio próprio": "https://invalid.test" });
  await submit("Editar domínio");
  assert.ok(d.querySelector('form[aria-label="Editar domínio"]'));
  assert.equal(d.querySelector('[aria-label="Domínio próprio"]').value, "https://invalid.test");
  await fill({
    "Domínio próprio": "corrigido.example.invalid",
    "Destino DNS fornecido pela plataforma": "destino.example.invalid",
  });
  await submit("Editar domínio");
  assert.ok(!d.querySelector('form[aria-label="Editar domínio"]'));
  assert.ok(text().includes("corrigido.example.invalid"));
  assert.ok(text().includes("destino.example.invalid"));
  assert.ok(!text().includes("Última revisão local:"));
  assert.ok(text().includes("Pendente de verificação real"));
  await click("Editar domínio");
  await fill({ "Domínio próprio": "cancelado.example.invalid" });
  await click("Cancelar edição do domínio");
  assert.ok(!text().includes("cancelado.example.invalid"));
  await click("Usuários");
  await fill({
    "Nome do usuário": "Corretor informado",
    "E-mail do usuário": "corretor@example.invalid",
    Função: "Corretor",
  });
  await submit("Cadastrar usuário demonstrativo");
  const checks = [...d.querySelectorAll('input[type="checkbox"]')];
  assert.ok(checks.length > 0);
  assert.ok(checks.every((check) => !check.checked));
  checks[0].click();
  await click("Salvar permissões demonstrativas");
  await click("Integrações");
  await fill({
    "Nome da conexão": "Conta de campanha",
    Provedor: "Meta Ads",
    "ID público da conta, perfil, pixel ou container": "conta-informada",
  });
  await submit("Configurar integração demonstrativa");
  assert.ok(text().includes("Conta de campanha"));
  await click("Website");
  await fill({ "Nome do website": "Site informado", Tema: "Editorial", Tipografia: "Sem serifa" });
  await submit("Criar website");
  assert.ok(text().includes("CMS habilitado"));
  await click("CMS");
  await fill({ "Título principal": "Imóveis cadastrados pela equipe" });
  await submit("Personalizar website");
  assert.ok(text().includes("Imóveis cadastrados pela equipe"));
  await click("Portais");
  await fill({ "Nome do portal": "Portal informado", "Formato do feed": "XML" });
  await submit("Configurar portal imobiliário");
  await click("Testar composição local");
  assert.ok(text().includes("Cadastre um imóvel"));
  await click("Imóveis");
  await fill({
    "Título do imóvel": "Imóvel informado pela equipe",
    Finalidade: "Venda",
    "Tipo de imóvel": "Apartamento",
    "Preço (R$)": "500000",
    "Área (m²)": "100",
    Quartos: "3",
    "Descrição completa": "Descrição escrita pela equipe",
    "Logradouro do imóvel": "Rua fictícia",
    "Número do imóvel": "2",
    "Bairro do imóvel": "Bairro fictício",
    "Cidade do imóvel": "Cidade fictícia",
    "UF do imóvel": "MG",
    "CEP do imóvel": "00000000",
  });
  await submit("Ficha do novo imóvel");
  const propertyCard = [...d.querySelectorAll("button")].find((button) =>
    button.textContent.includes("Abrir ficha completa"),
  );
  assert.ok(propertyCard);
  propertyCard.click();
  await tick();
  assert.ok(d.querySelector('[aria-label="Ficha completa do imóvel"]'));
  await submit("Preparar landing page do imóvel");
  const lpButton = [...d.querySelectorAll("button")].find((button) =>
    button.textContent.startsWith("Visualizar LP"),
  );
  assert.ok(lpButton);
  lpButton.click();
  await tick();
  assert.ok(d.querySelector('[aria-label="Prévia da landing page"]'));
  await click("Leads");
  await fill({ "Nome do lead": "Lead informado pela equipe", "WhatsApp do lead": "31000000001" });
  await submit("Cadastrar lead");
  assert.ok(text().includes("Novo lead"));
  const leadButton = [...d.querySelectorAll("button")].find((button) =>
    button.textContent.includes("Abrir atendimento e histórico"),
  );
  leadButton.click();
  await tick();
  assert.ok(d.querySelector('[aria-label="Atendimento do lead"]'));
  await fill({
    "Tipo de atividade": "Ligação",
    "Resultado da atividade": "Cliente solicitou retorno",
    "Data e hora da atividade": "2026-09-07T14:30",
  });
  await submit("Registrar atividade");
  assert.ok(text().includes("Cliente solicitou retorno"));
  await fill({ "Mover Lead informado pela equipe": "Descartado" });
  await submit("Confirmar Descartado");
  assert.ok(text().includes("reason"));
  await fill({ Motivo: "Sem interesse informado" });
  await submit("Confirmar Descartado");
  assert.equal(
    d.querySelector('[aria-label="Mover Lead informado pela equipe"]').value,
    "Descartado",
  );
  await fill({ "Mover Lead informado pela equipe": "Novo lead" });
  assert.equal(
    d.querySelector('[aria-label="Mover Lead informado pela equipe"]').value,
    "Novo lead",
  );
  await click("Dashboard");
  assert.ok(text().includes("1"));
  await click("IA");
  assert.ok(text().includes("sem responsável"));
  assert.ok(!text().includes("Mariana Alves"));
  await click("Reiniciar demonstração");
  await click("Cancelar");
  assert.equal(d.querySelector('[aria-label="Tenant selecionado"]').options.length, 2);
  await click("Reiniciar demonstração");
  await click("Confirmar reinício");
  assert.equal(d.querySelector('[aria-label="Tenant selecionado"]').options.length, 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS DOM: empty start → plan → tenant → domain → user/permissions → ads config → website/CMS → feed → property/LP → minimal lead → activity/history → discard/reactivate → derived dashboard/insights → reset",
  );
  console.log(
    "Round 46 controlled checks passed. No browser layout, remote integration or persistent-runtime claim.",
  );
} finally {
  dom.window.close();
}
