# IA-003 — RLS Policies (RESTRICTIVE por tenant)

**Status:** 🟡 Proposed — aguardando auditoria
**Etapa alvo:** M2b — RLS Policies Implementation
**Predecessoras:** IA-001 (Tenant Middleware), IA-002 (Client Impersonation Layer)
**Governança normativa:** `ARCHITECTURE_CONSTITUTION.md`, `SECURITY_ARCHITECTURE.md`
**Escopo desta IA:** exclusivamente análise arquitetural. **Nenhuma policy, migration, alteração de schema ou de código será realizada nesta etapa.**

---

## 1. Objetivo

Analisar, sem implementar, a aplicação de **Row-Level Security (RLS)
restritiva por tenant** em todas as tabelas de negócio do Supabase,
consolidando o isolamento multi-tenant ao nível da camada de persistência.

A M2b transforma o isolamento — hoje garantido apenas por
`requireTenant` na borda das server functions (IA-001) — em uma **garantia
de banco de dados**, tornando cross-tenant leakage impossível mesmo em
cenários de bug, bypass ou uso incorreto de client privilegiado por
código futuro.

Objetivo específico:

- Definir taxonomia de tabelas (tenant-scoped, global, join, audit/system).
- Definir padrão de policies `RESTRICTIVE` que compõem por AND com as
  policies de negócio existentes.
- Garantir que Super Admin e impersonação continuam operando com a
  mesma autoridade estabelecida em IA-001 / IA-002.
- Preparar plano de rollout auditável, com rollback seguro.

## 2. Escopo

### Dentro do escopo (análise)

- Tabelas de negócio com `tenant_id`.
- Tabelas de negócio **sem** `tenant_id` (candidatas a receber a coluna
  ou a serem reclassificadas como globais).
- Tabelas compartilhadas / de junção.
- Tabelas globais (por design fora de isolamento).
- Tabelas de sistema / auditoria.
- Tratamento de Super Admin (`is_super_admin()`).
- Tratamento de impersonação (header `x-tenant-id` propagado por
  `attachTenantHeader` e validado por `requireTenant`).
- Relação com `requireTenant` e `tenant-repository`.
- Modelo `auth.uid()` como origem única de identidade server-side.
- Necessidade eventual de funções auxiliares (ex.: `get_current_tenant_id()`
  já existente).
- Semântica de `RESTRICTIVE` vs `PERMISSIVE`.
- Risco de cross-tenant leakage residual.
- Impacto em server functions (leitura, escrita, admin).
- Impacto em INSERT / UPDATE / DELETE / SELECT.
- Impacto em seeds e migrations.
- Estratégia de rollback.

### Fora do escopo (proibido nesta IA)

- Criação de policies, migrations ou funções SQL.
- Alterações em `src/`, `supabase/`, storage, Media Library.
- Alterações em Workspace Runtime, ResolutionGraph, Registry, Snapshot,
  ActionExecutor, PluginContext, PluginRegistry, Bootstrap.
- Alterações em `requireTenant`, `tenant-repository`, `tenant-attacher`,
  `impersonation-state`.
- Início de M2b — **bloqueado até auditoria e aprovação formal desta IA**.

### Dependências

- IA-001 aprovada e implementada.
- IA-002 aprovada e implementada (Fase 2.3 + Patch 2.3.1).
- `SECURITY_ARCHITECTURE.md` vigente.
- `get_current_tenant_id()` e `is_super_admin()` existentes e auditadas.

## 3. Componentes envolvidos

| Componente | Papel na M2b |
|---|---|
| Supabase RLS | Camada onde as policies serão aplicadas |
| Tabelas de negócio (`leads`, `imoveis`, `launch_projects`, `blog_posts`, `cms_pages`, `form_submissions`, `corretores`, `teams`, `media_library`, …) | Alvos de policy RESTRICTIVE por `tenant_id` |
| `tenant_members` | Fonte de verdade das memberships |
| `tenants` | Cadastro autoritativo de tenants |
| `user_roles` | Fonte de `super_admin` |
| `requireTenant` (server) | Autoridade de contexto na borda; passa a ser complementada — não substituída — pelo RLS |
| `tenant-repository` | Acesso a memberships / existência de tenant |
| `is_super_admin()` (RPC) | Predicado de super admin dentro das policies |
| `get_current_tenant_id()` (RPC) | Predicado de tenant efetivo dentro das policies |
| Server functions (`src/lib/api/*.functions.ts`) | Consumidores; devem continuar operando idênticos após M2b |
| Migrations Supabase | Único veículo de entrega das policies |
| Seeds (`seed_default_lead_reasons`, `seed_default_portal_connectors`, `tg_tenants_seed_defaults`) | Devem continuar funcionando sob SECURITY DEFINER |
| `SECURITY_ARCHITECTURE.md` | Extensão normativa que autoriza e restringe a M2b |

