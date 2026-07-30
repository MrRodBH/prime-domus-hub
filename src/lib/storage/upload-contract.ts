// M3.2 / PR-M2 corrective — client-safe upload intent and server-issued target.
// Bucket, path and filename are derived by the server and persisted in a
// short-lived provenance ledger before the client receives transport data.

export const UPLOAD_DOMAINS = [
  "imoveis",            // bucket "imoveis"      → {tid}/{imovelId}/{file}
  "lancamento-capa",    // bucket "lancamentos"  → {tid}/{slug}/capa/{file}
  "lancamento-galeria", // bucket "lancamentos"  → {tid}/{slug}/galeria/{file}
  "lancamento-pdf",     // bucket "lancamentos"  → {tid}/{slug}/{pdfKind}/{file}
  "blog-cover",         // bucket "site"         → {tid}/blog/{file}
  "blog-inline",        // bucket "site"         → {tid}/blog/inline/{file}
  "cms-page",           // bucket "site"         → {tid}/{pageVariant}/{file}
  "corretor-foto",      // bucket "site"         → {tid}/corretores/{file}
  "media",              // bucket "site"         → {tid}/media/{file}
  "crm-attachment",     // bucket "site"         → {tid}/crm/{leadId}/{file}
] as const;

export type UploadDomain = (typeof UPLOAD_DOMAINS)[number];

/** Intenção funcional enviada pelo client. O path físico nunca é aceito. */
export type CreateUploadTargetInput = {
  domain: UploadDomain;
  originalFileName: string;
  mimeType?: string | null;
  size?: number | null;
  /** Necessário para domínios ligados a uma entidade. */
  entityId?: string | null;
  /** Sub-tipo controlado, como pdfKind ou pageVariant. */
  variant?: string | null;
};

/**
 * Instrução controlada devolvida pelo servidor.
 * `targetId` é a única autoridade aceita no registro final de metadata.
 * `path` e `bucket` são dados de transporte para o upload, não autorização.
 */
export type CreateUploadTargetResult = {
  targetId: string;
  bucket: "imoveis" | "lancamentos" | "site";
  path: string;
  storageFileName: string;
  tenantId: string;
  domain: UploadDomain;
  entityId: string | null;
  expiresAt: string;
  status: "pending";
};
