# SCP-005 — Commercial Entitlement Runtime Boundary Planning

## Status

Implemented / Ready for External Audit

## 1. Objetivo

Definir arquiteturalmente a fronteira segura pela qual o runtime do
produto (features, módulos, server functions) poderá futuramente
consultar entitlements comerciais de um tenant, sem abrir billing real
completo, sem permitir leituras diretas client-side das tabelas
comerciais/billing e sem transformar entitlement em autorização
primária de usuário.

Esta etapa é **exclusivamente de planejamento arquitetural /
governança**. Nenhum código, migration, RLS, grant, hook client-side,
UI, mutation, provider integration, webhook, checkout, customer portal,
billing_admin, commercial_admin, canManageTenantBilling ou alteração em
tenant_members é produzido nesta etapa.

## 2. Contexto

Sequência consolidada da Fase 4 — SaaS Commercial Platform:

1. IA-006 — SaaS Commercial Platform Impact Analysis — Accepted.
2. ADR-005 — Commercial Domain — Accepted.
3. ADR-006 — Billing Provider Abstraction — Accepted.
4. F4.0 — Role Reconciliation / Membership Role Audit — Accepted.
5. SCP-001 — Commercial Domain Model — Accepted.
6. SCP-002 — Billing Provider Abstraction Materialization — Accepted.
7. SCP-003 — Commercial Read Models / Server-Side Access Planning — Accepted.
8. SCP-004 — Commercial Server Read Functions — Accepted.
9. SCP-005 — Commercial Entitlement Runtime Boundary Planning — etapa atual.

A SCP-004 disponibilizou runtime apenas três funções server-side de
leitura comercial:

- `getTenantCommercialSummary`
- `getTenantEntitlementSnapshot`
- `getTenantBillingHealth`

`CommercialAdminDiagnostic` permanece exclusivamente como item
documental futuro, proibido de exposição runtime nesta fase.

## 3. Escopo

Planejar a fronteira segura para consumo runtime de entitlements
comerciais:

- Onde a decisão de disponibilidade de feature comercial ocorre.
- Qual camada é autoridade (server-side, obrigatoriamente).
- Que tipos de decisão podem ser derivados de
  `TenantEntitlementSnapshot` e `TenantBillingHealth`.
- Como o consumo é sanitizado e determinístico.
- Como separar entitlement de autorização, de impersonação e de
  administração comercial.
- Que hard gates governarão a próxima etapa (SCP-006) que
  eventualmente implementará runtime feature gate.

## 4. Fora de Escopo

A SCP-005 **não** produz:

- FeatureGate runtime;
- hook client-side (nenhum `useEntitlement`, `useFeature`, etc.);
- UI de entitlement;
- mutation comercial;
- billing enforcement definitivo;
- bloqueio automático de tenant por billing;
- checkout, customer portal, webhook público;
- integração real com stripe, hotmart, kiwify;
- provider adapter real;
- billing_admin, commercial_admin;
- canManageTenantBilling;
- alteração em tenant_members;
- RLS policy, grant, migration;
- alteração das funções runtime da SCP-004.

## 5. Fronteira server-side proposta

Fluxo conceitual futuro (não implementado nesta etapa):

```
runtime operation (server function ou server route interno)
  → server-side tenant resolution (requireTenant, IA-001 / F3.2)
  → membership authorization (tenant_role / status ativos)
  → commercial entitlement read model
      (getTenantEntitlementSnapshot + getTenantBillingHealth)
  → deterministic entitlement decision
  → sanitized allow / deny / reason response
```

Regras conceituais:

- A decisão só existe server-side. Cliente jamais consulta tabela
  comercial/billing diretamente.
- A leitura reutiliza SCP-004 (`getTenantEntitlementSnapshot`,
  `getTenantBillingHealth`), sem novas queries diretas ao schema
  comercial.
- A resposta ao chamador é sempre um DTO sanitizado (`allowed`,
  `reason`, `source`), nunca a linha bruta de plano, assinatura ou
  fatura.
- A UI pode receber o resultado sanitizado para exibição
  (ex.: banner "recurso indisponível no plano atual"), mas nunca
  executa a decisão.

## 6. Relação com SCP-004

- SCP-004 fornece leitura sanitizada de estado comercial atual.
- SCP-005 planeja como transformar esse estado em decisão determinística
  de disponibilidade de feature.
- SCP-005 **não** altera nem estende as três funções da SCP-004.
- SCP-005 **não** introduz nova função runtime; apenas define contratos
  conceituais futuros.

## 7. Relação com Membership Authorization

- Entitlement comercial ≠ autorização de usuário.
- Um usuário pode ser membro ativo (`tenant_members.status = 'active'`)
  e ainda assim ver `allowed = false` porque o tenant não possui o
  entitlement do plano.
- Um tenant pode ter entitlement, mas o usuário não ser membro; nesse
  caso a operação é rejeitada em membership authorization, antes de
  chegar à camada comercial.
- Membership authorization **precede** entitlement decision no fluxo.

## 8. Relação com Super Admin Impersonation

- Super Admin sem impersonação explícita continua sem acesso a
  recursos tenant-scoped.
- Super Admin impersonando um tenant vê o mesmo resultado de entitlement
  que o tenant real veria; nenhuma bypass de entitlement por role
  administrativa é permitida nesta camada.
- Ações administrativas comerciais (billing_admin, commercial_admin)
  são **futuras**, dependem de `canManageTenantBilling` e não fazem
  parte desta etapa.

## 9. Relação com Billing Health

- `TenantBillingHealth` é insumo consultivo para o campo `reason`.
- Estados de billing (`unknown`, `attention_required`, `blocked`)
  podem ser refletidos em `reason`, mas a SCP-005 **não** decide
  automaticamente bloquear tenants por billing.