## 4. Análise Arquitetural

| Componente | Impacto | Justificativa |
|---|---|---|
| ResolutionGraph | **NÃO** | RLS pertence à camada de persistência; grafo de resolução do Workspace não é tocado |
| Registry | **NÃO** | Sem alteração de contrato de registro |
| RegistrySnapshot | **NÃO** | Snapshot é imutável e não interage com RLS |
| ActionExecutor | **NÃO** | Execução de ações continua idêntica; RLS atua abaixo |
| PluginContext | **NÃO** | Plugins continuam sandbox read-only; RLS complementa, não altera |
| Bootstrap | **NÃO** | Inicialização do runtime não muda |
| Workspace Runtime | **NÃO** — RLS pertence à camada de persistência e segurança de dados, não ao runtime de resolução do Workspace |
| Security Architecture | **SIM (reforço)** — M2b instancia formalmente o princípio de *defense-in-depth* já declarado em `SECURITY_ARCHITECTURE.md` §Tenant Isolation |
| Roadmap | **SIM** — promove M2b de bloqueado para pronto-para-implementar após aprovação desta IA |
| Constitution | **NÃO** — nenhum invariante é alterado; M2b apenas concretiza a autoridade de isolamento já prevista |

## 5. Verificação dos Invariantes

### 5.1 Invariantes da Constitution (§5)

- **§5.1 Registry tri-layer** — intocado.
- **§5.2 ResolutionGraph imutável / O(1)** — intocado.
- **§5.3 Plugins sandbox read-only** — intocado.
- **§5.4 Nenhuma heurística / fallback silencioso** — RLS é declarativa e determinística; sem heurísticas.
- **§5.5 Contratos públicos preservados** — nenhum contrato alterado.
- **§5.6 Multi-tenancy autoritativa server-side** — **reforçada**.
- **§5.7 Anti-SQL Leakage** — não afetada (RLS é infraestrutura de banco, não código de domínio).
- **§5.8 IA obrigatória antes de implementação** — cumprida por esta IA-003.

### 5.2 Invariantes de Segurança (`SECURITY_ARCHITECTURE.md`)

- **Client é untrusted** — preservado. RLS **não** confia em nada vindo do client.
- **Autoridade server-side** — reforçada: além de `requireTenant`, o banco passa a rejeitar cross-tenant.
- **Trust boundary** — `auth.uid()` continua sendo a origem única de identidade dentro das policies.
- **Header `x-tenant-id` como transporte** — mantido; policy consome via `get_current_tenant_id()` que já valida a origem (super vs membership).
- **Defense-in-depth** — instanciado formalmente.
- **Least privilege** — respeitado: nenhuma nova GRANT ampliada; apenas policies restritivas adicionais.

## 6. Hard Gates

| Gate | Descrição | Resultado |
|---|---|---|
| G0 | Sem alteração de runtime protegido | ✅ (nenhuma alteração de src/) |
| G1 | Sem introdução de heurística | ✅ |
| G2 | Sem singleton / estado global | ✅ |
| G3 | Sem API paralela / bypass de contrato | ✅ |
| G4 | Sem quebra de Anti-SQL Leakage no domínio | ✅ (SQL fica em migration, não em domínio) |
| G5 | Sem alteração de PluginContext / Registry | ✅ |
| G6 | IA obrigatória cumprida | ✅ |
| G7 | Compatibilidade com Security Architecture | ✅ (reforço, não desvio) |

**No new Hard Gates introduced.**

## 7. Análise de Acoplamento

