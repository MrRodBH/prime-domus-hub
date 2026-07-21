# PTW-01 — Public Writer Authority Inventory

## Status

**Direct repository audit — planning evidence**

```text
STAGE_ID = PTW-01
BASELINE_MAIN = 87acb309c0102a096f65d0c420061012edb5899e
CANONICAL_ISSUE = 16
EXECUTOR = GitHub-native
RUNTIME_CHANGED = false
DATABASE_CHANGED = false
PTW01_IMPLEMENTATION_AUTHORIZED = false
PSG01_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

## 1. Audit boundary

The inventory covers public product mutations and public routes that perform tenant-scoped side effects:

1. public site lead creation;
2. generic CMS form submission and optional lead creation;
3. CMS campaign event registration;
4. Meta Conversions API event dispatch;
5. portal lead ingestion;
6. portal feed generation with operational writes;
7. portal DLQ replay of lead ingestion.

The following public surfaces were inspected but are not implementation-owned by PTW-01:

- `api/public/bootstrap-admin`: identity bootstrap, not a tenant business writer;
- operational hook authentication for `portal-dlq-retry`: owned by PSG-01;
- email provider callbacks and suppression routes: separate email/provider security boundary;
- CMS renderer sanitization and URL allowlists: owned by PSG-01.

PTW-01 may change the DLQ replay business write path, but it must not change the hook authentication mechanism in this stage.

## 2. Authority matrix

| Surface | Current authority source | Database client | Current write | Primary defect |
|---|---|---|---|---|
| `enviarLead` | none; resource IDs and notification flag from client | service role | `leads` plus email queue | no Host tenant; no explicit tenant on lead; unscoped resource and recipient queries |
| `submeterFormulario` | tenant derived from globally resolved form slug | service role | `leads`, `form_submissions`, email, webhook | slug is global authority; `maybeSingle`; no Host binding |
| `registrarEventoCampanha` | optional client `tenantId` converted to `x-tenant-id` | anon | `cms_campaign_events` | client/header authority; no campaign ownership proof |
| `enviarEventoMetaCAPI` | none; first global settings row by key | service role | external Meta API | tenant credentials are not Host-bound |
| portal lead endpoint | exact token intended, but `maybeSingle` | service role | `leads`, sync log, DLQ | ambiguous token handling; direct property ID is not tenant-bound |
| portal feed endpoint | exact token intended, but `maybeSingle` | service role | `imovel_portais`, connector status, sync log | ambiguous connector authority; operational writes must reuse proven tenant |
| portal DLQ replay | `item.tenant_id` from queue item | service role | `leads` and retry/resolution RPCs | duplicate writer path; property ID replay is not revalidated |

## 3. Public lead creation

### 3.1 Current function

```text
src/lib/api/catalogo.functions.ts
export const enviarLead
```

Current behavior:

- accepts `imovel_id`, `launch_project_id`, `origem` and `notificar_gestores` from the browser;
- creates a service-role client directly;
- resolves launch project by `id` only;
- resolves property by `id` only;
- resolves broker and user by global IDs without tenant equality;
- inserts a lead without assigning an explicit server-proven `tenant_id`;
- may query all `user_roles` with `admin` or `gerente` and all matching brokers without tenant scope;
- reads `site_settings` contact data by global key;
- enriches notification email through a property lookup by global ID.

### 3.2 Consumers

Confirmed consumers include:

```text
src/routes/contato.tsx
src/routes/anuncie.tsx
src/routes/imovel.$slug.tsx
src/routes/lancamentos.$slug.tsx
```

The contact and listing-advertisement routes send `notificar_gestores: true` from the client. Property and launch routes send resource IDs originating from public read data, but the server accepts the IDs independently and must not trust their browser provenance.

### 3.3 Accepted predecessor boundary

The accepted authenticated manual lead path uses `create_manual_lead`, canonical tenant resolution, explicit membership cardinality and authenticated-only RPC grants. PTW-01 must not modify or weaken that LSH-01 boundary.

The current public writer is a separate service-role bypass. PTW-01 must create a dedicated anonymous-public boundary rather than routing anonymous traffic into the authenticated manual-lead RPC.

### 3.4 Required decision

- resolve the public tenant from request Host before any resource query;
- reject any tenant field or tenant header as authority;
- validate property or launch project by `tenant_id + id` with explicit 0/1/N handling;
- derive broker, assignee and notification recipients only inside the same tenant;
- remove `notificar_gestores` from public input;
- derive notification policy server-side;
- insert `tenant_id` explicitly from the accepted public tenant;
- use one shared public-lead writer for direct site leads, form-derived leads and portal leads after each channel has established its own accepted authority.

## 4. Generic CMS forms

### 4.1 Current functions

```text
src/lib/api/forms.functions.ts
obterFormPublicoPorSlug
submeterFormulario
```

Current behavior:

- public form read uses anon client and resolves by global `slug + published` with `maybeSingle()`;
- public submission uses service role and repeats global `slug + published` resolution with `maybeSingle()`;
- tenant authority is copied from the returned form row;
- fields are loaded by form ID;
- optional lead and submission writes use the row-derived tenant;
- notification recipients and webhook are derived from form config.

### 4.2 Consumer

```text
src/components/site/CmsFormRenderer.tsx
```

The component receives a form slug from a validated CMS page block and submits the same slug from the browser. The server must still resolve Host authority independently.

### 4.3 Required decision

- resolve tenant from Host before form lookup;
- strict input accepts only form slug, form data, consent and attribution fields;
- query form by `tenant_id + slug + published` and read at most two rows;
- zero rows fails as unavailable, exactly one row is accepted, multiple rows fail as ambiguity;
- post-validate returned form `tenant_id`;
- form fields must be linked only to the accepted form identity;
- optional lead creation must call the shared public-lead writer with the accepted tenant object;
- submission row must use the same tenant and form identity;
- notification and webhook configuration must come only from the accepted tenant-bound form.

## 5. Campaign and Meta writers

### 5.1 Campaign event writer

```text
src/lib/api/campaigns.functions.ts
registrarEventoCampanha
```

Current behavior:

- accepts optional `tenantId` from the browser;
- creates an anon Supabase client carrying `x-tenant-id` from that value;
- inserts `campaign_id`, event type, route and session ID;
- does not prove that the campaign belongs to the accepted tenant;
- does not explicitly persist a server-proven tenant ID.

Consumer:

```text
src/components/site/CampaignRenderer.tsx
```

The current consumer does not send `tenantId`, but the public contract still accepts it and an arbitrary caller can forge it.

Required decision:

- remove tenant input from schema;
- resolve Host tenant server-side;
- query active campaign by `tenant_id + campaign_id` with explicit 0/1/N handling;
- insert event with explicit `tenant_id` using server-only credentials;
- close direct anon Data API INSERT access to `cms_campaign_events`;
- keep route/session metadata non-authoritative and bounded.

### 5.2 Meta Conversions API writer

```text
src/lib/api/meta.functions.ts
enviarEventoMetaCAPI
```

Current behavior:

- accepts event data from public pages;
- reads `meta_integracao` and `meta_credenciais` by global key with `maybeSingle()`;
- does not resolve request Host tenant;
- can therefore dispatch a public event through credentials unrelated to the requesting tenant.

Confirmed consumers include contact, advertisement, property and launch public pages.

Required decision:

- resolve Host tenant first;
- query each settings key by `tenant_id + key`, read at most two rows and fail closed on ambiguity;
- post-validate returned `tenant_id`;
- never accept pixel ID, token or tenant input from the client;
- preserve non-blocking user experience only after tenant authority is proven; authority/configuration failures must be observable and must not fall back to another tenant.

## 6. Portal authority and writers

### 6.1 Connector resolution

Both public portal routes resolve `portal_connectors` through:

```text
feed_token + portal_slug + maybeSingle()
```

A token is a credential transport, not a tenant ID. The server may derive tenant authority only after exactly one active connector is proven.

Required connector contract:

```text
0 connector rows = invalid credential
1 active connector row = accepted authority
N > 1 rows = authority ambiguity; fail closed
inactive connector = denied
```

The accepted connector object must remain available through every downstream query and operational write.

### 6.2 Portal lead ingestion

```text
src/routes/api/public/portal-leads.ts
```

Current behavior:

- code-based property lookup includes connector tenant;
- direct property-ID lookup uses only property `id`;
- a foreign property can therefore influence `corretor_id` and be persisted on a lead attributed to another tenant;
- lead insertion, sync logging and DLQ enqueue use service role.

Required decision:

- direct and code-based lookup both require connector tenant equality;
- if both ID and code are supplied, they must resolve to the same accepted property or fail closed;
- property 0/1/N handling is explicit;
- lead insert uses the shared public-lead writer with connector-derived authority;
- sync logs and DLQ entries use the same connector tenant;
- no payload tenant field is accepted.

### 6.3 Portal feed and operational writes

```text
src/routes/api/public/feeds.$portal.$token.ts
```

The feed read is tenant-filtered after connector resolution, but the route also writes:

- publication state in `imovel_portais`;
- connector sync status;
- portal sync logs.

Required decision:

- exact connector cardinality precedes all work;
- connector tenant and joined tenant must match;
- property set is tenant-bound before image resolution;
- every operational write uses the accepted connector and tenant IDs;
- no fallback to all properties when the portal-link state is ambiguous; existing documented behavior for zero links must be made explicit in tests.

### 6.4 DLQ replay

```text
src/routes/api/public/hooks/portal-dlq-retry.ts
```

PTW-01 does not own authentication of this operational route. It owns the replayed business mutation.

Current replay duplicates lead construction and reuses queued `imovel_id` without tenant revalidation.

Required decision:

- replay calls the same shared portal-lead/public-lead writer as the immediate route;
- `item.tenant_id` is treated as persisted queue authority only after the item contract is validated;
- property ID is revalidated within `item.tenant_id`;
- retry/resolution RPCs are called only for the same queue item;
- no second lead-insertion algorithm remains.

## 7. RLS, grants and execution model

### 7.1 Service-role surfaces

The following current writers use service-role credentials and therefore bypass RLS decisions:

```text
enviarLead
submeterFormulario
portal-leads
portal feed operational writes
portal DLQ replay
enviarEventoMetaCAPI settings reads
```

For these surfaces, application server validation is the primary authorization boundary. RLS remains defense-in-depth and must not be described as the authorizer of service-role writes.

### 7.2 Anon surface

`registrarEventoCampanha` currently writes through the publishable anon client. The application therefore depends on table privilege plus RLS policy behavior and carries client-controlled tenant transport.

PTW-01 implementation must move this write behind the server authority boundary and add one migration that:

- revokes direct anon/PUBLIC DML required only by the legacy public writer;
- preserves authenticated admin behavior;
- preserves server/service-role execution;
- proves through SQL structural tests that no anonymous direct campaign-event insertion path remains.

The migration must audit existing policy and grant names before changing them. Broad policy deletion is prohibited.

### 7.3 Accepted LSH boundary

The authenticated `create_manual_lead` RPC and its grants remain unchanged. PTW-01 must not reuse it for anonymous requests and must not reopen LSH-01.

## 8. Server functions and consumers

| Server/public function | Consumer or caller |
|---|---|
| `enviarLead` | contact, advertise-property, property detail, launch detail public pages |
| `obterFormPublicoPorSlug` | `CmsFormRenderer` |
| `submeterFormulario` | `CmsFormRenderer` |
| `registrarEventoCampanha` | `CampaignRenderer` impression/click/dismiss callbacks |
| `enviarEventoMetaCAPI` | contact, advertise-property, property, launch and other public tracking surfaces |
| portal lead POST | external property portals |
| portal feed GET | external property portals/feed readers |
| portal DLQ retry POST | cron/operator trigger; business replay owned by PTW-01 |

## 9. Material risks

```text
RISK-PTW-01 = cross-tenant property/broker association
RISK-PTW-02 = tenantless public lead persistence
RISK-PTW-03 = cross-tenant manager notification
RISK-PTW-04 = global form slug as tenant authority
RISK-PTW-05 = client/header campaign tenant authority
RISK-PTW-06 = Meta event sent through wrong tenant credentials
RISK-PTW-07 = ambiguous portal token authority
RISK-PTW-08 = duplicate immediate/replay writer logic
RISK-PTW-09 = direct anon campaign-event Data API bypass
```

All are release-blocking for controlled multi-tenant homologation.

## 10. Audit conclusion

```text
PUBLIC_WRITER_AUTHORITY_CURRENTLY_ACCEPTABLE = false
HOST_BOUND_SITE_LEADS = false
HOST_BOUND_FORM_SUBMISSIONS = false
HOST_BOUND_CAMPAIGN_EVENTS = false
HOST_BOUND_META_CAPI = false
PORTAL_TOKEN_CARDINALITY_EXPLICIT = false
PORTAL_DIRECT_PROPERTY_TENANT_BOUND = false
DLQ_REPLAY_SINGLE_WRITER_PATH = false
ANON_CAMPAIGN_EVENT_BYPASS_CLOSED = false
```

No runtime correction was applied during this inventory. The next valid action is acceptance of the PTW-01 planning Impact Analysis.