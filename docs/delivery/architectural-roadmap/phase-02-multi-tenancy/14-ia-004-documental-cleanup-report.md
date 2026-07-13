# Relatório — IA-004 Tenant Storage Isolation · Correção Documental Prévia

**Status:** Concluído (etapa exclusivamente documental)
**Escopo:** Ajustes na IA-004 e no Roadmap Arquitetural antes de qualquer
implementação da M3.
**Autoridade de execução:** M3 permanece bloqueada até auditoria e aprovação
formal da IA-004 revisada.

---

## 1. Resumo Executivo

Foram realizadas correções documentais para deixar a **IA-004 — Tenant
Storage Isolation** tecnicamente consistente, neutra quanto à estratégia
de path e pronta para auditoria crítica. As correções:

- Eliminaram a duplicidade de entradas de IA-004 no Roadmap.
- Removeram a antecipação do padrão `tenantId/ prefix` no Roadmap
  (decisão ainda não aprovada).
- Padronizaram a nomenclatura oficial para **Tenant Storage Isolation**.
- Reposicionaram o `tenantId/ prefix` na IA-004 como **hipótese técnica
  em análise**, não como decisão arquitetural.
- Adicionaram à IA-004 **matriz comparativa** de estratégias de path
  (H1/H2/H3/H4) com análise técnica real por critério.

**Nenhum código, migration, bucket, policy, schema, server function,
Media Picker, componente de upload ou signed URL foi alterado.**

---

## 2. Arquivos Alterados

| Caminho | Tipo de alteração | Motivo |
|---|---|---|
| `docs/architecture/ROADMAP_ARCHITECTURAL.md` | Documental | Deduplicação de IA-004, remoção da antecipação `tenantId/ prefix`, padronização de nomenclatura, referência à IA-004 como gate obrigatório da M3. |
| `docs/architecture/impact-analysis/IA-004-TenantStorageIsolation.md` | Documental | Reposicionamento de `tenantId/ prefix` como hipótese (§12.3/§12.3.1) e adição de matriz comparativa H1–H4 com critérios de segurança, performance, complexidade, escalabilidade, rollback, signed URL, vazamento cross-tenant e aderência Architecture First. |
| `docs/delivery/phase-02-multi-tenancy/14-ia-004-documental-cleanup-report.md` | Criação | Este relatório de auditoria. |

Nenhum outro arquivo foi tocado.

---

## 3. Correções no Roadmap

**Duplicidade removida:**

- **Antes:** duas linhas equivalentes na tabela da Fase 2 —
  - `IA-004 · Tenant Storage Isolation` (Proposed / Awaiting Audit)
  - `M3 · Tenant Storage Isolation Implementation` (Blocked until IA-004 approval)
- **Depois:** uma única entrada oficial —
  `IA-004 · Tenant Storage Isolation — Proposed / Awaiting Audit — M3 bloqueada até aprovação`.

**Menções prematuras removidas:**

- Removida a bullet "Prefixação de objetos por `tenantId` no bucket ativo"
  da seção `#### M3 — Storage Isolation`.
- Título ajustado para `#### M3 — Tenant Storage Isolation`.
- Substituída pela declaração explícita de que **a estratégia de
  path/segmentação será definida na IA-004 e ratificada antes da
  implementação**, e que o Roadmap **não antecipa padrão de path
  específico**.
- Bloco de dependências (§5) atualizado de `M3 (Storage Isolation)` para
  `M3 (Tenant Storage Isolation)`.

**Nomenclatura padronizada** em todo o Roadmap: **Tenant Storage
Isolation**. Não subsistem variações como "Storage Isolation", "Tenant
Storage", "Tenant Storage Prefix" ou "Storage tenantId prefix".

---

## 4. Correções na IA-004

**Reposicionamento de `tenantId/ prefix` como hipótese:**

- §12.3 renomeada para **"Matriz comparativa de estratégias de path
  (hipóteses)"**, com aviso explícito: *"Nenhuma estratégia abaixo é
  decisão arquitetural aprovada. Todas permanecem como hipóteses técnicas
  em análise, a serem ratificadas (ou substituídas) no início da M3."*
