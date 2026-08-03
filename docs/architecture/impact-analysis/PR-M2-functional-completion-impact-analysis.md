# PR-M2 — Functional Completion Impact Analysis

## Status

**Correction Authorized — Storage Provenance, Dual-Path Retirement, Broker Photo and CRM Attachments**

```text
STAGE_ID = PR-M2
EXECUTION_TYPE = consolidated_protected_merge_blocking_correction
REPOSITORY = MrRodBH/prime-domus-hub
BASE_BRANCH = main
IMPLEMENTATION_BRANCH = agent/pr-m2-functional-completion
PULL_REQUEST = 60

AUDITED_MAIN_HEAD = ec05fd4edee94feabf8423a129154eb807c52a99
CORRECTIVE_START_HEAD = 14901782b911f7607ca17be541aed1364c60862a
EXPECTED_MERGE_BASE = ec05fd4edee94feabf8423a129154eb807c52a99
EXPECTED_AHEAD_BY = 347
EXPECTED_BEHIND_BY = 0

FINAL_PROTECTED_MERGE_AUDIT = Rejected
PRM2_MERGE_AUTHORIZED = false
MERGE_EXECUTED = false
```

## 1. Gate e decisão de suficiência

A Full Protected Merge Audit Rerun comprovou três bloqueios materiais:

1. `registrarMidia`, `adminSalvarPost` e `adminSalvarLancamento` ainda admitem caminhos de mídia originados pelo caller;
2. o upload de foto de corretor usa signer de imóvel, persiste uma URL temporária e não consome o target emitido pelo servidor;
3. CRM Attachments está declarado no registry e na evidência, mas não possui boundary funcional completo.

A lista autorizada contém todos os elementos necessários para a correção:

- contratos e server functions de upload;
- consumers de Media, Broker Photo e CRM Attachments;
- mutation paths de Blog e Launch;
- UI de broker e CRM;
- uma migration corretiva aditiva;
- três harnesses determinísticos já incorporados ao Release Gate;
- documentos canônicos e evidências finais.

```text
FILES_ALLOWED_SUFFICIENT = true
FILES_OUTSIDE_ALLOWED_REQUIRED = false
IMPLEMENTATION_MAY_PROCEED = true
```

Se qualquer dependência factual exigir arquivo fora da lista autorizada, a implementação deverá interromper em fail-closed.

## 2. Estratégia arquitetural

### 2.1 Regra comum de provenance

O client permanece autorizado apenas a transportar bytes para um destino emitido pelo servidor. A autorização final para persistir metadata será sempre o identificador imutável do target.

```text
CLIENT_UPLOAD_INPUT = functional intent only
SERVER_DERIVES_TENANT = true
SERVER_DERIVES_BUCKET = true
SERVER_DERIVES_PATH = true
SERVER_DERIVES_FILENAME = true
FINAL_METADATA_AUTHORITY = uploadTargetId only
SIGNED_URL_PRIMARY_AUTHORIZATION = false
```

Todo consumer SQL deverá:

1. localizar exatamente um target por id;
2. bloquear a linha com `FOR UPDATE`;
3. validar tenant, ator e `tenant_origin`;
4. validar `status = pending` e expiração;
5. validar domínio, entidade, bucket e prefixo;
6. validar existência do objeto em `storage.objects`;
7. inserir ou atualizar a metadata funcional;
8. marcar o target como consumido na mesma transação;
9. rejeitar replay e qualquer estado ambíguo.

### 2.2 Media Library

`registrarMidia` será convertido para aceitar apenas:

```text
uploadTargetId
optional derivativeTargetIds
functional metadata
```

Serão removidos do input final `bucket`, `path`, `storageFileName` e paths derivativos. A RPC corretiva consumirá o target principal e targets derivativos, quando fornecidos, e inserirá `media_library` atomicamente.

### 2.3 Blog e Launch

As mutações paralelas não poderão persistir `imagem_capa`, `og_image`, `storage_path`, `bucket` ou `path` vindos do caller.

Estratégia escolhida:

```text
BLOG_LEGACY_MUTATION = retained for non-media fields, media keys rejected by strict schema
LAUNCH_LEGACY_MUTATION = retained for non-media fields, media keys rejected by strict schema
CANONICAL_MEDIA_BOUNDARIES = existing transactional upload-target consumers
DUAL_ACTIVE_MEDIA_MUTATION = false
```

Esta estratégia preserva operações administrativas ainda utilizadas sem reintroduzir autoridade de path.

### 2.4 Broker Photo

`corretor-foto` passará a exigir `entityId` igual ao broker tenant-scoped antes da emissão do target.

Fluxo final:

```text
brokerId
→ createUploadTarget(entityId = brokerId)
→ client uploads bytes to server-issued transport destination
→ consumeTenantBrokerPhotoUploadTarget(targetId, brokerId)
→ atomic object verification and durable path persistence
→ target consumed
→ signed preview generated from persisted path
```

`foto_url` deixará de ser campo de mutação direta no cadastro profissional. O banco persistirá path durável; a listagem poderá devolver preview assinado separado.

### 2.5 CRM Attachments

A capability será materializada em cinco boundaries:

```text
consumeTenantCrmAttachmentUploadTarget
listTenantCrmAttachments
getTenantCrmAttachmentDownloadUrl
deleteTenantCrmAttachment
CrmOperationsPanel attachment UI
```

O create/consume aceitará `leadId`, `uploadTargetId`, `displayName`, `mimeType` e `size`. Nenhuma API aceitará bucket ou path como autoridade.

## 3. Impacto SQL, RLS e grants

Será adicionada exclusivamente:

