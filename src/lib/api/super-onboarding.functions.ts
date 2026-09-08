import { z } from "zod";
import { lookupPostalCode } from "@/components/demo/interactive/postal-lookup";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  saveCompanySchema,
  savePlanSchema,
  type OnboardingSnapshot,
} from "@/lib/onboarding/contracts";

async function authority(context: { userId: string; supabase: SupabaseClient<Database> }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error || !data)
    throw Error("Acesso exclusivo do Super Admin. Não foi possível autorizar esta operação.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
function safeError(error: { message?: string } | null) {
  if (!error) return;
  if (error.message?.includes("onboarding_conflict"))
    throw Error("Este cadastro foi alterado. Recarregue os dados antes de salvar novamente.");
  if (error.message?.includes("onboarding_plan_unavailable"))
    throw Error("O plano selecionado não está ativo. Confira o cadastro do plano.");
  throw Error(
    "Não foi possível salvar no banco. Seus campos foram preservados; confira a conexão e tente novamente.",
  );
}
export const loadSuperOnboarding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OnboardingSnapshot> => {
    const db = await authority(context);
    const [plans, tenants] = await Promise.all([
      db
        .from("commercial_plans")
        .select("id,code,name,description,status,metadata,updated_at")
        .order("sort_order")
        .order("name"),
      db
        .from("tenants")
        .select("id,nome,dominio_principal,plano_codigo,metadata,updated_at")
        .order("nome"),
    ]);
    if (plans.error || tenants.error)
      throw Error("Não foi possível carregar os cadastros do banco. Tente novamente.");
    return { plans: plans.data ?? [], tenants: tenants.data ?? [] } as OnboardingSnapshot;
  });
export const saveSuperPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => savePlanSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await authority(context);
    const { error } = await db.rpc(
      "save_super_onboarding_plan" as never,
      { p_actor: context.userId, p_data: data } as never,
    );
    safeError(error);
    return { saved: true as const };
  });
export const saveSuperCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveCompanySchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await authority(context);
    const { error } = await db.rpc(
      "save_super_onboarding_company" as never,
      { p_actor: context.userId, p_data: data } as never,
    );
    safeError(error);
    return { saved: true as const };
  });

export const lookupSuperPostalCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ cep: z.string().regex(/^\d{8}$/) })
      .strict()
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await authority(context);
    return lookupPostalCode(data.cep, new AbortController().signal);
  });
