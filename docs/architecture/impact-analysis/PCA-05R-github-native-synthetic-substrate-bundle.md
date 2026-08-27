# PCA-05R — bundle de substrato sintético privado

`STATUS=READY_FOR_PRIVATE_CELL_EXECUTION_AUTHORIZATION`

O lexer SQL determinístico validado projeta as 105 migrations pré-PCA-04 sem alterar `supabase/migrations/`. Dos 1.267 statements de origem, 1.201 são preservados, 65 são excluídos e um bloco de tenantização é substituído por DDL sanitizado, totalizando 1.202 statements projetados. Cada decisão registra arquivo, ordinal e SHA-256.

O bundle é restrito a uma célula Lovable nova, privada e vazia. Não escreve `supabase_migrations`, não cria usuário ou tenant real, não reescreve Storage, não ativa `pg_net`, `pg_cron` ou `supabase_vault`, não chama rede e não autoriza Same-Backend, provider ou deploy. O replacement adiciona somente coluna nullable, FK, default e índice; provisionamento/backfill sintéticos pertencem a gate posterior.

O SQL e o manifest são materializados sob demanda com `node scripts/build-pca-05r-synthetic-substrate-bundle.mjs --write`; artefatos derivados não são fonte de autoridade. O replacement deriva exatamente os 24 targets do array do statement de origem e falha se algum deles não possuir `CREATE TABLE` predecessor no bundle. O contrato também rejeita os oito targets que haviam sido inventados pelo gerador anterior. O teste trava o SHA-256 corrigido em `9386c7896ccc07711aaa299bc40bda83fa730d103983af25d630911dd66ff9bc`.

`MIGRATION_FILE_MUTATION=false`  
`LOVABLE_EXECUTION_AUTHORIZED=false`  
`SAME_BACKEND_ALLOWED=false`  
`PROVIDER_MUTATION=false`  
`DEPLOY=false`
