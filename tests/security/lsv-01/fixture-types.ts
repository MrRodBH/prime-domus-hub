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

export interface LsvCleanupOutcome {
  readonly fixturesCreated: number;
  readonly fixturesCleaned: number;
  readonly orphanedFixtures: number;
}
