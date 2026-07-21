import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePublicWriterTenantFromRequest } from "@/lib/public-writers/public-writer-authority.server";
import {
  loadPublicMetaCredentials,
  loadTenantSettingValue,
} from "@/lib/public-writers/public-campaign-writer.server";

/** Pixel ID — lido no servidor via service role, sempre vinculado ao tenant público resolvido. */
export const obterMetaPixelId = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ pixel_id: string | null }> => {
    const tenant = await requirePublicWriterTenantFromRequest();
    const value = await loadTenantSettingValue<{ pixel_id?: unknown }>({
      tenant,
      key: "meta_integracao",
    });
    return {
      pixel_id:
        typeof value?.pixel_id === "string" && value.pixel_id.trim()
          ? value.pixel_id.trim()
          : null,
    };
  },
);

/** Admin: lê config completa (pixel + indica se token está configurado). Nunca expõe o token. */
export const obterMetaConfigAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in("key", ["meta_integracao", "meta_credenciais"]);
    let pixel_id = "";
    let token_set = false;
    for (const row of data ?? []) {
      if (row.key === "meta_integracao") {
        pixel_id = (row.value as { pixel_id?: string })?.pixel_id ?? "";
      } else if (row.key === "meta_credenciais") {
        token_set = Boolean((row.value as { conversions_api_token?: string })?.conversions_api_token);
      }
    }
    return { pixel_id, token_set };
  });

export const atualizarMetaConfigAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      pixel_id: z.string().trim().max(64),
      conversions_api_token: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "meta_integracao", value: { pixel_id: data.pixel_id }, updated_by: context.userId });

    if (typeof data.conversions_api_token === "string" && data.conversions_api_token.length > 0) {
      await supabaseAdmin
        .from("site_settings")
        .upsert({
          key: "meta_credenciais",
          value: { conversions_api_token: data.conversions_api_token },
          updated_by: context.userId,
        });
    }
    return { ok: true };
  });

/* ---------- Conversions API (server-side) ---------- */

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashOptional(v: string | undefined | null): Promise<string | undefined> {
  if (!v) return undefined;
  return sha256Hex(String(v));
}

function normalizePhone(p: string): string {
  return p.replace(/\D/g, "");
}

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

/** Envia evento server-side para a Meta Conversions API.
 *  Falhas de transporte não impactam UX, mas a autoridade Host deve ser resolvida antes. */
export const enviarEventoMetaCAPI = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => metaEventSchema.parse(data))
  .handler(async ({ data }) => {
    const tenant = await requirePublicWriterTenantFromRequest();
    try {
      const { pixelId, token } = await loadPublicMetaCredentials(tenant);
      if (!pixelId) return { ok: false, reason: "no-pixel-id" };
      if (!token) return { ok: false, reason: "no-token" };

      const ud = data.user_data ?? {};
      const userData: Record<string, string | string[]> = {};
      const emHash = await hashOptional(ud.email);
      if (emHash) userData.em = [emHash];
      const phHash = await hashOptional(ud.phone ? normalizePhone(ud.phone) : undefined);
      if (phHash) userData.ph = [phHash];
      const fnHash = await hashOptional(ud.first_name);
      if (fnHash) userData.fn = [fnHash];
      const lnHash = await hashOptional(ud.last_name);
      if (lnHash) userData.ln = [lnHash];
      const ctHash = await hashOptional(ud.city);
      if (ctHash) userData.ct = [ctHash];
      const stHash = await hashOptional(ud.state);
      if (stHash) userData.st = [stHash];
      if (ud.client_ip) userData.client_ip_address = ud.client_ip;
      if (ud.client_user_agent) userData.client_user_agent = ud.client_user_agent;
      if (ud.fbp) userData.fbp = ud.fbp;
      if (ud.fbc) userData.fbc = ud.fbc;

      const payload = {
        data: [
          {
            event_name: data.event_name,
            event_time: Math.floor(Date.now() / 1000),
            event_id: data.event_id,
            event_source_url: data.event_source_url,
            action_source: data.action_source,
            user_data: userData,
            custom_data: data.custom_data ?? {},
          },
        ],
      };

      const url = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("[Meta CAPI] erro", res.status, txt);
        return { ok: false, reason: "http-error", status: res.status };
      }
      return { ok: true };
    } catch (error) {
      console.error("[Meta CAPI] exceção", {
        tenantId: tenant.id,
        error,
      });
      return { ok: false, reason: "exception" };
    }
  });
