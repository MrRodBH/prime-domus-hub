# LVR-02H — GitHub Backlog Terminal Reconciliation and Product Capability Audit

## 1. Execution identity

- Gate: `LVR-02H_GITHUB_BACKLOG_TERMINAL_RECONCILIATION`.
- Audited `main`: `252f3e98492bc34c30380704bb47e3ed576948f6`.
- Audited tree: `65287b9019498c35d8614bacf1fa679fc750851b`.
- Execution: GitHub documentation/issues only.
- Code, backend, provider, production, PR #105 and Lovable Agent mutations: zero.

## 2. Binding governance decision

1. GitHub `main` is the final technical and execution authority.
2. Governance produced by Lovable is historical and non-authorizing unless the exact content was materialized, audited and accepted in `main`.
3. `.lovable/plan.md`, Lovable saved plans, messages, files and preview state cannot block, reorder or reopen the repository roadmap.
4. Conflicting Lovable governance must be ignored and replaced by repository authority.
5. Future Lovable use is limited to expressly authorized Same-Backend Supabase operations or advanced UX/UI work.
6. Lovable must never receive GitHub instructions or repository operations.

## 3. Revalidated architecture backlog

| Item | Current state | Evidence / safe execution moment |
|---|---|---|
| ARCH-12F-01 | Accepted/Merged | PR #114; tracked `.env` removed, value-free `.env.example`, fail-closed server config |
| ARCH-12F-02 | Pending | Worker name remains fixed in `wrangler.jsonc`; Supabase project ref remains fixed in `supabase/config.toml`; next independent Architecture First gate before homologation |
| ARCH-12F-03 | Deferred upstream | Issue #116; execute only after admissible stable Wrangler/upstream fix or separate Owner-authorized harness |
| ARCH-12F-04A/04B | Accepted/Merged | PR #114; log redaction and structured logging materialized |
| ARCH-TENANCY-01 | Accepted/Merged | PR #114 and ADR-007; Pool is canonical with selective Bridge criteria |
| DCA-02-BL2 repository proof | Accepted/Merged | PR #114; live PITR restore remains a separate isolated pre-production gate |
| DCA-02-BL1 diagnostic | Materialized/Merged | PR #114; exact-head status must be reconciled administratively; provider writes remain prohibited |
| LVR private variant | Blocked External | Await official Lovable support clarification/correction of connector contract |
| PR #105 / BCR | Open/Draft/Unmerged | Preserve intact until issue #116 receives a material upstream trigger |

## 4. Current product-capability verdict

### 4.1 Customer domains

Status: repository lifecycle implemented and synthetic Cloudflare proof accepted; real-customer activation and production cutover not proved.

- The server-owned state machine covers ownership TXT, DNS observation, Cloudflare Custom Hostname, SSL observation, activation, replacement, reconciliation and removal.
- Both `manual_assisted` and `api_automated` are modeled.
- `manual_assisted` means the customer keeps DNS at its registrar/provider and follows server-generated TXT/CNAME instructions.
- Cloudflare remains the implemented SaaS edge/custom-hostname/SSL provider; no second provider adapter is present.
- The real RM Prime domain remains `pending_ownership_verification`; global authoritative cutover is false.
- Safe next moment: non-production onboarding proof for one synthetic tenant, then a separately authorized real-tenant ceremony.

### 4.2 Meta Ads and Google Ads lead ingestion

Status: contracts and ingestion engine exist, but the live integration is not operational.

- Meta payload/schema, HMAC `X-Hub-Signature-256`, Google webhook-key validation, mapping, idempotency and canonical CRM ingestion are implemented in server modules.
- No public route currently calls `receiveMarketingProviderPayload`; therefore no accepted provider callback entrypoint is wired.
- Canonical evidence says real credentials, real webhooks and external delivery were not verified.
- The admin diagnostic still reports both adapters as `adapter_not_implemented`, conflicting with the build-time registry; this drift must be corrected before activation.
- Safe next moment: Architecture First webhook-entrypoint gate, credential-reference contract, provider app setup, test-lead proof and terminal teardown.

