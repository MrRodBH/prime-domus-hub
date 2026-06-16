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

/** Converte um caminho "bucket/path" em URL assinada. Aceita já URLs http. */
export async function signedUrl(
  supabase: ReturnType<typeof publicClient>,
  bucket: string,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGN_TTL);
  if (error || !data) return null;
  return data.signedUrl;
}

export const obterSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) throw new Error(error.message);
  const result: Record<string, Record<string, unknown>> = {
    branding: {},
    home_hero: {},
    contato: {},
  };
  for (const row of data ?? []) {
    result[row.key] = (row.value as Record<string, unknown>) ?? {};
  }
  // Resolve logo signed URL
  const branding = result.branding as { logo_path?: string | null };
  if (branding.logo_path) {
    const url = await signedUrl(supabase, "site", branding.logo_path);
    (result.branding as Record<string, unknown>).logo_url = url;
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