- O antigo bloco "Padrão oficial proposto" virou §12.3.1 —
  **"Exemplo ilustrativo de path (hipótese H2, não aprovado)"** — com
  disclaimer de que serve apenas como referência.

**Matriz comparativa adicionada (§12.3):**

Estratégias avaliadas:

- **H1** — `tenants/{tenantId}/media/{filename}` (prefixo por tenant +
  domínio único `media`).
- **H2** — `tenants/{tenantId}/{entity}/{entityId}/{filename}` (prefixo
  por tenant + domínio funcional).
- **H3** — `tenants/{tenantId}/{mediaId}/{filename}` (prefixo por tenant +
  `mediaId` opaco).
- **H4** — Bucket por tenant (`bucket_{tenantId}`).

Critérios avaliados por hipótese:

- Segurança
- Performance
- Complexidade
- Escalabilidade
- Rollback
- Compatibilidade com signed URLs
- Risco de vazamento cross-tenant
- Aderência Architecture First

Notas transversais reforçam que **nenhuma hipótese** admite path enviado
pelo client como autoridade, bucket público, tenant default, fallback
implícito, bypass de Super Admin sem impersonação ou uso de signed URL
como autorização primária.

---

## 5. Confirmação de Não Implementação

Confirma-se explicitamente que **NÃO foram alterados**:

- código (`src/**`)
- migrations (`supabase/migrations/**`)
- buckets (Supabase Storage)
- policies (`storage.objects` ou tabelas do domínio)
- storage físico (arquivos, paths, prefixos)
- schema do banco
- server functions (`src/lib/api/**`, incluindo `media.functions.ts`)
- Media Picker (`src/components/admin/MediaPicker.tsx`)
- signed URLs (geração, TTL, escopo)
- componentes de upload (Media Library, adapters)

A etapa foi **exclusivamente documental**.

---

## 6. Riscos Identificados (para consideração antes da M3)

1. **Branch anon de `get_current_tenant_id()`** — permite transportar
   `x-tenant-id` em fluxos públicos controlados; precisa ser reavaliada
   caso qualquer mídia venha a ser servida anonimamente. Recomendação
   inicial: nenhuma mídia tenant-scoped elegível para leitura anônima.
2. **TTL longo de signed URLs** — hoje em `60*60*24*365` (1 ano) no
   `media.functions.ts`; risco de vazamento por reuso de URL. Deve ser
   reduzido antes/durante a M3.
3. **Arquivos legados sem prefixo** — inventário obrigatório antes de
   qualquer migração; risco de arquivos órfãos sem correspondência em
   metadata (`media_library`, `imovel_imagens`, `launch_*`, `cms_*`,
   `blog_posts`).
4. **Uploads diretos do client** — hoje o client escolhe path livre
   após permissão CMS; risco arquitetural (client não pode ser
   autoridade). Precisa passar por path pré-assinado pelo server.
5. **Constraint de coerência metadata × path** — `media_library.tenant_id`
   deve casar com o prefixo do arquivo; sem constraint, drift é possível.
6. **Rollback de migração** — exige janela com dupla leitura (legacy +
   novo prefixo) e coluna `arquivo_legacy` temporária; risco operacional
   se não for orquestrado em fases.
7. **Limites do provider para H4 (bucket por tenant)** — Supabase possui
   limites de buckets; H4 pode ser inviável em escala.
8. **Compatibilidade com Fase 4 / StorageProvider (ADR-006 futuro)** —
   qualquer decisão hoje deve evitar aumento de acoplamento com o
   provider atual; H4 é o cenário de maior custo de migração posterior.

---

## 7. Recomendação para Próxima Etapa

**Recomendação:** dividir a M3 em subfases, não executar M3 direta.

Justificativa técnica: o escopo real da M3 combina (a) descoberta e
classificação de arquivos legados, (b) mudança de contrato de upload,
(c) migração massiva com rollback, (d) endurecimento de signed URL e (e)
validação server-side no Media Picker. Cada uma dessas frentes possui
critérios de aceite independentes, superfícies de falha distintas e
janelas de rollback próprias. Empacotar todas em uma única entrega
aumenta o blast radius sem ganho arquitetural.

Divisão sugerida:

