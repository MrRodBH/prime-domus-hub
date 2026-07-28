// M3.2 — New Upload Path Enforcement.
// Autoridade server-side para bucket/path/filename de qualquer upload novo.
// Client envia apenas INTENÇÃO (domain + metadata). Path é construído aqui.
//
// Regras (IA-004):
//  - tenantId vem exclusivamente de requireTenant() (nunca do client).
//  - domain é enum fechado (upload-contract.ts).
//  - entityId é validado explicitamente contra tenant_id no servidor.
//  - storageFileName é gerado pelo servidor; nome original é apenas metadata.
//  - qualquer path/prefixo enviado pelo client é IGNORADO.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  UPLOAD_DOMAINS,
  type UploadDomain,
  type CreateUploadTargetResult,
} from "@/lib/storage/upload-contract";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PDF_KINDS = new Set(["pdfs", "book", "planta", "memorial"]);
const PAGE_VARIANTS = new Set(["sobre", "anuncie"]);

function sanitizeName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\\|\//g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return base || "file";
}

function safeExt(name: string): string {
  const match = /\.([a-zA-Z0-9]{1,8})$/.exec(name);
  return match ? `.${match[1].toLowerCase()}` : "";
}

function generateStorageFileName(originalFileName: string): string {
  const clean = sanitizeName(originalFileName);
  const withoutExt = clean.replace(/\.[a-zA-Z0-9]{1,8}$/, "");
  const ext = safeExt(originalFileName);
  const prefix = crypto.randomUUID().slice(0, 8);
  return `${prefix}-${withoutExt}${ext}`;
}

const inputSchema = z.object({
  domain: z.enum(UPLOAD_DOMAINS as unknown as [string, ...string[]]),
  originalFileName: z.string().min(1).max(300),
  mimeType: z.string().max(200).nullable().optional(),
  size: z.number().int().min(0).nullable().optional(),
  entityId: z.string().nullable().optional(),
  variant: z.string().max(40).nullable().optional(),
});

export const createUploadTarget = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) => inputSchema.parse(raw))
  .handler(async ({ data, context }): Promise<CreateUploadTargetResult> => {
    const { tenantId } = context.tenant;
    const domain = data.domain as UploadDomain;
    const storageFileName = generateStorageFileName(data.originalFileName);
    const supabase = context.supabase;

    let bucket: string;
    let subPath: string;

    switch (domain) {
      case "imoveis": {
        if (!data.entityId || !UUID_RE.test(data.entityId)) {
          throw new Error("entityId (imovel) obrigatório e inválido");
        }
        const { data: rows, error } = await supabase
          .from("imoveis")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("id", data.entityId)
          .limit(2);
        if (error) throw new Error(error.message);
        if ((rows ?? []).length !== 1) {
          throw new Error("Imóvel inexistente, ambíguo ou fora do tenant efetivo");
        }
        bucket = "imoveis";
        subPath = `${data.entityId}/${storageFileName}`;
        break;
      }
      case "lancamento-capa":
      case "lancamento-galeria":
      case "lancamento-pdf": {
        if (!data.entityId || !UUID_RE.test(data.entityId)) {
          throw new Error("entityId (lançamento) obrigatório e inválido");
        }
        const { data: rows, error } = await supabase
          .from("launch_projects")
          .select("id, slug")
          .eq("tenant_id", tenantId)
          .eq("id", data.entityId)
          .limit(2);
        if (error) throw new Error(error.message);
        if ((rows ?? []).length !== 1) {
          throw new Error("Lançamento inexistente, ambíguo ou fora do tenant efetivo");
        }
        const row = rows![0];
        const slug = (row.slug || row.id) as string;
        bucket = "lancamentos";
        if (domain === "lancamento-capa") {
          subPath = `${slug}/capa/${storageFileName}`;
        } else if (domain === "lancamento-galeria") {
          subPath = `${slug}/galeria/${storageFileName}`;
        } else {
          const kind = (data.variant ?? "pdfs").toLowerCase();
          if (!PDF_KINDS.has(kind)) {
            throw new Error(`variant inválida para lancamento-pdf: ${kind}`);
          }
          subPath = `${slug}/${kind}/${storageFileName}`;
        }
        break;
      }
      case "blog-cover":
        bucket = "site";
        subPath = `blog/${storageFileName}`;
        break;
      case "blog-inline":
        bucket = "site";
        subPath = `blog/inline/${storageFileName}`;
        break;
      case "cms-page": {
        const variant = (data.variant ?? "").toLowerCase();
        if (!PAGE_VARIANTS.has(variant)) {
          throw new Error(`variant inválida para cms-page: ${variant}`);
        }
        bucket = "site";
        subPath = `${variant}/${storageFileName}`;
        break;
      }
      case "corretor-foto":
        bucket = "site";
        subPath = `corretores/${storageFileName}`;
        break;
      case "media":
        bucket = "site";
        subPath = `media/${storageFileName}`;
        break;
      default:
        throw new Error(`Domain desconhecido: ${String(domain)}`);
    }

    const path = `${tenantId}/${subPath}`;
    return { bucket, path, storageFileName, tenantId, domain };
  });