- Qualquer bloqueio real de operação por billing exige governança
  explícita futura (não faz parte desta etapa).

## 10. DTOs / contratos conceituais futuros

Contratos apenas planejados. Não implementados.

```
type CommercialFeatureDecision = {
  tenantId: string;
  featureKey: string;
  allowed: boolean;
  reason:
    | "entitled"
    | "not_entitled"
    | "limit_reached"
    | "billing_unknown"
    | "billing_attention_required"
    | "billing_blocked"
    | "not_evaluated";
  source: "tenant" | "plan" | "default" | "none";
};
```

Diretrizes conceituais:

- `allowed` é sempre boolean determinístico.
- `reason` é enum fechado; strings livres proibidas.
- `source` explicita a origem lógica da decisão.
- Sem campos financeiros crus (`amount`, `currency`, `invoice_id`,
  `provider_customer_id`) no DTO exposto.
- Sem exposição de identificadores de provider externo.

## 11. Read decisions permitidas x proibidas

Permitidas (na futura implementação SCP-006):

- Disponibilidade de feature por `featureKey`.
- Verificação de limite quantitativo já materializado no snapshot.
- Sinalização de razão sanitizada para UI de estado.

Proibidas nesta etapa e reservadas para governança futura:

- Bloqueio automático de operações críticas por billing.
- Cancelamento automático de assinatura.
- Ações de cobrança, refund, upgrade, downgrade.
- Superfície administrativa comercial.
- Qualquer chamada síncrona a provider externo em request path.

## 12. Riscos arquiteturais

- **Risco A — Entitlement como autorização primária.** Mitigação:
  membership authorization precede sempre a decisão comercial;
  entitlement nunca substitui checagem de papel.
- **Risco B — Direct client reads.** Mitigação: SCP-005 reafirma que
  nenhuma tabela comercial/billing é lida no client; toda decisão passa
  por server function.
- **Risco C — Billing enforcement implícito.** Mitigação: bloqueio por
  billing depende de governança futura explícita, jamais introduzido
  como efeito colateral do runtime de feature gate.
- **Risco D — Vazamento de dados financeiros.** Mitigação: DTO de
  decisão é sanitizado; sem valores monetários, sem IDs de provider,
  sem metadados de fatura.
- **Risco E — Acoplamento a provider real.** Mitigação: nenhuma
  integração com stripe, hotmart, kiwify, webhook, checkout ou
  customer portal é introduzida ou planejada como parte desta camada.

## 13. Hard Gates propostos para SCP-006

- **SCP5-G1 — Entitlement Decisions Are Server-Side Only.**
- **SCP5-G2 — Entitlements Do Not Replace Membership Authorization.**
- **SCP5-G3 — No Direct Client Reads From Commercial Tables.**
- **SCP5-G4 — No Billing Enforcement Without Explicit Governance.**
- **SCP5-G5 — No Commercial Admin Surface.**
- **SCP5-G6 — No Provider Runtime Integration.**
- **SCP5-G7 — Deterministic Allow/Deny Reasons Required.**
- **SCP5-G8 — Audit Required Before Runtime Feature Gate Implementation.**

## 14. Critérios para implementação futura (SCP-006)

Antes de qualquer implementação runtime:

1. Aprovação externa desta SCP-005.
2. Definição catalogada de `featureKey` suportados.
3. Definição de contrato final de `CommercialFeatureDecision`.
4. Testes determinísticos server-side cobrindo cada `reason`.
5. Confirmação de que nenhuma leitura direta client-side é introduzida.
6. Confirmação de que a decisão reutiliza SCP-004 como fonte, sem
   novos acessos diretos ao schema comercial.

## 15. Invariantes preservados

- Client nunca é autoridade.
- Server-side é autoridade única.
- Sem fallback heurístico, sem dual-path, sem tenant default.
- `x-tenant-id` permanece transporte, não autorização.
- Super Admin sem impersonação explícita não acessa recursos
  tenant-scoped.
- Tenant selection comum e Super Admin impersonation permanecem fluxos
  separados.
- RLS multi-tenant preservada.
- Nenhum direct client read de tabelas comerciais/billing.

## 16. Inspeções executadas

Roadmap:

```
rg -n "SCP-004|SCP-005|SCP-006|Accepted|Implemented / Ready|próxima etapa" \
  docs/architecture/ROADMAP_ARCHITECTURAL.md
```

Confirmações esperadas:
- SCP-004 aparece uma única vez como `Accepted`.
- SCP-005 aparece uma única vez.
- SCP-006 aparece apenas como próxima etapa futura.
- Sem duplicidade de numeração.

Ausência de implementação SQL:

```
rg -n "CREATE POLICY|ALTER POLICY|DROP POLICY|GRANT|REVOKE|\
FORCE ROW LEVEL SECURITY|CREATE TABLE|ALTER TABLE|CREATE FUNCTION" \
  supabase docs/fase6/62-scp-005-commercial-entitlement-runtime-boundary-planning.md
```

Confirmação: nenhuma instrução de migration, RLS, grant ou função SQL
foi introduzida por esta etapa.

Ausência de superfícies proibidas em runtime:

```
rg -n "billing_admin|commercial_admin|canManageTenantBilling|\
tenant_members|stripe|hotmart|kiwify|webhook|checkout|customer portal" \
  docs/fase6/62-scp-005-commercial-entitlement-runtime-boundary-planning.md
```

Confirmação: ocorrências restritas a seções de fora de escopo,
proibição ou risco arquitetural.

## 17. Próxima etapa recomendada

**SCP-006** — implementação runtime do feature gate comercial
server-side determinístico, sujeita a auditoria externa desta SCP-005
e aos hard gates SCP5-G1..SCP5-G8. Não iniciar sem aprovação.
