# DRA-01 — Delivery Recovery & Release Criticality Audit

## Status

**Accepted — planning-only direct GitHub audit**

**Audit baseline:** `193e761dad3d15981205362bc08eedd2bbd2c1c4`  
**Execution mode:** read-only repository inspection  
**Runtime changes:** none  
**Lovable interactions consumed:** zero

---

## 1. Decision

The prior FRP-01 path remains `Rejected — terminal` and is not reopened.

DRA-01 establishes a new delivery decision based on the product owner's explicit adoption of the hybrid execution model. It does not retry FRP-01, does not inherit its rejected boundaries and does not authorize broad product completion before homologation.

The delivery objective is now:

> Reach controlled homologation through the smallest safe, reproducible and evidence-backed path, with zero Lovable execution on release-critical runtime and security work.

---

## 2. Audited repository findings

### 2.1 Build, generator and release evidence

Evidence:

- `package.json` provides `dev`, `build`, `build:dev` and historical stage-specific tests, but no canonical `typecheck`, release verification or CI script.
- the audited HEAD has no GitHub combined status checks and no associated workflow run;
- `vite.config.ts` and `src/tanstack-start-register.d.ts` retain the rejected LSR-02 Strategy B artifacts;
- the generated `src/routeTree.gen.ts` currently ends without a generated TanStack Start augmentation, but reproducibility across generation/build/dev cycles is not proven.

Decision:

```text
BUILD_CURRENTLY_BROKEN = UNKNOWN
BUILD_REPRODUCIBILITY_PROVEN = false
TYPECHECK_GATE_PROVEN = false
CI_GATE_PRESENT_AT_AUDITED_HEAD = false
REJECTED_STRATEGY_B_REMAINS_IN_TREE = true
```

This is `RELEASE_BLOCKING` because homologation cannot rely on an unproven build/toolchain state.

### 2.2 Public tenant resolution and public data context

Evidence:

- `src/lib/tenant.server.ts` contains `FALLBACK_TENANT_SLUG = "rm-prime"` and resolves the fallback tenant when the host is absent, preview/local or unmatched;
- `src/routes/__root.tsx` does not derive and pass the request host to a tenant-resolution chain;
- `src/lib/api/site.functions.ts::obterSiteSettings` reads `site_settings` through a public client without tenant transport;
- `src/lib/api/pages.functions.ts::obterPaginaPublica` resolves by slug and accepts optional `tenant_id` input instead of deriving tenant from server-owned host context;
- `src/lib/api/campaigns.functions.ts` accepts optional client `tenantId` for campaign listing and event registration and uses it to construct `x-tenant-id`;
- public form submission paths derive tenant from a globally addressed form slug and require deterministic uniqueness/cardinality proof;
- portal lead/feed paths derive tenant from portal connector tokens and require negative cross-tenant proof before homologation.

Decision:

```text
PUBLIC_HOST_TENANT_AUTHORITY_FAIL_CLOSED = false
PUBLIC_SITE_SETTINGS_TENANT_CONTEXT_CONNECTED = false
PUBLIC_PAGE_TENANT_AUTHORITY_SERVER_DERIVED = false
PUBLIC_CAMPAIGN_TENANT_AUTHORITY_SERVER_DERIVED = false
PUBLIC_FORM_CARDINALITY_PROVEN = false
PUBLIC_PORTAL_NEGATIVE_ISOLATION_PROVEN = false
```

This is `RELEASE_BLOCKING` for SaaS white-label homologation.

### 2.3 Public privileged and operational surfaces

Evidence:

- `src/routes/api/public/bootstrap-admin.ts` is anonymous and can create an Auth user plus global admin role whenever no admin role row exists;
- `src/routes/api/public/hooks/portal-dlq-retry.ts` accepts either `x-cron-secret == CRON_SECRET` or `apikey == SUPABASE_PUBLISHABLE_KEY`; the publishable key is not an exclusive secret and no cryptographic webhook signature is implemented;
- both surfaces use service-role authority after their public entry checks.

Decision:

