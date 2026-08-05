import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DomainError, toSafeDomainError } from "./domain-errors";
import { normalizeDomainHostname } from "./domain-normalization";
import { sha256 } from "./domain-repository-mappers.server";

export interface LegacyDomainImportManifestEntry {
  tenant_id: string;
  normalized_hostname: string;
  registrable_domain: string;
  public_suffix: string;
  source_sha256: string;
}

/**
 * Build the exact manifest consumed by the single DCA-01 migration.
 * The manifest is server-generated, contains no credential material and must be
 * supplied to the migration in the same controlled database session through
 * app.dca01_legacy_import_manifest. SQL validates exact tenant cardinality,
 * source digest, uniqueness and canonical shape; it never guesses PSL data.
 */
export async function buildLegacyDomainImportManifest(): Promise<LegacyDomainImportManifestEntry[]> {
  const { data, error } = await (supabaseAdmin as any)
    .from("tenants")
    .select("id, dominio_principal")
    .not("dominio_principal", "is", null);
  if (error) throw toSafeDomainError(error);

  const manifest: LegacyDomainImportManifestEntry[] = [];
  const hostnames = new Set<string>();
  const tenantIds = new Set<string>();

  for (const row of data ?? []) {
    const source = typeof row.dominio_principal === "string" ? row.dominio_principal.trim() : "";
    if (!source) continue;
    if (tenantIds.has(row.id)) {
      throw new DomainError("domain_ambiguous", "Legacy tenant cardinality is ambiguous", {
        safeDetail: { tenantId: row.id },
      });
    }
    const normalized = normalizeDomainHostname(source);
    if (hostnames.has(normalized.hostname)) {
      throw new DomainError("domain_hostname_conflict", "Duplicate normalized legacy hostname", {
        safeDetail: { normalizedHostname: normalized.hostname },
      });
    }
    tenantIds.add(row.id);
    hostnames.add(normalized.hostname);
    manifest.push({
      tenant_id: row.id,
      normalized_hostname: normalized.hostname,
      registrable_domain: normalized.registrableDomain,
      public_suffix: normalized.publicSuffix,
      source_sha256: await sha256(source.toLowerCase()),
    });
  }

  return manifest.sort((left, right) => left.tenant_id.localeCompare(right.tenant_id));
}