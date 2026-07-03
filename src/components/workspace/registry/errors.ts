// Registry — erros canônicos (Fase 6 · Bloco 4 · Etapa 4.1.b).
// Fail-fast obrigatório: nenhum fallback silencioso.

export class RegistryResolutionError extends Error {
  constructor(
    public readonly registry: string,
    public readonly id: string,
  ) {
    super(`[${registry}] ID não registrado: "${id}"`);
    this.name = "RegistryResolutionError";
  }
}