### 4.3 Meta Pixel, Google Analytics and conversions

Status: browser runtime implemented; live attribution unproved; Meta Conversions API disabled.

- Meta Pixel and GA4 loaders, tenant-scoped identifiers, closed event catalog, SPA navigation and consent opt-in are implemented.
- GTM remains intentionally CSP-blocked.
- Browser events include page view, property view, public-form submission, lead creation and contact clicks.
- External browser delivery and attribution were not live verified.
- The legacy Meta CAPI function is fail-closed and always reports `externalProviderCalled=false`; no server-side CAPI delivery is active.
- Safe next moment: consent/CSP requalification, test Pixel/GA properties, browser proof, then a separate server-side CAPI architecture and deduplication gate.

### 4.4 Property landing pages and CRM entry

Status: core property landing flow is implemented; a generic campaign landing-page builder is not proved.

- `/imovel/$slug` provides tenant-bound property content, SEO/canonical metadata, gallery, map, broker contacts and inquiry form.
- The form requires LGPD consent and e-mail or valid Brazilian phone/WhatsApp.
- Accepted submission writes through the canonical public lead writer with `status=novo`.
- The database trigger binds the lead to the tenant's unique active default pipeline and the `novo` stage; ambiguity fails closed.
- Attribution stores property, campaign, UTM, landing URL, referrer, `gclid` and `fbclid` when supplied by accepted contracts.
- Direct-site lead creation queues a `novo-lead` e-mail to the broker or tenant managers/contact address.
- The current page invokes browser Meta events, while CAPI remains fail-closed.
- Missing capability: configurable per-property/per-campaign landing-page templates, A/B versions, domain/path publication contract and campaign-specific conversion goals.

### 4.5 New-lead notifications

Status: e-mail queue implemented but live delivery unproved; SMS and WhatsApp adapters absent.

- The server enqueues an idempotent `novo-lead` transactional message and records pending/failure state.
- Current sender domains are fixed to RM Prime values and must become tenant/environment configuration before scale.
- Canonical CRM evidence records `EXTERNAL_EMAIL_EXECUTED=false`.
- WhatsApp and SMS are cataloged communication channels, but their state remains `adapter_not_implemented`.
- Safe next moment: provider-neutral notification contract, tenant preferences, recipient policy, templates, consent, retry/DLQ, observability and one provider adapter per channel.

### 4.6 Real-estate portals

Status: manual export, generic XML feed and inbound portal-lead endpoint exist; automated outbound portal adapters do not.

- The system can generate tenant-authorized VRSync-style XML feeds and CSV/XLSX/manual exports.
- A token-authorized public endpoint ingests portal leads into the canonical CRM and uses rate limits plus DLQ on internal failure.
- The outbound registry catalogs `XML_FEED`, `API_PUSH` and `CUSTOM_ADAPTER`, but every adapter returns `adapter_not_implemented`.
- No named free or paid portal catalog is accepted, and no real external publication was proved.
- The generic XML feed still contains a placeholder provider e-mail and requires tenant-scoped correction.
- Safe next moment: business selection of target portals, contract classification by feed/API/manual method, then one adapter gate at a time.

### 4.7 Other material business capabilities

- CRM: canonical stages, assignments, tasks, notes, tags, visits, proposals, SLA/automation registries, OCC/idempotency and audit trail are repository-materialized.
- CMS/campaigns: content and campaign rendering exist, but dedicated acquisition landing-page productization remains incomplete.
- Property administration and tenant-scoped media authority are materialized; live Storage proof remains a later homologation concern.
- Billing/Stripe runtime remains deferred upstream in issue #116 and must not block provider-agnostic frontend work.
- Production publish, commercial activation and production cutover remain unauthorized.

## 5. Architecture-first delivery plan

### Phase 0 — Governance and configuration closure

- Reconcile issue #107 and close historical issues according to terminal evidence.
- Execute ARCH-12F-02 in its own gate: externalize environment identifiers without moving secrets into GitHub.
- Definition of Done: no environment-specific identifier in shared runtime configuration unless explicitly documented as a safe invariant.

