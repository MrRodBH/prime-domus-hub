export class PublicTenantResolutionError extends Error {
  readonly code = "PUBLIC_TENANT_NOT_RESOLVED";

  constructor() {
    super("Public tenant authority could not be resolved");
    this.name = "PublicTenantResolutionError";
  }
}

export function isPublicTenantResolutionError(error: unknown): boolean {
  return (
    error instanceof PublicTenantResolutionError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "PUBLIC_TENANT_NOT_RESOLVED")
  );
}