| Pergunta | Resposta |
|---|---|
| Aumenta acoplamento entre módulos de código? | **NÃO** — policies vivem no banco |
| Cria dependência cruzada entre pacotes? | **NÃO** |
| Cria singleton? | **NÃO** |
| Cria API paralela? | **NÃO** — server functions continuam sendo o único caminho |
| Cria novo fluxo runtime? | **NÃO** |
| Cria fallback? | **NÃO** |
| Cria heurística? | **NÃO** — policies são determinísticas |
| Altera ResolutionGraph? | **NÃO** |
| Altera Registry? | **NÃO** |
| Cria bypass de tenant? | **NÃO** — proibido explicitamente |

## 8. Impacto em Multi-tenancy

### 8.1 Matriz de cenários

| Cenário | Comportamento esperado sob M2b |
|---|---|
| Tenant isolation (leitura normal) | SELECT retorna apenas linhas onde `tenant_id = get_current_tenant_id()` |
| Cross-tenant read | Bloqueado no banco — 0 rows |
| Cross-tenant write (INSERT com `tenant_id` alheio) | Bloqueado via `WITH CHECK` |
| INSERT sem `tenant_id` | Rejeitado — coluna `NOT NULL` + WITH CHECK |
| UPDATE alterando `tenant_id` | Bloqueado — WITH CHECK reavalia após UPDATE |
| DELETE cross-tenant | Bloqueado — USING filtra alvos |
| Super Admin sem impersonação | **NÃO** acessa dados tenant-scoped por RLS. `get_current_tenant_id()` retorna NULL → policies rejeitam todas as operações tenant-scoped. Para operar sobre dados de um tenant, o Super Admin deve iniciar impersonação explícita de um tenant válido (IA-002). Superfícies globais / administrativas expressamente classificadas (§12.1) permanecem acessíveis segundo suas próprias regras. Nenhum "tenant default" implícito é admitido. |
| Super Admin com impersonação | `get_current_tenant_id()` já retorna o tenant impersonado; policies operam normalmente |
| Usuário com múltiplas memberships | Escolha explícita continua responsabilidade de IA/Fase 3; policies operam sobre o tenant efetivo |
| Usuário sem membership | `get_current_tenant_id()` retorna NULL → policies rejeitam todas as operações |
| Tenant inexistente (header forjado) | `requireTenant` já rejeita antes de chegar ao banco; RLS é segunda linha |

### 8.2 Regras invioláveis

- Nenhuma policy pode aceitar `tenant_id IS NULL` como wildcard.
- Nenhuma policy pode permitir UPDATE que altere `tenant_id` para valor diferente do atual, exceto Super Admin em contexto explicitamente autorizado (a formalizar).
- Nenhuma tabela de negócio pode permanecer sem policy tenant-scoped após M2b (exceto allowlist de globais definida em §12).

## 9. Impacto em Plugins

Neutralidade total confirmada:

- `PluginContext` — intocado.
- `PluginRegistry` — intocado.
- `PluginLoader` — intocado.
- `FeatureFlagService` — intocado.
- Plugins **não podem** bypassar RLS: continuam acessando dados
  exclusivamente via APIs do host, que passam por server functions e,
  portanto, pelo `requireTenant` + policies.

## 10. Necessidade de ADR

**Decisão formal:** **NÃO.**

**Justificativa:**
M2b apenas materializa em RLS o princípio de isolamento por tenant já
definido em `SECURITY_ARCHITECTURE.md`. A implementação deverá reutilizar
funções existentes — `get_current_tenant_id()`, `is_super_admin()`,
`has_role()`, `user_belongs_to_tenant()` — sem introduzir nova semântica
arquitetural de autorização. Como não há decisão arquitetural nova,
registro em migration + relatório técnico de M2b é suficiente.

**Condição de parada (ADR passa a ser obrigatório se, durante M2b, ocorrer qualquer um dos seguintes):**

- criação de nova função SQL com papel arquitetural permanente (ex.: novo
  predicado de autorização, `enforce_tenant_write()`, etc.);
- introdução de novo modelo de autorização;
- qualquer forma de bypass de Super Admin ao isolamento por tenant;
- alteração da `SECURITY_ARCHITECTURE.md`;
- qualquer exceção ao modelo de tenant isolation.

