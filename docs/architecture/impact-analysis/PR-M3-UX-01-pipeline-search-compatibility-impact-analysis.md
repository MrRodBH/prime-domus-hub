# PR-M3-UX-01 — Pipeline Search Compatibility and Command Palette Impact Analysis

## Status

```text
STATE = Accepted for GitHub-native implementation
SOURCE_MAIN = 3b70a96e535ef40ab0c246f4cf7b63d3bd3a6397
SOURCE_TREE = 32ab92df5a8a3e121525d4bfa3faf30f29352ea5
ARCHITECTURE_FIRST = true
DATABASE_WRITE = false
PROVIDER_WRITE = false
PRODUCTION_PUBLISH = false
PR_105_MERGE = false
```

## Confirmed contract mismatch

The legacy `/admin/leads` redirect forwards arbitrary query state and rewrites
retired `corretor_id`, `view` and `tab` parameters. The active
`/admin/pipeline` route is a read-only surface whose canonical URL contract is
limited to `item`, `q`, `status` and `origem`. The Command Palette still sends
`new`, `view` and `tab` to that strict boundary.

The mismatch interrupts navigation and also creates a misleading creation
command. It does not create tenant authority or a database mutation, but it is a
release-blocking UX contract defect because valid deep links and global
navigation are not deterministic.

## Architecture First decision

One compatibility boundary remains authoritative:

```text
untrusted URL search
→ reject authority-bearing keys
→ preserve individually valid canonical presentation fields
→ map only the documented legacy discarded-tab alias
→ discard benign retired or unknown presentation fields
→ enter the read-only pipeline
```

Authority-bearing keys such as tenant, role, scope, command, action, user,
membership or impersonation fail closed. Benign unknown parameters do not
interrupt navigation and cannot reach the active route output.

The legacy redirect must call the same boundary explicitly and must never
spread the incoming search object. `tab=descartados` maps to
`status=descartado`; `corretor_id`, `view`, `new` and unsupported `tab` values
are retired rather than reintroduced into the active schema.

## Command Palette decision

Opening an existing lead uses only the canonical `item=<uuid>` deep link.
`view` and `tab` are removed from that navigation.

The active pipeline is read-only and no lead-creation workflow has been
accepted as server-authoritative in PR-M3. Therefore, `Novo lead` remains
visible only as a disabled, explicitly unavailable command. UX-01 must not
reactivate `criarLeadManual`, a client mutation, or a query-string creation
command. A future creation workflow requires a separate Architecture First
gate and server-authoritative authorization contract.

## Impact and safety

- Multi-tenant isolation, RLS, grants, Auth, Storage and impersonation are unchanged.
- No server read model or business data contract is widened.
- No database, provider, secret, deploy, roadmap or production write occurs.
- Accepted SEC-02 security behavior remains intact.
- PR #105 remains open, draft and unmerged.
- `bun.lock`, runtime dependencies and development dependencies remain unchanged.

## Test matrix

1. Canonical `item`, `q`, `status` and `origem` survive validation.
2. `new`, `view`, `tab`, retired filters and benign unknown keys are stripped.
3. Invalid canonical presentation values are discarded without a navigation failure.
4. Tenant, role, scope, command, action and impersonation keys fail closed.
5. Legacy `tab=descartados` maps only to `status=descartado`.
6. Legacy redirect never spreads untrusted search state.
7. Existing-lead Command Palette navigation sends only `item`.
8. `Novo lead` cannot navigate or mutate.
9. Deep links and saved canonical filters remain stable.
10. PRM3-P0A, typecheck, builds and canonical release verification remain green.

## Exact implementation envelope

```text
FILES_ALLOWED = 7 exact paths
NEW_DEPENDENCIES = false
BUN_LOCK_CHANGE = false
DATABASE_DDL_DML = false
AUTH_STORAGE_TENANT_MEMBERSHIP_DOMAIN_MUTATION = false
PROVIDER_DEPLOY_PUBLISH = false
ROADMAP_UPDATE = false
PR_105_MERGE = false
```

## Successor interlock

After terminal repository acceptance, the next gate is
`PR-M3-SEC-04_SECURITY_LINTER_FINDINGS_REQUALIFICATION`. It must remain
individual, read-only first and must not use automatic fix-all behavior.
`LVR-01` remains suspended until UX-01 and SEC-04 are both accepted.
