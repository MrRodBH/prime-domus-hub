// Bloco 3.1 — redirect legado: /admin/blog/novo → /admin/blog?new=1.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/blog/novo")({
  beforeLoad: () => {
    throw redirect({
      to: "/admin/blog",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: { new: "1" } as any,
      replace: true,
    });
  },
  component: () => null,
});
