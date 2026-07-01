// Server-only tenant helpers. Never import from client code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Fallback tenant slug quando o host não bate com nenhum tenants.dominio_principal.
// Ambiente atual só tem 1 tenant (RM Prime), então esse é o default seguro.
const FALLBACK_TENANT_SLUG = "rm-prime";

function serverPublishable() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  return host.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
}

export async function resolveTenantByHost(host: string | null | undefined): Promise<{
  id: string;
  slug: string;
  nome: string;
} | null> {
  const client = serverPublishable();
  const h = normalizeHost(host);

  if (h && !h.endsWith("lovable.app") && h !== "localhost" && h !== "127.0.0.1") {
    const { data } = await client
      .from("tenants")
      .select("id, slug, nome")
      .eq("dominio_principal", h)
      .maybeSingle();
    if (data) return data as { id: string; slug: string; nome: string };
  }

  const { data: fallback } = await client
    .from("tenants")
    .select("id, slug, nome")
    .eq("slug", FALLBACK_TENANT_SLUG)
    .maybeSingle();
  return (fallback as { id: string; slug: string; nome: string } | null) ?? null;
}

export function publicSupabaseForTenant(tenantId: string) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    global: { headers: { "x-tenant-id": tenantId } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
