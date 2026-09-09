# Release identity — Round60

Owner authorization: continue #251 after the supplied release.json returned
commit=null, dirty=null, builtAt=2026-09-08T19:45:19.492Z. Never substitute the
expected revision or false for unavailable Git metadata. No roadmap change.

The official Lovable read-only response on 2026-09-09 (message
umsg_01m23ps440etwtbrkj2p1b93vq) could not expose build logs, deployment-specific
terminal status, or the originating revision. Runtime logs are not build logs.
The public browser URL restriction remains respected.

## Schema 2 and comparison

The build-only Vite plugin emits release.json. `source.sha256` is computed from
actual files on disk, without Git or environment variables. Compare its scope,
algorithm, fileCount and digest with the output produced on the approved source:

Run `node --import tsx/esm tests/round60/release-identity.ts` from that checkout.
The existing Round52 CI executes it through the Round58 regression runner and
records the expected digest with the tested GitHub head. No new dependency.

Scope `rm-prime-source-v1` covers all regular files recursively in src, public,
scripts; package.json, bun.lock, tsconfig.json and vite.config.ts are mandatory.
Optional package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lockb,
postcss.config.js, tailwind.config.ts and index.html are included if present.
Paths use forward slashes and ordinal sorting. Each file is SHA-256 hashed over
its exact bytes, then SHA-256 is applied to UTF-8 JSON of
`[scope, [[path, fileSha256], ...]]`. Added/deleted files change the digest.
Missing mandatory inputs or symlinks fail the build instead of producing a
misleading identity. The public response contains only aggregate hash/count.

Excluded: generated src/routeTree.gen.ts and public/release.json. Environment
configuration, secrets, dependencies on disk, Git data, database state, tests,
documentation and compiled output are outside this source scope. Runtime
configuration can change independently of a matching source digest. Alternative
provider lockfiles or byte transformations cause a mismatch to investigate, not
an automatic approval. Update the scope version if its coverage changes.

A matching digest establishes equality within that scope, not a signed build
attestation, full artifact equality or proof of a unique Git commit. Multiple
commits with the same selected inputs legitimately share the digest.
`commit` and `dirty` remain null together if Git identity cannot be determined;
when available, dirty includes staged, unstaged and untracked nonignored files.
Never interpret null as false. `builtAt` is generation time, not deploy success.

## Acceptance boundaries

Controlled tests cover same source exported without Git, modified/added/deleted
inputs, unknown Git state, untracked inputs and fail-closed missing/symlink inputs.
Source evidence and published behavior must be reported separately. ViaCEP,
platform-only account management, refusal of tenant operation and approved visual
presentation still require public observation. Owner-entered records alone will
be used for later logout/login persistence acceptance. No records are created by
this correction; no role, property, navigation, theme or roadmap changes.
