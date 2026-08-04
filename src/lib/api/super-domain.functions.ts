import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { assertGlobalSuperAdmin, authorizeTenantDomainOperation } from "@/lib/domains/domain-authority.server";
import {
  enqueueDomainJob,
  getDomainPlatformDiagnostics as loadDiagnostics,
  getTenantDomain,
  listDomainOperationFailures,
  listProviderAccountHealth,
} from "@/lib/domains/domain-repository.server";
import { assertDomainCutoverReady } from "@/lib/domains/domain-reconciliation.server";
import { DomainError, sanitizeDomainDetail, toSafeDomainError } from "@/lib/domains/domain-errors";
import { normalizeDomainHostname } from "@/lib/domains/domain-normalization";

const providerIdSchema = z.object({ providerAccountId: z.string().uuid() }).strict();
const providerRegistrationSchema = z.object({
  accountIdentifier: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  credentialReference: z.string().regex(/^env:[A-Z][A-Z0-9_]{2,127}$/).max(132),
  zones: z.record(z.string().min(3).max(253), z.string().regex(/^[A-Za-z0-9_-]{8,64}$/)),
}).strict();
const retrySchema = z.object({ domainId: z.string().uuid() }).strict();
const availabilitySchema = providerIdSchema.extend({ enabled: z.boolean() }).strict();
const credentialSchema = providerIdSchema.extend({
  credentialReference: z.string().regex(/^env:[A-Z][A-Z0-9_]{2,127}$/).max(132),
}).strict();
const trustedTenant = (context: any) => ({ userId: context.userId as string, tenant: context.tenant });

export const registerCloudflareProviderAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => providerRegistrationSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertGlobalSuperAdmin(context);
    const normalizedZones: Record<string, string> = {};
    for (const [hostname, zoneId] of Object.entries(data.zones)) {
      const normalized = normalizeDomainHostname(hostname);
      if (normalized.hostname !== normalized.registrableDomain) {
        throw new DomainError("domain_provider_configuration_invalid", "Provider zone key must be a registrable-domain apex");
      }
      if (Object.prototype.hasOwnProperty.call(normalizedZones, normalized.registrableDomain)) {
        throw new DomainError("domain_ambiguous", "Duplicate normalized provider zone binding");
      }
      normalizedZones[normalized.registrableDomain] = zoneId;
    }
    if (Object.keys(normalizedZones).length === 0) {
      throw new DomainError("domain_provider_configuration_invalid", "At least one server-owned zone binding is required");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any).rpc("register_domain_provider_account", {
      _account_identifier: data.accountIdentifier,
      _credential_reference: data.credentialReference,
      _zones: normalizedZones,
      _actor_user_id: context.userId,
      _authority_origin: "super_admin",
    });
    if (error) throw toSafeDomainError(error);
    if (!rows || rows.length !== 1) throw new DomainError("domain_ambiguous", "Provider account was not resolved exactly once");
    return { ...rows[0], credentialReference: "[redacted]" };
  });

export const getDomainPlatformDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertGlobalSuperAdmin(context);
    const diagnostics = await loadDiagnostics();
    return {
      ...diagnostics,
      serverDomainAuthority: true,
      clientDomainAuthority: false,
      externalSuccessInferred: false,
    };
  });

export const listDomainOperationFailuresForSuper = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ limit: z.number().int().min(1).max(132).optional() }).strict().parse(data ?? {}))
  .handler(async ({ context, data }) => {
    await assertGlobalSuperAdmin(context);
    return listDomainOperationFailures(data.limit ?? 100);
  });

export const getProviderAccountHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertGlobalSuperAdmin(context);
    return listProviderAccountHealth();
  });

export const prepareAuthoritativeDomainCutover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertGlobalSuperAdmin(context);
    const preflight = await assertDomainCutoverReady();
    return {
      ...preflight,
      cutoverExecuted: false,
      productionCutoverAuthorized: false,
      nextAction: "deploy_exact_release_after_separate_production_authorization",
    };
  });

export const rotateProviderCredentialReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => credentialSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertGlobalSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any).rpc("rotate_domain_provider_credential_reference", {
      _provider_account_id: data.providerAccountId,
      _credential_reference: data.credentialReference,
      _actor_user_id: context.userId,
      _authority_origin: "super_admin",
    });
    if (error) throw toSafeDomainError(error);
    if (!rows || rows.length !== 1) throw new DomainError("domain_not_found", "Provider account was not resolved exactly once");
    return { updated: true, credentialReference: "[redacted]" };
  });

export const setProviderAccountAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => availabilitySchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertGlobalSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any).rpc("set_domain_provider_account_availability", {
      _provider_account_id: data.providerAccountId,
      _enabled: data.enabled,
      _actor_user_id: context.userId,
      _authority_origin: "super_admin",
    });
    if (error) throw toSafeDomainError(error);
    if (!rows || rows.length !== 1) throw new DomainError("domain_not_found", "Provider account was not resolved exactly once");
    return { updated: true, enabled: data.enabled };
  });

export const retryDomainOperationAsImpersonatedTenant = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => retrySchema.parse(data))
  .handler(async ({ context, data }) => {
    const authority = await authorizeTenantDomainOperation(trustedTenant(context), "operate");
    if (!authority.isSuperAdmin || authority.origin !== "impersonation") {
      throw new DomainError("domain_authority_denied", "Explicit Super Admin impersonation is required");
    }
    const domain = await getTenantDomain(authority.tenantId, data.domainId);
    const operationType = domain.status === "pending_ownership_verification" ? "observe_ownership_dns"
      : domain.status === "ownership_verified" ? "prepare_dns_configuration"
      : domain.status === "pending_dns_configuration" ? "observe_required_dns"
      : domain.status === "pending_cloudflare_provisioning" ? "provision_provider_binding"
      : domain.status === "removal_pending" ? "cleanup_domain"
      : "reconcile_domain";
    return enqueueDomainJob({
      authority,
      domain,
      operationType,
      payload: { impersonatedRetryRequestedAt: new Date().toISOString() },
    });
  });

export const recordManualAssistedObservationAsImpersonatedTenant = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => z.object({
    domainId: z.string().uuid(),
    observationKind: z.enum(["ownership", "required_dns", "provider", "ssl"]),
    providerObjectIdHint: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/).optional(),
    operatorNote: z.string().trim().max(500).optional(),
  }).strict().parse(data))
  .handler(async ({ context, data }) => {
    const authority = await authorizeTenantDomainOperation(trustedTenant(context), "operate");
    if (!authority.isSuperAdmin || authority.origin !== "impersonation") {
      throw new DomainError("domain_authority_denied", "Explicit Super Admin impersonation is required");
    }
    const domain = await getTenantDomain(authority.tenantId, data.domainId);
    if (data.observationKind === "provider" && !data.providerObjectIdHint) {
      throw new DomainError("domain_provider_configuration_invalid", "Provider object hint is required for manual-assisted provider observation");
    }
    const operationType = data.observationKind === "ownership" ? "observe_ownership_dns"
      : data.observationKind === "required_dns" ? "observe_required_dns"
      : data.observationKind === "provider" ? "provision_provider_binding"
      : "observe_ssl_lifecycle";
    const job = await enqueueDomainJob({
      authority,
      domain,
      operationType,
      payload: {
        operatorNote: sanitizeDomainDetail(data.operatorNote ?? ""),
        providerObjectIdHint: data.providerObjectIdHint ?? null,
        operatorDidNotAssertSuccess: true,
      },
    });
    return { job, operatorSuccessAssertionAccepted: false };
  });
