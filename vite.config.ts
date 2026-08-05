// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro,
//     componentTagger, VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logging and sandbox detection.
//
// GNR-01 restores TanStack Start's generated route-tree augmentation as the
// only Register authority. No authored declaration file and no generated-file
// rewriting plugin are permitted.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const wri01RuntimePlugin = fileURLToPath(
  new URL("./src/lib/runtime/wri-01-cloudflare-nitro-plugin.server.ts", import.meta.url),
);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts
    // (the existing SSR error wrapper).
    server: { entry: "server" },
  },
  vite: {
    nitro: {
      plugins: [wri01RuntimePlugin],
    },
  },
});
