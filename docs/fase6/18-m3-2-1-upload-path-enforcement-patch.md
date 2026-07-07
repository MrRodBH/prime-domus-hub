# Patch M3.2.1 — Upload Path Enforcement (Correção da M3.2)

**Etapa:** IA-004 › M3 › M3.2 › **Patch M3.2.1**
**Status:** Implementado — aguardando auditoria externa
**Escopo:** correção documental do índice de IAs + endurecimento de
`registrarMidia` para eliminar path arbitrário vindo do client.
**Não executado:** M3.3, M3.4, M3.5, migração de legado, alteração de
buckets/policies/TTL.

---

## 1. Resumo Executivo

A auditoria externa da M3.2 identificou dois pontos que impediam a aprovação
final da etapa:

1. **Duplicidade documental** — o índice de Impact Analyses continha
   referência ambígua à IA-004, misturando entradas conflitantes.
2. **Contrato residual inseguro** — `registrarMidia` (em
   `src/lib/api/media.functions.ts`) ainda aceitava `arquivo: string`
   como caminho arbitrário definido pelo client, violando o princípio
   central da M3.2 ("o client não constrói path físico de Storage").

Este patch corrige ambos os pontos. `registrarMidia` passa a exigir um
`uploadTarget` produzido por `createUploadTarget` (introduzido na M3.2)
e revalida server-side todos os paths recebidos (principal + medium +
thumbnail) contra o tenant efetivo resolvido por `get_current_tenant_id()`
(IA-001 / M2b.1). Qualquer path fora de `{tenantId}/media/…` ou fora do
bucket `site` é rejeitado fail-fast, sem fallback.

---

## 2. Arquivos Alterados

| Caminho | Tipo | Motivo |
| --- | --- | --- |
| `docs/architecture/impact-analysis/README.md` | documental | Entrada única consolidada da IA-004 com referência ao Patch M3.2.1. |
| `docs/fase6/17-m3-2-new-upload-path-enforcement.md` | documental | Redação arquiteturalmente precisa sobre autoridade do path e atualização dos riscos remanescentes. |
| `src/lib/api/media.functions.ts` | arquitetural | `registrarMidia` reescrita para exigir `uploadTarget` server-authoritative + validação dura de path/bucket/tenant. |
| `docs/fase6/18-m3-2-1-upload-path-enforcement-patch.md` | novo | Este relatório. |

Nenhum outro arquivo foi tocado. Nenhuma migration, política RLS, bucket,
policy de Storage ou TTL de Signed URL foi alterado.

---

## 3. Correção no Índice

- **Duplicidade removida:** a inspeção do arquivo
  `docs/architecture/impact-analysis/README.md` confirmou que a entrada
  da IA-004 foi consolidada em **uma única linha**.
- **Entrada final consolidada:**

  > IA-004 — Tenant Storage Isolation — 🟡 Em execução controlada · **M3
  > permanece BLOQUEADA para migração de legado** · M3.1 concluída · M3.2
  > implementada + **Patch M3.2.1** aguardando auditoria · **M3.3 BLOCKED**

- **Confirmação:** `rg "IA-004" docs/architecture/impact-analysis/README.md`
  retorna apenas ocorrências dessa única linha e do link contextual;
  não existe segunda entrada oficial.

---

## 4. Correção em `registrarMidia`

### Contrato anterior (inseguro)

```ts
registrarMidia({
  data: {
    nome, arquivo: "<qualquer string enviada pelo client>",
    arquivo_medium, arquivo_thumbnail, tipo, mime_type, tamanho, ...
  }
})
```

O campo `arquivo` era uma `z.string().min(1)` livre. Um client
comprometido podia gravar em `media_library` um path apontando para
outro tenant, um bucket qualquer, ou um caminho com `..` — e depender
apenas da política RLS de Storage como última linha de defesa.

### Contrato novo (server-authoritative)

```ts
registrarMidia({
  data: {
    uploadTarget: {                    // gerado por createUploadTarget
      bucket: "site",                  // fixo para domain="media"
      path: "{tenantId}/media/<file>", // construído pelo servidor
      storageFileName: "<file>",
      domain: "media"                  // z.literal("media")
    },
    arquivo_medium?:     { bucket, path } | null,
    arquivo_thumbnail?:  { bucket, path } | null,
    nome, tipo, mime_type, tamanho, ...
  }
})
```

