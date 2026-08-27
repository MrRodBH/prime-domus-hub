# ARCH-12F-03 — Official workerd single-dispatch harness

## Authority and scope

SOURCE_MAIN=b228779e3df1755879c34088315597c8b432e0ba
SOURCE_TREE=839b60701d423be55fa8b88e643acbf7030c1ce7
UPSTREAM_WRANGLER_TRIGGER=4.126.0
OFFICIAL_RUNTIME=workerd@1.20260825.1
COMPATIBILITY_DATE=2026-07-29
PROVIDER_MUTATION=false
BACKEND_MUTATION=false
DEPLOY=false
PR_105_MUTATION=false
LOVABLE_AGENT_CALLS=false

Wrangler 4.126.0 satisfies the temporal recheck trigger but is not admissible
for the proof path: its published ProxyWorker retains automatic GET/HEAD
requeue behavior, while the relevant upstream corrections remain unmerged.

## Implemented proof cell

- Executes the official Cloudflare workerd binary directly, without Wrangler,
  ProxyWorker, Miniflare proxy or browser retry layers.
- Pins the tested engine exactly in package.json and bun.lock.
- Advances the permanent F07 lockfile checksum to the new audited exact
  dependency baseline.
- Uses one local TCP connection with Connection: close, one POST and one request
  ID in the positive phase.
- Counts matching Worker invocation logs and requires exactly one.
- Runs a separate explicit negative phase where a repeated request ID is
  rejected with HTTP 409.
- Denies global outbound networking in the workerd configuration.
- Uses no secrets, provider identifiers, database bindings, migrations,
  deployment configuration or production resources.

## Boundary

This harness qualifies only the deterministic local transport cell. It does
not activate billing, Stripe, checkout, portal, invoice, provider diagnostics
or commercial mutations. Any BCR recovery must be reconstructed from the
then-current main; the preserved PR #105 is not an integration source.

Remote Release, WRI-01 and PR-M2 results are recorded only after publication of
the exact candidate head in an isolated draft PR.
