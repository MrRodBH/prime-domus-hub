// URL search schema do Workspace de Conteúdo — Bloco 3 §2 (Content Session serializable).
import { z } from "zod";

export const contentSearchSchema = z.object({
  item: z.string().optional(),               // entidade selecionada (id) → ?item=<id>
  tab: z.enum(["conteudo", "seo", "preview", "versoes", "publicacao"]).optional(),
  status: z.enum(["all", "draft", "published", "archived"]).optional(),
  q: z.string().optional(),
  sort: z.enum(["recent", "title", "status"]).optional(),
  density: z.enum(["compact", "comfortable"]).optional(),
  device: z.enum(["desktop", "tablet", "mobile"]).optional(),
  new: z.enum(["1"]).optional(),
  compare: z.string().optional(),            // id da versão em comparação
});
export type ContentSearch = z.infer<typeof contentSearchSchema>;
