---
name: commit
description: "Fluxo padrao para organizar commits e push com quality gate integrado. Use quando o usuario pedir para commitar, subir, ou fazer push."
---

# Git Commit & Push Workflow

**Nunca commite automaticamente.** So commite quando o usuario pedir explicitamente (ex: "commita", "pode subir", "sobe", "commit", "push").
Quando o usuario pedir, siga este fluxo. Se pedir para pular o quality gate ("pula", "skip", "so commita"), va direto para a etapa 3.

## 1. Analisar alteracoes pendentes

- Rode `git status` e `git diff --stat` para listar todos os arquivos modificados
- Rode `git diff` por grupo de arquivos para entender cada mudanca

## 2. Quality Gate (lint + build)

### Lint (sempre)

```bash
npm run lint
```

- **Sempre roda**, independente do tamanho da mudanca
- Se falhar, corrija os erros e rode novamente. Nao prossiga ate passar.

### Build (condicional)

```bash
npm run build
```

Rode **apenas** se: 3+ arquivos alterados, **ou** mudancas em `types/`, `tsconfig`, `package.json`, arquivos de config.
Se falhar, corrija e rode novamente. Nao prossiga ate passar.

**Frontend com limitação de memória (WSL):**
```bash
cd frontend && NODE_OPTIONS="--max-old-space-size=4096" npm run build
```
Use quando o build crashar por falta de memória no WSL (erro de heap ou crash do terminal).

## 3. Agrupar por responsabilidade

Separe as alteracoes em commits logicos, cada um com **uma unica responsabilidade**:
- Agrupe arquivos que fazem parte da mesma feature/fix/refactor
- Nunca misture alteracoes de backend com frontend se forem de funcionalidades diferentes
- Nunca misture performance com feature nova

## 4. Apresentar tabela + CodeRabbit Review

Apresente a tabela de commits. Em seguida, rode o CodeRabbit Review se aplicavel.

### CodeRabbit (condicional)

```bash
coderabbit review --plain --type uncommitted
```

Rode **apenas** se: 3+ arquivos alterados, **ou** o usuario pediu explicitamente ("revisa", "roda coderabbit", "quality gate").

### Tabela enriquecida

Mapeie as sugestoes do CodeRabbit aos commits e apresente a tabela com status:

| # | Commit (titulo) | Arquivos | Status |
|---|-----------------|----------|--------|
| 1 | `tipo: titulo curto` | arquivo1, arquivo2 | limpo |
| 2 | `tipo: titulo curto` | arquivo3 | 2 sugestoes |

Para commits com sugestoes, liste-as abaixo:

| # | Arquivo | Sugestao | Severidade |
|---|---------|----------|------------|
| 1 | `path/file.ts` | Descricao da melhoria | alta/media/baixa |

- Ordene por severidade (alta primeiro)
- Traduza para portugues se vier em ingles
- Pergunte quais sugestoes aplicar
- **Aplique antes de commitar** (o commit ja sai na versao final)
- Se aplicou mudancas, rode `npm run lint` novamente

Se CodeRabbit nao rodar (< 3 arquivos), apresente a tabela sem a coluna Status.

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
