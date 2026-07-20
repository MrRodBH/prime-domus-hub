// LSR-02 canonical TanStack Start module augmentation.
// Single source of truth for the `declare module '@tanstack/react-start'`
// Register interface. This file is authored (not generated) and is included
// by tsconfig via `src/**/*.ts`. It emits no runtime code.
//
// Strategy B (dedicated_declaration_file) selected by LSR-02.
// Do not add a duplicate augmentation to src/routeTree.gen.ts.

import type { getRouter } from "./router";
import type { startInstance } from "./start";

declare module "@tanstack/react-start" {
  interface Register {
    ssr: true;
    router: Awaited<ReturnType<typeof getRouter>>;
    config: Awaited<ReturnType<typeof startInstance.getOptions>>;
  }
}

// Type-only static assertions. These produce no JavaScript and fail the
// typecheck if the module augmentation drifts from the expected shape.
type _AssertRouter = import("@tanstack/react-start").Register extends {
  router: Awaited<ReturnType<typeof getRouter>>;
}
  ? true
  : never;

type _AssertConfig = import("@tanstack/react-start").Register extends {
  config: Awaited<ReturnType<typeof startInstance.getOptions>>;
}
  ? true
  : never;

type _AssertSsr = import("@tanstack/react-start").Register extends {
  ssr: true;
}
  ? true
  : never;

// Referencing the aliases prevents "unused type" warnings in strict configs
// while remaining fully type-erased at compile output.
export type _Lsr02RegisterAssertions = [
  _AssertRouter,
  _AssertConfig,
  _AssertSsr,
];
