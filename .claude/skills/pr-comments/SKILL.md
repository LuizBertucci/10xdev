---
name: pr-comments
description: "Extrai comentarios de reviews do PR via gh CLI e gera relatorio em Markdown"
---

# PR Comments Extractor

Quando o usuario pedir para **"puxar do coderabbit"** (ou variantes como "extrai as sugestoes", "pega os comentarios do PR", "relatorio do PR", etc.), execute o fluxo abaixo.

## 1. Atualizar base e detectar numero do PR

- Rode `git fetch origin main` para garantir base atualizada
- Determine o numero do PR:
  - Se o usuario informar explicitamente (ex: "PR #91"), use esse numero
  - Se nao informar, detecta a partir da branch atual:
    ```bash
    branch=$(git branch --show-current)
    prNum=$(gh pr list --head "$branch" --json number --jq '.[0].number')
    ```

Se nao encontrar PR, avisar usuario e nao prosseguir.

## 2. Obter detalhes do PR e reviews

```bash
# Obter informacoes basicas do PR
prNum=$1  # ou detected do passo anterior
prInfo=$(gh pr view $prNum --json title,state,url --jq '{title: .title, state: .state, url: .url}')
```

Obter reviews e comments:
```bash
# Reviews do PR
reviews=$(gh api repos/{owner}/{repo}/pulls/$prNum/reviews --jq '.[] | {state, body, user: .user.login}')

# Comments do CodeRabbit (reviews com body contendo "coderabbit")
coderabbitReviews=$(gh api repos/{owner}/{repo}/pulls/$prNum/reviews --jq '.[] | select(.body | contains("coderabbit"))')
```

## 3. Parsear comments actionables

O CodeRabbit retorna comments no body do review em formato estruturado. Extraia:
- Actionable comments (com link inline)
- Outside diff comments
- Nitpicks

Exemplo de parsing:
```bash
# Verificar se ha actionable comments
echo "$coderabbitReviews" | jq -r '.body' | grep -q "Actionable comments" && echo "Ha actionables"
```

## 4. Gerar relatorio em Markdown

Crie o arquivo em `.cursor/pr-comments/pr-$prNum.md`:

```bash
output=".cursor/pr-comments/pr-$prNum.md"

cat > "$output" <<EOF
# Relatorio de Comentarios do PR #$prNum

**Titulo**: $(echo "$prInfo" | jq -r '.title')
**URL**: $(echo "$prInfo" | jq -r '.url')
**Branch**: $(git branch --show-current)
**Gerado em**: $(date -u '+%Y-%m-%d UTC')

## Estatisticas

- Total de comentarios no PR: $totalComments
- Total de reviews: $totalReviews
- Total de comentarios inline: $inlineComments
- Arquivos com comentarios: $filesCount
- Autores: $authors

## Reviews

EOF
```

## 5. Estruturar comentarios por severidade

Organize os comentarios em tabela por severidade:
- 🔴 Critical
- 🟠 Major  
- 🟡 Minor
- Nitpicks

Para cada comentario, inclua:
- Arquivo e linha
- Tipo (potential issue, refactor suggestion, etc)
- Descricao do problema
- Correcao sugerida (se houver code snippet no comentario)

## 6. Fornecer ao usuario

Apresente ao usuario:
1. Caminho do arquivo gerado
2. Resumo estatistico
3. Tabela com principais action items
4. Pergunte se deseja aplicar alguma correcao

## Exemplo de uso

```
user: Puxa os comentarios do coderabbit do PR
assistant: Vou extrair os comentarios do PR atual...
[executa passos 1-5]
Pronto! Relatorio gerado em .cursor/pr-comments/pr-91.md

## Tabela de Recomendacoes

| # | Severidade | Arquivo | Problema |
|---|------------|---------|----------|
| 1 | 🔴 Critical | Projects.tsx:206 | URL legado... |
...

Quer que eu aplique alguma dessas correcoes?
```
