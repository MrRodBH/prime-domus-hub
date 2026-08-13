# BCR-01 Hybrid Billing Envelope — Pre-Merge Evidence

```text
BASELINE_MAIN = 1696c7d70373c1549f4464128e941f4a4776f1b0
ENVELOPE_COMMIT = 2fea7404df717160517e5517a89b4e0eeda43b04
HYBRID_BILLING = explicit
MRR_PATH = subscriptions
NON_RECURRING_PATH = invoicing
BCA01_REOPEN = false
IMPLEMENTATION_STARTED_BY_THIS_COMMIT = false
DATABASE_MUTATION = false
PROVIDER_MUTATION = false
```

The envelope correction makes setup, milestone, customization and on-demand revenue first-class non-recurring billing paths under the existing provider-agnostic BillingProvider boundary. It also corrects the factual Super Admin registry path and keeps final SaaS plan catalog definition deferred.
