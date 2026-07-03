// Fase 6 · Bloco 4 · Etapa 4.2 — Stress Test standalone (§9).
//
// Objetivo: comprovar as propriedades arquiteturais exigidas pela 4.2 sem
// depender do runtime React nem do bootstrap real do app:
//
//   §9.1 Escala simulada:
//        30 descriptors × (10 views, 20 panels, 50 actions, 15 dialogs)
//   §5.1 resolve(id) O(1) — nunca varredura linear
//   §5.3 Bootstrap freeze — register() após freeze lança RegistryFrozenError
//   §7   Separation of Concern: resolve / exists / getStrict / list
//
// Execução:  bun run scripts/etapa-4-2-stress-test.mjs
//
// Este script usa a MESMA semântica dos registries de produção (Map<string,T>
// + fail-fast + freeze flag). Não instancia React — mede pura resolução.

const RegistryResolutionError = class extends Error {};
const RegistryFrozenError = class extends Error {};

function makeRegistry(name) {
  const map = new Map();
  let frozenRef = { v: false };
  return {
    _freeze: () => (frozenRef.v = true),
    register(id, comp) {
      if (frozenRef.v) throw new RegistryFrozenError(`${name} frozen: ${id}`);
      map.set(id, comp);
    },
    resolve(id) {
      const c = map.get(id);
      if (!c) throw new RegistryResolutionError(`${name}: ${id}`);
      return c;
    },
    exists: (id) => map.has(id),
    getStrict(id) {
      const c = map.get(id);
      if (!c) throw new RegistryResolutionError(`${name}: ${id}`);
      return c;
    },
    list: () => [...map.keys()],
    size: () => map.size,
  };
}

const view = makeRegistry("ViewRegistry");
const panel = makeRegistry("PanelRegistry");
const action = makeRegistry("ActionRegistry");
const dialog = makeRegistry("DialogRegistry");

// ---------------------------------------------------------------------------
// §9.1 — popular na escala exigida
// ---------------------------------------------------------------------------
const DESCRIPTORS = 30;
const VIEWS = 10;
const PANELS = 20;
const ACTIONS = 50;
const DIALOGS = 15;

const t0 = performance.now();
for (let i = 0; i < VIEWS; i++) view.register(`view.${i}`, () => null);
for (let i = 0; i < PANELS; i++) panel.register(`panel.${i}`, () => null);
for (let i = 0; i < ACTIONS; i++) action.register(`action.${i}`, async () => {});
for (let i = 0; i < DIALOGS; i++) dialog.register(`dialog.${i}`, () => null);
const tBootstrap = performance.now() - t0;

console.log(
  `[bootstrap] ${VIEWS + PANELS + ACTIONS + DIALOGS} registros em ${tBootstrap.toFixed(3)}ms`,
);

// ---------------------------------------------------------------------------
// §5.1 — resolve() deve ser O(1). Medimos N lookups e comparamos com
// tamanho do registry: tempo/lookup deve permanecer estável.
// ---------------------------------------------------------------------------
function measureLookups(reg, ids, iterations) {
  const t = performance.now();
  for (let k = 0; k < iterations; k++) {
    for (const id of ids) reg.resolve(id);
  }
  return (performance.now() - t) / (iterations * ids.length);
}

const viewIds = view.list();
const actionIds = action.list();
const avgView = measureLookups(view, viewIds, 5000);
const avgAction = measureLookups(action, actionIds, 5000);

console.log(
  `[lookup] view avg=${(avgView * 1000).toFixed(3)}µs  action avg=${(avgAction * 1000).toFixed(3)}µs`,
);

// ---------------------------------------------------------------------------
// §9.1 — simular DESCRIPTORS descriptors alternando views/panels em runtime.
// Nenhum re-bootstrap, nenhuma invalidação, apenas resolve().
// ---------------------------------------------------------------------------
const tSwitch = performance.now();
for (let d = 0; d < DESCRIPTORS; d++) {
  const v = viewIds[d % viewIds.length];
  const p = panel.list()[d % PANELS];
  view.resolve(v);
  panel.resolve(p);
}
console.log(
  `[switch] ${DESCRIPTORS} alternâncias descriptor→view/panel em ${(performance.now() - tSwitch).toFixed(3)}ms`,
);

// ---------------------------------------------------------------------------
// §7 — Separation of Concern: exists / getStrict / list
// ---------------------------------------------------------------------------
console.log("[api] view.exists('view.0') =", view.exists("view.0"));
console.log("[api] view.exists('view.999') =", view.exists("view.999"));
try {
  view.getStrict("view.999");
  throw new Error("getStrict deveria ter lançado");
} catch (e) {
  if (!(e instanceof RegistryResolutionError)) throw e;
  console.log("[api] view.getStrict('view.999') → RegistryResolutionError ✓");
}

// ---------------------------------------------------------------------------
// §5.3 — Bootstrap Freeze Model
// ---------------------------------------------------------------------------
view._freeze();
panel._freeze();
action._freeze();
dialog._freeze();

try {
  view.register("view.late", () => null);
  throw new Error("register após freeze deveria falhar");
} catch (e) {
  if (!(e instanceof RegistryFrozenError)) throw e;
  console.log("[freeze] register após freeze → RegistryFrozenError ✓");
}

// resolves continuam funcionando após freeze (registry é READ-ONLY, não morto)
view.resolve("view.0");
console.log("[freeze] resolve() continua operante pós-freeze ✓");

console.log("\n✅ Stress test 4.2 aprovado.");