Nesses casos a implementação deverá ser **interrompida** e um ADR deverá
ser criado e aprovado antes de continuar.

## 11. Necessidade de Patch Arquitetural

**Avaliação:** **NÃO.**

Justificativa:

- Não altera Constitution.
- Não altera Security Architecture (apenas a instancia).
- Não altera contratos oficiais.
- Não altera runtime.
- Não introduz bypass ou exceção.

## 12. Estratégia de Implementação Proposta (para M2b — não executar agora)

### 12.1 Inventário e classificação de tabelas

Antes de qualquer migration, produzir inventário verificado das tabelas
do schema `public` classificando cada uma em:

| Classe | Tratamento |
|---|---|
| **Tenant-scoped** (possui `tenant_id`) | Policy RESTRICTIVE obrigatória |
| **Join tables** (ex.: `launch_project_amenities`, `team_members`) | Policy RESTRICTIVE via JOIN com tabela-pai que carrega `tenant_id` |
| **Global by design** | Allowlist explícita e justificada |
| **Audit / system** (`audit_log`, `system_events`, `rate_limit_buckets`) | Regra própria — leitura restrita a super_admin, escrita via SECURITY DEFINER |
| **Sem `tenant_id` mas deveria ter** | Bloqueia M2b até correção via migration prévia |

> **Nota — inventário preliminar, não normativo.**
> O inventário abaixo é **preliminar** e serve apenas como referência
> para dimensionar a M2b. A classificação **final e normativa** das
> tabelas deverá ser produzida durante a M2b por inspeção real do schema
> via `information_schema` / `pg_catalog`, registrada no relatório
> técnico da M2b. **Nenhuma tabela poderá receber policy sem
> classificação explícita no relatório técnico da M2b.**

Inventário preliminar (a validar durante M2b):

- **Tenant-scoped (candidatas):** `leads`, `lead_atividades`, `lead_descartes`, `lead_perdas`, `lead_origens`, `lead_discard_reasons`, `deal_lost_reasons`, `imoveis`, `imovel_imagens`, `imovel_portais`, `launch_projects`, `launch_units`, `launch_amenities`, `launch_project_amenities`, `launch_project_imagens`, `launch_payment_conditions`, `launch_pdfs`, `launch_statuses`, `corretores`, `teams`, `team_members`, `blog_posts`, `blog_categorias`, `cidades`, `bairros`, `instagram_posts`, `site_settings`, `site_settings_versions`, `cms_pages`, `cms_forms`, `cms_form_fields`, `cms_campaigns`, `cms_campaign_events`, `cms_import_snapshots`, `form_submissions`, `media_library`, `media_usage`, `portal_connectors`, `portal_sync_logs`, `portal_sync_dlq`, `website_menu_items`, `email_send_log`, `email_unsubscribe_tokens`, `suppressed_emails`.
- **Globais / cross-tenant por design (candidatas):** `tenants`, `tenant_members`, `user_roles`, `user_profiles`, `rbac_profiles`, `rbac_modules`, `rbac_permissions`, `system_events`, `rate_limit_buckets`, `email_send_state`.
- **Classificação pendente (ambígua):** `audit_log` — ver §12.1.1.

#### 12.1.1 Regra específica — `audit_log`

A tabela `audit_log` **não** poderá receber policy definitiva enquanto
sua categoria não for explicitamente decidida durante a M2b entre uma
das três opções abaixo, com registro no relatório técnico:

1. **tenant-scoped audit** — usar quando cada evento pertence a um
   tenant específico, `tenant_id` é obrigatório (NOT NULL), e a leitura
   deve ser limitada ao tenant efetivo ou a auditoria administrativa
   autorizada. Policies RESTRICTIVE tenant-scoped padrão (§12.2).
2. **system audit** — usar quando os eventos são globais, não há
   `tenant_id`, e a leitura deve ser restrita a super-admin ou função
   administrativa dedicada.
3. **hybrid audit** — usar quando coexistem eventos globais e
   tenant-scoped na mesma tabela; requer policies específicas por tipo
   de evento e pode exigir análise própria ou IA futura.

