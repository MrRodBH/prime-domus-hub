// URL search schema do Workspace de Conteúdo (Bloco 3.1 §2/§13 — estado 100% na URL).
import { z } from "zod";

export const contentSearchSchema = z.object({
  item: z.string().optional(),
  tab: z.string().optional(),           // aberto conforme descriptor.tabs
  status: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["recent", "title", "status"]).optional(),
  density: z.enum(["compact", "comfortable"]).optional(),
  device: z.enum(["desktop", "tablet", "mobile"]).optional(),
  new: z.enum(["1"]).optional(),
  compare: z.string().optional(),
  group: z.string().optional(),         // filtro por grupo (site: Empresa/Home/Páginas)
});
export type ContentSearch = z.infer<typeof contentSearchSchema>;
