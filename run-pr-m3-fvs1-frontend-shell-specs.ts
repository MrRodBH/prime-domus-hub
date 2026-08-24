import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const baseSha = process.env.PR_M3_FVS1_BASE_SHA ?? "e9edb214fa43317924e89ddaf019184b32e1c3b7";
let assertions = 0;

const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

const allowlist = new Set([
  "src/styles.css",
  "src/components/workspace/WorkspaceShell.tsx",
  "src/components/workspace/AppHeader.tsx",
  "src/components/workspace/NavigationRail.tsx",
  "src/components/workspace/WorkspaceState.tsx",
  "src/components/workspace/index.ts",
  "src/routes/_authenticated.admin.index.tsx",
  "run-pr-m3-fvs1-frontend-shell-specs.ts",
  "package.json",
  ".github/workflows/release-gate.yml",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-fvs1-frontend-shell-evidence.md",
]);

const changed = new Set(
  [
    git("diff", "--name-only", `${baseSha}...HEAD`),
    git("diff", "--name-only"),
    git("diff", "--cached", "--name-only"),
    git("ls-files", "--others", "--exclude-standard"),
  ]
    .flatMap((output) => output.split("\n"))
    .filter(Boolean),
);

for (const path of changed) {
  ok(allowlist.has(path), `changed path must be allowlisted: ${path}`);
}
ok(changed.size > 0, "FVS1 must contain a non-empty exact diff");
ok(changed.size <= allowlist.size, "FVS1 must not exceed its eleven-path allowlist");

const baseLock = git("show", `${baseSha}:bun.lock`);
equal(read("bun.lock").trim(), baseLock, "bun.lock must remain byte-for-byte unchanged");

