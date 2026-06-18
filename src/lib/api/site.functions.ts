import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// 1 ano em segundos (URLs assinadas longas para conteúdo público estático)
const SIGN_TTL = 60 * 60 * 24 * 365;

/** Converte um caminho "bucket/path" em URL assinada. Aceita já URLs http.
 *  Usa service role apenas para assinar (a URL gerada é pública e expira). */
export async function signedUrl(
  bucket: string,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, SIGN_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}


export interface SiteSettings {
  branding: {
    logo_path?: string | null;
    logo_url?: string | null;
    favicon_path?: string | null;
    favicon_url?: string | null;
    site_name?: string;
  };
  home_hero: { eyebrow?: string; title_lines?: string[]; subtitle?: string; cta_primary?: string; cta_secondary?: string };
  contato: { telefone?: string; whatsapp?: string; email?: string; endereco?: string; instagram?: string; facebook?: string; linkedin?: string; creci?: string; localizacao?: string };
}

export const obterSiteSettings = createServerFn({ method: "GET" }).handler(async (): Promise<SiteSettings> => {
  const supabase = publicClient();
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) throw new Error(error.message);
  const result: SiteSettings = { branding: {}, home_hero: {}, contato: {} };
  for (const row of data ?? []) {
    if (row.key === "branding" || row.key === "home_hero" || row.key === "contato") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[row.key] = (row.value as Record<string, unknown>) ?? {};
    }
  }
  if (result.branding.logo_path) {
    result.branding.logo_url = await signedUrl("site", result.branding.logo_path);
  }
  if (result.branding.favicon_path) {
    result.branding.favicon_url = await signedUrl("site", result.branding.favicon_path);
  }

  return result;
});

export const atualizarSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      key: z.enum(["branding", "home_hero", "contato"]),
      value: z.record(z.string(), z.unknown()),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: data.key, value: data.value as never, updated_by: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
