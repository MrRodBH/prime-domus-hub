import {
  assertNoMarketingInlineSecrets,
  getMarketingChannelDefinition,
  type MarketingChannelKey,
} from "@/lib/marketing/marketing-channel-registry";
import {
  hashMarketingPayload,
  sanitizeMarketingPayload,
  verifyMarketingHmacSha256,
} from "@/lib/marketing/marketing-ingestion.server";
import { safeTenantMarketingError } from "@/lib/api/tenant-marketing-authority.server";

export type TrustedMarketingProviderEnvelope = {
  connectorId: string;
  providerPayloadId: string;
  payload: Record<string, unknown>;
};

export async function receiveMarketingProviderPayload(
  input: TrustedMarketingProviderEnvelope,
): Promise<never> {
  assertNoMarketingInlineSecrets(input.payload);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await (supabaseAdmin as any)
    .from("tenant_marketing_connectors")
    .select("id, tenant_id, channel_key, availability_state, active")
    .eq("id", input.connectorId)
    .maybeSingle();
  if (result.error) throw safeTenantMarketingError(result.error);
  if (!result.data) throw new Error("tenant_marketing_connector_not_found");
  const definition = getMarketingChannelDefinition(result.data.channel_key as string);
  if (definition.providerKey === "internal") {
    throw new Error("marketing_provider_endpoint_not_applicable");
  }
  if (definition.availabilityState !== "automated_ready" || result.data.active !== true) {
    throw new Error("marketing_adapter_not_implemented");
  }
  void input.providerPayloadId;
  void hashMarketingPayload(sanitizeMarketingPayload(input.payload));
  throw new Error("marketing_adapter_not_implemented");
}

export function verifyMarketingProviderPayload(input: {
  channelKey: Extract<MarketingChannelKey, "META_ADS" | "GOOGLE_ADS">;
  rawBody: string;
  signatureHex: string;
  timestampSeconds: number;
  nowSeconds: number;
  maxSkewSeconds: number;
  serverResolvedSecret: string;
}): boolean {
  const definition = getMarketingChannelDefinition(input.channelKey);
  if (definition.signatureContract !== "provider_adapter_required") return false;
  return verifyMarketingHmacSha256({
    rawBody: input.rawBody,
    signatureHex: input.signatureHex,
    timestampSeconds: input.timestampSeconds,
    nowSeconds: input.nowSeconds,
    maxSkewSeconds: input.maxSkewSeconds,
    secret: input.serverResolvedSecret,
  });
}

export async function ingestVerifiedMarketingLead(): Promise<never> {
  throw new Error("marketing_adapter_not_implemented");
}
