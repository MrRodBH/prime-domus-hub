// PluginValidator — Fase 6 · Bloco 4 · Etapa 4.4 §3.
//
// Validação fail-fast de PluginManifest. Não conhece Registry, Snapshot,
// ResolutionGraph, Executor ou Bootstrap.
import type {
  PluginManifest,
  PluginCapability,
  PluginPermission,
} from "./PluginManifest";

export const SUPPORTED_API_VERSIONS: ReadonlyArray<string> = ["4.3.4"] as const;

const VALID_CAPABILITIES: ReadonlySet<PluginCapability> = new Set([
  "view",
  "panel",
  "dialog",
  "action",
]);

const VALID_PERMISSIONS: ReadonlySet<PluginPermission> = new Set([
  "read:entities",
  "write:entities",
  "execute:actions",
  "read:featureFlags",
]);

export class PluginValidationError extends Error {
  constructor(public readonly pluginId: string, message: string) {
    super(`[PluginValidator] ${pluginId}: ${message}`);
    this.name = "PluginValidationError";
  }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/** Fail-fast. Retorna manifest tipado se válido. */
export function validateManifest(input: unknown): PluginManifest {
  if (!input || typeof input !== "object") {
    throw new PluginValidationError("<unknown>", "manifest não é objeto");
  }
  const m = input as Record<string, unknown>;
  const id = isNonEmptyString(m.id) ? m.id : null;
  if (!id) throw new PluginValidationError("<unknown>", "id ausente/ inválido");

  for (const key of ["version", "apiVersion", "displayName", "description", "author", "entrypoint"] as const) {
    if (!isNonEmptyString(m[key])) {
      throw new PluginValidationError(id, `campo "${key}" ausente/ inválido`);
    }
  }

  if (!SUPPORTED_API_VERSIONS.includes(m.apiVersion as string)) {
    throw new PluginValidationError(
      id,
      `apiVersion "${String(m.apiVersion)}" incompatível — suportadas: ${SUPPORTED_API_VERSIONS.join(", ")}`,
    );
  }

  if (!Array.isArray(m.capabilities)) {
    throw new PluginValidationError(id, "capabilities deve ser array");
  }
  for (const c of m.capabilities) {
    if (!VALID_CAPABILITIES.has(c as PluginCapability)) {
      throw new PluginValidationError(id, `capability inválida: ${String(c)}`);
    }
  }

  if (!Array.isArray(m.permissions)) {
    throw new PluginValidationError(id, "permissions deve ser array");
  }
  for (const p of m.permissions) {
    if (!VALID_PERMISSIONS.has(p as PluginPermission)) {
      throw new PluginValidationError(id, `permission inválida: ${String(p)}`);
    }
  }

  if (!Array.isArray(m.featureFlags)) {
    throw new PluginValidationError(id, "featureFlags deve ser array");
  }
  for (const f of m.featureFlags) {
    if (!isNonEmptyString(f)) {
      throw new PluginValidationError(id, "featureFlag inválido (string vazia)");
    }
  }

  if (!m.dependencies || typeof m.dependencies !== "object" || Array.isArray(m.dependencies)) {
    throw new PluginValidationError(id, "dependencies deve ser Record<string,string>");
  }
  for (const [k, v] of Object.entries(m.dependencies as Record<string, unknown>)) {
    if (!isNonEmptyString(k) || !isNonEmptyString(v)) {
      throw new PluginValidationError(id, `dependency inválida: ${k}`);
    }
  }

  return Object.freeze({
    id,
    version: m.version as string,
    apiVersion: m.apiVersion as string,
    displayName: m.displayName as string,
    description: m.description as string,
    author: m.author as string,
    capabilities: Object.freeze([...(m.capabilities as PluginCapability[])]),
    featureFlags: Object.freeze([...(m.featureFlags as string[])]),
    entrypoint: m.entrypoint as string,
    permissions: Object.freeze([...(m.permissions as PluginPermission[])]),
    dependencies: Object.freeze({ ...(m.dependencies as Record<string, string>) }),
  }) as PluginManifest;
}

/** Verifica permissão declarada. Enforcement runtime é do host. */
export function hasPermission(
  manifest: PluginManifest,
  permission: PluginPermission,
): boolean {
  return manifest.permissions.includes(permission);
}
