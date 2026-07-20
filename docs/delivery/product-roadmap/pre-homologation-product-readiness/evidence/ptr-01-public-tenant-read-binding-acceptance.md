# PTR-01 — Public Tenant Read Binding — Final Audit Rejection

## Authority notice

The prior `Accepted` declaration in this file is superseded by the final direct GitHub audit recorded against effective `main`.

```text
PTR_01_STATE = Rejected
PTR_01_TERMINAL = true
PRIOR_ACCEPTANCE_VALID = false
```

## Audited repository state

```text
Repository: MrRodBH/prime-domus-hub
Accepted predecessor main: 9c93b9c8b7b095e2a07e424ed895f529d5e4b4fc
PTR runtime merge: a746e58bc2c48f0e20ddee62571c16ace809bbd8
Invalid acceptance reconciliation: d630daf8ffdf28e195de4ed0028577288e974652
Lovable interactions: 0
```

## Duplicate execution finding

Two independent implementation flows executed the same PTR-01 material scope concurrently:

### Flow A — PR #21

```text
Created before PR #22
Principal head: 6f57c87a14ce3b35cac8713b46f281f8a736aef5
Principal run: 29786244606
Principal conclusion: failure
Corrective head: 2d66ffb731ca7a6faa57d9ccca3abb25b9130cc2
Corrective run: 29786580653
Corrective conclusion: failure
PR result: closed unmerged
```

The complete corrective artifact proved a TypeScript serialization failure in the page DTO used by that flow.

### Flow B — PR #22

```text
Created after PR #21
Principal head: b36381b74344ffc65d368cb8af63cd44d86caec3
Principal run: 29786394077
Principal conclusion: failure
Corrective head: c27b09f99ca10720b47b90daced07e4f1b45ef09
Corrective run: 29786681893
Corrective conclusion: success
PR result: merged as a746e58bc2c48f0e20ddee62571c16ace809bbd8
```

The stage therefore consumed more than one principal and one corrective execution. The acceptance commit `d630daf...` omitted Flow A and incorrectly recorded a compliant budget.

## Build and typecheck status

A documentation-only audit PR executed the full Release Gate against the effective merged runtime:

```text
Audit PR: #26
Audit head: 027b4235f653889e7651d962fcee51bdefe015b4
Run: 29787093558
Job: 88500886301
Conclusion: success
```

This proves that the effective runtime compiles and passes the current structural Release Gate. It does not prove the missing behavioral requirements below.

## Blocking findings

### 1. Prompt/PR budget exceeded

```text
PTR01_PRINCIPAL_EXECUTIONS = 2
PTR01_CORRECTIVE_EXECUTIONS = 2
PTR01_ALLOWED_IMPLEMENTATION_EXECUTIONS = 2
PTR01_BUDGET_COMPLIANT = false
```

No additional PTR-01 implementation is authorized.

### 2. Unknown-host public application does not fail closed

`requirePublicTenantFromRequest()` throws when Host authority cannot be resolved, but `src/routes/__root.tsx` catches and ignores errors from both public site settings and public Meta reads. The root route then renders default RM Prime branding and metadata.

```text
UNKNOWN_HOST_PUBLIC_READ_FUNCTION_THROWS = true
UNKNOWN_HOST_PUBLIC_APPLICATION_DENIAL = false
DEFAULT_BRANDING_AFTER_TENANT_FAILURE = true
```

### 3. Public Meta query error is ignored

`obterMetaPixelId()` applies tenant equality but does not inspect the Supabase `error` result. A failed query is converted into `{ pixel_id: null }`.

```text
PUBLIC_META_TENANT_FILTER_PRESENT = true
PUBLIC_META_QUERY_ERROR_FAILS_CLOSED = false
```

### 4. Cross-tenant runtime proof is absent

The PTR-01 specifications inspect source strings. They do not execute database fixtures or runtime probes proving that a foreign tenant row is denied.

```text
STRUCTURAL_TENANT_FILTER_SPECS_PASSED = true
RUNTIME_CROSS_TENANT_READ_TESTS_EXECUTED = false
CROSS_TENANT_PUBLIC_READ_TESTS_PASSED = false
```

### 5. Acceptance claims were unsupported

The prior acceptance claimed:

```text
UNKNOWN_HOST_PUBLIC_READ_DENIAL = true
CROSS_TENANT_PUBLIC_READ_TESTS_PASSED = true
```

The effective code and test suite do not prove those claims.

## Runtime disposition

The runtime commit `a746e58...` remains physically present because it removes client tenant input and adds explicit tenant predicates. Immediate rollback would restore less restrictive public read paths.

Its presence does not constitute acceptance:

```text
PTR01_RUNTIME_PRESENT = true
PTR01_RUNTIME_ACCEPTED = false
PTR01_ARTIFACTS_AUTO_TRANSFERABLE = false
```

A reduced successor must independently audit, retain, replace or correct only the files inside its frozen scope.

## Terminal governance result

```text
PTR01_PRINCIPAL_CONSUMED = true
PTR01_CORRECTIVE_CONSUMED = true
PTR01_REMAINING_IMPLEMENTATION_BUDGET = 0/2
PTR01_ADDITIONAL_IMPLEMENTATION_AUTHORIZED = false
PTR01_BUDGET_REOPENING_AUTHORIZED = false
PTR01_FINAL_EXTERNAL_AUDIT_ACCEPTED = false
PTW01_STARTED = false
PTW01_AUTHORIZED = false
```

## Reduced successor path

```text
PSC-01 — Public Settings & Campaign Read Recovery
  → PPR-01 — Public Page Runtime Verification
  → PTW-01 — Public Tenant Writer Authority
```

PSC-01 and PPR-01 are independent reduced outcomes, not PTR-01 retries. Both must use the current runtime only as an observed baseline and must produce executable behavioral evidence.

```text
NEXT_STAGE_AUTHORIZED = PSC-01
LOVABLE_AUTHORIZED = false
```
