import { queryOptions } from "@tanstack/react-query";
import { carregarImoveisCampanhas } from "@/lib/api/rm-campanhas.functions";
export const campanhasQueryOptions = () => queryOptions({ queryKey: ["campanhas", "imoveis"], queryFn: carregarImoveisCampanhas });