A decisão dependerá da existência, obrigatoriedade e semântica da
coluna `tenant_id` verificadas via `information_schema`.

**Regra de segurança inegociável:** nenhuma policy de `audit_log` poderá
usar `tenant_id IS NULL` como wildcard de acesso amplo.

A allowlist final é normativa e viverá em §12 do relatório da M2b.

### 12.2 Padrões de policy propostos

**SELECT:**
```
USING (tenant_id = get_current_tenant_id())
```

**INSERT:**
```
WITH CHECK (tenant_id = get_current_tenant_id())
```

**UPDATE:**
```
USING (tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id())
```
(garante que UPDATE não pode migrar linha para outro tenant)

**DELETE:**
```
USING (tenant_id = get_current_tenant_id())
```

**Composição:** todas como `AS RESTRICTIVE` — compõem por **AND** com
as policies PERMISSIVE de negócio já existentes. Nenhuma policy
existente é removida por M2b.

### 12.3 Tratamento de Super Admin

**Decisão formal — Opção A (adotada).**

Super Admin **só** enxerga dados tenant-scoped via impersonação
explícita de um tenant válido (IA-002). Sem impersonação,
`get_current_tenant_id()` retorna NULL e as policies RESTRICTIVE
rejeitam qualquer operação sobre dados tenant-scoped. Nenhuma cláusula
`OR is_super_admin()` é adicionada às policies tenant-scoped.

- **Opção A (adotada):** Super Admin acessa dados tenant-scoped apenas
  via impersonação explícita. Nenhuma exceção nas policies é necessária.
  Não existe "tenant default" implícito.
- **Opção B (rejeitada):** cláusula adicional `OR is_super_admin()` nas
  policies tenant-scoped — expõe todos os tenants simultaneamente,
  viola defense-in-depth e cria superfície de vazamento acidental.
  Proibida.

Superfícies globais / administrativas expressamente classificadas em
§12.1 (ex.: `tenants`, `tenant_members`, `user_roles`) permanecem
acessíveis segundo suas próprias regras — não são objeto desta cláusula.

### 12.4 Tratamento de impersonação

Já resolvido por IA-002 + Patch 2.3.1. `get_current_tenant_id()` valida
o header apenas quando `is_super_admin() = true`. Policies apenas
consomem — não precisam de lógica adicional.

### 12.5 Regra anti-hijack de `tenant_id`

Todas as tabelas tenant-scoped devem, em conjunto com as policies:

- ter `tenant_id NOT NULL`;
- ter FK para `tenants(id) ON DELETE RESTRICT`;
- ter `WITH CHECK` no UPDATE reavaliando `tenant_id`.

### 12.6 Funções auxiliares

Reutilizar as existentes — `get_current_tenant_id()`, `is_super_admin()`,
`has_role()`, `user_belongs_to_tenant()`. **Não** criar novas funções
nesta etapa salvo justificativa arquitetural registrada em ADR.

### 12.7 Plano de rollout

1. **Migration 1 (dry-run auditoria):** apenas produz o inventário
   verificado via `information_schema`, sem alterar nada. Saída revisada
   antes da migration 2.
2. **Migration 2 (pilot rollout controlado em tabela de baixo risco):**
   aplica policies RESTRICTIVE em uma tabela piloto de baixo risco
   (ex.: `blog_categorias`), com smoke test dedicado. **Não é "shadow
   mode"** — RLS não possui modo observacional nativo; as policies
   passam a valer imediatamente na tabela piloto.
3. **Migration 3 (rollout completo):** aplica policies em todas as
   tabelas tenant-scoped classificadas em §12.1.
4. **Migration 4 (audit lock):** revoga qualquer GRANT residual que
   permita bypass indevido.

### 12.8 Plano de rollback

- Cada migration deve ter par `DROP POLICY IF EXISTS` reverso arquivado
  no relatório técnico de M2b.
- Rollback é sempre por migration nova, nunca por edição de migration
  anterior.
- Rollback preserva as policies PERMISSIVE existentes — remove apenas
  as RESTRICTIVE adicionadas por M2b.

### 12.9 Plano de testes

- Suite de testes de isolamento (framework-agnostic, alinhada à Unit
  Testing Policy) cobrindo os 11 cenários da matriz §8.1.
