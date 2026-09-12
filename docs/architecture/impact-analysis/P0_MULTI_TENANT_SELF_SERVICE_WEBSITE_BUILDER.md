# P0 — Multi-tenant self-service website builder

## Decisão

O construtor é uma camada guiada sobre os dois modelos canônicos existentes. Configuração, progresso e preferências permanecem no snapshot versionado `configuration` de `site_settings_versions`; páginas permanecem em `cms_pages` e `cms_page_versions`. Não existe um segundo website, tabela de menu concorrente ou persistência oficial no navegador.

## Impact Analysis

| Superfície | Estado anterior | Delta P0 | Autoridade preservada |
|---|---|---|---|
| Entrada do Admin | atalhos manuais em `/admin/site` | wizard persistente com criar/configurar depois | sessão + membership server-side |
| Configuração | snapshot canônico com marca, visual, contatos, social, SEO e menu | domínio `website_setup` com estado, etapa, tema, alinhamento, páginas e viewport | `save_tenant_configuration_draft` |
| Páginas | workflow versionado do CMS | provisionamento idempotente de slugs catalogados em rascunho | `save_tenant_page_draft` |
| Mídia | biblioteca tenant-scoped | seleção de logo e favicon pelo seletor existente | validação server-side de referências |
| Menu | `menu_items` no snapshot de configuração | montagem inicial a partir das páginas escolhidas | Configuration Center |
| Preview | preview técnico da configuração | preview visual responsivo no wizard | somente snapshot em memória/rascunho |
| Publicação | confirmação e versões imutáveis | sem alteração; wizard gera apenas rascunhos | RPCs de publish existentes |
| Domínio | gate DCA-01 | nenhuma mudança | gate posterior |

## Contrato congelado

- Tenant é derivado exclusivamente pelo middleware autenticado; nenhuma entrada aceita `tenant_id`.
- Super Admin sem identidade tenant autorizada não usa o wizard nem edita tenant.
- `website_setup_status`: `not_started`, `deferred`, `in_progress` ou `draft_ready`.
- `website_setup_step`: inteiro entre as etapas conhecidas pela UI; a UI limita o valor ao catálogo.
- Temas e fontes são chaves catalogadas; CSS, HTML executável e componentes runtime não são aceitos.
- Páginas iniciais são slugs catalogados. Existentes não são sobrescritos; colisões concorrentes convergem para “existente”.
- Rascunho não é publicação. Publicação e restauração continuam nos workflows canônicos; restauração cria revisão nova.
- Upload e referências de mídia usam a biblioteca existente e suas validações tenant-scoped.
- `website_menu_items` não é reativada como caminho de escrita; menus permanecem no snapshot `configuration`.
- Cloudflare, DNS e conexão de domínio ficam fora deste gate.

## Delta de dados

Correção auditada em 2026-09-12: uma migration é necessária. As tabelas e os RPCs de gravação canônicos suportam o fluxo, mas o validador SQL também possui catálogo fechado. Acrescentar seis campos somente no registry TypeScript deixava a gravação bloqueada por `configuration_key_not_cataloged`.

A migration `20260911221612_dcb4669a-310b-44e8-87d0-090d7386a3a2.sql`, aplicada pelo operador Supabase, substitui exclusivamente `validate_tenant_configuration_snapshot(uuid,jsonb)`. Seu SQL foi recuperado do histórico aplicado e versionado sem nova execução no banco. Preserva todas as validações anteriores e reconhece status, etapa, tema, alinhamento da marca, páginas e viewport conforme o contrato. O teste de catálogo verifica paridade de todos os campos SQL/servidor e preservação do corpo anterior.

Auditoria direta: snapshot completo dos defaults do registry aceito; etapa fracionária/null, chave desconhecida e página fora do catálogo rejeitadas. EXECUTE efetivo: anon=false, authenticated=false, service_role=true. As chamadas foram de validação/leitura, sem gravação comercial. Isso não comprova a jornada autenticada de salvar, sair e retomar; essa homologação permanece pendente. Os avisos 0008/0028/0029 informados pelo Lovable não foram reavaliados nem suprimidos neste corretivo.

SQL aplicado recuperado do ledger `supabase_migrations.schema_migrations`, versão `20260911221612`, nome `dcb4669a-310b-44e8-87d0-090d7386a3a2`. SHA-256 do arquivo com newline final: `3d6cf98ef31fc4f6901d2330e767e95a237faa899d085a33ca349ecea3fbac72`. O snapshot do tenant RM Prime observado nesta auditoria continua na revisão publicada 1, sem campos do wizard nem rascunho: não há evidência de gravação do wizard após a correção. Não será criada uma revisão comercial por acesso administrativo ao banco para substituir o teste pela sessão do Admin.

## Critérios terminais

1. Estado retomável persistido sem `localStorage`.
2. Geração repetida não duplica páginas.
3. Nenhuma função recebe `tenant_id` do cliente.
4. Nenhuma publicação ocorre durante o wizard.
5. CMS existente consegue editar e publicar os rascunhos.
6. Gate de domínio permanece intocado.
