# Fase 5.2 — Quality Gate (tracker)

Tracker vivo da execução da Fase 5.2. Atualizado ao fim de cada ciclo.

## Ciclos

| # | Escopo                                                    | Status  |
|---|-----------------------------------------------------------|---------|
| 1 | Infra Playwright + Auth + Super Admin smoke               | ✅ Concluído |
| 2 | CRM + Imóveis + Uploads (smoke + RLS audit + portais)     | ✅ Concluído |
| 3 | CMS + Website (fix hydration B1)                          | ⏳ Aguardando |
| 4 | Multi-tenant + Segurança (fix B2)                         | ⏳ Aguardando |
| 5 | Performance + Regressão                                   | ⏳ Aguardando |
| 6 | Checklist funcional + Design System + A11y                | ⏳ Aguardando |
| 7 | Documentação + Métricas + Relatório RC1                   | ⏳ Aguardando |

## Bugs abertos

| # | Origem     | Descrição                                                                                                                | Alvo   |
|---|------------|--------------------------------------------------------------------------------------------------------------------------|--------|
| B1 | Ciclo 1/2 | Hydration mismatch intermitente em rotas públicas (`/imoveis`, `/lancamentos`, `/anuncie`, `/privacidade`) — SSR ≠ client (Footer/site query) | Ciclo 3 |
| B2 | Ciclo 2   | Tabelas `imovel_portais`, `portal_connectors`, `portal_sync_dlq` sem policy RESTRICTIVE de tenant (dependem só do policy padrão) | Ciclo 4 |

## Auditoria RLS Ciclo 2 (24 tabelas críticas)

Todas com `rowsecurity=true`. 17/24 com policy `RESTRICTIVE` de isolamento
por tenant. As 7 restantes são globais por design (super admin / rate limit /
system events / tenants / user_roles / tenant_members) exceto **B2**.

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
