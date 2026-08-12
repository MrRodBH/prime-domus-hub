import type { TenantDomainRecord } from "./domain-contracts";

export interface CloudflareProviderContext {
  accountIdentifier: string;
  zoneId: string;
  credentialReference: string;
}

export interface CloudflareCustomHostnameObservation {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string | null;
  ownershipVerification: { type: string; name: string; value: string } | null;
  errors: readonly { code: number | string; message: string }[];
  version: string | null;
  createdAt: string | null;
}

export interface CloudflarePort {
  /** First-create only. Exact-hostname lookup is collision detection, never ownership/adoption. */
  provisionCustomHostname(input: {
    provider: CloudflareProviderContext;
    domain: TenantDomainRecord;
    idempotencyKey: string;
  }): Promise<CloudflareCustomHostnameObservation>;
  /** Observe only the server-persisted or server-validated provider object id. */
  observeCustomHostname(input: {
    provider: CloudflareProviderContext;
    domain: TenantDomainRecord;
    expectedCustomHostnameId: string;
  }): Promise<CloudflareCustomHostnameObservation>;
  /** Remove only the exact server-persisted provider object id. */
  removeCustomHostname(input: {
    provider: CloudflareProviderContext;
    domain: TenantDomainRecord;
    customHostnameId: string;
  }): Promise<{ removed: true; alreadyAbsent: boolean }>;
}
