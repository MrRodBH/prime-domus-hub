// ContentWorkspace — compat shim (Fase 6 · Bloco 4 · Etapa 4.0).
//
// A implementação real do orquestrador foi promovida a EntityWorkspace,
// componente genérico da plataforma (src/components/workspace/entities/).
// Este arquivo permanece APENAS como re-export para não quebrar imports
// legados durante a migração incremental do Bloco 4.
//
// Nenhum novo consumidor deve importar de "@/components/content/ContentWorkspace".
// A superfície canônica é `@/components/workspace/entities`.
export { EntityWorkspace as ContentWorkspace } from "@/components/workspace/entities";
