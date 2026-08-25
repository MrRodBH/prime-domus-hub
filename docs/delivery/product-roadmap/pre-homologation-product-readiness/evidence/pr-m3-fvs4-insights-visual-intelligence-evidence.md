# PR-M3-FVS4 — Authenticated Insights and Visual Intelligence Read-Only Slice

## Autoridade e escopo

- `BASE_HEAD=2f31f433f8c6a3ceeb5f311f9242519ee9a310ca`
- `BASE_TREE=6ebe787e6b7381c4c6262f0b216082fd64a8ccc6`
- `TRACKING_ISSUE=123`
- `SOURCE_PR=122`
- `FRONTEND_CONTRACT_REGRESSION=0`
- `PROVIDER_WRITES=0`
- `DATABASE_WRITES=0`
- `DEPLOY=false`
- `PRODUCTION_CUTOVER=false`
- `PR_105_MERGE=false`

## Contrato frontend congelado

A rota administrativa reutiliza o único `WorkspaceShell`, `Outlet`,
`TenantSelectionGate`, autenticação e contexto de impersonação. A fatia consome
somente `dashboardStats` e a leitura privilegiada existente
`adminListarCorretores`. Tenant, role, effective scope, actor kind, identidade
de provider e IDs de autoridade não integram o read model apresentado.

Período, origem e corretor são estado de apresentação validado na URL. O
servidor continua sendo a única autoridade de escopo e valida o corretor antes
da consulta. Não existe `useMutation`, comando comercial, sucesso simulado,
dependência nova, SDK, Stripe, Cloudflare, Wrangler, webhook, migration, banco,
secret ou chamada externa nova.

## Visual intelligence e acessibilidade

Recharts já instalado é usado exclusivamente para séries e funil quantitativos
reais. Toda visualização possui nome, descrição, legenda e alternativa textual
ou tabular completa. A animação dos gráficos é desabilitada, preservando
`prefers-reduced-motion`, foco e leitura. A superfície suporta loading, empty,
denied, unavailable, error e o estado completo.

- `LOVABLE_PRIVATE_PREVIEW_REQUIRED=true`
- `LOVABLE_PRODUCTION_PUBLISH=false`
- `LOVABLE_ROADMAP_UPDATE=false`
- O preview isolado reutiliza os componentes de autoridade visual exatos e usa
  somente dados sintéticos marcados se a autenticação impedir a inspeção.
- A matriz visual cobre `375x812`, `768x1024` e `1440x900`, os seis estados,
  teclado, foco, `aria-live`, overflow, sobreposição, legibilidade e layout shift.

## Gates exigidos

1. allowlist exata de doze caminhos e `bun.lock` byte a byte;
2. matriz focada FVS4, security specs, typecheck, build e `verify:release`;
3. PR-M2, WRI-01 e Release Gate no mesmo head;
4. preview privado Lovable com `PASS_EXACT_FILES` e hashes na PR;
5. Release Gate pós-merge em `main`.

## Resultado local pré-commit

- `FOCUSED_MATRIX=PASS_248_ASSERTIONS`
- `SECURITY_SPECS=PASS`
- `PR_M2_DASHBOARD_AUTHORITY=PASS_11_ASSERTIONS`
- `PSG_SECURITY_AND_TENANT_READS=PASS_13_ASSERTIONS`
- `PRM3_P0A_FRONTEND_CONTRACT=PASS_53_ASSERTIONS`
- `TYPECHECK=PASS`
- `PRODUCTION_BUILD=PASS`
- `VERIFY_RELEASE_CONSTITUENT_SPECS=PASS`
- `REMOTE_EXACT_BUN_VERIFY_RELEASE=REQUIRED_BEFORE_MERGE`
- `LOCAL_DEVELOPMENT_BUILD_REPEAT=ENVIRONMENT_MEMORY_LIMIT_AFTER_FULL_PASS`
- `BUN_LOCK_SHA256=f864bf8258b259bc91a983464c4ec4bbc1b54168f95f3363241e008bb8039885`
- `ROUTE_TREE_SHA256=e384a523de4c66f84bb0ef5c16dd5f11516b8b8d175a127f97d2f9d68c313588`
