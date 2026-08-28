# PCA-05R — GitHub-native prerequisite closure manifest

## Terminal decision

```text
SOURCE_MAIN=930233f12eb7750fe5dd644033df83ae340f72a7
SOURCE_TREE=98dc5b9c3fb7fbc8eab49226082e8eef45257e22
STATUS=FAIL_CLOSED_SYNTHETIC_SUBSTRATE_BUNDLE_REQUIRED
WHOLE_PREREQUISITE_REPLAY_ALLOWED=false
SAME_BACKEND_AS_RECIPE_ALLOWED=false
MIGRATION_FILE_MUTATION=false
LOVABLE_AGENT_CALLS=false
BACKEND_MUTATION=false
PROVIDER_MUTATION=false
DEPLOY=false
PR_105_MUTATION=false
```

The protected repository contains 131 SQL migration files: 105 candidates
before the PCA-04 chain, 17 approved PCA-04 rehearsal migrations and 9 later
or interleaved migrations outside the rehearsal. The machine-readable manifest
records every candidate byte hash and disposition; timestamp or Lovable ledger
names do not establish equivalence.

## Closure finding

The 105 historical files are not an admissible whole-file bootstrap for an
empty private cell. One file seeds a real RM Prime tenant and identity, one
deletes a named Auth identity, and one broadly rewrites Storage objects. The
remaining candidates still require statement-level dependency proof and an
execution wrapper because 104 do not contain their own explicit transaction.

Comments mentioning `net.http_post` are not executable callers. Static
comment-stripped inspection found no executable HTTP/net or cron invocation in
the prerequisite candidates; this does not waive the mandatory catalog
preflight in the future cell.

## Binding execution boundary

No project/database creation or SQL application is authorized. A successor
GitHub-native gate must materialize a rehearsal-only synthetic substrate bundle
from exact protected-main statements, with statement hashes, dependency order,
transaction wrappers and explicit exclusions for all real-identity, tenant,
Storage and external-effect operations. It must remain outside
`supabase/migrations/` and cannot become a production migration or ledger
repair mechanism.

The 17 PCA-04 files remain byte-valid but cannot execute until that substrate
bundle is independently tested and merged. Same-Backend remains evidence only,
never an execution recipe. The four live-only BCA/BCR versions remain
quarantined, and DCA-02-BL2 continues to own backup/PITR proof.
