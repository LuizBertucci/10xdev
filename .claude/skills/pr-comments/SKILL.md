---
name: pr-comments
description: "Extrai comentarios de reviews do PR via gh CLI e gera relatorio em Markdown"
---

# PR Comments Extractor

Quando o usuario pedir para **"puxar do coderabbit"** (ou variantes como "extrai as sugestoes", "pega os comentarios do PR", "relatorio do PR", etc.), execute o fluxo abaixo.

## 1. Detectar branch e numero do PR

```bash
branch=$(git branch --show-current)
prNum=$(gh pr list --head "$branch" --json number --jq '.[0].number')
```

Se nao encontrar PR, avisar usuario e nao prosseguir.

O usuario tambem pode informar o numero do PR explicitamente (ex: "PR #97") ou via URL — nesse caso, extrair o numero da URL.

## 2. Baixar conteudo via gh CLI

```bash
prInfo=$(gh pr view $prNum --json title,state,url,headRefName --jq '{title, state, url, branch: .headRefName}')

# Comentarios inline (reviews do CodeRabbit)
inlineComments=$(gh api repos/{owner}/{repo}/pulls/$prNum/comments \
  --jq '[.[] | {path: .path, line: .original_line, body: .body, user: .user.login}]')

# Body do review principal (contem outside diff + actionable summary)
reviewBody=$(gh api repos/{owner}/{repo}/pulls/$prNum/reviews \
  --jq '.[] | select(.user.login | contains("coderabbit")) | .body')
```

## 3. Analisar e salvar em `.cursor/pr-comments/pr-{N}.md`

Com os dados de `inlineComments` e `reviewBody` em maos, o agente (nao um script bash) deve:

**a) Parsear cada comentario inline** buscando no campo `body`:
- Severidade: `_🔴 Critical_`, `_🟠 Major_`, `_🟡 Minor_`
- Titulo em negrito (primeira linha `**...**`)
- Arquivo + linha ja estao nos campos `path` e `line`

**b) Parsear o `reviewBody`** para extrair:
- Outside diff comments (bloco `⚠️ Outside diff range comments`)
- Comentarios que nao aparecem inline

**c) Escrever o arquivo** em `.cursor/pr-comments/pr-$prNum.md` com:
- Cabecalho: titulo, URL, branch, data gerada
- Estatisticas: total inline, outside diff
- Secoes por severidade: 🔴 Critical → 🟠 Major → 🟡 Minor
- Secao de outside diff
- Tabela resumo ao final com colunas `# | Sev | Arquivo | Problema`

## 4. Apresentar tabela no chat

Apos gerar o arquivo, exibir no chat:

1. Caminho do arquivo gerado
2. Resumo estatistico (totais por severidade)
3. Tabela com todos os action items:

```
| # | Sev | Arquivo | Problema |
|---|-----|---------|----------|
| 1 | 🔴  | foo.ts:42 | descricao curta |
...
```

4. Perguntar se deseja aplicar alguma correcao
