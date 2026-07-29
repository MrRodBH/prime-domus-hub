import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import { assertOptionalTenantScopedRow } from "@/lib/public-tenant-read-guards";
import { requirePublicWriterTenantFromRequest } from "@/lib/public-writers/public-writer-authority.server";
import { loadPublicMetaCredentials } from "@/lib/public-writers/public-campaign-writer.server";
import {
  authorizeTenantTrackingOperation,
  listTenantTrackingConnectorRows,
} from "@/lib/api/tenant-tracking-authority.server";

/**
 * Legacy compatibility read used by the preserved PTR-01 contract.
 * The public root no longer consumes this endpoint; the canonical authority is
 * getPublicTrackingSnapshot and tenant_tracking_connectors.
 */
export const obterMetaPixelId = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ pixel_id: string | null }> => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("tenant_id, value")
      .eq("tenant_id", tenant.id)
      .eq("key", "meta_integracao")
      .limit(2);
    if (error) throw new Error(error.message);
    if ((data ?? []).length > 1) {
      throw new Error("Tenant Meta integration setting is ambiguous.");
    }
    const row = assertOptionalTenantScopedRow(tenant.id, data?.[0] ?? null);
    const value = row?.value as { pixel_id?: unknown } | null | undefined;
    return {
      pixel_id:
        typeof value?.pixel_id === "string" && value.pixel_id.trim()
          ? value.pixel_id.trim()
          : null,
    };
  },
);

/** Canonical admin compatibility projection. Tokens are never returned. */
export const obterMetaConfigAdmin = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const auth = await authorizeTenantTrackingOperation(
      { userId: context.userId, tenant: context.tenant },
      "view",
    );
    const connectors = await listTenantTrackingConnectorRows(auth.tenantId);
    const meta = connectors.find((connector) => connector.providerKey === "META_PIXEL") ?? null;
    return {
      pixel_id: meta?.providerIdentifier ?? "",
      token_set: false,
      authority: "tenant_tracking_connectors" as const,
      legacy_configuration_writable: false as const,
      external_capi_enabled: false as const,
    };
  });

/**
 * Legacy mutation endpoint retained only to fail closed for stale consumers.
 * Configuration must be performed by tenant-tracking.functions.
 */
export const atualizarMetaConfigAdmin = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(
    z.object({
      pixel_id: z.string().trim().max(64),
      conversions_api_token: z.string().optional(),
    }).strict(),
  )
  .handler(async ({ context }) => {
    await authorizeTenantTrackingOperation(
      { userId: context.userId, tenant: context.tenant },
      "configure",
    );
    throw new Error("legacy_tracking_configuration_disabled_use_tracking_center");
  });

export interface MetaUserData {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  client_ip?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
}

const metaEventSchema = z
  .object({
    event_name: z.string().min(1),
    event_id: z.string().min(1),
    event_source_url: z.string().optional(),
    action_source: z.enum(["website", "system_generated"]).default("website"),
    user_data: z
      .object({
        email: z.string().optional(),
        phone: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        client_ip: z.string().optional(),
        client_user_agent: z.string().optional(),
        fbp: z.string().optional(),
        fbc: z.string().optional(),
      })
      .strict()
      .optional(),
    custom_data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/**
 * Legacy CAPI endpoint retained as a fail-closed compatibility boundary.
 * It resolves Host authority and legacy credential cardinality before refusing
 * execution. No network request and no success state are produced.
 */
export const enviarEventoMetaCAPI = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => metaEventSchema.parse(data))
  .handler(async () => {
    const tenant = await requirePublicWriterTenantFromRequest();
    const legacy = await loadPublicMetaCredentials(tenant);
    try {
      return {
        ok: false as const,
        reason: "adapter-not-implemented" as const,
        pixelConfigured: Boolean(legacy.pixelId),
        credentialConfigured: Boolean(legacy.token),
        externalProviderCalled: false as const,
        externalDeliveryProved: false as const,
      };
    } catch {
      return {
        ok: false as const,
        reason: "adapter-not-implemented" as const,
        pixelConfigured: false,
        credentialConfigured: false,
        externalProviderCalled: false as const,
        externalDeliveryProved: false as const,
      };
    }
  });
