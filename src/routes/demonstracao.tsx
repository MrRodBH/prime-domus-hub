import { createFileRoute } from "@tanstack/react-router";
import { DemoWorkspace } from "@/components/demo/DemoWorkspace";

export const Route = createFileRoute("/demonstracao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Demonstração da plataforma — Real One" },
      {
        name: "description",
        content:
          "Demonstração visual da plataforma SaaS imobiliária Real One com empresa e dados fictícios.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DemoWorkspace,
});
