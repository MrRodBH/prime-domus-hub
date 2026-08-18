// BCR-01 — HTTP-to-trusted billing context adapter. Server-only.
//
// Tenant resolution delegates to the canonical resolveTenantContext algorithm;
// x-tenant-id remains transport only. This file exists because file-route HTTP
// handlers do not directly execute TanStack function middleware.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  resolveTenantContext,
} from "@/integrations/supabase/tenant-middleware";
import { createSupabaseTenantRepository } from "@/integrations/supabase/tenant-repository";
import {
  authorizeTenantBillingOperation,
  type TrustedBillingContext,
} from "@/lib/billing/billing-authorization.server";
import type {
  BillingAuthorizationContext,
  BillingOperation,
} from "@/lib/billing/billing-contracts";

export class BillingRequestContextError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "BillingRequestContextError";
    this.code = code;
    this.status = status;
  }
}

function requireBearer(request: Request): string {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new BillingRequestContextError("bcr01_unauthorized", 401);
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new BillingRequestContextError("bcr01_unauthorized", 401);
  }
  return token;
}

function createRequestSupabase(token: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new BillingRequestContextError("bcr01_supabase_environment_absent", 500);
  }

  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function resolveAuthorizedBillingRequest(
  request: Request,
  operation: BillingOperation,
): Promise<{
  readonly authorization: BillingAuthorizationContext;
  readonly trusted: TrustedBillingContext;
}> {
  const token = requireBearer(request);
  const supabase = createRequestSupabase(token);

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string" || !userId) {
    throw new BillingRequestContextError("bcr01_unauthorized", 401);
  }

  const { data: isAdminData, error: adminError } =
    await supabase.rpc("is_super_admin");
  if (adminError) {
    throw new BillingRequestContextError("bcr01_super_admin_resolution_failed", 500);
  }

  const transportTenantId = request.headers.get("x-tenant-id")?.trim() || null;
  const repo = createSupabaseTenantRepository(supabase);

  let tenant;
  try {
    tenant = await resolveTenantContext({
      userId,
      isSuperAdmin: isAdminData === true,
      impersonateHeader: transportTenantId,
      repo,
    });
  } catch {
    // Do not leak membership/cardinality/tenant-existence details to API clients.
    throw new BillingRequestContextError("bcr01_tenant_access_denied", 403);
  }

  const trusted: TrustedBillingContext = { userId, tenant };
  try {
    const authorization = await authorizeTenantBillingOperation(
      trusted,
      operation,
    );
    return { authorization, trusted };
  } catch {
    throw new BillingRequestContextError("bcr01_billing_access_denied", 403);
  }
}
