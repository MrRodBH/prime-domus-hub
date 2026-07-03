// Bloco 3.1 — redirect legado: /admin/formularios/$id → /admin/formularios?item=<id>.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/formularios/$id")({
  beforeLoad: ({ params }) => {
    const isNew = params.id === "novo";
    throw redirect({
      to: "/admin/formularios",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: (isNew ? { new: "1" } : { item: params.id }) as any,
      replace: true,
    });
  },
  component: () => null,
});
