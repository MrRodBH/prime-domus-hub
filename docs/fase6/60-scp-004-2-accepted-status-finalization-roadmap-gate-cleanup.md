# SCP-004.2 — Accepted Status Finalization & Roadmap Gate Cleanup

## Status

Accepted

- **Date:** 2026-07-09
- **Phase:** Fase 4 — SaaS Commercial Platform
- **Nature:** Documental / governança. Formaliza a aceitação da SCP-004
  junto com o patch corretivo SCP-004.1. Nenhuma alteração de código,
  schema, RLS, grant, migration ou permissão.

## Arquivos alterados

- `docs/fase6/58-scp-004-commercial-server-read-functions.md`
  - Status substituído por `Accepted`.
  - Adicionada `## Acceptance Note` confirmando aceitação conjunta com
    SCP-004.1 e listando as três funções runtime aprovadas.
- `docs/fase6/59-scp-004-1-commercial-diagnostic-boundary-documentation-cleanup.md`
  - Status substituído por `Accepted`.
  - Adicionada `## Acceptance Note` confirmando SCP-004.1 como patch
    corretivo de governança para SCP-004.
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
  - Subseção `#### Gates e sequência inicial da Fase 4` substituída
    integralmente.
  - SCP-004 marcada como `Accepted`.
  - SCP-005 introduzida apenas como `próxima etapa a definir após
    aprovação arquitetural`.
  - Restrições permanentes da SCP-004 preservadas.

## Status final da SCP-004

`Accepted` — heading único, linha única.

## Status final da SCP-004.1

`Accepted` — heading único, linha única.

## Trecho consolidado do roadmap da Fase 4

```
#### Gates e sequência inicial da Fase 4

1. IA-006 — SaaS Commercial Platform Impact Analysis — Accepted.
2. ADR-005 — Commercial Domain — Accepted.
3. ADR-006 — Billing Provider Abstraction — Accepted.
4. F4.0 — Role Reconciliation / Membership Role Audit — Accepted.
5. SCP-001 — Commercial Domain Model — Accepted.
6. SCP-002 — Billing Provider Abstraction Materialization — Accepted.
7. SCP-003 — Commercial Read Models / Server-Side Access Planning — Accepted.
8. SCP-004 — Commercial Server Read Functions — Accepted.
9. SCP-005 — próxima etapa a definir após aprovação arquitetural.

Restrições permanentes:
- SCP-004 não implementa billing real completo.
- SCP-004 não implementa billing admin.
- SCP-004 não implementa commercial admin.
- SCP-004 não implementa canManageTenantBilling.
- SCP-004 não implementa provider integration real.
- SCP-004 não implementa adapter real de Stripe, Hotmart ou Kiwify.
- SCP-004 não implementa webhook público real.
- SCP-004 não implementa checkout.
- SCP-004 não implementa customer portal.
- SCP-004 não cria secrets de provider.
- SCP-004 não abre RLS permissiva para usuários finais.
- SCP-004 não permite direct client reads das tabelas comerciais/billing.
- SCP-004 não expõe CommercialAdminDiagnostic em runtime.
```

## Resultado das inspeções textuais

### Documento SCP-004

```
rg -n "## Status|Accepted" \
  docs/fase6/58-scp-004-commercial-server-read-functions.md
```

Resultado:
- Apenas um `## Status` (linha 3).
- Apenas uma linha `Accepted` no bloco de status (linha 5).
- O status anterior foi substituído pelo status final oficial.

### Documento SCP-004.1

```
rg -n "## Status|Accepted" \
  docs/fase6/59-scp-004-1-commercial-diagnostic-boundary-documentation-cleanup.md
```

Resultado:
- Apenas um `## Status` (linha 3).
- Apenas uma linha `Accepted` no bloco de status (linha 5).
- O status anterior foi substituído pelo status final oficial.

### Roadmap — Fase 4

```
rg -n "SCP-003|SCP-004|SCP-005|próxima etapa|Accepted" \
  docs/architecture/ROADMAP_ARCHITECTURAL.md
```

Confirmações:
- SCP-003 aparece **uma única vez** na sequência oficial (item 7,
  `Accepted`).
- SCP-004 aparece **uma única vez** na sequência oficial (item 8,
  `Accepted`).
- SCP-005 aparece apenas como `próxima etapa a definir após aprovação
  arquitetural` (item 9).
- Não há duas linhas com o mesmo número.
- O status anterior da SCP-004 no roadmap foi substituído pelo status
  final oficial.

## Confirmação explícita: nenhuma alteração de código

Esta etapa foi exclusivamente documental. Nenhum arquivo em `src/`,
`supabase/migrations/`, `tests/` ou qualquer outro caminho de código foi
alterado.

## Confirmação explícita: não houve

- migration;
- RLS policy;
- grant;
- mutation;
- provider integration;
- webhook;
- checkout;
- customer portal;
- `billing_admin`;
- `commercial_admin`;
- `canManageTenantBilling`;
- alteração em `tenant_members`.

## Próximo passo

Não iniciar SCP-005. Aguardar definição arquitetural formal para a
próxima etapa da Fase 4 — SaaS Commercial Platform.
