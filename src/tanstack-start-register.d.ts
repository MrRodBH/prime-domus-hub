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

// LSR-02 (final corrective) — bidirectional Equal<A, B> type contract.
// The (<T>() => T extends X ? 1 : 2) trick treats types as equal only when
// they are mutually assignable AND identical in variance, so a router/config
// type mismatch — or any augmentation drift — resolves to `false` and
// `Assert<false>` fails the typecheck with a real constraint error.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? (<T>() => T extends B ? 1 : 2) extends (<T>() => T extends A ? 1 : 2)
      ? true
      : false
    : false;

type Assert<T extends true> = T;

type RegisterType = import("@tanstack/react-start").Register;

type _AssertRouter = Assert<
  Equal<RegisterType["router"], Awaited<ReturnType<typeof getRouter>>>
>;

type _AssertConfig = Assert<
  Equal<RegisterType["config"], Awaited<ReturnType<typeof startInstance.getOptions>>>
>;

type _AssertSsr = Assert<Equal<RegisterType["ssr"], true>>;

export type _Lsr02RegisterAssertions = [
  _AssertRouter,
  _AssertConfig,
  _AssertSsr,
];
