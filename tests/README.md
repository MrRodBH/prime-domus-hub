# Suíte de Testes — Fase 5.2 (Quality Gate)

Estrutura oficial da suíte E2E/regressão/segurança/performance da plataforma
RM Prime. Testes são escritos em Python + Playwright (Chromium headless
já disponível no sandbox — `import playwright.async_api`, sem `pip install`).

## Layout

```
tests/
├── _fixtures/           Dados canônicos (payloads, seeds) reutilizados
├── _helpers/            Helpers de sessão, seletores, browser bootstrap
├── auth/                Autenticação (login, logout, reset, sessão expirada)
├── crm/                 Leads, atividades, funil, descartes
├── cms/                 Páginas, blog, campanhas, mídias
├── website/             Rotas públicas (home, imóveis, lançamentos, blog, contato)
├── dashboard/           KPIs, gráficos, filtros
├── portals/             Feed XML e portal-leads (público)
├── super-admin/         /super/* — tenants, DLQ, observabilidade
├── saas/                Onboarding, wizard, planos
├── multi-tenant/        Isolamento entre Alpha e Beta
└── performance/         FCP/LCP/CLS/INP + tempos de API/RPC
```

## Perfis de usuário (fixtures)

| Perfil       | Email suposto                     | Observação                                    |
|--------------|-----------------------------------|-----------------------------------------------|
| Super Admin  | rodolfovaz882@gmail.com           | Sessão injetada via `LOVABLE_BROWSER_*`       |
| Admin        | admin@tenant-alpha.rmprime.test   | Criado no Ciclo 4 (multi-tenant)              |
| Gerente      | gerente@tenant-alpha.rmprime.test | idem                                          |
| Corretor     | corretor@tenant-alpha.rmprime.test| idem                                          |
| Captador     | captador@tenant-alpha.rmprime.test| idem                                          |
| Secretaria   | secretaria@tenant-alpha.rmprime.test| idem                                        |

## Execução

Cada arquivo é auto-contido (`python3 tests/<área>/<arquivo>.py`).
A orquestração central roda via `bash tests/_helpers/run_all.sh`
e grava artefatos em `/tmp/qa/<timestamp>/`.

## Ciclos Fase 5.2

- **Ciclo 1** — Infra + Auth + Super Admin smoke
- **Ciclo 2** — CRM + Imóveis + Uploads
- **Ciclo 3** — CMS + Website
- **Ciclo 4** — Multi-tenant + Segurança
- **Ciclo 5** — Performance + Regressão
- **Ciclo 6** — Checklist funcional + Design System + A11y
- **Ciclo 7** — Documentação + Métricas + Relatório RC1
