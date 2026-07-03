// URL search schema — estado completo reidratável (Bloco 2 §2).
import { z } from "zod";

export const pipelineSearchSchema = z.object({
  item: z.string().optional(),
  view: z.enum(["list", "kanban"]).optional(),
  density: z.enum(["compact", "comfortable"]).optional(),
  status: z.string().optional(),
  origem: z.string().optional(),
  corretor: z.string().optional(),
  inicio: z.string().optional(),
  fim: z.string().optional(),
  alerta: z.enum(["sem_atendimento", "sem_followup", "visitas_sem_feedback", "propostas_paradas"]).optional(),
  tab: z.enum(["ativos", "descartados", "analise"]).optional(),
  new: z.enum(["1"]).optional(),
});
export type PipelineSearch = z.infer<typeof pipelineSearchSchema>;
