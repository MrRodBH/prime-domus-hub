/**
 * M3.4 — Signed URL Hardening
 *
 * Constantes de TTL centralizadas e validador de path/bucket para geração
 * segura de Signed URLs tenant-scoped.
 *
 * Regras (IA-004 / M3.4):
 *  - Signed URL NÃO é autorização. Autorização acontece server-side ANTES
 *    da assinatura (auth + tenant + ownership + permissão).
 *  - TTL curto por padrão. Preview admin = 15 min. Download op = 60 min.
 *  - Path tenant-scoped DEVE começar com `${tenantId}/` e passar por
 *    validação anti-traversal.
 *  - Bucket precisa estar em allowlist tenant-scoped.
 *
 * NÃO USAR para public website assets (branding/hero público) — esses
 * seguem fluxo próprio documentado em docs/delivery/phase-02-multi-tenancy/19-m3-4-signed-url-hardening.md.
 */

/** 15 minutos — previews administrativos (Media Library, admin viewer). */
export const SIGNED_URL_TTL_PREVIEW_SECONDS = 60 * 15;

/** 60 minutos — downloads operacionais autenticados (PDF, original). */
export const SIGNED_URL_TTL_DOWNLOAD_SECONDS = 60 * 60;

/**
 * Buckets considerados tenant-scoped privados. Qualquer path assinado nesses
 * buckets DEVE ter prefixo `${tenantId}/`.
 */
export const TENANT_SCOPED_PRIVATE_BUCKETS = ["site", "imoveis", "lancamentos"] as const;
export type TenantScopedBucket = (typeof TENANT_SCOPED_PRIVATE_BUCKETS)[number];

export function isTenantScopedBucket(bucket: string): bucket is TenantScopedBucket {
  return (TENANT_SCOPED_PRIVATE_BUCKETS as readonly string[]).includes(bucket);
}

/**
 * Valida shape de um path tenant-scoped:
 *  - não vazio
 *  - sem path traversal (`..`)
 *  - sem path absoluto (`/…`)
 *  - sem separador Windows (`\`)
 *  - começa com `${tenantId}/`
 *
 * Fail-fast: lança Error com mensagem estável.
 */
export function assertTenantScopedPath(path: string, tenantId: string): void {
  if (!path || typeof path !== "string") {
    throw new Error("Signed URL: path vazio ou inválido.");
  }
  if (path.includes("..") || path.includes("\\") || path.startsWith("/")) {
    throw new Error("Signed URL: path inseguro (traversal ou absoluto).");
  }
  if (!tenantId) {
    throw new Error("Signed URL: tenant efetivo não resolvido.");
  }
  const prefix = `${tenantId}/`;
  if (!path.startsWith(prefix)) {
    throw new Error("Signed URL: path fora do escopo do tenant.");
  }
}

/**
 * Valida bucket + path tenant-scoped e lança fail-fast em qualquer violação.
 * Retorna o par validado para uso imediato em `createSignedUrl`.
 */
export function validateTenantSignRequest(params: {
  bucket: string;
  path: string;
  tenantId: string;
}): { bucket: TenantScopedBucket; path: string } {
  const { bucket, path, tenantId } = params;
  if (!isTenantScopedBucket(bucket)) {
    throw new Error(`Signed URL: bucket "${bucket}" fora da allowlist tenant-scoped.`);
  }
  assertTenantScopedPath(path, tenantId);
  return { bucket, path };
}
