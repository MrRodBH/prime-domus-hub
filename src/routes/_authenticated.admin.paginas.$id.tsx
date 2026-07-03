// Redirect legado: /admin/paginas/$id → /admin/paginas?item=<id> (Bloco 3).
// Padrão idêntico ao redirect do Bloco 2 (/admin/leads → /admin/pipeline).
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/paginas/$id")({
  beforeLoad: ({ params }) => {
    const isNew = params.id === "novo";
    throw redirect({
      to: "/admin/paginas",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: (isNew ? { new: "1" } : { item: params.id }) as any,
      replace: true,
    });
  },
  component: () => null,
});