- **M3.1 — Storage Inventory & Classification** — leitura apenas; produz
  inventário, classifica tenant-scoped/public/system/orphan/legacy e
  fecha a decisão entre H1/H2/H3/H4.
- **M3.2 — New Upload Path Enforcement** — server passa a montar path
  tenant-scoped; client perde autoridade de path; constraint de
  coerência habilitada para novos registros.
- **M3.3 — Legacy File Migration** — copy → verify → update reference →
  delete, em lotes, com `arquivo_legacy` e dupla leitura durante a
  janela.
- **M3.4 — Signed URL Hardening** — redução de TTL, escopo por objeto,
  validação `media_library.tenant_id = get_current_tenant_id()`, revisão
  da branch anon do resolver.
- **M3.5 — Media Picker Validation** — Media Picker só assina URL para
  mídia do tenant efetivo; testes E2E cross-tenant e de impersonação.

Cada subfase deve ser precedida de aprovação incremental e seguida de
relatório próprio, mantendo o fluxo Architecture First.

---

## 8. Evidências

**Roadmap — tabela da Fase 2 (excerto pós-edição):**

```
| IA-003 · RLS Policies (RESTRICTIVE por tenant) | 🟢 Aprovada em auditoria final |
| M2b · RLS Policies Implementation | 🟢 Implementada — aguarda auditoria externa (...) |
| IA-004 · Tenant Storage Isolation | 🟡 Proposed / Awaiting Audit (...) — M3 bloqueada até aprovação |
```

**Roadmap — subseção M3 (excerto pós-edição):**

```
#### M3 — Tenant Storage Isolation
- Isolamento por tenant do armazenamento de arquivos (buckets privados atuais).
- Estratégia de path/segmentação e migração de arquivos existentes a serem
  definidas na IA-004 e ratificadas antes da implementação — o Roadmap não
  antecipa padrão de path específico.
- Base para a futura Storage Abstraction Layer (Fase 4).
- Depende de M2b e de aprovação formal da IA-004.
```

**IA-004 — §12.3 (excerto do cabeçalho da matriz):**

```
### 12.3 Matriz comparativa de estratégias de path (hipóteses)

Nenhuma estratégia abaixo é decisão arquitetural aprovada. Todas
permanecem como hipóteses técnicas em análise, a serem ratificadas (ou
substituídas) no início da M3, após auditoria da IA-004. O Roadmap
Arquitetural não antecipa `tenantId/` prefix nem qualquer outro padrão.
```

**IA-004 — cabeçalhos da matriz:**

```
| Estratégia (hipótese) | Segurança | Performance | Complexidade | Escalabilidade | Rollback | Signed URL | Vazamento cross-tenant | Aderência Architecture First |
| H1 — tenants/{tenantId}/media/{filename}
| H2 — tenants/{tenantId}/{entity}/{entityId}/{filename}
| H3 — tenants/{tenantId}/{mediaId}/{filename}
| H4 — Bucket por tenant (bucket_{tenantId})
```

**IA-004 — §12.3.1 (excerto do reposicionamento):**

```
#### 12.3.1 Exemplo ilustrativo de path (hipótese H2, não aprovado)

A título ilustrativo da hipótese H2 (prefixo por tenant + domínio
funcional), um formato possível seria: (...)

Este exemplo não é decisão aprovada; serve apenas como referência (...)
```

---

## 9. Declaração de Conformidade

Este relatório e as correções documentais associadas estão em
conformidade com:

- `ARCHITECTURE_CONSTITUTION.md`
- `SECURITY_ARCHITECTURE.md`
- `ROADMAP_ARCHITECTURAL.md`
- ADRs existentes (ADR-001..004)
- Impact Analysis Gate (Constitution §7)
- Fluxo Architecture First

Invariantes preservados: cliente não é autoridade; servidor é autoridade
única; storage não confia em path enviado pelo client; sem tenant
default; sem fallback inteligente; sem heurística implícita; sem bypass
de Super Admin; tenant context explícito; signed URLs não são
autorização primária; qualquer path deve ser validável server-side.

**Declaração explícita:** a etapa foi **exclusivamente documental**;
**M3 permanece bloqueada** até auditoria e aprovação formal da IA-004
revisada.
