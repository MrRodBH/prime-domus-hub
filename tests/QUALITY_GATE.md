# Fase 5.2 — Quality Gate (tracker)

Tracker vivo da execução da Fase 5.2. Atualizado ao fim de cada ciclo.

## Ciclos

| # | Escopo                                                    | Status  |
|---|-----------------------------------------------------------|---------|
| 1 | Infra Playwright + Auth + Super Admin smoke               | ✅ Concluído |
| 2 | CRM + Imóveis + Uploads (smoke + RLS audit + portais)     | ✅ Concluído |
| 3 | CMS + Website (SEO/responsivo + fix B1)                   | ✅ Concluído |
| 4 | Multi-tenant + Segurança (fix B2)                         | ✅ Concluído |
| 5 | Performance + Regressão                                   | ✅ Concluído |
| 6 | Checklist funcional + Design System + A11y                | ✅ Concluído |
| 7 | Documentação + Métricas + Relatório RC1                   | ✅ Concluído |

## Bugs abertos

| # | Origem     | Descrição                                                                                                                | Status |
|---|------------|--------------------------------------------------------------------------------------------------------------------------|--------|
| B1 | Ciclo 1/2 | Hydration mismatch em rotas públicas — causa raiz: `CampaignRenderer` usava `useState(() => Date.now())` no SSR       | ✅ Corrigido no Ciclo 3 (mount-guarded). Warning residual intermitente em ~1/8 rotas — monitorar |
| B2 | Ciclo 2   | `imovel_portais`, `portal_connectors`, `portal_sync_dlq` sem policy RESTRICTIVE de tenant                              | ✅ Corrigido no Ciclo 4 (+ estendido para cms_import_snapshots, deal_lost_reasons, lead_discard_reasons, lead_perdas, portal_sync_logs). 44/44 tabelas com tenant_id validadas |
| B3 | Ciclo 6   | `.eyebrow` / `text-gold` sem contraste WCAG AA sobre linen; WhatsApp FAB `bg-[#25D366]` sobre branco (1.98:1)          | ✅ Corrigido no Ciclo 6 — token `--gold` recalibrado (oklch 0.72), `.eyebrow` com color-mix darker, FAB em `bg-[#0a6b5c]` + `font-semibold` |
| B4 | Ciclo 6   | `<select>` sem accessible name em `/imoveis` (7) e `/` (1) — falha axe `select-name` crítica                            | ✅ Corrigido no Ciclo 6 — `aria-label` adicionado a todos os selects públicos |

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
- [x] Design System consistente
- [ ] Documentação técnica atualizada
- [ ] Relatório final emitido
