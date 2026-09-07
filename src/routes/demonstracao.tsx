import { createFileRoute } from "@tanstack/react-router";
import { EmptyDemoWorkspace } from "@/components/demo/interactive/EmptyDemoWorkspace";

export const Route = createFileRoute("/demonstracao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Demonstração da plataforma — Real One" },
      {
        name: "description",
        content:
          "Demonstração interativa da plataforma Real One, iniciada vazia e preenchida pela equipe com dados fictícios.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: EmptyDemoWorkspace,
});
