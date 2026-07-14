// PR-M1 — Cutover: /admin/leads-workspace foi absorvido por /admin/pipeline
// como autoridade única do CRM. Mantido apenas como redirect compatível.
// Preserva search params relevantes (view, tab, corretor, origem, q, status, item).
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/leads-workspace")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/admin/pipeline", search: (search ?? {}) as never });
  },
  component: () => null,
});
