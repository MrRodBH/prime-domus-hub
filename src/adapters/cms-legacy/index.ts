// Adapter público CMS — novo workspace importa APENAS deste arquivo (Bloco 3 §9).
// Isola componentes legados sem reescrevê-los. Migração incremental.
export { CmsPageRenderer } from "@/components/site/CmsPageRenderer";
export { CmsFormRenderer } from "@/components/site/CmsFormRenderer";
export { MediaPicker } from "@/components/admin/MediaPicker";
export { RichTextEditor } from "@/components/admin/RichTextEditor";
export { CmsVersoesTab } from "@/components/admin/CmsVersoesTab";
export type { CmsBlock } from "@/lib/api/pages.functions";
