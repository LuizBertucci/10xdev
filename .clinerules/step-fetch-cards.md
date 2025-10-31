# Step: Fetch Cards - Como Acessar e Descobrir ID de Cards Existentes

Este documento descreve o processo para buscar cards existentes na API e descobrir seus IDs para usar como inspiração.

## 🎯 Objetivo

Encontrar o ID de um CardFeature específico que já foi criado na plataforma para poder:
- Usar como referência/inspiração
- Acessar diretamente via API
- Verificar estrutura e conteúdo

## 📋 Processo Completo

### 1. Buscar Card por Título (Filtro por Texto)

**Comando curl para buscar cards que contenham um termo no título:**

```bash
curl -s "http://localhost:3001/api/card-features" | \
python3 -c "import sys, json; \
data = json.load(sys.stdin); \
items = [item for item in data.get('data', []) if 'TERMO_AQUI' in item.get('title', '')]; \
print(json.dumps(items, indent=2, ensure_ascii=False))" | \
grep -E '"id"|"title"'
```

**Exemplo prático - Buscar card "Autenticação Supabase":**

```bash
curl -s "http://localhost:3001/api/card-features" | \
python3 -c "import sys, json; \
data = json.load(sys.stdin); \
items = [item for item in data.get('data', []) if 'Supabase' in item.get('title', '')]; \
print(json.dumps(items, indent=2, ensure_ascii=False))" | \
grep -E '"id"|"title"'
```

**Saída esperada:**
```json
    "id": "f58d397a-e88b-4685-b1b7-9ecc9f1df615",
    "title": "Autenticação Supabase - Alavanca Dash",
```

### 2. Buscar Todos os Cards e Filtrar

**Listar os últimos cards criados:**

```bash
curl -s "http://localhost:3001/api/card-features?limit=10" | \
python3 -m json.tool | \
grep -A 10 '"title":' | \
head -n 30
```

**Filtrar por título específico:**

```bash
curl -s "http://localhost:3001/api/card-features" | \
python3 -m json.tool | \
grep -B 2 -A 15 '"title": "Título Exato Aqui"'
```

### 3. Buscar Card por ID Específico

**Uma vez que você tem o ID, pode buscar diretamente:**

```bash
curl -s "http://localhost:3001/api/card-features/f58d397a-e88b-4685-b1b7-9ecc9f1df615" | \
python3 -m json.tool
```

### 4. Buscar por Tecnologia ou Tipo

**Filtrar por tech:**

```bash
curl -s "http://localhost:3001/api/card-features?tech=React" | \
python3 -m json.tool | \
grep -E '"id"|"title"|"tech"'
```

**Filtrar por card_type:**

```bash
curl -s "http://localhost:3001/api/card-features?card_type=workflows" | \
python3 -m json.tool | \
grep -E '"id"|"title"|"card_type"'
```

### 5. Buscar Usando Search Endpoint

**Usar endpoint de busca da API:**

```bash
curl -s "http://localhost:3001/api/card-features/search?q=Supabase" | \
python3 -m json.tool | \
grep -E '"id"|"title"'
```

## 🔧 Script Auxiliar

**Criar função helper para buscar ID rapidamente:**

```bash
# Função para buscar ID por título
function get-card-id() {
  local search_term=$1
  curl -s "http://localhost:3001/api/card-features" | \
  python3 -c "import sys, json; \
  data = json.load(sys.stdin); \
  items = [item for item in data.get('data', []) if '$search_term'.lower() in item.get('title', '').lower()]; \
  print(items[0]['id'] if items else 'Not found')"
}

# Uso:
# get-card-id "Supabase"
```

## 📝 Exemplo Completo - Caso Real

**Cenário:** Queremos encontrar o ID do card "Autenticação Supabase - Alavanca Dash"

**Passo 1 - Buscar por termo "Supabase":**
```bash
curl -s "http://localhost:3001/api/card-features" | \
python3 -c "import sys, json; \
data = json.load(sys.stdin); \
items = [item for item in data.get('data', []) if 'Supabase' in item.get('title', '')]; \
print(json.dumps(items, indent=2, ensure_ascii=False))"
```

**Passo 2 - Extrair apenas ID e título:**
```bash
curl -s "http://localhost:3001/api/card-features" | \
python3 -c "import sys, json; \
data = json.load(sys.stdin); \
items = [item for item in data.get('data', []) if 'Supabase' in item.get('title', '')]; \
for item in items: print(f\"ID: {item['id']}\"); print(f\"Title: {item['title']}\")"
```

**Resultado:**
```
ID: f58d397a-e88b-4685-b1b7-9ecc9f1df615
Title: Autenticação Supabase - Alavanca Dash
```

## 🎨 Usando o ID Como Inspiração

**Uma vez que você tem o ID, pode:**

1. **Acessar o card completo:**
```bash
curl -s "http://localhost:3001/api/card-features/f58d397a-e88b-4685-b1b7-9ecc9f1df615" | \
python3 -m json.tool > card-inspiration.json
```

2. **Copiar estrutura para criar novo card similar:**
```bash
# Buscar card original
curl -s "http://localhost:3001/api/card-features/f58d397a-e88b-4685-b1b7-9ecc9f1df615" | \
python3 -m json.tool > template.json

# Modificar template.json com novos dados
# Enviar novo card
curl -X POST http://localhost:3001/api/card-features \
  -H 'Content-Type: application/json' \
  -d @template.json
```

3. **Acessar via frontend:**
- URL: `https://web-frontend-10xdev.azurewebsites.net/?tab=codes`
- O card estará visível na listagem
- Ao clicar, você verá todos os screens e codeblocks

## 📚 Estrutura da Resposta

**Quando você busca um card, recebe:**

```json
{
  "id": "uuid-do-card",
  "title": "Título do Card",
  "tech": "React",
  "language": "typescript",
  "description": "Descrição completa",
  "content_type": "code",
  "card_type": "codigos",
  "screens": [
    {
      "name": "nome-do-screen",
      "description": "Descrição do screen",
      "route": "caminho/arquivo.ts",
      "blocks": [
        {
          "id": "uuid-do-bloco",
          "type": "code",
          "content": "código aqui...",
          "language": "typescript",
          "title": "Título do bloco",
          "order": 0
        }
      ]
    }
  ],
  "createdAt": "2025-10-31T01:13:21.56+00:00",
  "updatedAt": "2025-10-31T01:13:21.56+00:00"
}
```

## 🔍 Dicas

1. **Busca case-insensitive:** Use `lower()` no Python para busca que não diferencia maiúsculas/minúsculas
2. **Múltiplos resultados:** O filtro Python retorna array - use `items[0]` para o primeiro resultado
3. **Formato bonito:** Use `python3 -m json.tool` para JSON formatado
4. **Produção:** Substitua `localhost:3001` pela URL real da API em produção

## 🚀 Quick Reference

**Buscar ID por título:**
```bash
curl -s "http://localhost:3001/api/card-features" | python3 -c "import sys, json; data = json.load(sys.stdin); items = [item for item in data.get('data', []) if 'TERMO' in item.get('title', '')]; print(items[0]['id'] if items else 'Not found')"
```

**Buscar card completo por ID:**
```bash
curl -s "http://localhost:3001/api/card-features/ID_AQUI" | python3 -m json.tool
```

**Listar últimos 10 cards:**
```bash
curl -s "http://localhost:3001/api/card-features?limit=10" | python3 -m json.tool
```