- Reuso de `tests/security/test_tenant_isolation.py` como base para o
  audit SQL de conformidade (auditoria já verifica RESTRICTIVE em
  `pg_policies`).
- Smoke tests HTTP nas rotas críticas (`/admin/leads`, `/admin/imoveis`,
  home pública, feeds de portal) validando não-regressão de leitura.

## 13. Checklist Final

- [x] Constitution consultada
- [x] Security Architecture consultada
- [x] IA-001 consultada
- [x] IA-002 consultada
- [x] Tenant Middleware aprovado
- [x] Client Impersonation aprovado
- [x] Hard Gates G0–G7 validados
- [x] Nenhuma policy implementada nesta IA
- [x] M2b permanece bloqueado até auditoria e aprovação formal da IA-003

---

## Anexo A — Threat Model de RLS

| # | Ameaça | Vetor | Mitigação sob M2b |
|---|---|---|---|
| T1 | Usuário tenta **ler** dados de outro tenant | SELECT direto via server function comprometida ou client privilegiado | Policy SELECT `USING (tenant_id = get_current_tenant_id())` retorna 0 rows |
| T2 | Usuário tenta **inserir** registro em tenant alheio | Payload malicioso com `tenant_id` forjado | Policy INSERT `WITH CHECK (tenant_id = get_current_tenant_id())` rejeita |
| T3 | Usuário tenta **alterar `tenant_id`** de linha própria | UPDATE malicioso | Policy UPDATE reavalia `WITH CHECK` após mutação → rejeita |
| T4 | Usuário tenta **apagar** registro de outro tenant | DELETE direto | Policy DELETE `USING` filtra alvos → 0 rows afetadas |
| T5 | Super Admin **sem** impersonação lê dados amplos | Login legítimo sem contexto | Estratégia adotada (Opção A §12.3) — Super Admin só enxerga tenant impersonado |
| T6 | Super Admin **com** impersonação | Fluxo legítimo | `get_current_tenant_id()` retorna tenant impersonado; policies operam normalmente; auditoria registrada (Security Audit Trail — IA futura) |
| T7 | Server function **mal configurada** (sem `requireTenant`) | Bug de desenvolvimento | RLS é 2ª linha: mesmo sem `requireTenant`, o banco rejeita cross-tenant |
| T8 | Policy **PERMISSIVE acidental** cobrindo múltiplos tenants | Erro em migration futura | Policies M2b são `RESTRICTIVE` — compõem por AND; PERMISSIVE errada não abre passagem |
| T9 | Tabela **sem `tenant_id`** entra em produção | Migration futura descuidada | Inventário §12.1 é gate obrigatório; CI de M2b deve falhar se detectar tabela nova sem classificação |
| T10 | Função **SECURITY DEFINER** mal usada expõe dados | RPC arbitrária | Auditoria explícita de todas as SECURITY DEFINER funcs em §12.4 do relatório de M2b; nenhuma nova SECURITY DEFINER pode ser criada sem ADR |
| T11 | Uso de `supabaseAdmin` (service role) contorna RLS | Código futuro | Já normatizado em Security Architecture: `supabaseAdmin` apenas para webhooks verificados / manutenção; M2b não altera essa regra |
| T12 | Header `x-tenant-id` forjado por não-super | Client malicioso | `requireTenant` (IA-001) rejeita antes do banco; RLS é 3ª linha via `get_current_tenant_id()` que já valida origem |

## Anexo B — Proibições vigentes durante esta IA

- ❌ Criar migrations.
- ❌ Criar ou alterar policies.
- ❌ Alterar SQL / schema Supabase.
- ❌ Alterar server functions.
- ❌ Alterar qualquer arquivo em `src/`.
- ❌ Alterar runtime.
- ❌ Iniciar M2b.

## Conformidade

Declaro conformidade explícita com:

- `ARCHITECTURE_CONSTITUTION.md`
- `SECURITY_ARCHITECTURE.md`
- `IA-001-TenantMiddleware.md`
- `IA-002-ClientImpersonationLayer.md`

**M2b permanece bloqueado até auditoria e aprovação formal da IA-003.**
