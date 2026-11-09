import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText, type FlexibleSchema } from "ai";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server.ts";

export async function campaignText<T>(key: string, schema: FlexibleSchema<T>, system: string, prompt: string) {
  const correlation = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({ baseURL:"https://ai.gateway.lovable.dev/v1",apiKey:key,headers:{"Lovable-API-Key":key,"X-Lovable-AIG-SDK":"vercel-ai-sdk"},fetch:correlation.fetch });
  let failure: unknown;
  const result=streamText({model:provider.responses("openai/gpt-6-astra"),output:Output.object({schema}),system,prompt,maxRetries:0,
    providerOptions:{openai:{forceReasoning:true,reasoningEffort:"low",reasoningSummary:"auto",store:false,include:["reasoning.encrypted_content"]}},
    onError:({error})=>{failure=error;},
  });
  try {return await result.output;} catch(error) {
    const e=failure ?? error;
    if(e && typeof e==="object" && "statusCode" in e) {
      const code=e.statusCode;
      if(code===402) throw new Error("Créditos de IA insuficientes. Recarregue os créditos para continuar.");
      if(code===429) throw new Error("Muitas gerações seguidas. Aguarde antes de tentar novamente.");
      if(code===403) throw new Error("A geração foi negada pelo serviço de IA. Verifique as permissões de IA.");
      if(code===401) throw new Error("A geração por IA precisa de ajuste de configuração.");
      if(code===404) throw new Error("O modelo de IA não está disponível.");
    }
    throw new Error("A IA não concluiu a geração. Nenhum conteúdo foi substituído.");
  }
}