# PCA-07 — terminal post-application reconciliation and successor selection

## Decision

`SOURCE_MAIN = 6567ffcd68b6cea12d598ec92dbd673e9bf04818`

`SOURCE_TREE = 1291ab35a601d2a0b81b0e623d59ea3dc2db73ae`

PCA-07 is `ACCEPTED_TERMINAL`. Protected PR #175 merged W6R with both required exact-head checks green and no ruleset bypass. GitHub `main` is identical to the verified merge commit.

The corrected 27,449-byte W6 envelope was applied exclusively through the Lovable-managed canonical backend. Its atomic preflight, DDL/DML, exact-manifest invocation, ledger write and postflight committed. Read-only reconciliation independently confirmed ledger integrity `3/3/3/2/8/1` for W1–W6, three W6 functions, one future-tenant trigger and exact least-privilege ACLs.

All 15 W5 tables exist with RLS, all 17 W5 functions exist, client table/function exposures remain zero, the exact tenant baseline is `1/7–4/4/4–3/3/36/1`, and protected tenant, portal-secret and Storage cardinalities are unchanged. No direct Supabase access occurred.

## Successor boundary

The selected successor is `PCA-08_PROVIDER_AGNOSTIC_PRODUCT_HOMOLOGATION_ENTRY_READ_ONLY_IMPACT_REQUALIFICATION`. It is a read-only decision gate, not authorization for controlled homologation. It must reconcile the now-complete product schema with the current HRR-01 authority, release evidence and remaining external prerequisites without reopening historical HVP-01/HRC-01 stages.

Controlled Homologation remains unauthorized. Production, deploy, provider mutation, commercial PR #105 adoption and DCA-02-BL2 R2 activation remain outside PCA-07. R2 stays deferred until after formal homologation and before production readiness/cutover.
