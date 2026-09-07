# Round 44 — Initial broker identity link interface

Authorized base: `main@033a80eb47e3704183420de1453f309441dd62a6` (Round 43, PR #234). Repository-only change; no deployment or backend execution.

## Necessary impact analysis (before editing)

The directory already reads `user_id` through `adminListarCorretores`, but its presentation strips private identifiers. Add only a boolean link state. The detail stays a read-only professional profile; a separate panel consumes the exact Round 42 two-field command. No new server function, migration, authorization, tenant resolver or access-creation path is required. `listTenantMemberships` has narrower owner/canonical administrative authorization than the link command; load it only on explicit selection and show its refusal, without any alternate lookup or permission expansion. The server remains authoritative for both calls.

## Implemented behavior

Active memberships only; explicit empty, loading, denied and unavailable states; identity selection and named confirmation; cancellable review before submission; processing with immediate duplicate lock and React Query mutation tracking; success and `already_linked`; safe conflict and unknown-error messages. Failed commands preserve the selected identity and never retry automatically. Both successful outcomes invalidate the actual directory query. A failed refresh is visible without repeating the command. Existing links expose no replacement or unlink. A membership becoming invalid after selection is revalidated by the unchanged server command.

Membership results stay in component memory, not a shared query cache. Late lookup responses are ignored after unmount; mutation success invalidates the directory even if the panel unmounts. The panel retains the existing shell and tenant transport boundaries; it does not establish tenant or authorization from client data.

## Controlled verification and regression evolution

`run-round-44-broker-identity-ui-specs.mjs` bundles the actual directory page, read-model hook and panel. All API imports are replaced at build resolution; the runner rejects backend/Supabase modules in the bundle and disables fetch. JSDOM 26.1.0 is a temporary test-only dependency, not a product dependency. Synthetic UUIDs and `example.invalid` identities only.

DOM cases: selection/confirmation/cancel; exact payload; active-only options; lazy lookup; loading; empty; owner denial; absent manager; missing tenant; query failure and explicit retry; command denial; conflict; safe failure and preserved selection; no automatic retry; same-tick duplicate submissions; success and already-linked refresh; pre-existing link; directory denial; failed refresh without repeated mutation. Evolved FVS6 checks retain filtering, metrics, team projection and privacy, adding only boolean link state. The original FVS6 exact twelve-file release snapshot remains historical, not claimed as a current-head gate. PR-M2 replaces the temporary Round 42 “no link UI” assertion with exact dedicated-command and no privileged/client-authority/access-creation guards. The three cumulative scope classifiers add only this round's fourteen exact paths and retain their historical runtime assertions.

Local DOM and PR-M2 checks passed; applicable CI checks must pass on the final PR head before protected merge. The new workflow performs DOM, PR-M2 and typecheck. Existing Round 40 and Round 42 workflows and protected release gates remain applicable. Final head/check/merge evidence is recorded in the PR and its checks.

## Limits and continuity

Controlled DOM verifies frontend behavior, not browser layout, mobile/200% zoom, remote availability, persistent writes, or a deployed migration. Round 43's native PostgreSQL 17.6 isolated concurrency evidence remains intact and is not repeated or generalized. Production APIs, integrations, migrations, permissions and dependency manifests remain unchanged. No backend, real identity, credential, deployment, publication or Lovable action occurred.

#229 still awaits human support; #231 remains unmerged and undeployed. #227, #230, demonstration and preview remain preserved. LSR-02 remains Rejected — Terminal, budget 0/2. Remote operation availability and persistent homologation remain dependencies requiring separately authorized work after the existing blockers are resolved.
