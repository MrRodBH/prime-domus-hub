// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import type { getRouter } from "./src/router";
import type { startInstance } from "./src/start";

// LSR-02 (final corrective) — enforceable module-augmentation assertions.
// The module augmentation lives in src/tanstack-start-register.d.ts.
// TypeScript declaration files (.d.ts) do NOT enforce type-alias constraint
// violations under `tsgo`, so the Assert / Equal checks are anchored here in
// a real .ts source file (vite.config.ts is included by tsconfig.json).
// Any drift between the augmentation and getRouter / startInstance shapes
// produces a real TS2344 error at typecheck time. No runtime code is emitted.
type _Lsr02Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? (<T>() => T extends B ? 1 : 2) extends (<T>() => T extends A ? 1 : 2)
      ? true
      : false
    : false;
type _Lsr02Assert<T extends true> = T;
type _Lsr02Register = import("@tanstack/react-start").Register;
type _Lsr02AssertRouter = _Lsr02Assert<
  _Lsr02Equal<_Lsr02Register["router"], Awaited<ReturnType<typeof getRouter>>>
>;
type _Lsr02AssertConfig = _Lsr02Assert<
  _Lsr02Equal<
    _Lsr02Register["config"],
    Awaited<ReturnType<typeof startInstance.getOptions>>
  >
>;
type _Lsr02AssertSsr = _Lsr02Assert<_Lsr02Equal<_Lsr02Register["ssr"], true>>;
export type _Lsr02RegisterStaticAssertions = [
  _Lsr02AssertRouter,
  _Lsr02AssertConfig,
  _Lsr02AssertSsr,
];


// LSR-02 (final corrective) — Strategy B: strip ONLY a known, anchored
// TanStack Start route-tree footer emitted by
// @tanstack/start-plugin-core/route-tree-footer. src/tanstack-start-register.d.ts
// remains the single canonical source of the module augmentation.
//
// Safety contract (see LSR-02 §7):
// - Anchored to EOF (trailing whitespace only after the footer block).
// - Requires `declare module '@tanstack/react-start'` inside the suffix.
// - Suffix contains ONLY the footer imports and the module augmentation
//   (no route objects / no functional content).
// - Unknown / partial footers fail closed in build hooks; in dev they are
//   left untouched and logged.
// Scope: tanstack_start_registration_only. No routes, URLs, loaders,
// middleware, SSR, server entry, deploy target, aliases, or unrelated
// plugins are altered by this plugin.
const KNOWN_FOOTER_RE =
  /\n+import type \{ getRouter \} from '[^']+'\n(?:import type \{ (?:startInstance|createStart) \} from '[^']+'\n)?declare module '@tanstack\/react-start' \{\n {2}interface Register \{\n {4}ssr: true\n {4}router: Awaited<ReturnType<typeof getRouter>>(?:\n {4}config: Awaited<ReturnType<typeof startInstance\.getOptions>>)?\n {2}\}\n\}\s*$/;

// Loose detector: catches any augmentation-shaped tail so we can fail closed
// when the exact known form doesn't match but a suspicious footer is present.
const LOOSE_FOOTER_RE =
  /\n+import type \{ (?:getRouter|createStart|startInstance) \}[\s\S]*declare module '@tanstack\/react-start'[\s\S]*$/;

type StripOutcome =
  | { kind: "noop" }
  | { kind: "stripped"; newContent: string }
  | { kind: "unknown_footer"; reason: string };

function computeStrip(content: string): StripOutcome {
  const knownMatch = content.match(KNOWN_FOOTER_RE);
  if (knownMatch && knownMatch.index !== undefined) {
    const suffix = content.slice(knownMatch.index);
    // Extra safety: the suffix must not contain route/functional markers.
    if (
      /createFileRoute|_addFileChildren|_addFileTypes|RouteImport|rootRouteChildren/.test(
        suffix,
      )
    ) {
      return {
        kind: "unknown_footer",
        reason: "known footer regex matched but suffix contains route content",
      };
    }
    const head = content.slice(0, knownMatch.index).replace(/\s*$/, "");
    return { kind: "stripped", newContent: head + "\n" };
  }
  if (LOOSE_FOOTER_RE.test(content)) {
    return {
      kind: "unknown_footer",
      reason: "augmentation-shaped tail present but does not match known footer",
    };
  }
  return { kind: "noop" };
}

function stripTanstackStartRegisterFooter(): Plugin {
  const target = resolve(process.cwd(), "src/routeTree.gen.ts");
  const applyStrict = (hook: string) => {
    if (!existsSync(target)) return;
    const content = readFileSync(target, "utf8");
    const outcome = computeStrip(content);
    if (outcome.kind === "noop") return;
    if (outcome.kind === "unknown_footer") {
      throw new Error(
        `[lsr02:strip-tanstack-start-register-footer] fail-closed in ${hook}: ${outcome.reason}`,
      );
    }
    if (outcome.newContent !== content) {
      writeFileSync(target, outcome.newContent);
    }
  };
  const applyDevSafe = (logger: {
    error: (msg: string) => void;
  }) => {
    if (!existsSync(target)) return;
    const content = readFileSync(target, "utf8");
    const outcome = computeStrip(content);
    if (outcome.kind === "noop") return;
    if (outcome.kind === "unknown_footer") {
      logger.error(
        `[lsr02:strip-tanstack-start-register-footer] dev fail-soft: ${outcome.reason} — file left untouched`,
      );
      return;
    }
    if (outcome.newContent !== content) {
      writeFileSync(target, outcome.newContent);
    }
  };
  return {
    name: "lsr02:strip-tanstack-start-register-footer",
    enforce: "post",
    buildStart() {
      applyStrict("buildStart");
    },
    writeBundle() {
      applyStrict("writeBundle");
    },
    closeBundle() {
      applyStrict("closeBundle");
    },
    configureServer(server) {
      applyDevSafe(server.config.logger);
      const onChange = (path: string) => {
        if (path === target) applyDevSafe(server.config.logger);
      };
      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);
    },
  };
}

// Exported for LSR-02 stripper safety tests. Not consumed at runtime by Vite.
export const __lsr02StripperInternals = { computeStrip, KNOWN_FOOTER_RE, LOOSE_FOOTER_RE };

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [stripTanstackStartRegisterFooter()],
  },
});
