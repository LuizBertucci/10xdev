---
name: pr-comments
description: "Extrai comentarios de reviews do PR via gh CLI e gera relatorio em Markdown"
---

# PR Comments Extractor

Quando o usuario pedir para **"puxar do coderabbit"** (ou variantes como "extrai as sugestoes", "pega os comentarios do PR", "relatorio do PR", etc.), execute o fluxo abaixo.

## 1. Detectar PR e review ID

O usuario pode fornecer:

- **Branch atual** → detectar PR automaticamente:
  ```bash
  branch=$(git branch --show-current)
  prNum=$(gh pr list --head "$branch" --json number --jq '.[0].number')
  ```
- **Numero explicito** (ex: "PR #97") → usar diretamente
- **URL do PR** (ex: `https://github.com/owner/repo/pull/97`) → extrair numero da URL
- **URL de review especifico** (ex: `.../pull/97#pullrequestreview-3889856314`) → extrair `prNum` e `reviewId` da URL

Se nao encontrar PR, avisar usuario e nao prosseguir.

## 2. Baixar conteudo via gh CLI

```bash
repo=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
prInfo=$(gh pr view $prNum --json title,state,url,headRefName,author --jq '{title, state, url, branch: .headRefName, author: .author.login}')
```

**Se o usuario forneceu URL de review especifico** (tem `#pullrequestreview-{id}`), filtrar apenas os comentarios daquele review:

```bash
# Body do review especifico
reviewBody=$(gh api repos/$repo/pulls/$prNum/reviews/$reviewId --jq '.body')

# Apenas os inline comments daquele review
inlineComments=$(gh api repos/$repo/pulls/$prNum/comments \
  --jq "[.[] | select(.pull_request_review_id == $reviewId) | {path: .path, line: (.original_line // .line // .start_line), body: .body, user: .user.login}]")
```

**Se nao, buscar todos os comentarios do CodeRabbit:**

```bash
# Comentarios inline de todos os reviews
inlineComments=$(gh api repos/$repo/pulls/$prNum/comments \
  --jq '[.[] | {path: .path, line: (.original_line // .line // .start_line), body: .body, user: .user.login}]')

# Body do review principal (contem outside diff + actionable summary)
reviewBody=$(gh api repos/$repo/pulls/$prNum/reviews \
  --jq '[.[] | select(.user.login | contains("coderabbit")) | .body] | join("\n\n")')
```

## 3. Analisar e salvar em `.cursor/pr-comments/pr-$prNum.md`

Com os dados de `inlineComments` e `reviewBody` em maos, o agente (nao um script bash) deve:

**a) Parsear cada comentario inline** buscando no campo `body`:
- Severidade: `_🔴 Critical_`, `_🟠 Major_`, `_🟡 Minor_`
- Titulo em negrito (primeira linha `**...**`)
- Arquivo + linha ja estao nos campos `path` e `line`

**b) Parsear o `reviewBody`** para extrair:
- Outside diff comments (bloco `⚠️ Outside diff range comments`)
- Comentarios que nao aparecem inline

**c) Escrever o arquivo** em `.cursor/pr-comments/pr-$prNum.md` com:
- Cabecalho: titulo, URL, autor do PR, branch, data gerada
- Estatisticas: total de comentarios, arquivos afetados, autores dos comentarios, outside diff
- Secoes por severidade: 🔴 Critical → 🟠 Major → 🟡 Minor
- Secao de outside diff
- Tabela resumo ao final com colunas `# | Sev | Arquivo | Problema`

## 4. Apresentar tabela no chat

Apos gerar o arquivo, exibir no chat:

1. Caminho do arquivo gerado
2. Resumo estatistico: totais por severidade, numero de arquivos afetados, autores envolvidos
3. Tabela com todos os action items:

```md
| # | Sev | Arquivo | Problema |
|---|-----|---------|----------|
| 1 | 🔴  | foo.ts:42 | descricao curta |
...
```

4. Perguntar se deseja aplicar alguma correcao
