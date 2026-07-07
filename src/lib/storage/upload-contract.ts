// M3.2 — Contrato client-safe de upload.
// A autoridade sobre bucket/path/filename é do SERVIDOR (createUploadTarget).
// Este módulo expõe apenas tipos e o enum fechado de domínios permitidos.

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
] as const;

export type UploadDomain = (typeof UPLOAD_DOMAINS)[number];

/** Intenção funcional enviada pelo client. O path físico NUNCA é aceito. */
export type CreateUploadTargetInput = {
  domain: UploadDomain;
  originalFileName: string;
  mimeType?: string | null;
  size?: number | null;
  /** Necessário para domínios ligados a uma entidade (imoveis, lancamento-*). */
  entityId?: string | null;
  /** Sub-tipo controlado (ex.: pdfKind para lancamento-pdf, pageVariant para cms-page). */
  variant?: string | null;
};

/** Instrução controlada devolvida pelo servidor. */
export type CreateUploadTargetResult = {
  bucket: string;
  path: string;              // path completo com tenantId injetado pelo servidor
  storageFileName: string;   // filename físico gerado pelo servidor
  tenantId: string;
  domain: UploadDomain;
};
