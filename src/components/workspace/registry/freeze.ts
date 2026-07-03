// Registry Freeze Model — Fase 6 · Bloco 4 · Etapa 4.2 §5.3.
//
// Bootstrap freeze: após a fase declarativa inicial, todo `register(...)`
// passa a ser rejeitado com fail-fast. Isso torna o bootstrap:
//   • determinístico   (1x, sem reprocesso)
//   • imutável         (não reage a mudança de estado em runtime)
//   • auditável        (qualquer tentativa tardia gera exception)
//
// Regra §2 (Anti-Monolith): o registry indexa, nunca orquestra — portanto
// não pode aceitar mutação em runtime crítico.
//
// Este módulo NÃO importa registries: são os registries que consultam
// `isFrozen()` em `register()`. Sem ciclos, sem side effects.

let frozen = false;

export function freezeRegistries(): void {
  frozen = true;
}

export function isFrozen(): boolean {
  return frozen;
}

/** Test-only helper. Nunca chamar em código de produto. */
export function __unsafeResetFreezeForTests(): void {
  frozen = false;
}

export class RegistryFrozenError extends Error {
  constructor(registry: string, id: string) {
    super(
      `[${registry}] registry congelado — tentativa de registrar "${id}" após bootstrap. ` +
        `Registros só são permitidos durante bootstrapWorkspaceRegistries().`,
    );
    this.name = "RegistryFrozenError";
  }
}
