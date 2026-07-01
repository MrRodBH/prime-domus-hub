/**
 * Otimização client-side de imagens.
 * Gera variantes WebP: medium (1600w) e thumbnail (400w).
 * Preserva o original em qualquer formato para download.
 */

export interface OptimizedImage {
  originalBlob: Blob;
  originalMime: string;
  mediumBlob: Blob | null;
  thumbBlob: Blob | null;
  width: number | null;
  height: number | null;
}

const MEDIUM_MAX_W = 1600;
const THUMB_MAX_W = 400;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function toWebp(img: HTMLImageElement, maxWidth: number, quality = 0.82): Promise<Blob | null> {
  const ratio = img.naturalHeight / img.naturalWidth;
  const w = Math.min(img.naturalWidth, maxWidth);
  const h = Math.round(w * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
}

export async function optimizeImage(file: File): Promise<OptimizedImage> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return {
      originalBlob: file,
      originalMime: file.type,
      mediumBlob: null,
      thumbBlob: null,
      width: null,
      height: null,
    };
  }
  try {
    const img = await loadImage(file);
    const [mediumBlob, thumbBlob] = await Promise.all([
      toWebp(img, MEDIUM_MAX_W, 0.82),
      toWebp(img, THUMB_MAX_W, 0.78),
    ]);
    return {
      originalBlob: file,
      originalMime: file.type,
      mediumBlob,
      thumbBlob,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } catch {
    return {
      originalBlob: file,
      originalMime: file.type,
      mediumBlob: null,
      thumbBlob: null,
      width: null,
      height: null,
    };
  }
}

export function fileKindFromMime(mime: string): "image" | "video" | "pdf" | "audio" | "other" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return "other";
}

export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
