import { createFileRoute } from "@tanstack/react-router";
import { SuperDomainOperations } from "@/components/domains/SuperDomainOperations";

export const Route = createFileRoute("/_authenticated/super/domains")({
  component: SuperDomainOperations,
});
