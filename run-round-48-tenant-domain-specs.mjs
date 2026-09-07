import assert from "node:assert/strict";
import { build } from "esbuild";
const compiled = await build({
  entryPoints: ["src/components/demo/interactive/model.ts"],
  bundle: true,
  write: false,
  format: "esm",
});
const { emptyState, command, domainName } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64")
);
let state = command(emptyState(), "plans", "", {
  name: "Plano fictício",
  price: "0",
  users: "1",
  properties: "1",
});
const data = Object.fromEntries(
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
  ].map((key) => [key, "Fictício"]),
);
Object.assign(data, { cnpj: "00000000000100", plan: state.rows.plans[0].id, sameBilling: "true" });
state = command(state, "tenants", "", data);
const first = state.rows.tenants[0].id;
state = command(state, "tenants", "", { ...data, cnpj: "00000000000200" });
const second = state.rows.tenants[1].id;
assert.throws(
  () => command(state, "tenantEdit", first, { ...data, cnpj: "00000000000200" }, first),
  /CNPJ/,
);
assert.throws(() => command(state, "tenantEdit", second, data, first), /CNPJ|indisponível/);
assert.throws(
  () => command(state, "tenantEdit", first, { ...data, plan: "absent" }, first),
  /plano/,
);
const before = JSON.stringify(state);
assert.throws(
  () => command(state, "tenantEdit", first, { ...data, sameBilling: "false" }, first),
  /billing/,
);
assert.equal(JSON.stringify(state), before);
state = command(
  state,
  "tenantEdit",
  first,
  { ...data, name: "Corrigido", cnpj: "00.000.000/0001-00" },
  first,
);
assert.equal(state.rows.tenants.length, 2);
assert.equal(state.rows.tenants[0].id, first);
assert.equal(state.rows.tenants[0].fields.name, "Corrigido");
state = command(state, "domains", first, { name: "one.example.invalid", provider: "Cloudflare" });
const domain = state.rows.domains[0].id;
state = command(state, "domains", second, {
  name: "two.example.invalid",
  provider: "Provedor próprio",
});
assert.throws(
  () =>
    command(
      state,
      "domainEdit",
      second,
      { name: "other.example.invalid", provider: "Cloudflare" },
      domain,
    ),
  /indisponível/,
);
assert.throws(
  () =>
    command(
      state,
      "domainEdit",
      first,
      { name: "two.example.invalid", provider: "Cloudflare" },
      domain,
    ),
  /utilizado/,
);
assert.throws(() => domainName("a".repeat(64) + ".invalid"), /tamanho/);
state = command(state, "domainTest", first, { status: "Conectado" }, domain);
assert.equal(state.rows.domains[0].fields.status, "Pendente de verificação real");
assert.ok(state.rows.domains[0].fields.lastCheck);
state = command(
  state,
  "domainEdit",
  first,
  { name: "fixed.example.invalid", provider: "Provedor próprio", status: "Conectado" },
  domain,
);
assert.equal(state.rows.domains.length, 2);
assert.equal(state.rows.domains[0].fields.lastCheck, "");
assert.equal(state.rows.domains[0].fields.status, "Pendente de verificação real");
assert.equal(state.rows.domains[1].fields.name, "two.example.invalid");
console.log(
  "PASS Round48: edits preserve IDs, uniqueness/isolation, validation atomicity, invalidation and no false domain completion",
);
await import("./run-round-46-empty-onboarding-specs.mjs");
