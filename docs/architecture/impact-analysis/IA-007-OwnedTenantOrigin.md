# IA-007 — Owned tenant application origin

Date: 2026-09-14. Scope of this revision: impact record, local compiled-runtime experiment, CI and operational documentation. Production implementation and credential transfer remain unexecuted. Owner selected preparation subject to demonstrated validation; that is not evidence of future 100% success. This record consolidates the read-only analysis and local experiment; it does not backdate a production approval.

## 1. Objective

Remove the unsupported SaaS-to-SaaS origin chain by hosting the existing tenant application in a distinct Cloudflare application Worker, retaining the canonical managed Supabase backend.

## 2. Scope

In: PR286 decision correction, production-origin preparation, compiled Workerd isolation test and additive CI check. Later deployment requires secure credential custody and acceptance before ingress.
Follow-up within release validation: classify three already-present September migrations as explicitly excluded from the historical PCA-05R rehearsal; update its inventory counts and hashes without changing SQL, rehearsal content, prerequisites or replay prohibitions.
Continuation after owner secret configuration: historical PCA tests must distinguish their archived baseline from the already accepted main `18f6a8e7eece84e542df926295b7049f721094ae`. A test-only helper will verify ancestry and reject every new path outside the exact PR286 review scope; it cannot authorize application, SQL or credential changes. Existing behavioral/security tests remain active. The PCA-12B config check may recognize only the exact PR281 domain-processor suffix while retaining the historical prefix hash and authenticated HML section. No historical provisioner is executed or enabled by this compatibility correction.
Out: platform-host migration, UI changes, database migration, second domain scheduler, legacy HML redeployment, direct status activation, purchase of a paid plan.

## 3. Components

Existing Nitro/Cloudflare bundle, materializer, Supabase server clients, routing-proof handler, static assets, Cloudflare for SaaS delivery zone. This revision changes no application source, schema, Edge Function, secret or live route.

## 4. Architectural analysis

| Component | Change | Reason |
| --- | --- | --- |
| Registry | NO | Existing definitions reused verbatim. |
| Snapshot | NO | Existing per-tenant snapshot lifecycle. |
| ResolutionGraph | NO | No resolver replacement or graph mutation. |
| ActionExecutor | NO | Existing authorization/dispatch. |
| PluginContext | NO | No additional access or methods. |
| Bootstrap | NO source change | Existing compiled Cloudflare bootstrap exercised in Workerd. |
| Public contracts | NO | Existing hostname, generation and HMAC proof contract tested unchanged. |

## 5. Invariants

1. Registry Purity: unchanged; fixture lives only in test process.
2. Registry Freeze: unchanged.
3. Snapshot Passivity: unchanged.
4. Tenant Isolation: three synthetic tenants; independent signatures and alias targets tested. Live RLS/auth acceptance still required.
5. Resolution Graph Immutability: unchanged.
6. Single Dispatcher: same compiled application, no replacement renderer.
7. Typed Kinds: unchanged.
8. Plugin Read-Only Sandbox: unchanged.
9. Executor Purity: unchanged.
10. Bootstrap Determinism: real bundle loaded with synthetic runtime bindings; repetition tested.
11. Explicit Contracts: exact host/domain/tenant/generation/nonce signature independently checked.
12. O(1) Resolution: no production resolver change.

## 6. Hard gates

| Gate | Assessment |
| --- | --- |
| G0 Governance | ADR records owner-selected preparation; no live cutover represented as approved by a test. |
| G1 Plugin Sandbox | No plugin change. |
| G2 Flag Neutrality | No architectural feature flag. |
| G3 Loader Purity | No loader change. |
| G4 Plugin Registry Isolation | No registry imports added. |
| G5 Context Read-Only | No context change. |
| G6 Core Untouchability | No protected-core source change. |
| G7 Bootstrap Untouchability | No bootstrap source change; test executes existing output. |

## 7. Coupling

Application/backend: same canonical project; no replica. Hosting/provider: owned application removes second SaaS zone. Automation/hosting: processor stays exclusively Supabase Edge; application config has no cron. Credentials: ChatGPT connector, managed runtime and Worker runtime remain separate custody boundaries. Test/production: fixture outbound service cannot reach a network and rejects writes; synthetic build is not deployable.

## 8. Multi-tenancy

Preserve exact server-owned hostname resolution. Unknown hostname, unverified ownership, orphan alias, API failure and forged forwarding/tenant headers are rejected in compiled-runtime checks. These checks do not claim live login, RLS, content or TLS acceptance.

## 9. Plugins

No plugin, menu, theme or capability contract change.

## 10. ADR required

YES: DOMAIN_ORIGIN_CHAIN_CORRECTION.md records hosting-boundary change and supersession of the unsupported origin chain.

## 11. Architectural patch required

NO for this preparation revision: no protected core or bootstrap mutation. A later credential provisioner must receive explicit security review and cannot reuse historical impersonation helpers.

## 12. Implementation strategy

Verify PR tree, build isolated copy with dummy public configuration, materialize new production name locally, audit compiled bundle, run compiled-runtime test. Record current connector capability instead of presuming historical limitations. Obtain only the missing runtime-accessible Cloudflare provisioning credential. Then implement/review secure transfer, build with canonical public values, deploy isolated origin, validate live origin and TLS before routing traffic and allowing existing reconciliation.

## 13. Checklist

- [x] AGENTS, Constitution, Security Architecture, current domain ADR/rollout and PR evolution consulted.
- [x] Exact PR286 starting tree verified locally; existing changes preserved.
- [x] Local build, compiled-bundle audit and three-tenant routing-proof experiment passed.
- [x] Additive CI check; no existing test disabled.
- [ ] Final-head CI observed after push.
- [ ] Secure runtime-to-Worker credential custody implemented and verified.
- [ ] Isolated production Worker, assets, live TLS, authentication and traffic acceptance.
- [ ] Canonical/alias state-machine activation and final tenant/platform homologation.
