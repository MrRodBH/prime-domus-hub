# 124 — LSH-01: Lead Authorization & Audit Hardening

**Status:** Ready for External Audit
**Predecessor:** LSO-01 (Rejected — obrigações transferidas)
**Successor:** LSV-01 (Planned, blocked until LSH-01 Accepted)
**Baseline HEAD:** `704ae40a18e19a14332256e25964cf2fbb51cc9f`

## Objetivo

Materializar a autoridade tipada de autorização Lead, endurecer a tabela de
auditoria e a RPC canônica de criação manual, e sanear as server functions
do domínio. A prova operacional multiusuário/RLS/JWT é escopo exclusivo da
LSV-01.

## Artefatos

- `supabase/migrations/20260715222734_*.sql` — hardening da auditoria e da RPC
- `src/lib/leads/lead-authorization.server.ts` — boundary tipado
- `src/lib/leads/__tests__/lead-authorization.spec.ts` — 15 unit
- `src/lib/leads/__tests__/lead-structural.spec.ts` — 16 structural
- `docs/architecture/impact-analysis/LSH-01-lead-authorization-audit-hardening-impact-analysis.md`
- Refatorações: `admin.functions.ts` (adminListarCorretores, adminAtualizarLead,
  manualLeadReturnSchema)
- Adapter: `useLeadAdapter.ts` (comentários legados saneados)

## Matriz de transferência LSO-01 → LSH-01 / LSV-01

| Obrigação da LSO-01 | Destino |
|---------------------|---------|
| Boundary tipado de autorização | LSH-01 |
| Hardening de `lead_audit_events` | LSH-01 |
| Hardening de `create_manual_lead` | LSH-01 |
| Correção de server functions | LSH-01 |
| Testes unitários e estruturais | LSH-01 |
| Testes reais de grants e RLS | LSV-01 |
| Fixtures multi-tenant e multiusuário | LSV-01 |
| Impersonation runtime | LSV-01 |
| Rollback e atomicidade no banco aplicado | LSV-01 |

## Definition of Done

Todos os itens vinculantes (§19 do runbook) satisfeitos. Nenhuma limitação
conhecida dentro do escopo da LSH-01.

## Não escopo

LSV-01, RDA-01, RC-01, PR-M2.
