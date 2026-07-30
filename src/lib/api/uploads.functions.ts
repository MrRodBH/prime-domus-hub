// M3.2 / PR-M2 corrective — server-issued upload target provenance.
// The client supplies only intent. The server derives tenant, bucket, path and
// filename, persists a short-lived target, and returns its id for atomic use by
// the final metadata-registration boundary.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  UPLOAD_DOMAINS,
  type UploadDomain,
  type CreateUploadTargetResult,
} from "@/lib/storage/upload-contract";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PDF_KINDS = new Set(["tabela_precos", "manual"]);
const PAGE_VARIANTS = new Set(["sobre", "anuncie"]);
const TARGET_TTL_MS = 15 * 60 * 1000;

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
  domain: z.enum(UPLOAD_DOMAINS as unknown as [UploadDomain, ...UploadDomain[]]),
  originalFileName: z.string().min(1).max(300),
  mimeType: z.string().max(200).nullable().optional(),
  size: z.number().int().min(0).max(100 * 1024 * 1024).nullable().optional(),
  entityId: z.string().nullable().optional(),
  variant: z.string().max(40).nullable().optional(),
}).strict();

const targetResultSchema = z.object({
  targetId: z.string().uuid(),
  tenantId: z.string().uuid(),
  domain: z.enum(UPLOAD_DOMAINS as unknown as [UploadDomain, ...UploadDomain[]]),
  entityId: z.string().uuid().nullable(),
  bucket: z.enum(["imoveis", "lancamentos", "site"]),
  path: z.string().min(3).max(512),
  storageFileName: z.string().min(1).max(180),
  expiresAt: z.string(),
  status: z.literal("pending"),
}).strict();

export const createUploadTarget = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data, context }): Promise<CreateUploadTargetResult> => {
    const { tenantId } = context.tenant;
    const domain = data.domain;
    const storageFileName = generateStorageFileName(data.originalFileName);
    const supabase = context.supabase;

    let bucket: CreateUploadTargetResult["bucket"];
    let subPath: string;
    let entityId: string | null = null;

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
        entityId = data.entityId;
        bucket = "imoveis";
        subPath = `${entityId}/${storageFileName}`;
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
        entityId = data.entityId;
        const row = rows![0];
        const slug = (row.slug || row.id) as string;
        bucket = "lancamentos";
        if (domain === "lancamento-capa") {
          subPath = `${slug}/capa/${storageFileName}`;
        } else if (domain === "lancamento-galeria") {
          subPath = `${slug}/galeria/${storageFileName}`;
        } else {
          const kind = (data.variant ?? "").toLowerCase();
          if (!PDF_KINDS.has(kind)) {
            throw new Error(`variant inválida para lancamento-pdf: ${kind}`);
          }
          subPath = `${slug}/${kind}/${storageFileName}`;
        }
        break;
      }
      case "crm-attachment": {
        if (!data.entityId || !UUID_RE.test(data.entityId)) {
          throw new Error("entityId (lead) obrigatório e inválido");
        }
        const { data: rows, error } = await supabase
          .from("leads")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("id", data.entityId)
          .limit(2);
        if (error) throw new Error(error.message);
        if ((rows ?? []).length !== 1) {
          throw new Error("Lead inexistente, ambíguo ou fora do tenant efetivo");
        }
        entityId = data.entityId;
        bucket = "site";
        subPath = `crm/${entityId}/${storageFileName}`;
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
    const expiresAt = new Date(Date.now() + TARGET_TTL_MS).toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rawTarget, error: targetError } = await supabaseAdmin.rpc(
      "register_tenant_upload_target" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _domain: domain,
        _entity_id: entityId,
        _bucket: bucket,
        _path: path,
        _storage_file_name: storageFileName,
        _mime_type: data.mimeType ?? null,
        _size: data.size ?? null,
        _expires_at: expiresAt,
      } as never,
    );
    if (targetError) throw new Error("Falha segura ao registrar o target de upload.");

    return targetResultSchema.parse(rawTarget);
  });
