import { PCA11_DEDICATED_WORKER } from "@/lib/cloudflare/managed-inactive-version-contract.server";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
const CLOUDFLARE_ACCOUNT_ID = "68ec853e6b04a038f09fca5712d6b26b";
const VERSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PAGES = 20;
const PAGE_SIZE = 100;

type Fetcher = typeof fetch;

interface CloudflareEnvelope {
  success: boolean;
  result: unknown;
  result_info?: { page?: number; total_pages?: number };
}

export interface Pca15rTerminalReconciliationDependencies {
  fetcher?: Fetcher;
}

export interface Pca15rTerminalEvidence {
  method: "GET_ONLY";
  workerId: typeof PCA11_DEDICATED_WORKER;
  expectedVersionObserved: true;
  versionCount: number;
  deploymentCount: 0;
  routeCount: 0;
  customDomainCount: 0;
  cronCount: 0;
  accessAppCount: 0;
  reusablePolicyCount: 0;
  serviceTokenCount: 0;
  workersDevEnabled: false;
  previewsEnabled: false;
}

export class Pca15rTerminalReconciliationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 409,
  ) {
    super(code);
    this.name = "Pca15rTerminalReconciliationError";
  }
}

function fail(code: string, status = 409): never {
  throw new Pca15rTerminalReconciliationError(code, status);
}

function providerHeaders(provisioner: string): HeadersInit {
  return { Authorization: `Bearer ${provisioner}` };
}

async function getEnvelope(
  path: string,
  provisioner: string,
  fetcher: Fetcher,
): Promise<CloudflareEnvelope> {
  const response = await fetcher(`${CLOUDFLARE_API_BASE}${path}`, {
    method: "GET",
    headers: providerHeaders(provisioner),
    cache: "no-store",
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return fail("pca15r_cloudflare_invalid_response", 502);
  }
  const envelope = payload as CloudflareEnvelope | null;
  if (!response.ok || envelope?.success !== true) {
    return fail("pca15r_cloudflare_get_failed", 502);
  }
  return envelope;
}

function resultItems(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items;
  }
  return fail("pca15r_cloudflare_list_shape", 502);
}

function pagedPath(path: string, page: number): string {
  return `${path}${path.includes("?") ? "&" : "?"}per_page=${PAGE_SIZE}&page=${page}`;
}

async function getAllPages(
  path: string,
  provisioner: string,
  fetcher: Fetcher,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const envelope = await getEnvelope(pagedPath(path, page), provisioner, fetcher);
    const items = resultItems(envelope.result);
    rows.push(...items);
    const totalPages = envelope.result_info?.total_pages;
    if (typeof totalPages === "number" ? page >= totalPages : items.length < PAGE_SIZE) {
      return rows;
    }
  }
  return fail("pca15r_cloudflare_pagination_bound_exceeded", 502);
}

function nestedList(result: unknown, key: string): unknown[] {
  if (!result || typeof result !== "object") {
    return fail("pca15r_cloudflare_list_shape", 502);
  }
  const rows = (result as Record<string, unknown>)[key];
  if (!Array.isArray(rows)) return fail("pca15r_cloudflare_list_shape", 502);
  return rows;
}

function requireZero(count: number, code: string): 0 {
  if (count !== 0) fail(code);
  return 0;
}

export async function reconcilePca15rTerminalStateGetOnly(
  provisioner: string,
  expectedVersionId: string,
  dependencies: Pca15rTerminalReconciliationDependencies = {},
): Promise<Pca15rTerminalEvidence> {
  if (!provisioner) fail("pca15r_missing_server_dependency", 503);
  if (!VERSION_ID_RE.test(expectedVersionId)) fail("pca15r_invalid_created_version_id");
  const fetcher = dependencies.fetcher ?? fetch;
  const workerPrefix = `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${PCA11_DEDICATED_WORKER}`;

  const [
    versions,
    deploymentsEnvelope,
    subdomainEnvelope,
    schedulesEnvelope,
    accessApps,
    reusablePolicies,
    serviceTokens,
    customDomains,
    zones,
  ] = await Promise.all([
    getAllPages(`${workerPrefix}/versions`, provisioner, fetcher),
    getEnvelope(`${workerPrefix}/deployments`, provisioner, fetcher),
    getEnvelope(`${workerPrefix}/subdomain`, provisioner, fetcher),
    getEnvelope(`${workerPrefix}/schedules`, provisioner, fetcher),
    getAllPages(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps`, provisioner, fetcher),
    getAllPages(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/policies`, provisioner, fetcher),
    getAllPages(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/service_tokens`, provisioner, fetcher),
    getAllPages(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/domains`, provisioner, fetcher),
    getAllPages(`/zones?account.id=${CLOUDFLARE_ACCOUNT_ID}`, provisioner, fetcher),
  ]);

  const versionIds = versions.map((entry) =>
    entry && typeof entry === "object" ? (entry as Record<string, unknown>).id : null,
  );
  if (!versionIds.includes(expectedVersionId)) fail("pca15r_created_version_not_observed");

  const deployments = Array.isArray(deploymentsEnvelope.result)
    ? deploymentsEnvelope.result
    : nestedList(deploymentsEnvelope.result, "deployments");
  const schedules = Array.isArray(schedulesEnvelope.result)
    ? schedulesEnvelope.result
    : nestedList(schedulesEnvelope.result, "schedules");
  const subdomain = subdomainEnvelope.result as Record<string, unknown> | null;
  if (!subdomain || subdomain.enabled !== false || subdomain.previews_enabled !== false) {
    fail("pca15r_ingress_not_zero");
  }

  const routeLists = await Promise.all(
    zones.map(async (zone) => {
      const zoneId = zone && typeof zone === "object" ? (zone as Record<string, unknown>).id : null;
      if (typeof zoneId !== "string" || !zoneId) {
        return fail("pca15r_cloudflare_zone_shape", 502);
      }
      return getAllPages(`/zones/${zoneId}/workers/routes`, provisioner, fetcher);
    }),
  );
  const routes = routeLists.flat();

  return {
    method: "GET_ONLY",
    workerId: PCA11_DEDICATED_WORKER,
    expectedVersionObserved: true,
    versionCount: versions.length,
    deploymentCount: requireZero(deployments.length, "pca15r_deployment_not_zero"),
    routeCount: requireZero(routes.length, "pca15r_route_not_zero"),
    customDomainCount: requireZero(customDomains.length, "pca15r_custom_domain_not_zero"),
    cronCount: requireZero(schedules.length, "pca15r_cron_not_zero"),
    accessAppCount: requireZero(accessApps.length, "pca15r_access_app_not_zero"),
    reusablePolicyCount: requireZero(reusablePolicies.length, "pca15r_reusable_policy_not_zero"),
    serviceTokenCount: requireZero(serviceTokens.length, "pca15r_service_token_not_zero"),
    workersDevEnabled: false,
    previewsEnabled: false,
  };
}
