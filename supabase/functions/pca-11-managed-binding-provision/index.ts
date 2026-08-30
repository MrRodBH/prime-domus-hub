import { createClient } from "npm:@supabase/supabase-js@2.108.2";
import {
  executePca11ManagedBindingProvisioning,
  Pca11ProvisioningError,
  sha256WithWebCrypto,
} from "../_shared/pca11-managed-binding-core.ts";

const JSON_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
});
const MAX_REQUEST_BYTES = 16_384;

function json(
  status: number,
  body: Record<string, unknown>,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...Object.fromEntries(new Headers(extraHeaders)) },
  });
}

function requireEnvironment(name: string): string {
  const value = Deno.env.get(name);
  if (!value)
    throw new Pca11ProvisioningError(
      "pca11_missing_server_dependency",
      `Missing required server dependency: ${name}`,
      503,
    );
  return value;
}

function resolveManagedDefaultKey(bundleName: string, legacyName: string): string {
  const bundle = Deno.env.get(bundleName);
  if (bundle) {
    try {
      const parsed = JSON.parse(bundle) as Record<string, unknown>;
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        typeof parsed.default === "string" &&
        parsed.default
      ) {
        return parsed.default;
      }
    } catch {
      // A malformed managed bundle fails closed unless the legacy managed key is present.
    }
  }
  return requireEnvironment(legacyName);
}

function resolvedEnvironment(name: string): string | undefined {
  if (name === "SUPABASE_PUBLISHABLE_KEY") {
    return resolveManagedDefaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  }
  if (name === "SUPABASE_SERVICE_ROLE_KEY") {
    return resolveManagedDefaultKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  }
  return Deno.env.get(name);
}

async function authenticateGlobalSuperAdmin(request: Request): Promise<void> {
  if (request.headers.has("x-tenant-id")) {
    throw new Pca11ProvisioningError(
      "pca11_tenant_header_prohibited",
      "x-tenant-id is prohibited",
      400,
    );
  }
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    throw new Pca11ProvisioningError(
      "pca11_unauthorized",
      "Bearer authentication is required",
      401,
    );
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token)
    throw new Pca11ProvisioningError(
      "pca11_unauthorized",
      "Bearer authentication is required",
      401,
    );

  const supabaseUrl = requireEnvironment("SUPABASE_URL");
  const publishableKey = resolveManagedDefaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const privilegedKey = resolveManagedDefaultKey(
    "SUPABASE_SECRET_KEYS",
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const authClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string" || !userId) {
    throw new Pca11ProvisioningError("pca11_unauthorized", "Invalid authenticated subject", 401);
  }

  const adminClient = createClient(supabaseUrl, privilegedKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: roles, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin");
  if (roleError || !roles || roles.length !== 1) {
    throw new Pca11ProvisioningError(
      "pca11_forbidden",
      "Exact global super_admin authority is required",
      403,
    );
  }
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return json(405, { ok: false, code: "method_not_allowed" }, { allow: "POST" });
  }

  try {
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      throw new Pca11ProvisioningError(
        "pca11_request_too_large",
        "Request body exceeds the closed limit",
        413,
      );
    }
    await authenticateGlobalSuperAdmin(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new Pca11ProvisioningError(
        "pca11_invalid_json",
        "Request body must be valid JSON",
        400,
      );
    }
    const result = await executePca11ManagedBindingProvisioning(body, {
      fetcher: fetch,
      readEnvironment: resolvedEnvironment,
      sha256: sha256WithWebCrypto,
    });
    return json(
      result.reconciledExistingVersion ? 200 : 201,
      result as unknown as Record<string, unknown>,
    );
  } catch (error) {
    if (error instanceof Pca11ProvisioningError) {
      return json(error.status, { ok: false, code: error.code });
    }
    return json(500, { ok: false, code: "pca11_internal_failure" });
  }
});
