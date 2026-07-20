// Server-only tenant helpers. Never import from client code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizePublicHostname } from "@/lib/public-tenant";
import { resolvePublicTenantForHostname } from "@/lib/public-tenant.server";

export function normalizeHost(host: string | null | undefined): string {
  return normalizePublicHostname(host);
}

export async function resolveTenantByHost(host: string | null | undefined): Promise<{
  id: string;
  slug: string;
  nome: string;
}> {
  const resolved = await resolvePublicTenantForHostname(normalizePublicHostname(host));
  return {
    id: resolved.tenant.id,
    slug: resolved.tenant.slug,
    nome: resolved.tenant.nome,
  };
}

/**
 * Transport-only client. The tenant id must already have been resolved and
 * validated by a server-owned authority. The x-tenant-id header is never an
 * authority and remains subject to server/RLS revalidation.
 */
export function publicSupabaseForTenant(tenantId: string) {
  if (!tenantId) throw new Error("Validated tenant id is required.");

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    global: { headers: { "x-tenant-id": tenantId } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
