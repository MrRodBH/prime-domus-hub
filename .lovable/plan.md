# Preview isolado do head 4186e5b4 (PR draft #120) — verificação read-only

## Resultado da verificação (nada foi alterado)

- O remoto `origin` deste workspace **não é o GitHub** `MrRodBH/prime-domus-hub`; é o mirror Git interno do Lovable (`git.private.lovable-gcp.code.storage/982b91d8-...`).
- `git ls-remote origin refs/heads/agent/pr-m3*` retorna **vazio**: a branch `agent/pr-m3-fvs2-authenticated-pipeline-read-only` não existe no mirror.
- `git cat-file -t 4186e5b45b27cc26c74fb0ad023d87c8706d8b09` → `could not get object info`: o objeto **não está disponível localmente**.
- Branches presentes no mirror: `main`, `agent/bcr-01-billing-commercial-recovery-*` e backups `lovable-backup-main-*`.

## Limitação objetiva

O Lovable **não oferece preview por commit/PR**. Existe um único preview por projeto, servido pelo dev server do workspace a partir do checkout atual. Consequências:

1. Não há mecanismo de "abrir preview de um SHA" sem materializar aquele SHA no workspace.
2. Materializar o SHA é, por definição, escrita de arquivos no workspace — o que este envelope proíbe ("não altere nenhum arquivo").
3. O mirror Lovable não contém a branch/objeto, então nem um `checkout` local seria possível sem sync a partir do GitHub (operação de escrita).

**Conclusão: fail-closed.** Não é possível abrir um preview fiel a `4186e5b4` sob as restrições atuais. Nenhuma publicação em produção foi feita.

## Caminhos possíveis (exigem autorização explícita do Owner)

- **Opção A — Materialização autorizada neste projeto**: autorizar escrita de arquivos para trazer exatamente `4186e5b4` ao workspace (via tarball/GitHub) e usar o preview do projeto para revisão visual. Reversível para o head atual depois, mas altera temporariamente o workspace. Não requer publish.
- **Opção B — Projeto Lovable separado**: criar/usar um segundo projeto Lovable dedicado à revisão, materializar o SHA lá e revisar no preview dele. Mantém este projeto intocado; exige um projeto adicional (e backend próprio, se a revisão depender de dados).
- **Opção C — Revisão sem preview Lovable**: revisão de código na própria PR #120 no GitHub, ou build/preview fora do Lovable (ex.: Cloudflare preview a partir da branch), sem tocar este workspace.

## Nota técnica

Nenhuma das opções envolve migration, secret, provider externo ou publish. A Opção A é a única que produz preview fiel ao SHA dentro deste projeto, e depende de suspender a restrição "não alterar arquivos".
