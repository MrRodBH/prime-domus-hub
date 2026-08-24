# PR-M3-FVS2 — Authenticated Pipeline Read-Only Vertical Slice

## Autoridade e escopo

- `BASE_HEAD=3bbfb0454ca3599149bddd313ffbee6672d9c89e`
- `BASE_TREE=b2834f704ea6b8f067efadecb456e5c49205da26`
- `TRACKING_ISSUE=119`
- `SOURCE_PR=118`
- `FRONTEND_CONTRACT_REGRESSION=0`
- `PROVIDER_WRITES=0`
- `DATABASE_WRITES=0`
- `DEPLOY=false`
- `PRODUCTION_CUTOVER=false`
- `PR_105_MERGE=false`

## Contrato congelado

A rota autenticada `/admin/pipeline` reutiliza o único `WorkspaceShell`, o único
`Outlet`, o `TenantSelectionGate` e o contexto de impersonação existentes. O
cliente chama exclusivamente `adminListarLeads` e projeta o DTO server-owned em
um modelo de consulta que remove atribuição, estágio, versionamento e demais
campos de autoridade.

Busca, origem, etapa e seleção são apenas estado validado da URL. A fatia não
importa `useMutation`, DnD, `NovoLeadDialog`, `LeadDetail`, transições, notas,
tarefas, anexos, qualificação ou atribuição. Loading, empty, denied,
unavailable e error derivam deterministicamente do read model e da resposta do
servidor, sem controles de debug ou sucesso simulado.

## Experiência e inspeção visual

- `LOVABLE_PREVIEW_REQUIRED=true`
- `LOVABLE_PRODUCTION_PUBLISH=false`
- `LOVABLE_ROADMAP_UPDATE=false`
- O preview isolado deve refletir o mesmo head auditado da PR antes do merge.
- A inspeção cobre `375x812`, `768x1024` e `1440x900`, teclado, foco,
  `aria-selected`, `aria-current`, `aria-live`, overflow e continuidade do
  contexto autenticado.
- O preview é superfície de revisão visual; GitHub permanece a autoridade de
  código, checks e merge. Publicação em produção requer autorização explícita
  do Owner.

## Gates exigidos

1. allowlist exata e `bun.lock` byte a byte;
2. matriz focada `test:pr-m3-fvs2`;
3. security specs, typecheck, build e `verify:release`;
4. PR-M2, WRI-01 e Release Gate no mesmo head;
5. preview Lovable isolado e auditoria visual pré-merge;
6. Release Gate pós-merge em `main`.

FVS2 sucede o gate executável de FVS1 em `verify:release`. A matriz vigente
revalida diretamente o único shell, único Outlet, TenantSelectionGate,
impersonação, acessibilidade e responsividade congelados em FVS1; assim, a
allowlist histórica de FVS1 não é reaplicada indevidamente sobre arquivos de
fatias frontend sucessoras.
