import { createFileRoute } from "@tanstack/react-router";
import { TenantDomainWorkspace } from "@/components/domains/TenantDomainWorkspace";

export const Route = createFileRoute("/_authenticated/admin/domains")({
  component: TenantDomainWorkspace,
});
