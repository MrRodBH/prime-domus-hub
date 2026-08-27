# PCA-05R — GitHub-native structural wave bundle

## Decisão CTDD

`scripts/build-pca-05r-structural-wave-bundle.mjs` deriva W1–W6 exclusivamente das 17 migrations travadas no manifest PCA-04. O gerador valida SHA-256, ordem, transações explícitas e ausência de chamadas/capacidades externas; não altera migrations nem escreve o ledger Supabase.

Os seis arquivos SQL e o manifest de execução são artefatos efêmeros gerados por `node scripts/build-pca-05r-structural-wave-bundle.mjs --write`. GitHub `main` permanece autoridade dos bytes. A execução é permitida somente em uma nova célula Lovable privada, não publicada e descartável.

Compatibilidade PostgreSQL 17: a migration `20260728180000` contém quatro comparações entre `name[]` e `text[]`. O bundle projeta somente `pg_attribute.attname` para `text` dentro dessas quatro agregações; o hash dos bytes-fonte continua obrigatório e o arquivo de migration permanece imutável.

Compatibilidade `FUNC_MAX_ARGS=100`: a migration `20260728233000` possui um `jsonb_build_object` com mais de 100 argumentos. O bundle divide somente esse construtor em dois objetos concatenados por `||`, preservando chaves, valores e `jsonb_strip_nulls`.

```text
SAME_BACKEND_MUTATION=false
MIGRATION_FILE_MUTATION=false
PROVIDER_MUTATION=false
DEPLOY=false
PR_105_MUTATION=false
```
