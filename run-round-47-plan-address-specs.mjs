import assert from "node:assert/strict";
import { transform, build } from "esbuild";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";
const { JSDOM, VirtualConsole } = await import(
  pathToFileURL(process.env.ROUND47_JSDOM_MODULE).href
);
const module = await build({
  entryPoints: ["src/components/demo/interactive/formats.ts"],
  bundle: true,
  write: false,
  format: "esm",
});
const { formatInput, normalizeCnpj } = await import(
  "data:text/javascript;base64," + Buffer.from(module.outputFiles[0].text).toString("base64")
);
for (const [mask, raw, result] of [
  ["cnpj", "12345678000190", "12.345.678/0001-90"],
  ["cnpj", "12abc34501de35", "12.ABC.345/01DE-35"],
  ["cpf", "12345678900", "123.456.789-00"],
  ["phone", "3133334444", "(31) 3333-4444"],
  ["phone", "31999998888", "(31) 99999-8888"],
  ["phone", "+55 (31) 99999-8888", "(31) 99999-8888"],
  ["cep", "12345678", "12345-678"],
  ["cep", "12345-67", "12345-67"],
  ["cpf", "", ""],
  ["phone", "", ""],
])
  assert.equal(formatInput(raw, mask), result);
assert.equal(normalizeCnpj("12.abC.345/01de-35"), "12ABC34501DE35");
const modelBuild = await build({
  entryPoints: ["src/components/demo/interactive/model.ts"],
  bundle: true,
  write: false,
  format: "esm",
});
const modelApi = await import(
  "data:text/javascript;base64," + Buffer.from(modelBuild.outputFiles[0].text).toString("base64")
);
let state = modelApi.command(modelApi.emptyState(), "plans", "", {
  name: "Teste",
  price: "10",
  users: "2",
  properties: "5",
});
const tenantFields = Object.fromEntries(
  [
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
  ].map((key) => [key, "Teste"]),
);
Object.assign(tenantFields, {
  plan: state.rows.plans[0].id,
  sameBilling: "true",
  cnpj: "12.ABC.345/01DE-35",
});
state = modelApi.command(state, "tenants", "", tenantFields);
assert.throws(
  () => modelApi.command(state, "tenants", "", { ...tenantFields, cnpj: "12abc34501de35" }),
  /CNPJ já/,
);
state = modelApi.command(state, "tenants", "", { ...tenantFields, cnpj: "12ABD34501DE35" });
assert.equal(
  state.rows.tenants.length,
  2,
  "different alpha CNPJs must not collide through digit stripping",
);
const api = await build({
  entryPoints: ["src/components/demo/interactive/postal-lookup.ts"],
  bundle: true,
  write: false,
  format: "esm",
});
const { lookupPostalCode } = await import(
  "data:text/javascript;base64," + Buffer.from(api.outputFiles[0].text).toString("base64")
);
const originalFetch = globalThis.fetch;
let count = 0;
try {
  globalThis.fetch = async (url, options) => {
    count++;
    assert.equal(url, "https://viacep.com.br/ws/12345678/json/");
    assert.equal(options.method, "GET");
    assert.equal(options.credentials, "omit");
    assert.equal(options.referrerPolicy, "no-referrer");
    assert.equal(options.redirect, "error");
    assert.ok(!options.body);
    return {
      ok: true,
      json: async () => ({
        cep: "12345-678",
        logradouro: "Rua de teste",
        bairro: "Bairro de teste",
        localidade: "Cidade de teste",
        uf: "MG",
      }),
    };
  };
  await assert.rejects(() => lookupPostalCode("123", new AbortController().signal), /8 dígitos/);
  assert.equal(count, 0);
  assert.equal(
    (await lookupPostalCode("12345-678", new AbortController().signal)).city,
    "Cidade de teste",
  );
  assert.equal(count, 1);
  for (const response of [
    { erro: true },
    { erro: "true" },
    null,
    { cep: "87654-321", localidade: "Cidade", uf: "MG" },
  ]) {
    globalThis.fetch = async () => ({ ok: true, json: async () => response });
    await assert.rejects(
      () => lookupPostalCode("12345678", new AbortController().signal),
      /não encontrado|inválida/,
    );
  }
  globalThis.fetch = async () => {
    throw Error("PRIVATE_PROVIDER_DETAILS");
  };
  await assert.rejects(
    () => lookupPostalCode("12345678", new AbortController().signal),
    (error) => !error.message.includes("PRIVATE_") && error.message.includes("manualmente"),
  );
  // Accelerate only the helper's documented timeout; verify abort reaches the transport.
  const originalTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms, ...args) => originalTimeout(fn, ms === 8000 ? 1 : ms, ...args);
  try {
    globalThis.fetch = async (_url, options) =>
      new Promise((_, reject) =>
        options.signal.addEventListener("abort", () => reject(Error("aborted"))),
      );
    await assert.rejects(
      () => lookupPostalCode("12345678", new AbortController().signal),
      /demorou demais/,
    );
  } finally {
    globalThis.setTimeout = originalTimeout;
  }
} finally {
  globalThis.fetch = originalFetch;
}
console.log(
  "PASS masks, alpha CNPJ, postal-only GET boundary, malformed/not-found/network/timeout responses",
);
const result = await build({
  entryPoints: ["tests/round47/entry.tsx"],
  bundle: true,
  write: false,
  metafile: true,
  jsx: "automatic",
});
assert.ok(
  !Object.keys(result.metafile.inputs).some(
    (path) => path.includes("src/lib/api") || path.includes("supabase"),
  ),
);
const postalSource = readFileSync("src/components/demo/interactive/postal-lookup.ts", "utf8");
assert.equal((postalSource.match(/fetch\(/g) || []).length, 1);
const errors = [],
  requests = [];
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
  w.HTMLElement.prototype.scrollIntoView = function () {};
  // Controlled responses only, including intentionally late responses despite cancellation.
  w.fetch = (url, options) =>
    new Promise((resolve, reject) => {
      assert.match(url, /^https:\/\/viacep\.com\.br\/ws\/\d{8}\/json\/$/);
      requests.push({ url, options, resolve, reject });
    });
  w.eval(result.outputFiles[0].text);
  const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
  const text = () => d.body.textContent;
  async function until(check) {
    for (let i = 0; i < 300; i++) {
      if (check()) return;
      await tick();
    }
    throw Error("Timed out: " + text().slice(-1400));
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
  const field = (label) => d.querySelector(`[aria-label="${label}"]`);
  function input(label, value) {
    const item = field(label);
    assert.ok(item, "field " + label);
    const prototype =
      item.tagName === "SELECT" ? w.HTMLSelectElement.prototype : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(item, value);
    item.dispatchEvent(
      new w.Event(item.tagName === "SELECT" ? "change" : "input", { bubbles: true }),
    );
  }
  async function fill(values) {
    for (const [label, value] of Object.entries(values)) {
      input(label, value);
      await tick();
    }
  }
  async function blur(label) {
    field(label).dispatchEvent(new w.FocusEvent("focusout", { bubbles: true }));
    await tick();
  }
  async function submit(title) {
    d.querySelector(`form[aria-label="${title}"]`).dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
    await tick();
  }
  const answer = (index, cep, extra = {}) =>
    requests[index].resolve({
      ok: true,
      json: async () => ({
        cep,
        logradouro: "Rua retornada",
        bairro: "Bairro retornado",
        localidade: "Cidade retornada",
        uf: "MG",
        ...extra,
      }),
    });
  await until(() => text().includes("Comece pela estrutura"));
  await click("Planos");
  assert.ok(text().includes("Não é CNPJ, chave de API ou senha"));
  assert.equal(field("ID do produto no portal").required, false);
  const features = d.querySelector('fieldset[aria-label="Recursos incluídos"]');
  assert.ok(features);
  assert.ok([...features.querySelectorAll("input")].every((input) => !input.checked));
  assert.ok(!d.querySelector('textarea[aria-label="Recursos incluídos"]'));
  const featureCheckbox = (name) =>
    [...features.querySelectorAll("label")]
      .find((label) => label.textContent === name)
      .querySelector("input");
  featureCheckbox("Website").click();
  featureCheckbox("CRM").click();
  await tick();
  featureCheckbox("CRM").click();
  await tick();
  await fill({
    "Nome do plano": "Plano informado",
    "Mensalidade (R$)": "100",
    "Limite de usuários": "5",
    "Limite de imóveis": "20",
  });
  await submit("Definir plano");
  assert.ok(
    [...d.querySelectorAll("details p")].some((p) => p.textContent === "Website"),
    "selected features saved; unchecked feature absent",
  );
  await click("Tenants");
  await click("Novo tenant");
  const form = d.querySelector('form[aria-label="Cadastrar tenant"]');
  assert.equal(form.querySelector("input").getAttribute("aria-label"), "CEP");
  await fill({
    CNPJ: "12abc34501de35",
    "CPF do responsável": "12345678900",
    WhatsApp: "+5531999998888",
    "Telefone 2": "3133334444",
  });
  assert.equal(field("CNPJ").value, "12.ABC.345/01DE-35");
  assert.equal(field("CPF do responsável").value, "123.456.789-00");
  assert.equal(field("WhatsApp").value, "(31) 99999-8888");
  assert.equal(field("Telefone 2").value, "(31) 3333-4444");
  await fill({ CEP: "123" });
  await blur("CEP");
  assert.equal(requests.length, 0);
  assert.ok(text().includes("8 dígitos"));
  await fill({ CEP: "12345678", Número: "42", Complemento: "Sala informada" });
  await blur("CEP");
  assert.equal(requests.length, 1);
  assert.ok(text().includes("Buscando endereço"));
  assert.ok(button("Consultar CEP novamente").disabled);
  await fill({ Logradouro: "Rua corrigida pela equipe" });
  answer(0, "12345-678");
  await until(() => field("Cidade").value === "Cidade retornada");
  assert.equal(field("Logradouro").value, "Rua corrigida pela equipe");
  assert.equal(field("Número").value, "42");
  assert.equal(field("Complemento").value, "Sala informada");
  assert.equal(field("UF").value, "MG");
  await blur("CEP");
  assert.equal(requests.length, 1, "no duplicate lookup of completed CEP");
  await fill({ CEP: "23456789" });
  assert.equal(field("Cidade").value, "", "old autofill cleared");
  assert.equal(field("Logradouro").value, "Rua corrigida pela equipe", "manual value retained");
  await blur("CEP");
  assert.equal(requests.length, 2);
  await fill({ CEP: "34567890" });
  assert.ok(requests[1].options.signal.aborted);
  await blur("CEP");
  assert.equal(requests.length, 3);
  answer(2, "34567-890", { localidade: "Cidade mais recente" });
  await until(() => field("Cidade").value === "Cidade mais recente");
  answer(1, "23456-789", { localidade: "Resposta obsoleta" });
  await tick();
  assert.equal(field("Cidade").value, "Cidade mais recente");
  await fill({ CEP: "45678901" });
  await blur("CEP");
  requests[3].resolve({ ok: true, json: async () => ({ erro: true }) });
  await until(() => text().includes("CEP não encontrado"));
  assert.equal(field("CEP").value, "45678-901");
  assert.equal(field("Número").value, "42");
  assert.ok(!field("Logradouro").disabled);
  await click("Consultar CEP novamente");
  requests[4].reject(Error("PRIVATE_PROVIDER_DETAILS"));
  await until(() => text().includes("Consulta de CEP indisponível"));
  assert.ok(!text().includes("PRIVATE_PROVIDER_DETAILS"));
  await click("Consultar CEP novamente");
  answer(5, "45678-901", { logradouro: "", bairro: "", localidade: "Município informado" });
  await until(() => field("Cidade").value === "Município informado");
  assert.ok(text().includes("campos não informados"));
  await fill({ Logradouro: "Rua preenchida manualmente", Bairro: "Bairro preenchido manualmente" });
  field("Endereço de cobrança igual ao da empresa").click();
  await tick();
  assert.ok(field("Cobrança — CEP"));
  const billingInput = [...form.querySelectorAll("input")].find((input) =>
    input.getAttribute("aria-label")?.startsWith("Cobrança"),
  );
  assert.equal(billingInput.getAttribute("aria-label"), "Cobrança — CEP");
  await fill({ "Cobrança — CEP": "56789012" });
  await blur("Cobrança — CEP");
  assert.equal(requests.length, 7);
  field("Endereço de cobrança igual ao da empresa").click();
  await tick();
  assert.ok(requests[6].options.signal.aborted);
  answer(6, "56789-012");
  await tick();
  assert.equal(field("Cidade").value, "Município informado");
  assert.ok(!field("Cobrança — CEP"));
  // Save with optional product absent, edited address and masks; duplicate masked/raw CNPJ rejected in state tests.
  await fill({
    "Razão Social": "Empresa de teste",
    Responsável: "Pessoa de teste",
    "E-mail": "pessoa@example.invalid",
    "Plano adquirido": "session-1",
  });
  await submit("Cadastrar tenant");
  assert.equal(field("Tenant selecionado").options.length, 2);
  assert.ok(!field("CEP"));
  await click("Tenants");
  await click("Novo tenant");
  assert.equal(field("CEP").value, "");
  await fill({ CEP: "67890123" });
  await blur("CEP");
  assert.equal(requests.length, 8);
  await click("Dashboard");
  assert.ok(requests[7].options.signal.aborted);
  answer(7, "67890-123");
  await tick();
  assert.ok(!text().includes("Rua retornada"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS actual DOM: optional product help, checkbox selection/save, masks/paste, CEP-first, loading, edited-field preservation, cancellation/races, not-found/error/manual fallback/retry, generic CEP, billing and unmount",
  );
} finally {
  dom.window.close();
}

// Execute the real header functions without importing business/server dependencies.
const serverSource = readFileSync("src/server.ts", "utf8");
const headerSource = serverSource.slice(
  serverSource.indexOf("function parseExactOrigin"),
  serverSource.indexOf("function applyTrackingSecurityHeaders"),
);
const headerJs = await transform(headerSource, { loader: "ts" });
const headersFor = new Function(
  "isCloudflareRuntimeRequest",
  headerJs.code + "; return trackingSecurityHeaders;",
)(() => true);
for (const path of ["/auth", "/super", "/super?view=tenants", "/super/", "/demonstracao", "/demonstracao/", "/", "/admin", "/demonstracao-outra"]) {
  const csp = headersFor(new Request("https://example.test" + path), {})["content-security-policy"];
  const connect = csp.split(";").find((part) => part.trim().startsWith("connect-src"));
  assert.equal(
    connect.includes("https://viacep.com.br"),
    true,
  );
  assert.equal(connect.includes("https://cloudflare-dns.com"), path === "/demonstracao" || path === "/demonstracao/");
  assert.ok(!connect.includes("https://*"));
  assert.ok(csp.includes("object-src 'none'"));
}
console.log("PASS: production CSP permits exact ViaCEP origin on login and authenticated document entries; DNS stays demo-only");
