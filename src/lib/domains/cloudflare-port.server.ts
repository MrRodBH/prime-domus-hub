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
}

export interface CloudflarePort {
  provisionCustomHostname(input: {
    provider: CloudflareProviderContext;
    domain: TenantDomainRecord;
    idempotencyKey: string;
  }): Promise<CloudflareCustomHostnameObservation>;
  observeCustomHostname(input: {
    provider: CloudflareProviderContext;
    customHostnameId: string;
  }): Promise<CloudflareCustomHostnameObservation>;
  removeCustomHostname(input: {
    provider: CloudflareProviderContext;
    domain: TenantDomainRecord;
    customHostnameId: string;
  }): Promise<{ removed: true; alreadyAbsent: boolean }>;
}
