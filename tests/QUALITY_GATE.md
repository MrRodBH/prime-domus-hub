# Fase 5.2 — Quality Gate (tracker)

Tracker vivo da execução da Fase 5.2. Atualizado ao fim de cada ciclo.

## Ciclos

| # | Escopo                                                    | Status  |
|---|-----------------------------------------------------------|---------|
| 1 | Infra Playwright + Auth + Super Admin smoke               | ✅ Concluído (9 checks: 6 OK / 3 SKIP super — requer login no preview) |
| 2 | CRM + Imóveis + Uploads                                   | ⏳ Aguardando |
| 3 | CMS + Website                                             | ⏳ Aguardando |
| 4 | Multi-tenant + Segurança                                  | ⏳ Aguardando |
| 5 | Performance + Regressão                                   | ⏳ Aguardando |
| 6 | Checklist funcional + Design System + A11y                | ⏳ Aguardando |
| 7 | Documentação + Métricas + Relatório RC1                   | ⏳ Aguardando |

## Bugs abertos

| # | Origem     | Descrição                                                                             | Alvo   |
|---|------------|---------------------------------------------------------------------------------------|--------|
| B1 | Ciclo 1    | Hydration mismatch em `/anuncie` e `/privacidade` (SSR ≠ client — Footer/site query) | Ciclo 3 |

## Critérios RC1 (checklist)

- [ ] E2E aprovados
- [ ] Regressão aprovada
- [ ] Multi-Tenant aprovado
- [ ] Segurança aprovada
- [ ] Performance aprovada
- [ ] Nenhuma regressão aberta
- [ ] Nenhum erro/warning crítico
- [ ] Nenhuma vulnerabilidade aberta
- [ ] RBAC/RLS validados
- [ ] APIs validadas
- [ ] CMS/CRM/SaaS validados
- [ ] Portais validados (estágio atual)
- [ ] Design System consistente
- [ ] Documentação técnica atualizada
- [ ] Relatório final emitido
