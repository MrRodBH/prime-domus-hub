import { createFileRoute } from "@tanstack/react-router";
import { DemoWorkspace } from "@/components/demo/DemoWorkspace";

export const Route = createFileRoute("/demonstracao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Demonstração da plataforma — RM Prime SaaS" },
      {
        name: "description",
        content: "Demonstração visual da plataforma imobiliária RM Prime SaaS com dados fictícios.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DemoWorkspace,
});