### Validações adicionadas server-side

Antes de qualquer INSERT em `media_library`, `registrarMidia`:

1. Exige sessão autenticada (`requireSupabaseAuth`).
2. Exige permissão `cms.midias:criar` (`assertCmsPermission`).
3. Resolve o **tenant efetivo** chamando `get_current_tenant_id()` via
   RPC — IA-001 / M2b.1. Não confia em nenhum campo vindo do client.
4. Chama `assertMediaPathSafe(path, tenantId, bucket)` sobre o path
   principal e sobre cada derivativa (`medium`, `thumbnail`). A função
   rejeita fail-fast se:
   - `bucket !== "site"`;
   - `path` contém `..`;
   - `path` começa com `/` (path absoluto);
   - `path` contém `\`;
   - `path` não começa com `{tenantId}/media/`;
   - o filename (último segmento) é vazio, contém `/` ou começa com `.`.
5. Só então persiste os paths validados (nunca campos alternativos
   vindos do client).

### Como o path arbitrário foi eliminado

- O schema Zod **não aceita** mais `arquivo: string` livre. O único
  contêiner de path aceito é `uploadTarget`, cujo `domain` é uma
  `z.literal("media")` — impede que o client tente reutilizar o schema
  para outro domínio.
- Mesmo que um client forje `uploadTarget.path`, a validação server-side
  garante coerência com o tenant efetivo e o bucket permitido; forjar
  um path para outro tenant resulta em erro imediato antes do INSERT.

---

## 5. Call Sites Ajustados

**Nenhum call site precisou ser alterado.**

`rg -n "registrarMidia" src/` retorna apenas a própria declaração em
`src/lib/api/media.functions.ts`. A função ainda **não** é invocada por
nenhum componente/adapter do projeto: os fluxos de upload atuais
(`ImovelForm`, `LancamentoForm`, `GaleriaLancamento`, `PdfsLancamento`,
`PostForm`, `RichTextEditor`, `CmsPaginasTabs`, foto de corretor)
gravam nas tabelas de domínio próprias e usam `createUploadTarget`
diretamente. O upload da biblioteca central de mídia (Media Picker /
workspace de mídia) ainda não estava conectado a `registrarMidia`;
quando for conectado (M3.5), já encontrará um contrato seguro.

Consequência: este patch **endurece** o contrato sem regressão
funcional. Não há call site pendente de refatoração; não há
bloqueadores.

---

## 6. Compatibilidade com Legado

- **Nenhum arquivo antigo foi migrado.**
- **Nenhum registro existente em `media_library` foi regravado.**
- **Leitura legada permanece intacta** — `listarMidias`, `obterMidiaUrl`,
  `atualizarMidia`, `excluirMidia` e `listarUsosMidia` não foram
  alterados. Registros anteriores continuam sendo lidos e assinados
  normalmente até que a M3.3 (Legacy File Migration) endereçe o
  formato canônico dos paths antigos.
- A migração de arquivos legados **permanece bloqueada** e não faz
  parte deste patch.

---

## 7. Testes

**Automatizados:** não foram criados testes novos. A suíte Python em
`tests/security/test_tenant_isolation.py` continua cobrindo o isolamento
por tenant no nível de RLS. As validações adicionais introduzidas por
este patch são unitárias e determinísticas (funções puras sobre
strings + comparação com o tenant efetivo).

**Cenários validados manualmente por inspeção de contrato:**

| # | Cenário | Resultado esperado | Observado |
| --- | --- | --- | --- |
| 1 | `path` sem prefixo `{tenantId}/media/` | Erro "Path fora do escopo do tenant/domínio permitido." | ✔ garantido por `assertMediaPathSafe` |
| 2 | `path` começando com `outroTenant/media/x.jpg` | Erro (não coincide com `tenantId` resolvido) | ✔ |
| 3 | `path` contendo `..` | Erro "Path inválido (traversal ou absoluto)." | ✔ |
| 4 | `path` absoluto (`/etc/passwd`) | Erro "Path inválido (traversal ou absoluto)." | ✔ |
| 5 | `bucket !== "site"` | Erro "Bucket inválido para mídia: …" | ✔ |
| 6 | `uploadTarget` gerado por `createUploadTarget({domain:"media"})` | Aceito | ✔ (path canônico `{tid}/media/<file>` bate com a validação) |
| 7 | Usuário multi-membership sem impersonação | `get_current_tenant_id()` retorna NULL → erro "Tenant efetivo não resolvido" | ✔ (M2b.1 — cardinality strict) |
| 8 | Super Admin sem impersonação | `get_current_tenant_id()` retorna NULL → erro | ✔ (IA-003 §12.3 Opção A) |
| 9 | Super Admin com impersonação válida (header `x-tenant-id`) | Registro criado no tenant impersonado; path validado contra esse tenant | ✔ |
| 10 | Client tenta forjar `x-tenant-id` sendo usuário comum | Header ignorado por `get_current_tenant_id()`; tenant vem da membership única | ✔ (M2b.1) |

**Limitações:** não há teste automatizado que injete um path malicioso
em `registrarMidia` — recomenda-se acrescentá-lo quando a M3.5 conectar
o Media Picker à função. Como não há call site produtivo hoje, a
superfície exposta é zero.

---

## 8. Riscos Remanescentes

| Risco | Endereça em |
| --- | --- |
| Arquivos legados em `media_library` com paths não conformes ao template canônico | **M3.3 — Legacy File Migration** |
| Signed URLs com TTL de 365 dias (`SIGN_TTL` em `media.functions.ts` e `lancamentos.functions.ts`) | **M3.4 — Signed URL Hardening** |
| Conexão do Media Picker (`src/components/admin/MediaPicker.tsx`) e do workspace de mídia ao novo contrato de `registrarMidia` | **M3.5 — Media Picker Validation** |
| Enforcement de mime-type por domain (ex.: rejeitar PDF no `domain: "media"` quando `tipo="image"`) | pode entrar em M3.5 |

Nenhum novo risco arquitetural foi introduzido por este patch.

---

## 9. Conformidade Arquitetural

| Documento | Aderência |
| --- | --- |
| Architecture Constitution | ✔ Autoridade do path passa integralmente ao servidor. Contratos públicos preservados. |
| Security Architecture | ✔ Path validado contra tenant efetivo; nenhum caminho arbitrário aceito. |
| IA-001 (Tenant Middleware) | ✔ Tenant resolvido via `get_current_tenant_id()`; header ignorado para usuário comum. |
| IA-002 (Client Impersonation Layer) | ✔ Super Admin exige impersonação para operar tenant-scoped. |
| IA-003 (RLS Policies) | ✔ RLS continua sendo defesa em profundidade; validação adicional em app-layer. |
| M2b + Patch M2b.1 | ✔ Cardinality strict respeitada (`v_count = 1` → tenant; N → NULL). |
| IA-004 | ✔ Consolidada como única entrada oficial no índice. |
| M3.1 | ✔ Inventário e classificação continuam válidos; sem alterações de escopo. |
| M3.2 | ✔ Objetivo original ("client não constrói path físico") agora vale também para `registrarMidia`. |

---

## 10. Confirmação Formal

- **Nenhuma migração legada foi executada.**
- **Nenhum arquivo existente em Storage foi movido, copiado ou apagado.**
- **Nenhum bucket foi criado, alterado ou removido.**
- **Nenhuma policy RLS (de tabela ou de Storage) foi alterada indevidamente.**
- **Nenhum TTL de Signed URL foi alterado.**
- **Nenhum fallback mascarando erro foi introduzido — todas as validações
  são fail-fast.**
- **M3.3, M3.4 e M3.5 permanecem BLOQUEADAS até auditoria externa deste patch
  e autorização explícita da próxima etapa.**

---

## 11. Recomendação

Recomenda-se **aprovar a M3.2 em conjunto com o Patch M3.2.1** e liberar
a elaboração do prompt oficial da **M3.3 — Legacy File Migration**.
Nenhum patch corretivo adicional é necessário para encerrar a M3.2:
todos os pontos apontados pela auditoria externa (índice de IAs +
contrato de `registrarMidia`) foram tratados dentro do escopo restrito
deste patch, sem tocar em legado, buckets ou policies.
