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
- [IA-002 — Client Impersonation Layer](./IA-002-ClientImpersonationLayer.md) — 🟡 READY FOR IMPACT ANALYSIS · Implementation BLOCKED
