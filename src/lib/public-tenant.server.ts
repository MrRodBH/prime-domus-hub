import { getRequest } from "@tanstack/react-start/server";
import {
  PublicTenantResolutionError,
  isLocalDevelopmentHostname,
  normalizePublicHostname,
  requireExactlyOneTenant,
  type PublicTenantIdentity,
} from "@/lib/public-tenant";

export interface PublicTenantContext {
  tenant: PublicTenantIdentity;
  admin: typeof import("@/integrations/supabase/client.server").supabaseAdmin;
  hostname: string;
  authority: "domain" | "explicit-local-development-mapping";
}

async function lookupTenantBy(
  field: "dominio_principal" | "slug",
  value: string,
): Promise<PublicTenantIdentity[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, nome, slug, dominio_principal, status")
    .eq(field, value)
    .eq("status", "active");

  if (error) {
    throw new PublicTenantResolutionError(
      "tenant_query_failed",
      `Public tenant registry lookup failed for ${field}.`,
    );
  }
  return (data ?? []) as PublicTenantIdentity[];
}

export async function resolvePublicTenantForHostname(
  rawHostname: string,
): Promise<Omit<PublicTenantContext, "admin">> {
  const hostname = normalizePublicHostname(rawHostname);
  const isNonProduction = process.env.NODE_ENV !== "production";

  if (isNonProduction && isLocalDevelopmentHostname(hostname)) {
    const explicitSlug = process.env.PUBLIC_DEV_TENANT_SLUG?.trim();
    if (!explicitSlug) {
      throw new PublicTenantResolutionError(
        "local_mapping_required",
        "PUBLIC_DEV_TENANT_SLUG is required for local public-site requests.",
      );
    }
    const tenant = requireExactlyOneTenant(
      await lookupTenantBy("slug", explicitSlug),
      `explicit-local-development-mapping:${explicitSlug}`,
    );
    return {
      tenant,
      hostname,
      authority: "explicit-local-development-mapping",
    };
  }

  const tenant = requireExactlyOneTenant(
    await lookupTenantBy("dominio_principal", hostname),
    `domain:${hostname}`,
  );
  return { tenant, hostname, authority: "domain" };
}

export async function requirePublicTenantContext(): Promise<PublicTenantContext> {
  const request = getRequest();
  const hostname = normalizePublicHostname(new URL(request.url).hostname);
  const resolved = await resolvePublicTenantForHostname(hostname);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { ...resolved, admin: supabaseAdmin };
}
