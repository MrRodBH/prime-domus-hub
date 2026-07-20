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

// LSR-02 — Strategy B: strip the auto-generated
// `declare module '@tanstack/react-start'` footer from src/routeTree.gen.ts
// so that src/tanstack-start-register.d.ts remains the single canonical
// source of the module augmentation across every generation path
// (vite dev, vite build, vite build --mode development, server-tree and
// client-tree generators). Scope is strictly limited to
// tanstack_start_registration_only — this plugin does not alter routes,
// URLs, loaders, middleware, SSR, or any runtime behavior.
function stripTanstackStartRegisterFooter(): Plugin {
  const target = resolve(process.cwd(), "src/routeTree.gen.ts");
  const strip = () => {
    if (!existsSync(target)) return;
    const content = readFileSync(target, "utf8");
    const markers = [
      "\nimport type { getRouter }",
      "\nimport type { createStart }",
    ];
    let cut = -1;
    for (const m of markers) {
      const i = content.indexOf(m);
      if (i !== -1 && (cut === -1 || i < cut)) cut = i;
    }
    if (cut === -1) return;
    const stripped = content.slice(0, cut).replace(/\s*$/, "") + "\n";
    if (stripped !== content) writeFileSync(target, stripped);
  };
  return {
    name: "lsr02:strip-tanstack-start-register-footer",
    enforce: "post",
    buildStart() {
      strip();
    },
    writeBundle() {
      strip();
    },
    closeBundle() {
      strip();
    },
    configureServer(server) {
      strip();
      server.watcher.on("change", (path) => {
        if (path === target) strip();
      });
      server.watcher.on("add", (path) => {
        if (path === target) strip();
      });
    },
  };
}

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
