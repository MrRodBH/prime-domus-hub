# ARCH-12F-02B — Runtime tenant domain and sender externalization

## Authority

```text
SOURCE_MAIN=b5bf74a4b9ec2de320518d217710ac35961056db
SOURCE_TREE=a07ddc8ddc3d3a01554ca74d38eca3d955fa2169
MIGRATION_FILE_MUTATION=false
PROVIDER_MUTATION=false
BACKEND_MUTATION=false
DEPLOY=false
LOVABLE_AGENT_CALLS=false
```

## Implemented contract

- Required server-only inputs: `RM_PRIME_EMAIL_SITE_NAME`,
  `RM_PRIME_EMAIL_SENDER_DOMAIN`, `RM_PRIME_EMAIL_FROM_DOMAIN` and
  `RM_PRIME_AUTH_SITE_ORIGIN`.
- Missing, blank, malformed, cross-domain or header-injection input fails before
  an email is queued.
- The sender domain must be a strict subdomain of the `From` domain; the Auth
  origin must be an exact HTTPS origin without credentials, path, query or hash.
- Public sitemap origin comes from the canonical hostname resolved by the
  server-side Domain Authority. Forwarded host/protocol headers are ignored.
- Public route canonicals are host-relative after canonical redirect, while
  tenant identity and SEO copy come from the published tenant configuration.
- Versioned legacy production domains were removed from the affected runtime
  paths. Preview-only password reset data uses the reserved `.test` namespace.

## Verification

```text
FOCUSED_ARCH_12F_02B=PASS
TYPECHECK=PASS
PRODUCTION_BUILD=PASS
MIGRATION_FILE_COUNT=0
PROVIDER_WRITES=0
BACKEND_WRITES=0
DEPLOY=false
```

Remote Release, WRI-01 and PR-M2 gate results are recorded only after the exact
candidate head is published to an isolated branch.