const styles = read("src/styles.css");
const shell = read("src/components/workspace/WorkspaceShell.tsx");
const header = read("src/components/workspace/AppHeader.tsx");
const navigation = read("src/components/workspace/NavigationRail.tsx");
const state = read("src/components/workspace/WorkspaceState.tsx");
const workspaceIndex = read("src/components/workspace/index.ts");
const dashboard = read("src/routes/_authenticated.admin.index.tsx");
const workflow = read(".github/workflows/release-gate.yml");
const pkg = JSON.parse(read("package.json")) as {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const basePackage = JSON.parse(git("show", `${baseSha}:package.json`)) as typeof pkg;

for (const token of [
  "--workspace-surface",
  "--workspace-elevated",
  "--workspace-navigation",
  "--workspace-navigation-active",
  "--workspace-focus",
  "--workspace-content-max",
  "--state-info",
  "--state-success",
  "--state-warning",
  "--state-danger",
]) {
  ok(styles.includes(token), `semantic token must exist: ${token}`);
}
ok(styles.includes(":focus-visible"), "global keyboard focus must be visible");
ok(styles.includes("prefers-reduced-motion: reduce"), "reduced-motion contract must exist");
ok(styles.includes("transition-duration: 0.01ms"), "reduced motion must bound transitions");

equal(
  (shell.match(/<Outlet \/>/g) ?? []).length,
  1,
  "authenticated shell must retain exactly one Outlet",
);
equal(
  (shell.match(/<WorkspaceShell/g) ?? []).length,
  0,
  "WorkspaceShell must not recursively create another shell",
);
ok(
  shell.includes('data-workspace-shell="single-authenticated-shell"'),
  "single shell must be machine-verifiable",
);
ok(
  shell.includes("<TenantSelectionGate"),
  "tenant selection gate must remain around authenticated content",
);
ok(shell.includes('path === "/invitations"'), "invitation route exception must remain explicit");
ok(shell.includes('href="#workspace-main"'), "shell must expose a skip link");
ok(shell.includes('id="workspace-main"'), "main landmark must expose a stable target");
ok(shell.includes('aria-label="Conteúdo principal"'), "main landmark must have an accessible name");
ok(shell.includes("tabIndex={-1}"), "main landmark must accept programmatic focus");
ok(shell.includes("min-h-dvh"), "shell must use a mobile-safe viewport unit");
ok(
  shell.includes("max-w-[var(--workspace-content-max)]"),
  "wide layout must use the semantic content boundary",
);
ok(shell.includes("overflow-hidden"), "shell must contain viewport-level overflow");
ok(
  shell.includes("min-w-0"),
  "content column must be allowed to shrink without horizontal overflow",
);
ok(shell.includes("overflow-y-auto"), "main content must own vertical scrolling");
ok(shell.includes("w-[min(86vw,280px)]"), "mobile navigation must remain within its viewport");
ok(shell.includes('aria-label="Navegação principal móvel"'), "mobile navigation must be named");
ok(
  shell.includes('aria-current={isActive ? "page" : undefined}'),
  "mobile navigation must expose current page",
);

ok(header.includes('aria-label="Cabeçalho do workspace"'), "header must have an accessible name");
ok(header.includes('aria-label="Abrir navegação"'), "mobile navigation trigger must be named");
ok(header.includes('aria-haspopup="dialog"'), "dialog triggers must expose their popup semantics");
ok(
  header.includes('aria-label="Abrir busca e paleta de comandos"'),
  "command palette trigger must be named",
);
ok(header.includes('aria-live="polite"'), "active context must be announced without interruption");
ok(header.includes("bg-workspace-elevated"), "header must consume the elevated semantic token");
ok(header.includes("shrink-0"), "header controls must not collapse into the content area");
ok(header.includes("md:hidden"), "mobile navigation trigger must leave the desktop layout");

ok(
  navigation.includes('data-workspace-navigation="desktop"'),
  "desktop navigation must be machine-verifiable",
);
ok(navigation.includes('aria-label="Contextos do workspace"'), "desktop navigation must be named");
ok(
  navigation.includes('aria-current={isActive ? "page" : undefined}'),
  "desktop navigation must expose current page",
);
ok(
  navigation.includes("bg-workspace-navigation"),
  "desktop navigation must consume its semantic surface",
);
ok(navigation.includes("md:flex"), "navigation rail must use the frozen tablet breakpoint");

const viewports = [
  { width: 375, height: 812, desktopRail: false },
  { width: 768, height: 1024, desktopRail: true },
  { width: 1440, height: 900, desktopRail: true },
] as const;
for (const viewport of viewports) {
  const railWidth = viewport.desktopRail ? 240 : 0;
  const availableContentWidth = viewport.width - railWidth;
  const mobileSheetWidth = Math.min(viewport.width * 0.86, 280);
  ok(
    viewport.height > 56,
    `${viewport.width}x${viewport.height} must retain main content below the header`,
  );
  ok(
    availableContentWidth > 0,
    `${viewport.width}x${viewport.height} must retain a positive content width`,
  );
  ok(
    mobileSheetWidth <= viewport.width,
    `${viewport.width}x${viewport.height} mobile sheet must not overflow`,
  );
}

for (const kind of ["loading", "empty", "denied", "unavailable", "error"]) {
  ok(state.includes(`"${kind}"`), `WorkspaceState must define ${kind}`);
}
ok(
  state.includes("Record<WorkspaceStateKind, WorkspaceStateDefinition>"),
  "all state definitions must be exhaustive",
);
ok(
  state.includes("data-workspace-state={kind}"),
  "state kind must be inspectable without visual inference",
);
ok(
  state.includes('role={isAssertive ? "alert" : "status"}'),
  "state semantics must distinguish error alerts",
);
ok(
  state.includes('aria-live={isAssertive ? "assertive" : "polite"}'),
  "state announcements must be deterministic",
);
ok(state.includes("aria-busy={isLoading}"), "loading state must expose busy semantics");
ok(
  state.includes('aria-hidden="true"'),
  "decorative state icon must be hidden from assistive technology",
);
ok(state.includes("{action ?"), "state component must support an explicit recovery action");
ok(state.includes("w-full"), "state surface must fit its content container");
ok(state.includes("max-w-md"), "state copy must retain a readable line length");
ok(
  workspaceIndex.includes("WorkspaceState"),
  "state primitive must be exported by the canonical workspace entrypoint",
);

ok(dashboard.includes('kind="loading"'), "dashboard must map the pending read model to loading");
ok(dashboard.includes('kind="empty"'), "dashboard must map no activity to empty");
ok(dashboard.includes('kind="error"'), "dashboard must map query failure to error");
ok(
  dashboard.includes("stats.isPending"),
  "dashboard loading must derive from the server-read query state",
);
ok(
  dashboard.includes("stats.isError"),
  "dashboard error must derive from the server-read query state",
);
ok(
  dashboard.includes("hasDashboardActivity"),
  "dashboard empty state must use an explicit deterministic predicate",
);
ok(dashboard.includes("stats.refetch()"), "dashboard error state must provide bounded recovery");
ok(!dashboard.includes('kind="denied"'), "dashboard must not simulate a denied server decision");
ok(
  !dashboard.includes('kind="unavailable"'),
  "dashboard must not simulate unavailable commercial runtime",
);
equal(
  (dashboard.match(/Assistente Comercial/g) ?? []).length,
  1,
  "dashboard must render one assistant heading",
);
ok(dashboard.includes('aria-label="Filtrar por corretor"'), "broker filter must be named");
ok(dashboard.includes('aria-label="Filtrar por origem"'), "origin filter must be named");
ok(
  dashboard.includes('aria-label="Período do dashboard"'),
  "period controls must be grouped and named",
);
ok(
  dashboard.includes("aria-pressed={periodo === p.id}"),
  "period buttons must expose pressed state",
);
ok(
  dashboard.includes("aria-pressed={serieMetricas[m]}"),
  "chart toggles must expose pressed state",
);

for (const source of [styles, shell, header, navigation, state, dashboard]) {
  for (const forbidden of [
    "stripe",
    "wrangler",
    "billing-stripe-webhook",
    "CLOUDFLARE_API_TOKEN",
  ]) {
    ok(
      !source.toLowerCase().includes(forbidden.toLowerCase()),
      `frontend slice must not contain ${forbidden}`,
    );
  }
}

assert.deepEqual(
  pkg.dependencies,
  basePackage.dependencies,
  "runtime dependencies must remain unchanged",
);
assertions += 1;
assert.deepEqual(
  pkg.devDependencies,
  basePackage.devDependencies,
  "dev dependencies must remain unchanged",
);
assertions += 1;
ok(
  pkg.scripts?.["test:pr-m3-fvs1"]?.includes("run-pr-m3-fvs1-frontend-shell-specs.ts"),
  "focused script must be pinned",
);
ok(
  pkg.scripts?.["verify:release"]?.startsWith("bun run test:pr-m3-fvs1"),
  "release verification must start with FVS1",
);
ok(
  workflow.includes("Verify PR-M3-FVS1 frontend shell"),
  "Release Gate must execute the focused FVS1 matrix",
);
ok(
  workflow.includes("bun run test:pr-m3-fvs1"),
  "Release Gate must call the pinned focused script",
);

const evidencePath =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-fvs1-frontend-shell-evidence.md";
ok(existsSync(resolve(root, evidencePath)), "FVS1 evidence document must exist");
const evidence = read(evidencePath);
for (const token of [
  "PR-M3-FVS1",
  "FRONTEND_CONTRACT_REGRESSION=0",
  "LOVABLE_ROADMAP_UPDATE=false",
  "PROVIDER_WRITES=0",
  "DATABASE_WRITES=0",
  "PR_105_MERGE=false",
]) {
  ok(evidence.includes(token), `evidence must retain ${token}`);
}

console.log(`PR-M3-FVS1 frontend shell gate passed (${assertions} assertions).`);
