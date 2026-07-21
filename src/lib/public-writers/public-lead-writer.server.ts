import {
  assertTenantScopedCollection,
  PublicWriterError,
  type PublicWriterTenantIdentity,
  selectExactlyOneTenantScopedRow,
} from "@/lib/public-writers/public-writer-authority.server";

export interface PublicLeadAttribution {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  referrer?: string | null;
  landing_url?: string | null;
}

export interface PublicLeadCommand {
  nome: string;
  email?: string | null;
  telefone?: string | null;
  mensagem?: string | null;
  origem: string;
  imovelId?: string | null;
  launchProjectId?: string | null;
  valorEstimado?: number | null;
  attribution?: PublicLeadAttribution;
  notificationMode?: "direct_site" | "none";
}

export interface PublicLeadWriteResult {
  id: string;
  tenantId: string;
  imovelId: string | null;
  launchProjectId: string | null;
  corretorId: string | null;
  assignedTo: string | null;
}

type PropertyRow = {
  id: string;
  tenant_id: string;
  corretor_id: string | null;
  codigo: string | null;
  titulo: string | null;
};

type LaunchRow = {
  id: string;
  tenant_id: string;
  corretor_id: string | null;
  nome: string | null;
};

type BrokerRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  nome: string | null;
  email: string | null;
};

function requiredTenant(tenant: PublicWriterTenantIdentity): PublicWriterTenantIdentity {
  if (!tenant?.id) {
    throw new PublicWriterError(
      "public_tenant_unresolved",
      "Validated tenant identity is required before public lead writing.",
      500,
    );
  }
  return tenant;
}

async function resolveProperty(
  tenant: PublicWriterTenantIdentity,
  id: string | null | undefined,
): Promise<PropertyRow | null> {
  if (!id) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("imoveis")
    .select("id, tenant_id, corretor_id, codigo, titulo")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .limit(2);
  if (error) throw new Error(error.message);
  return selectExactlyOneTenantScopedRow(
    tenant,
    data as PropertyRow[] | null,
    {
      zeroMessage: "Property not found in the accepted tenant.",
      ambiguousMessage: "Property identity is ambiguous in the accepted tenant.",
    },
  );
}

async function resolveLaunch(
  tenant: PublicWriterTenantIdentity,
  id: string | null | undefined,
): Promise<LaunchRow | null> {
  if (!id) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("launch_projects")
    .select("id, tenant_id, corretor_id, nome")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .limit(2);
  if (error) throw new Error(error.message);
  return selectExactlyOneTenantScopedRow(
    tenant,
    data as LaunchRow[] | null,
    {
      zeroMessage: "Launch project not found in the accepted tenant.",
      ambiguousMessage: "Launch project identity is ambiguous in the accepted tenant.",
    },
  );
}

async function resolveBroker(
  tenant: PublicWriterTenantIdentity,
  id: string | null,
): Promise<BrokerRow | null> {
  if (!id) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("corretores")
    .select("id, tenant_id, user_id, nome, email")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .limit(2);
  if (error) throw new Error(error.message);
  return selectExactlyOneTenantScopedRow(
    tenant,
    data as BrokerRow[] | null,
    {
      zeroMessage: "Responsible broker not found in the accepted tenant.",
      ambiguousMessage: "Responsible broker identity is ambiguous in the accepted tenant.",
    },
  );
}

async function resolveTenantContactEmail(
  tenant: PublicWriterTenantIdentity,
): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("tenant_id, value")
    .eq("tenant_id", tenant.id)
    .eq("key", "contato")
    .limit(2);
  if (error) throw new Error(error.message);
  const row = selectExactlyOneTenantScopedRow(
    tenant,
    data as Array<{ tenant_id: string; value: unknown }> | null,
    {
      allowZero: true,
      ambiguousMessage: "Tenant contact settings are ambiguous.",
    },
  );
  const value = row?.value as { email?: unknown } | null | undefined;
  return typeof value?.email === "string" && value.email.trim() ? value.email.trim() : null;
}

