// ResolverRegistry — Fase 6 · Bloco 4 · Etapa 4.3.3 §4.1.
//
// REGRA CRÍTICA (§4.1):
//   • NÃO conhece snapshot internamente.
//   • NÃO conhece tenant.
//   • NÃO contém `switch(kind)`.
//   • Apenas delega para resolvers registrados por capability.
//
// Consequência: adicionar um novo kind não exige tocar neste arquivo —
// basta um `registry.register("meuKind", meuResolver)` externo.
export interface Resolver<TKind extends string, TResult> {
  readonly kind: TKind;
  resolve(id: string, ctx?: unknown): TResult;
  exists(id: string): boolean;
}

export class ResolverNotRegisteredError extends Error {
  constructor(kind: string) {
    super(
      `[ResolverRegistry] Nenhum resolver registrado para kind="${kind}". ` +
        `Registre via resolverRegistry.register("${kind}", resolver).`,
    );
    this.name = "ResolverNotRegisteredError";
  }
}

export class ResolverRegistry {
  private readonly resolvers = new Map<string, Resolver<string, unknown>>();
  private frozen = false;

  register<TKind extends string, TResult>(
    kind: TKind,
    resolver: Resolver<TKind, TResult>,
  ): void {
    if (this.frozen) {
      throw new Error(
        `[ResolverRegistry] Congelado — impossível registrar "${kind}" após freeze.`,
      );
    }
    this.resolvers.set(kind, resolver as Resolver<string, unknown>);
  }

  getResolver<TResult = unknown>(kind: string): Resolver<string, TResult> {
    const r = this.resolvers.get(kind);
    if (!r) throw new ResolverNotRegisteredError(kind);
    return r as Resolver<string, TResult>;
  }

  has(kind: string): boolean {
    return this.resolvers.has(kind);
  }

  listKinds(): string[] {
    return Array.from(this.resolvers.keys());
  }

  freeze(): void {
    this.frozen = true;
    Object.freeze(this);
  }
}

export function createResolverRegistry(): ResolverRegistry {
  return new ResolverRegistry();
}
