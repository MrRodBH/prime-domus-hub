# Architectural Impact Analysis (IA)

## Propósito
Toda nova etapa do RM Prime SaaS — feature, refactor, middleware, auth,
multi-tenancy, storage, plugin, integração, CMS, CRM, automação, API,
dashboard, workflow ou Marketplace — **deve iniciar por um documento
`IA-<NNN>-<Slug>.md` neste diretório**, elaborado e aprovado antes de
qualquer linha de código ser escrita.

## Relação com a governança
- [`ARCHITECTURE_CONSTITUTION.md`](../ARCHITECTURE_CONSTITUTION.md) — regras permanentes (SSoT).
- [`SECURITY_ARCHITECTURE.md`](../security/SECURITY_ARCHITECTURE.md) — extensão normativa oficial de segurança.
- [`ROADMAP_ARCHITECTURAL.md`](../ROADMAP_ARCHITECTURAL.md) — evolução futura planejada.
- **Impact Analysis (IA)** — avalia uma implementação **antes** de acontecer.
- [`ADR`](../ADR/README.md) — registra decisões arquiteturais que efetivamente alteram
  ou ampliam a arquitetura (criado a partir de uma IA quando §10/§11 exigirem).

Uma IA nunca substitui um ADR e um ADR nunca substitui uma IA.

## Fluxo obrigatório (Gate de Entrada)
```
Nova Etapa
  ↓
Architectural Impact Analysis (IA)
  ↓
Validação contra ARCHITECTURE_CONSTITUTION.md
  ↓
Hard Gates (G0–G7)
  ↓
Verificação de ADR
  ↓
Verificação de Patch Arquitetural
  ↓
Aprovação
  ↓
Implementação
  ↓
Typecheck + Scans
  ↓
Relatório Técnico
  ↓
Auditoria
```
Pular qualquer etapa é violação do processo oficial de governança.

## Estrutura obrigatória do documento
Cada IA **deve** conter, nesta ordem, as 13 seções:

1. Objetivo da etapa
2. Escopo (dentro/fora)
3. Componentes envolvidos
4. Análise Arquitetural (Registry, Snapshot, ResolutionGraph, ActionExecutor,
   PluginContext, Bootstrap, Contratos Públicos — cada um com SIM/NÃO + justificativa)
5. Verificação dos Invariantes (§5 da Constituição, item por item)
6. Hard Gates (G0–G7, resultado por gate)
7. Análise de Acoplamento (item por item)
8. Impacto em Multi-tenancy
9. Impacto em Plugins
10. Necessidade de ADR (SIM/NÃO + justificativa)
11. Necessidade de Patch Arquitetural (SIM/NÃO + justificativa; se SIM, parar até aprovação)
12. Estratégia de Implementação
13. Checklist Final

## Numeração
Sequencial, sem gaps. Uma IA aprovada não é apagada nem renumerada; correções
geram nova IA que referencia a anterior.

## Índice
- [IA-001 — Tenant Middleware](./IA-001-TenantMiddleware.md) — ✔ Concluída
- [IA-002 — Client Impersonation Layer](./IA-002-ClientImpersonationLayer.md) — ✔ Concluída (Fase 2.3 + Patch 2.3.1)
- [IA-003 — RLS Policies](./IA-003-RLSPolicies.md) — 🟢 Aprovada · M2b implementada (`docs/delivery/architectural-roadmap/phase-02-multi-tenancy/11-fase-2-m2b-relatorio.md`) + Audit Clarification Report (`docs/delivery/architectural-roadmap/phase-02-multi-tenancy/12-m2b-audit-clarification-report.md`) + Patch M2b.1 (`docs/delivery/architectural-roadmap/phase-02-multi-tenancy/13-m2b-1-get-current-tenant-id-cardinality-fix.md`)
- [IA-004 — Tenant Storage Isolation](./IA-004-TenantStorageIsolation.md) — ✔ **Concluída** · M3 — Tenant Storage Isolation concluída operacionalmente · Subetapas M3.1 ([`15`](../../delivery/phase-02-multi-tenancy/15-m3-1-storage-inventory-classification.md)), M3.2 + Patch M3.2.1 ([`17`](../../delivery/phase-02-multi-tenancy/17-m3-2-new-upload-path-enforcement.md), [`18`](../../delivery/phase-02-multi-tenancy/18-m3-2-1-upload-path-enforcement-patch.md)), M3.4 + Patch M3.4.1 ([`19`](../../delivery/phase-02-multi-tenancy/19-m3-4-signed-url-hardening.md), [`20`](../../delivery/phase-02-multi-tenancy/20-m3-4-1-ia-004-index-fix.md)), M3.3 + Patch M3.3.1 ([`21`](../../delivery/phase-02-multi-tenancy/21-m3-3-legacy-file-migration.md), [`22`](../../delivery/phase-02-multi-tenancy/22-m3-3-1-metadata-normalization-documentation-fix.md)) e M3.5 ([`23`](../../delivery/phase-02-multi-tenancy/23-m3-5-media-picker-validation.md)) aprovadas · Fechamento formal em [`26`](../../delivery/phase-02-multi-tenancy/26-ia-004-m3-formal-closure.md) · Backlog preservado: Upload Provenance Token, M3.3.2 — Metadata Rewrite Batch, Media Picker Return Contract Normalization
- [IA-005 — Membership Evolution Model](./IA-005-MembershipEvolutionModel.md) — 🟡 Impact Analysis documental · Aguardando auditoria externa · Prepara Fase 3 — Membership Evolution Model (papéis por tenant, status, seleção explícita server-validated, base para futuros planos/assentos/billing) · Nenhuma implementação, migration, RLS, middleware, impersonação, storage, UI ou runtime alterados · Recomendação: Alternativa B (header transporte validado server-side a cada request)
