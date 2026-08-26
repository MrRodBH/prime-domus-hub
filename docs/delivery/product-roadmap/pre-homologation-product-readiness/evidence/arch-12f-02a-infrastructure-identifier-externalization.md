# ARCH-12F-02A — Infrastructure Identifier Externalization Evidence

## Authority and scope

```text
GATE=ARCH-12F-02A_GITHUB_NATIVE_INFRASTRUCTURE_IDENTIFIER_EXTERNALIZATION_CORRECTIVE_IMPLEMENTATION
SOURCE_MAIN=5e6f394b555e2de3b4cfdaa20d051003c5c05d71
SOURCE_TREE=22217abe8b655950a39beaf1b9960bf49f714434
BRANCH=agent/arch-12f-02a-github-native-infrastructure-identifier-externalization
PR=141
GITHUB_MUTATION=true
CODE_MUTATION=true
MIGRATION_FILE_MUTATION=false
BACKEND_MUTATION=false
PROVIDER_MUTATION=false
LOVABLE_AGENT_CALLS=false
```

## Corrective implementation

- `wrangler.jsonc` is now a non-deployable template and contains no Cloudflare
  account identifier or real Worker name.
- `scripts/materialize-wrangler-config.mjs` validates the deployment environment,
  Cloudflare account ID, Worker-name environment suffix, Supabase project ref and
  exact Supabase URL/ref parity before producing `.wrangler.generated.jsonc`.
- The resolved file is ignored by Git, written atomically with mode `0600`, and
  used explicitly by Wrangler without named environments.
- `supabase/config.toml` now contains only `project_id = "rm-prime-local"`.
  Remote selection is external through `supabase link --project-ref`; link state
  under `supabase/.temp/` is ignored.
- Release, WRI-01 and SPR-03 regressions enforce the new contract. CI fixtures
  are unmistakably synthetic and no provider operation is executed.

## Fail-closed contract

```text
MISSING_INPUT=fail_before_materialization
BLANK_INPUT=fail_before_materialization
MALFORMED_ACCOUNT_ID=fail_before_materialization
INVALID_WORKER_NAME=fail_before_materialization
WORKER_ENVIRONMENT_SUFFIX_MISMATCH=fail_before_materialization
SUPABASE_PROJECT_REF_URL_MISMATCH=fail_before_materialization
NAMED_WRANGLER_ENVIRONMENT=prohibited
SECRET_VALUE_LOGGING=prohibited
```

## Verification

```text
FOCUSED_ARCH_12F_02A=PASS
ARCH_12F_01_REGRESSION=PASS_F01_F10
WRI_01_REGRESSION=PASS_66_ASSERTIONS
SPR_03_REGRESSION=PASS_89_ASSERTIONS
NEW_FILES_ESLINT=PASS
PRODUCTION_BUILD=PASS
TYPECHECK=PASS
WORKER_BUNDLE_AUDIT=PASS
WRANGLER_DRY_RUN_SYNTHETIC=PASS_WRANGLER_4_114_0_EXIT_0
REMOTE_RELEASE_GATE=TO_BE_RECORDED
REMOTE_WRI_01_GATE=TO_BE_RECORDED
REMOTE_PR_M2_GATE=TO_BE_RECORDED
```

No migration, backend, Cloudflare resource, Supabase project, production
surface, Lovable project or roadmap site is mutated by this gate.
