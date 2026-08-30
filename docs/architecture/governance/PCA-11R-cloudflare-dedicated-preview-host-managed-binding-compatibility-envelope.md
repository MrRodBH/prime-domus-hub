# PCA-11R — Dedicated preview-host and managed-binding compatibility envelope

## Binding invariants

```text
SOURCE_MAIN=e766b68cc808a9de787b45f7c927de22aac62a3e
TARGET_WORKER=rm-prime-pca11-hml
PREVIEW_ALIAS=pca11-hml
SYNTHETIC_TENANT_SLUG=pca11-hml
TARGET_MUST_BE_ABSENT_BEFORE_MATERIALIZATION=true
TARGET_ACTIVE_DEPLOYMENT_COUNT=0
SOURCE_FINGERPRINT_REQUIRED=true
```

The exact preview hostname is provider-resolved and externally injected only
after it matches `pca11-hml-rm-prime-pca11-hml.<SUBDOMAIN>.workers.dev`.
One full hostname maps to one synthetic slug. `.workers.dev` wildcards,
suffix trust, forwarded-host authority and real tenant reuse are prohibited.

The PCA-11 bridge requires authenticated global `super_admin`, rejects
`x-tenant-id`, accepts only identifiers and the exact source fingerprint, and
uses a closed target/binding contract. The stage provisioner is server-only,
must fail before provider access when absent and can never become a Worker
binding.

## Later separately authorized sequence

1. revalidate exact protected main and candidate absence;
2. build and digest the exact source;
3. create the dedicated bootstrap Version with preview disabled and no deployment;
4. reconcile source fingerprint, bindings, routes, Cron and deployment count;
5. create the plain-binding inactive canary through managed custody;
6. create the final inactive managed-binding Version;
7. enable only the aliased preview URL after exact-host traffic control passes;
8. run bounded synthetic capability probes and deterministic teardown.

Any drift, ambiguous provider response, unexpected binding, active deployment,
secret disclosure attempt or adjacent host stops before preview exposure.

## Authorization boundary

```text
REPOSITORY_IMPLEMENTATION_AUTHORIZED=true
BRANCH_PUBLICATION_AUTHORIZED=false
PROVIDER_WRITE_AUTHORIZED=false
DEPLOY_AUTHORIZED=false
PREVIEW_ACTIVATION_AUTHORIZED=false
SAME_BACKEND_READ_AUTHORIZED=false
SAME_BACKEND_WRITE_AUTHORIZED=false
FIXTURE_CREATION_AUTHORIZED=false
CONTROLLED_HOMOLOGATION_AUTHORIZED=false
PRODUCTION_AUTHORIZED=false
```
