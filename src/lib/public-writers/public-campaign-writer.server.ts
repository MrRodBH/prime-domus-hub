import {
  type PublicWriterTenantIdentity,
  selectExactlyOneTenantScopedRow,
} from "@/lib/public-writers/public-writer-authority.server";

export interface PublicCampaignEventInput {
  campaign_id: string;
  tipo: "impression" | "click" | "dismiss";
  rota?: string;
  session_id?: string;
}

type CampaignRow = {
  id: string;
  tenant_id: string;
  status: string;
};

type SettingRow = {
  tenant_id: string;
  key: string;
  value: unknown;
};

export async function recordPublicCampaignEvent(input: {
  tenant: PublicWriterTenantIdentity;
  event: PublicCampaignEventInput;
}): Promise<{ ok: true }> {
  const { tenant, event } = input;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("cms_campaigns")
    .select("id, tenant_id, status")
    .eq("tenant_id", tenant.id)
    .eq("id", event.campaign_id)
    .eq("status", "active")
    .limit(2);
  if (error) throw new Error(error.message);

  const campaign = selectExactlyOneTenantScopedRow(
    tenant,
    data as CampaignRow[] | null,
    {
      zeroMessage: "Campaign is not active in the accepted tenant.",
      ambiguousMessage: "Campaign authority is ambiguous in the accepted tenant.",
    },
  );
  if (!campaign) throw new Error("Campaign not found.");

  const { error: insertError } = await supabaseAdmin
    .from("cms_campaign_events")
    .insert({
      tenant_id: tenant.id,
      campaign_id: campaign.id,
      tipo: event.tipo,
      rota: event.rota ?? null,
      session_id: event.session_id ?? null,
    });
  if (insertError) throw new Error(insertError.message);
  return { ok: true };
}

export async function loadTenantSettingValue<T>(input: {
  tenant: PublicWriterTenantIdentity;
  key: string;
}): Promise<T | null> {
  const { tenant, key } = input;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("tenant_id, key, value")
    .eq("tenant_id", tenant.id)
    .eq("key", key)
    .limit(2);
  if (error) throw new Error(error.message);

  const row = selectExactlyOneTenantScopedRow(
    tenant,
    data as SettingRow[] | null,
    {
      allowZero: true,
      ambiguousMessage: `Tenant setting ${key} is ambiguous.`,
    },
  );
  if (!row) return null;
  if (row.key !== key) throw new Error(`Unexpected tenant setting key: ${row.key}`);
  return row.value as T;
}

export async function loadPublicMetaCredentials(
  tenant: PublicWriterTenantIdentity,
): Promise<{ pixelId: string | null; token: string | null }> {
  const [integration, credentials] = await Promise.all([
    loadTenantSettingValue<{ pixel_id?: unknown }>({
      tenant,
      key: "meta_integracao",
    }),
    loadTenantSettingValue<{ conversions_api_token?: unknown }>({
      tenant,
      key: "meta_credenciais",
    }),
  ]);

  const pixelId =
    typeof integration?.pixel_id === "string" && integration.pixel_id.trim()
      ? integration.pixel_id.trim()
      : null;
  const token =
    typeof credentials?.conversions_api_token === "string" &&
    credentials.conversions_api_token.trim()
      ? credentials.conversions_api_token.trim()
      : null;
  return { pixelId, token };
}
