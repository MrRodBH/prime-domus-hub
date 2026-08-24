# PR-M3-FVS3 — Authenticated Property Inventory Read-Only Vertical Slice

## Autoridade e escopo

- `BASE_HEAD=ea762295f44e38fc7a9518260dc08bd3695ccdaa`
- `BASE_TREE=01ab717d1c5ef631d61bc572b4a0af60998b58ea`
- `TRACKING_ISSUE=121`
- `SOURCE_PR=120`
- `FRONTEND_CONTRACT_REGRESSION=0`
- `PROVIDER_WRITES=0`
- `DATABASE_WRITES=0`
- `DEPLOY=false`
- `PRODUCTION_CUTOVER=false`
- `PR_105_MERGE=false`

## Contrato frontend congelado

As rotas autenticadas de imóveis reutilizam o único `WorkspaceShell`, o único
`Outlet`, o `TenantSelectionGate` e o contexto de impersonação. A fatia chama
exclusivamente `adminListarImoveis` e `adminObterImovel`, ambos GET e
server-owned. Os DTOs são projetados em modelos de consulta que removem tenant,
identidade de escrita, atribuição e demais campos de autoridade.

Busca, status, finalidade e seleção são somente estado local validado da URL.
Criar, editar, excluir e publicar permanecem explicitamente indisponíveis. Não
há `useMutation`, atualização otimista, dependência nova, Recharts, SDK externo,
Stripe, Cloudflare, Wrangler, migration, banco ou secret nesta fatia.

## Experiência e inspeção visual

- `LOVABLE_PRIVATE_PREVIEW_REQUIRED=true`
- `LOVABLE_PRODUCTION_PUBLISH=false`
- `LOVABLE_ROADMAP_UPDATE=false`
- O preview isolado deve refletir o head exato da PR draft e pode usar apenas
  dados sintéticos claramente identificados quando o app exigir autenticação.
- A inspeção cobre `375x812`, `768x1024` e `1440x900`, teclado, foco,
  `aria-selected`, `aria-current`, `aria-live`, reduced motion, overflow,
  fallback de imagens e layout shift.
- GitHub permanece a autoridade de código, CI e merge. O Lovable é somente a
  superfície privada de revisão e não pode publicar produção.

## Gates exigidos

1. allowlist exata de doze caminhos e `bun.lock` byte a byte;
2. matriz focada `test:pr-m3-fvs3`, paridade exata do contrato FVS2 e
   autoridade property-admin;
3. security specs, typecheck, build e `verify:release`;
4. PR-M2, WRI-01 e Release Gate no mesmo head;
5. preview privado Lovable e auditoria visual pré-merge;
6. Release Gate pós-merge em `main`.

Recharts já existe no projeto, mas não é usado porque esta fatia não possui uma
série quantitativa que justifique um gráfico. As métricas exibidas são agregações
locais determinísticas sobre o read model recebido do servidor.

A matriz FVS3 substitui a reaplicação histórica da allowlist FVS2: ela compara
byte a byte os sete arquivos do pipeline read-only com o `main` auditado. Isso
preserva a regressão zero sem rejeitar legitimamente os arquivos da fatia
sucessora.

## Resultado local pré-commit

- `FOCUSED_MATRIX=PASS_280_ASSERTIONS`
- `PROPERTY_ADMIN_AUTHORITY=PASS_11`
- `PUBLIC_SURFACE_SECURITY=PASS_7`
- `PUBLIC_TENANT_READS=PASS_6`
- `TYPECHECK=PASS`
- `BUILD_DEVELOPMENT_PRODUCTION_REPEAT=PASS`
- `VERIFY_RELEASE=PASS`
- `ROUTE_TREE_SHA256=e384a523de4c66f84bb0ef5c16dd5f11516b8b8d175a127f97d2f9d68c313588`
- `BUN_LOCK_SHA256=f864bf8258b259bc91a983464c4ec4bbc1b54168f95f3363241e008bb8039885`