### Phase 1 — Product Capability Architecture Audit (PCA-01)

- Freeze a canonical capability matrix: implemented, repository-only, live-verified, blocked, missing and deferred.
- Define tenant onboarding sequence, provider ownership, credentials, consent/LGPD, data retention, retry/DLQ and audit requirements.
- Produce one dependency graph and prioritized release path; no implementation.

### Phase 2 — Customer onboarding and domains

- Validate tenant onboarding, canonical subdomain and custom-domain request UX.
- Prove manual DNS with a provider-owned registrar and automated Cloudflare lifecycle in a synthetic non-production tenant.
- Keep alternate edge/provider adapters out of scope until a business need is approved.
- Definition of Done: exact tenant/hostname authority, TXT/CNAME instructions, SSL observation, rollback/replacement and zero orphan.

### Phase 3 — Web acquisition and CRM

- Requalify `/imovel/$slug` end-to-end against Same-Backend.
- Add productized landing templates only after defining page ownership, versioning, SEO, consent and conversion contracts.
- Prove form → lead → unique default pipeline/`novo` stage → audit event → e-mail queue.
- Definition of Done: one synthetic lead, correct attribution, no cross-tenant read/write, idempotent notification and cleanup.

### Phase 4 — Tracking and conversion measurement

- Live-validate Meta Pixel and GA4 in non-production with consent and sanitized payload evidence.
- Keep GTM blocked until a closed CSP-safe contract exists.
- Design and implement Meta CAPI separately with browser/server `event_id` deduplication, hashed user data, credential custody and no client authority.
- Definition of Done: browser receipt and attribution proved; CAPI receipt/deduplication proved separately; no raw PII in logs.

### Phase 5 — Meta/Google campaign lead ingestion

- Materialize explicit public callback routes with exact provider verification.
- Resolve adapter-registry/diagnostic drift.
- Configure provider account/form mappings and opaque credential references.
- Prove Meta and Google test leads independently into the canonical CRM.
- Definition of Done: signature/key verification, replay rejection, exact tenant mapping, first-stage placement, audit ledger, retry/DLQ and no duplicate lead.

### Phase 6 — Notification orchestration

- Define provider-neutral e-mail/SMS/WhatsApp ports and tenant channel preferences.
- Externalize sender identity and per-tenant templates.
- Implement e-mail live proof first, then WhatsApp, then SMS; never infer delivery from enqueue.
- Definition of Done: accepted provider receipt, idempotency, suppression/opt-out, retry policy, terminal failure and audit evidence.

### Phase 7 — Portal integrations

- Owner selects portals by commercial priority and confirms free/paid plan constraints.
- Correct tenant identity in the generic feed.
- Validate manual export and XML feed before building API adapters.
- Implement one named portal adapter per gate; inbound leads must use the same canonical CRM writer.
- Definition of Done: publish/update/unpublish/reconcile, media mapping, credential rotation, inbound lead proof and DLQ recovery.

### Phase 8 — Integrated homologation

- Execute synthetic multi-tenant journeys: domain → landing → ads/tracking → lead → CRM → notification → portal.
- Validate Same-Backend, Auth, Storage, RLS, grants, consent, observability, backups and teardown.
- Production remains a separate Owner decision after terminal Product Acceptance.

## 6. Safe parallelization

1. Mutable lane: only one GitHub implementation gate at a time, beginning with ARCH-12F-02.
2. Read-only lane: provider documentation/account prerequisite inventory for Meta, Google, e-mail, WhatsApp, SMS and portals.
3. External-watch lane: Lovable support response and Wrangler/BCR triggers; no retries or agent calls.
4. UX/UI lane: Lovable may be used later only for advanced UX/UI after repository Architecture First approval; never for GitHub governance.
5. Backend/provider writes must remain sequential and separately authorized.

## 7. Recommended successor

`PCA-01_PRODUCT_CAPABILITY_COVERAGE_AND_INTEGRATION_ARCHITECTURE` should be planning-only/read-only and may run in parallel with the external watches. ARCH-12F-02 remains the first repository implementation candidate after LVR-02H terminal merge.