```text
supabase/migrations/20260803183000_pr_m2_storage_provenance_and_crm_attachment_corrective.sql
```

A migration criará RPCs `SECURITY DEFINER` com:

```text
SET search_path = public, pg_temp
REVOKE ALL FROM PUBLIC
REVOKE ALL FROM anon
REVOKE ALL FROM authenticated
GRANT EXECUTE TO service_role
```

As tabelas existentes `media_library`, `corretores`, `crm_attachments` e `tenant_upload_targets` mantêm RLS. Não haverá grant direto adicional para roles de client.

```text
HISTORICAL_MIGRATIONS_EDITED = false
MIGRATION_ADDITIVE = true
RLS_PRESERVED = true
CLIENT_DIRECT_TABLE_ACCESS = false
AUTH_UID_AS_BUSINESS_AUTHORITY = false
IS_SUPER_ADMIN_FALLBACK = false
NETWORK_CALLS_FROM_SQL = false
```

## 4. Impacto de runtime e UI

```text
FRONTEND_CHANGED = true
SERVER_BOUNDARY_CHANGED = true
SQL_FUNCTION_CHANGED = true
MIGRATION_CHANGED = true
DEPENDENCY_CHANGED = false
LOCKFILE_CHANGED = false
EXTERNAL_PROVIDER_CHANGED = false
MANAGED_MIGRATION_EXECUTED = false
```

A UI de corretores passará a consumir o target e persistir somente o path retornado pela autoridade server-side. O painel CRM receberá upload, listagem, download e exclusão de anexos, sempre por server functions tenant-scoped.

## 5. Compatibilidade e cutover

Não haverá fallback heurístico, dual path ou compatibilidade permissiva.

```text
RAW_CLIENT_PATH_AUTHORITY = false
DUAL_ACTIVE_RUNTIME = false
TENANT_DEFAULT = false
FIRST_ROW_AUTHORITY = false
HEURISTIC_FALLBACK = false
FAIL_FAST = true
FAIL_CLOSED = true
```

Payloads antigos contendo chaves de mídia proibidas deverão falhar na validação estrita. Targets já consumidos, expirados ou inconsistentes deverão falhar sem persistência parcial.

## 6. Matriz de impacto

| Área | Alteração | Controle |
|---|---|---|
| Media Library | consumer atômico por target id | row lock, object existence e replay denial |
| Blog | remoção de `imagem_capa` do schema legado | boundary canônico permanece único |
| Launch | remoção de `imagem_capa` e `og_image` do schema legado | consumers transacionais permanecem únicos |
| Broker Photo | target vinculado ao broker e path durável | consumer RPC + signer de leitura |
| CRM Attachments | API, SQL e UI completos | lead/tenant/actor/entity validation |
| Storage | objeto precisa existir antes da metadata | consulta a `storage.objects` |
| RLS/grants | sem abertura para client roles | service-role-only RPC ACL |
| Testes | provas negativas e atômicas | harnesses determinísticos existentes |
| Evidência | claims sincronizados ao HEAD final | exact-head gates e artifact integral |

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| objeto órfão após upload | target expira; metadata só é criada por consumer atômico |
| replay de target | status bloqueado e atualizado na mesma transação |
| target de outra entidade | igualdade obrigatória de `entity_id` |
| caller forjar path | input não contém path; SQL usa target persistido |
| signed URL armazenada | schema de broker exclui `foto_url`; persistência usa storage path |
| derivativo sem provenance | cada derivativo requer target próprio |
| dual mutation de Blog/Launch | schemas estritos rejeitam chaves de mídia |
| attachment cross-tenant | lead e target validados pelo tenant efetivo |
| claim documental prematuro | documentos atualizados apenas após código e testes |

## 8. Testes obrigatórios

Os harnesses autorizados deverão provar:

- rejeição de raw path e raw bucket;
- expiração, replay, ator, tenant, domínio, entidade e objeto ausente;
- consumo atômico de Media, Broker Photo e CRM Attachment;
- ausência de `imagem_capa`, `og_image` e `storage_path` nos schemas legados;
- ausência de import ativo de mutation paths superseded;
- foto de corretor sem property signer e sem signed URL persistida;
- CRM Attachments com schema, SQL, API e UI factuais;
- RLS, grants e `search_path` controlados;
- `git diff --check main..FINAL_HEAD` com exit code `0`.

## 9. Sequência e Definition of Done

```text
BF01_RESOLVED = required
BF02_RESOLVED = required
BF03_RESOLVED = required
STORAGE_PATH_NOT_CLIENT_AUTHORITY = required
UPLOAD_TARGET_PROVENANCE = required
BROKER_PHOTO_FUNCTIONAL = required
CRM_ATTACHMENT_FUNCTIONAL = required
RLS_AND_GRANTS_PRESERVED = required
MULTI_TENANT_ISOLATION_PRESERVED = required
DIFF_CHECK_PASSED = required
REQUIRED_CHECKS_SUCCESS = required
FULL_DIFF_ARTIFACT_VALID = required
PRM2_MERGE_AUTHORIZED = false
MERGE_EXECUTED = false
```

Sequência vinculante:

```text
PR-M2 — Consolidated Protected Merge Blocking Correction
→ PR-M2 — Full Protected Merge Audit Rerun
→ protected merge somente após autorização separada
→ DCA-01
→ BCA-01
→ PR-M3
```

Estado máximo desta execução:

```text
PRM2_BLOCKING_CORRECTION_STATE = Corrected — Ready for Full Protected Merge Audit Rerun
NEXT_AUTHORIZED_ACTION = PR-M2 — Full Protected Merge Audit Rerun
```
