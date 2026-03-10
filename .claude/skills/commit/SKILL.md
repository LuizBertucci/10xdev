---
name: commit
description: "Fluxo padrao para organizar commits e push com quality gate integrado. Use quando o usuario pedir para commitar, subir, ou fazer push."
---

# Git Commit & Push Workflow

**Nunca commite automaticamente.** So commite quando o usuario pedir explicitamente (ex: "commita", "pode subir", "sobe", "commit", "push").
Se pedir para pular o quality gate ("pula", "skip", "so commita"), va direto para a etapa 3.

## Modos de execucao

### 1) Commit rapido (default)
- Lint sempre; Build e CodeRabbit condicionais (3+ arquivos ou mudancas em types/config, ou usuario pediu)

### 2) Commit completo (quando usuario pedir "completo")
- Lint, Build e CodeRabbit sempre

## 1. Analisar alteracoes pendentes

- Rode `git status` e `git diff --stat` para listar todos os arquivos modificados
- Rode `git diff` por grupo de arquivos para entender cada mudanca

## 2. Quality Gate por modo

### Lint (sempre)

```bash
npm run lint
```

- **Sempre roda**, independente do tamanho da mudanca
- Se falhar, corrija os erros e rode novamente. Nao prossiga ate passar.

### Build (condicional no rapido, sempre no completo)

```bash
npm run build
```

- **Modo rapido:** rode apenas se 3+ arquivos alterados, **ou** mudancas em `types/`, `tsconfig`, `package.json`, arquivos de config
- **Modo completo:** sempre rode

**Frontend com limitacao de memoria (WSL):**
```bash
cd frontend && NODE_OPTIONS="--max-old-space-size=4096" npm run build
```
Use quando o build crashar por falta de memoria no WSL.

## 3. Agrupar por responsabilidade

Separe as alteracoes em commits logicos, cada um com **uma unica responsabilidade**:
- Agrupe arquivos que fazem parte da mesma feature/fix/refactor
- Nunca misture alteracoes de backend com frontend se forem de funcionalidades diferentes
- Nunca misture performance com feature nova

## 4. Apresentar blocos de aprovacao + tabela

### Bloco de aprovacao

**IMPORTANTE:** Sempre apresente titulo + arquivos + corpo de cada commit para o usuario aprovar antes de executar. Use o formato abaixo — cada commit como bloco separado:

---

**#N** — `tipo: titulo`
**Arquivos:** `arquivo1.ts`, `arquivo2.ts`
> Corpo descritivo em 2-3 linhas explicando o que foi feito e o motivo.

---

### Tabela de commits

Apresente a tabela na estrutura abaixo. Use a coluna **Status** apenas quando CodeRabbit tiver rodado.

| # | Commit (titulo) | Arquivos | Status |
|---|-----------------|----------|--------|
| 1 | `tipo: titulo curto` | arquivo1, arquivo2 | limpo |
| 2 | `tipo: titulo curto` | arquivo3 | 2 sugestoes |

- **Com CodeRabbit:** inclua coluna Status (limpo, N sugestoes)
- **Sem CodeRabbit:** apresente a tabela sem coluna Status

### CodeRabbit (condicional no rapido, sempre no completo)

```bash
coderabbit review --plain --type uncommitted
```

- **Modo rapido:** rode apenas se 3+ arquivos alterados, **ou** usuario pediu ("revisa", "roda coderabbit", "quality gate")
- **Modo completo:** sempre rode

### Sugestoes do CodeRabbit

Para commits com sugestoes, liste-as abaixo da tabela:

| # | Arquivo | Sugestao | Severidade |
|---|---------|----------|------------|
| 1 | `path/file.ts` | Descricao da melhoria | alta/media/baixa |

- Ordene por severidade (alta primeiro)
- Traduza para portugues se vier em ingles
- Pergunte quais sugestoes aplicar
- **Aplique antes de commitar** (o commit ja sai na versao final)
- Se aplicou mudancas, rode `npm run lint` novamente

**Tipos de commit:** `feat`, `fix`, `perf`, `style`, `refactor`, `docs`, `chore`, `test`

Aguarde o "ok" do usuario antes de executar os commits.

## 5. Executar commits na ordem

Cada commit usa HEREDOC com titulo + corpo descritivo:

```bash
git add arquivo1 arquivo2 && git commit -m "$(cat <<'EOF'
tipo: titulo curto em portugues

Descricao detalhada em 2-3 linhas explicando
o que foi feito e o motivo da alteracao.
EOF
)"
```

## 6. Verificar e fazer push

- Rode `git status` + `git log --oneline` para confirmar
- **Faca o push automaticamente** logo apos os commits
- Sempre perguntar antes de fazer `push --force`

## Regras

- Titulos de commit em **portugues**, lowercase, sem ponto final
- Corpo do commit em **portugues** com contexto util
- Titulo deve ser o **mais descritivo possivel** dentro do limite de ~72 caracteres
  - Bom: `perf: substituir chamadas individuais /access por calculo local com useMemo`
  - Ruim: `perf: otimizar acesso`
- Sempre perguntar antes de fazer `push --force`
