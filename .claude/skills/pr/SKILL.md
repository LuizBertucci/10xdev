---
name: pr
description: "Fluxo automatico para criacao de Pull Requests via gh CLI. Use quando o usuario pedir para criar ou rodar o PR."
---

# Pull Request Workflow

Quando o usuario pedir para criar/rodar o PR (ex.: "Rode o PR", "dar pr", "cria o PR"), siga este fluxo **sem pedir ref manual**. A lista "Commits incluidos" deve **bater com o que o GitHub mostra** na aba de commits do PR (commits da branch que nao estao na base).

## 1. Atualizar base e listar commits

- Rode `git fetch origin main` (ou a base branch) para ter a base atualizada.
- Rode `git log origin/main..HEAD --oneline` para listar os commits que entram neste PR (o mesmo que o GitHub exibe).
- Use **sempre** essa lista para a secao **"Commits incluidos"** — nao use ref do body do PR anterior, senao a contagem nao bate com a interface do GitHub.
- Opcional: `git diff origin/main..HEAD --stat` para resumo de arquivos alterados.

## 2. Montar e criar o PR

- **Summary:** em portugues; bullets com o que, por que e como; uma alteracao logica por bullet.
- **Commits incluidos:** apenas os commits do passo 1, no formato ``- `hash` descricao``.
- **Titulo:** em portugues, descritivo, sem ponto final; prefixe com tema se fizer sentido.
- Sempre faca **push** da branch antes (`git push origin "$BRANCH"`).
- **Nao crie arquivo .md temporario para o body:** nao use `--body-file`, nao gere um .md para depois apagar. Use **sempre o heredoc** inline no comando (veja abaixo).
- Crie o PR com heredoc:
  ```bash
  gh pr create --base main --title "Titulo do PR" --body "$(cat <<'BODY'
  ## Summary

  - Ponto 1
  - Ponto 2

  ## Commits incluidos

  - `hash1` descricao 1
  - `hash2` descricao 2
  BODY
  )"
  ```

## Regras gerais

- Base branch padrao: **main** (a menos que o usuario diga outra).
- O usuario so precisa dizer "Rode o PR" (ou equivalente); voce descobre o ultimo PR, a ref e os commits novos sozinho.
