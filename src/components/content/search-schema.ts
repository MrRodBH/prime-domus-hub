// URL search schema do Workspace (Bloco 3.1 §2/§13 — estado 100% na URL).
//
// Etapa 4.1.a — extensão exclusivamente genérica:
//   - `view`   : modo de visualização ativo (declarado em descriptor.views).
//   - `scope`  : id da scopeTab ativa (declarado em descriptor.scopeTabs).
//   - Chaves adicionais são aceitas via passthrough e interpretadas como
//     valores de `descriptor.filters[*]` pelo adapter. Nenhum nome de
//     domínio (corretor, autor, módulo, etc.) é fixado no core.
import { z } from "zod";

export const contentSearchSchema = z
  .object({
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
    // Etapa 4.1.a — capacidades declarativas genéricas.
    view: z.string().optional(),          // valor validado contra descriptor.views.available
    scope: z.string().optional(),         // valor validado contra descriptor.scopeTabs
  })
  .passthrough();                          // filtros declarativos entram por aqui
export type ContentSearch = z.infer<typeof contentSearchSchema>;
