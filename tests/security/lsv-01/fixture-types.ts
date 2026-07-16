// LSV-01 · Lote A — Fixture type contracts.

export type LsvIdentity =
  | "tenant_a_admin"
  | "tenant_a_corretor_assigned"
  | "tenant_a_corretor_unassigned"
  | "tenant_a_unauthorized_role"
  | "tenant_b_admin"
  | "tenant_b_corretor"
  | "suspended_member"
  | "removed_or_no_membership_user"
  | "super_admin"
  | "anonymous";

/** Identities that are expected to authenticate (all except anonymous). */
export type LsvAuthenticatedIdentity = Exclude<LsvIdentity, "anonymous">;

export interface LsvUserRecord {
  readonly userId: string;
  readonly email: string;
}

export interface LsvFixtureContext {
  readonly runId: string;
  readonly tenants: {
    readonly tenantA: string;
    readonly tenantB: string;
  };
  readonly users: Readonly<Record<LsvIdentity, LsvUserRecord | null>>;
  readonly resources: {
    readonly propertyA: string;
    readonly propertyB: string;
    readonly leadAAssigned: string;
    readonly leadAUnassigned: string;
    readonly leadB: string;
  };
}

/** Ephemeral credential — kept in memory only, never persisted. */
export interface LsvRuntimeCredential {
  readonly identity: LsvAuthenticatedIdentity;
  readonly email: string;
  readonly password: string;
  readonly expectedUserId: string;
}

export interface LsvFixtureManifest {
  readonly tenantIds: readonly string[];
  readonly authUserIds: readonly string[];
  readonly membershipKeys: readonly { tenantId: string; userId: string }[];
  readonly roleIds: readonly string[]; // user_ids that received an app_role
  readonly propertyIds: readonly string[];
  readonly leadIds: readonly string[];
}

export interface LsvFixtureBundle {
  readonly context: LsvFixtureContext;
  readonly credentials: ReadonlyMap<LsvAuthenticatedIdentity, LsvRuntimeCredential>;
  readonly manifest: LsvFixtureManifest;
}

export interface LsvCleanupOutcome {
  readonly fixturesCreated: number;
  readonly fixturesCleaned: number;
  readonly orphanedFixtures: number;
}
