import { createFileRoute } from "@tanstack/react-router";
import { TenantUsersPage } from "@/components/admin/TenantUsersPage";
export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/memberships")({component:TenantUsersPage});