```text
PUBLIC_BOOTSTRAP_ADMIN_SAFE_FOR_HOMOLOGATION = false
PORTAL_DLQ_RETRY_EXCLUSIVE_AUTH_PROVEN = false
PUBLIC_SERVICE_ROLE_ENTRYPOINTS_HARDENED = false
```

This is `RELEASE_BLOCKING`.

### 2.4 Public CMS rendering

Evidence:

- `CmsPageRenderer` injects `richtext` HTML through `dangerouslySetInnerHTML` without a sanitizer;
- video blocks accept arbitrary `iframe src`;
- hero and CTA blocks accept arbitrary href values;
- the public page path renders persisted CMS block content.

Decision:

```text
PUBLIC_CMS_RICHTEXT_SANITIZED = false
PUBLIC_CMS_EMBED_ALLOWLIST_ENFORCED = false
PUBLIC_CMS_LINK_PROTOCOL_ALLOWLIST_ENFORCED = false
```

This is `RELEASE_BLOCKING` because persisted CMS content can reach executable or unsafe browser contexts.

### 2.5 Canonical roadmap consistency

Evidence:

- `FINITE_ROADMAP_EXECUTION_MAP.md` terminalizes LSV-02, LSR-01, LSR-02 and FRP-01 and blocks all successors;
- `ROADMAP_ARCHITECTURAL.md` still describes an older executable chain with LSV-02 planned and retains obsolete Lovable-first audit language;
- the accepted product-owner decision replaces that delivery model with direct GitHub audit and executor allocation.

Decision:

```text
CANONICAL_ROADMAP_CURRENTLY_CONSISTENT = false
DELIVERY_MODEL_RECONCILIATION_REQUIRED = true
```

Roadmap reconciliation is a governance prerequisite and is addressed by the delivery-reset artifacts introduced with DRA-01.

---

## 3. Release-critical classification

### 3.1 RELEASE_BLOCKING

1. reproducible typecheck/build/generator/CI evidence;
2. removal or replacement of rejected Strategy B with one proven canonical registration path;
3. fail-closed public host-to-tenant authority;
4. tenant-connected public settings, pages, forms and campaigns;
5. negative isolation proof for portal public surfaces;
6. closure or hardening of public privileged bootstrap;
7. exclusive authentication and fail-closed behavior for operational webhook/cron entrypoints;
8. CMS rich-text sanitization, embed allowlist and safe-link allowlist;
9. controlled homologation preflight, protected baseline, backup/recovery confirmation and evidence persistence.

### 3.2 POST_HOMOLOGATION

- custom-domain lifecycle and automated DNS/TXT/SSL provisioning;
- complete onboarding/configuration-center consolidation;
- final billing provider, checkout, customer portal and commercial UI;
- full maintenance-mode product experience beyond the minimum safe operational controls;
- broad dashboard intelligence and noncritical UX refinement;
- full production-readiness closure.

### 3.3 BACKLOG

- Upload Provenance Token;
- storage metadata rewrite batch;
- Media Picker return normalization;
- public asset CDN/cache strategy;
- documentation repository reorganization;
- lightweight decision log;
- cosmetic refactors not required by homologation evidence.

No `POST_HOMOLOGATION` or `BACKLOG` item may enter the critical path without a new explicit security or correctness finding.

---

## 4. Minimum safe path to homologation

```text
DRA-01  Accepted
  → GNR-01  GitHub-Native Release Gate
  → PTH-01  Public Tenant Authority Hardening
  → PSG-01  Public Surface Security Gate
  → HVP-01  Homologation Validation Preflight
  → optional VSP-01 only when blocking visual defects are evidenced
  → Controlled Homologation
```

The sequence is finite. No rejected FRP-01 deliverable is auto-transferred.

---

## 5. Gate contracts

### 5.1 GNR-01 — GitHub-Native Release Gate

**Executor:** GitHub-native only.  
**Objective:** produce a deterministic, reviewable and automated release gate.

Required outcomes:

- one canonical TanStack Start registration source/path;
- rejected Strategy B explicitly removed, replaced or proven unnecessary;
- no manual edit to generated route-tree content;
- pinned `typecheck` command;
- canonical release verification command;
- `build` and `build:dev` pass;
- relevant structural/unit tests pass;
- GitHub Actions workflow runs on pull request and `main`;
- logs and exit codes are retained as evidence.

Prohibited:

- DB/Auth/Storage/RLS/grants/runtime feature changes;
- Lovable execution;
- claims based only on local narrative.

### 5.2 PTH-01 — Public Tenant Authority Hardening

**Executor:** GitHub-native only.  
**Objective:** establish one server-owned public tenant context consumed by every public read/write path.

Required outcomes:

- request host is normalized and resolved server-side;
- unknown/absent/ambiguous host fails closed outside explicit development configuration;
- no `rm-prime` runtime fallback authority;
- `site_settings`, public pages, forms and campaigns consume server-derived tenant context;
- client `tenantId` is rejected as authority;
- portal token paths prove deterministic cardinality and cross-tenant denial;
- RLS/grants/policies are changed only when required by the accepted server boundary;
- negative tests cover unknown host, forged header, forged tenant payload, duplicate slug and cross-tenant access.

### 5.3 PSG-01 — Public Surface Security Gate

**Executor:** GitHub-native only.  
**Objective:** remove or harden public privileged/operational entrypoints and secure persisted public CMS rendering.

Required outcomes:

- anonymous bootstrap-admin capability is removed, permanently disabled after initialization, or replaced by an explicit operator-only boundary;
- publishable-key authentication is not accepted as exclusive authorization for DLQ retry;
- operational entrypoints use explicit secret/signature/internal authority and fail closed;
- rich text is sanitized through a pinned and tested policy;
- iframe sources use an explicit allowlist;
- href/src protocols and destinations use explicit safe rules;
- negative security tests are executable and versioned.

### 5.4 HVP-01 — Homologation Validation Preflight

**Executor:** GitHub-native runbook plus authorized operator.  
**Objective:** prove eligibility for controlled Same-Backend homologation without changing product scope.

Required evidence:

- current `main` SHA and green release gate;
- protected RM Prime baseline registry;
- confirmation of data classification and absence of prohibited real test data;
- latest backup/restore point and recovery mechanism confirmed;
- separate Storage backup when applicable;
- minimum two synthetic tenant contexts and real sessions;
- host resolution, tenant context, impersonation and forged-header probes;
- public CMS security probes;
- deterministic fixture teardown and residue scan;
- persisted evidence artifact.

If an external operational prerequisite is absent, HVP-01 becomes `Blocked External`; it does not generate implementation loops.

### 5.5 VSP-01 — Optional Visual Stabilization Package

This gate exists only if HVP-01 produces blocking visual/product defects.

```text
Lovable principal executions: maximum 1
Lovable corrective executions: maximum 1
Absolute global maximum: 2
```

Security, tenant authority, migrations, RLS, build and toolchain are prohibited from this gate.

---

## 6. Delivery budget

```text
Release-critical Lovable executions = 0
Documentation Lovable executions = 0
Governance Lovable executions = 0

GitHub-native implementation PRs planned = 3
Operational evidence gate planned = 1
Optional visual package = 0 or 1 principal + 1 corrective
```

Each GitHub-native implementation gate receives one principal pull request and, only if required, one consolidated corrective pull request. A failed corrective forces terminal decision or executor/scope change.

---

## 7. DRA-01 Definition of Done

- hybrid execution model materialized;
- current repository findings inspected directly;
- release blockers separated from post-homologation and backlog;
- minimum finite path defined;
- executor assigned per gate;
- Lovable pre-homologation budget frozen;
- next gate identified;
- no runtime or schema change made;
- FRP-01 remains rejected and closed.

All criteria are satisfied.

---

## 8. Successor

```text
NEXT_STAGE_AUTHORIZED = GNR-01 planning and GitHub-native implementation through a reviewable pull request
LOVABLE_AUTHORIZED = false
```
