export const SPR03_HISTORICAL_WORKER = "rm-prime-wri01-hml";
export const PCA11_DEDICATED_WORKER = "rm-prime-pca11-hml";
export const PCA11_PREVIEW_ALIAS = "pca11-hml";
export const PCA11_SYNTHETIC_TENANT_SLUG = "pca11-hml";

export type ManagedBindingKind = "plain_text" | "secret_text";

export interface ManagedBindingDefinition {
  name: string;
  kind: ManagedBindingKind;
  required: boolean;
}

export interface ManagedInactiveVersionTarget {
  workerId: typeof SPR03_HISTORICAL_WORKER | typeof PCA11_DEDICATED_WORKER;
  tagPrefix: "spr03" | "pca11";
  expectedActiveDeploymentCount: 0 | 1;
  expectedPreviewsEnabled: false;
  requireSourceFingerprint: boolean;
  canaryBindings: readonly ManagedBindingDefinition[];
  finalBindings: readonly ManagedBindingDefinition[];
}

const pca11PlainBindings = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "RM_PRIME_AUTH_SITE_ORIGIN",
  "RM_PRIME_EMAIL_SITE_NAME",
  "RM_PRIME_EMAIL_SENDER_DOMAIN",
  "RM_PRIME_EMAIL_FROM_DOMAIN",
].map((name) => ({ name, kind: "plain_text" as const, required: true }));

const targetContracts: Readonly<Record<string, ManagedInactiveVersionTarget>> = Object.freeze({
  [SPR03_HISTORICAL_WORKER]: Object.freeze({
    workerId: SPR03_HISTORICAL_WORKER,
    tagPrefix: "spr03",
    expectedActiveDeploymentCount: 1,
    expectedPreviewsEnabled: false,
    requireSourceFingerprint: false,
    canaryBindings: Object.freeze([]),
    finalBindings: Object.freeze(
      ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CLOUDFLARE_API_TOKEN_DCA01_HML"].map(
        (name) => ({ name, kind: "secret_text" as const, required: true }),
      ),
    ),
  }),
  [PCA11_DEDICATED_WORKER]: Object.freeze({
    workerId: PCA11_DEDICATED_WORKER,
    tagPrefix: "pca11",
    expectedActiveDeploymentCount: 0,
    expectedPreviewsEnabled: false,
    requireSourceFingerprint: true,
    canaryBindings: Object.freeze(pca11PlainBindings),
    finalBindings: Object.freeze([
      ...pca11PlainBindings,
      { name: "SUPABASE_SERVICE_ROLE_KEY", kind: "secret_text" as const, required: true },
      { name: "LOVABLE_API_KEY", kind: "secret_text" as const, required: false },
      { name: "CLOUDFLARE_API_TOKEN_DCA01_HML", kind: "secret_text" as const, required: false },
      { name: "PORTAL_DLQ_RETRY_SECRET", kind: "secret_text" as const, required: false },
    ]),
  }),
});

export function resolveManagedInactiveVersionTarget(
  workerId: unknown,
): ManagedInactiveVersionTarget | null {
  return typeof workerId === "string" ? (targetContracts[workerId] ?? null) : null;
}

export function materializeManagedBindings(
  definitions: readonly ManagedBindingDefinition[],
  environment: NodeJS.ProcessEnv = process.env,
): {
  bindings: Array<{ type: ManagedBindingKind; name: string; text: string }>;
  unavailableOptionalBindings: string[];
} {
  const bindings: Array<{ type: ManagedBindingKind; name: string; text: string }> = [];
  const unavailableOptionalBindings: string[] = [];

  for (const definition of definitions) {
    const value = environment[definition.name];
    if (!value) {
      if (definition.required)
        throw new Error(`missing_required_managed_binding:${definition.name}`);
      unavailableOptionalBindings.push(definition.name);
      continue;
    }
    bindings.push({ type: definition.kind, name: definition.name, text: value });
  }

  return {
    bindings,
    unavailableOptionalBindings: unavailableOptionalBindings.sort(),
  };
}

export function expectedBindingNames(definitions: readonly ManagedBindingDefinition[]): string[] {
  return definitions.map(({ name }) => name).sort();
}