async function resolveTenantManagerEmails(
  tenant: PublicWriterTenantIdentity,
): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  const { data: memberships, error: membershipError } = await admin
    .from("tenant_members")
    .select("tenant_id, user_id, role, status")
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);
  if (membershipError) throw new Error(membershipError.message);
  const acceptedMemberships = assertTenantScopedCollection(
    tenant,
    memberships as Array<{ tenant_id: string; user_id: string }> | null,
  );
  const userIds = Array.from(new Set(acceptedMemberships.map((row) => row.user_id).filter(Boolean)));
  if (!userIds.length) return [];

  const { data: brokers, error: brokerError } = await admin
    .from("corretores")
    .select("tenant_id, user_id, email")
    .eq("tenant_id", tenant.id)
    .in("user_id", userIds);
  if (brokerError) throw new Error(brokerError.message);
  return Array.from(
    new Set(
      assertTenantScopedCollection(
        tenant,
        brokers as Array<{ tenant_id: string; user_id: string; email: string | null }> | null,
      )
        .map((row) => row.email?.trim())
        .filter((email): email is string => Boolean(email)),
    ),
  );
}

async function notifyDirectSiteLead(input: {
  tenant: PublicWriterTenantIdentity;
  leadId: string;
  command: PublicLeadCommand;
  property: PropertyRow | null;
  launch: LaunchRow | null;
  broker: BrokerRow | null;
}): Promise<void> {
  if (input.command.notificationMode !== "direct_site") return;

  try {
    const brokerEmail = input.broker?.email?.trim() || null;
    const recipients = brokerEmail
      ? [brokerEmail]
      : await resolveTenantManagerEmails(input.tenant);
    if (!recipients.length) {
      const contactEmail = await resolveTenantContactEmail(input.tenant);
      if (contactEmail) recipients.push(contactEmail);
    }
    if (!recipients.length) return;

    const { enqueueTransactional } = await import("@/lib/email/notify.server");
    const templateData = {
      nome: input.command.nome,
      email: input.command.email || undefined,
      telefone: input.command.telefone || undefined,
      mensagem: input.command.mensagem || undefined,
      origem: input.command.origem,
      imovel_codigo: input.property?.codigo || undefined,
      imovel_titulo: input.property?.titulo || undefined,
      lancamento_nome: input.launch?.nome || undefined,
      corretor_nome: input.broker?.nome || undefined,
      recebido_em: new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }),
    };

    for (const to of recipients) {
      await enqueueTransactional({
        templateName: "novo-lead",
        to,
        idempotencyKey: `lead-${input.leadId}-${to}`,
        templateData,
      });
    }
  } catch (error) {
    console.error("Falha ao notificar lead por e-mail:", error);
  }
}

export async function writePublicLead(input: {
  tenant: PublicWriterTenantIdentity;
  command: PublicLeadCommand;
}): Promise<PublicLeadWriteResult> {
  const tenant = requiredTenant(input.tenant);
  const command = input.command;
  if (!command.email && !command.telefone) {
    throw new PublicWriterError(
      "writer_input_invalid",
      "Informe e-mail ou telefone para contato.",
      400,
    );
  }

  const [property, launch] = await Promise.all([
    resolveProperty(tenant, command.imovelId),
    resolveLaunch(tenant, command.launchProjectId),
  ]);
  const corretorId = launch?.corretor_id ?? property?.corretor_id ?? null;
  const broker = await resolveBroker(tenant, corretorId);
  const assignedTo = broker?.user_id ?? null;
  const leadId = crypto.randomUUID();
  const attribution = command.attribution ?? {};

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("leads").insert({
    id: leadId,
    tenant_id: tenant.id,
    nome: command.nome,
    email: command.email || null,
    telefone: command.telefone || null,
    mensagem: command.mensagem || null,
    origem: command.origem,
    imovel_id: property?.id ?? null,
    launch_project_id: launch?.id ?? null,
    corretor_id: broker?.id ?? null,
    assigned_to: assignedTo,
    status: "novo",
    consent_lgpd: true,
    consent_at: new Date().toISOString(),
    valor_estimado: command.valorEstimado ?? null,
    utm_source: attribution.utm_source || null,
    utm_medium: attribution.utm_medium || null,
    utm_campaign: attribution.utm_campaign || null,
    utm_term: attribution.utm_term || null,
    utm_content: attribution.utm_content || null,
    gclid: attribution.gclid || null,
    fbclid: attribution.fbclid || null,
    referrer: attribution.referrer || null,
    landing_url: attribution.landing_url || null,
  } as never);
  if (error) throw new Error(error.message);

  await notifyDirectSiteLead({
    tenant,
    leadId,
    command,
    property,
    launch,
    broker,
  });

  return {
    id: leadId,
    tenantId: tenant.id,
    imovelId: property?.id ?? null,
    launchProjectId: launch?.id ?? null,
    corretorId: broker?.id ?? null,
    assignedTo,
  };
}
