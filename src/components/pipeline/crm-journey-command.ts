// Session-local retry identity. Authorization and versions remain server-owned.
export function createJourneyCommandRunner(key: () => string) {
  const attempts = new Map<string, string>();
  let busy = false;
  return async function run<T>(operation: string, payload: object, send: (idempotencyKey: string) => Promise<T>): Promise<T> {
    if (busy) throw new Error('journey_busy');
    const identity = JSON.stringify([operation, payload]);
    const token = attempts.get(identity) ?? key();
    attempts.set(identity, token);
    busy = true;
    try {
      const result = await send(token);
      attempts.delete(identity);
      return result;
    } finally { busy = false; }
  };
}
export function journeyError(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if (/permission|forbidden|unauthenticated|membership/.test(code)) return 'Acesso negado. Confirme sua sessão e as permissões do workspace.';
  if (/version|conflict/.test(code)) return 'O registro mudou. Consulte a versão atualizada antes de tentar novamente.';
  if (/tenant|unavailable|unconfigured/.test(code)) return 'Operação indisponível neste workspace.';
  if (/transition|reason/.test(code)) return 'Transição recusada pelo servidor. Confira a etapa e os requisitos.';
  return 'Não foi possível confirmar a operação. Tente novamente sem alterar os campos para reutilizar a mesma solicitação.';
}
