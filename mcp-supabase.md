# 🚀 Guia Completo: Implementação do Supabase MCP

> **Objetivo**: Configurar o Supabase MCP Server (oficial) para usar com Cline no VS Code, permitindo que a AI interaja diretamente com seu banco de dados Supabase através de linguagem natural.

---

## 📚 Índice

1. [O que é MCP e por que usar?](#1-o-que-é-mcp-e-por-que-usar)
2. [Arquitetura: Como funciona](#2-arquitetura-como-funciona)
3. [Pré-requisitos](#3-pré-requisitos)
4. [Parte 1: Setup Local (Desenvolvimento Seguro)](#4-parte-1-setup-local-desenvolvimento-seguro)
5. [Parte 2: Testando o MCP Local](#5-parte-2-testando-o-mcp-local)
6. [Parte 3: Setup Remoto (Projeto Real - Opcional)](#6-parte-3-setup-remoto-projeto-real-opcional)
7. [Parte 4: Usando o MCP na Prática](#7-parte-4-usando-o-mcp-na-prática)
8. [Troubleshooting](#8-troubleshooting)
9. [Boas Práticas e Segurança](#9-boas-práticas-e-segurança)

---

## 1. O que é MCP e por que usar?

### 🤔 O que é MCP?

**MCP (Model Context Protocol)** é um protocolo criado pela Anthropic que permite que Large Language Models (LLMs) conversem com serviços externos de forma padronizada.

**Analogia simples:**
```
MCP é como um "tradutor universal" entre AI e serviços externos.

Antes do MCP:
Você → AI → Você copia código SQL → Cola no Supabase → Executa

Com MCP:
Você → AI → [MCP executa automaticamente no Supabase] → Resultado
```

### 💡 Por que usar com Supabase?

**Benefícios práticos:**

1. **Velocidade**:
   - ❌ Antes: "Mostre tabelas" → copia SQL → abre Supabase → cola → executa
   - ✅ Com MCP: "Mostre tabelas" → resultado instantâneo

2. **Contexto**: AI vê seu schema real e sugere queries corretas

3. **Automação**: Crie schemas, insira dados, gere types - tudo por chat

4. **Documentação viva**: AI busca na docs oficial do Supabase em tempo real

---

## 2. Arquitetura: Como funciona

### 🏗️ Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    VOCÊ (Desenvolvedor)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ "Crie uma tabela users"
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                 CLINE (VS Code Extension)                   │
│  • Recebe sua mensagem                                      │
│  • Processa com Claude AI                                   │
│  • Identifica que precisa do MCP Supabase                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Chama tool: apply_migration(sql: "CREATE TABLE...")
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE MCP SERVER (Oficial)                  │
│                                                             │
│  Opção A: Local Development                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  http://localhost:54321/mcp                         │   │
│  │  • Roda junto com `supabase start`                  │   │
│  │  • Dados de teste/desenvolvimento                   │   │
│  │  • 100% seguro (não afeta produção)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Opção B: Remote Project                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  https://mcp.supabase.com/mcp                       │   │
│  │  • Cloud-hosted pela Supabase                       │   │
│  │  • Conecta com projeto real (supabase.com)          │   │
│  │  • OAuth + read_only mode para segurança            │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Executa SQL no banco
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE DATABASE                         │
│  • PostgreSQL                                               │
│  • Executa CREATE TABLE users...                           │
│  • Retorna sucesso/erro                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Resultado
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                        VOCÊ                                 │
│  Recebe: "✅ Tabela users criada com sucesso!"             │
└─────────────────────────────────────────────────────────────┘
```

### 🔧 Componentes Principais

| Componente | O que faz | Onde roda |
|------------|-----------|-----------|
| **Cline** | Interface de chat com AI | VS Code (sua máquina) |
| **Claude AI** | Processa linguagem natural → identifica tools MCP | Cloud Anthropic |
| **MCP Server** | Traduz chamadas AI → comandos Supabase | Local ou Cloud |
| **Supabase DB** | Executa SQL e retorna dados | Local ou Cloud |

---

## 3. Pré-requisitos

### ✅ Checklist (Marque conforme completa)

- [ ] **Node.js 18+** instalado
  ```bash
  node --version  # Deve mostrar v18+ ou v20+
  ```

- [ ] **VS Code** instalado e funcionando

- [ ] **Projeto Supabase** existente (ou vamos criar um)

- [ ] **Git** instalado (já tem, você clonou o repo)

### 📦 Instalações Necessárias

```bash
# 1. Supabase CLI (global)
npm install -g supabase

# 2. Verificar instalação
supabase --version
# Deve mostrar: supabase 1.x.x

# 3. Login no Supabase (vai abrir browser)
supabase login
```

---

## 4. Parte 1: Setup Local (Desenvolvimento Seguro)

> **Por que começar com local?** É 100% seguro. Você pode dropar tabelas, testar schemas, fazer qualquer coisa sem medo de quebrar produção.

### 📝 Passo 1: Inicializar Supabase no Projeto

```bash
# Navegue até o projeto 10xdev
cd C:\Users\samuel\Documents\code\10xdev

# Inicializar Supabase
supabase init

# O que isso faz:
# ✅ Cria pasta /supabase com estrutura de migrations
# ✅ Cria arquivo supabase/config.toml
```

**Estrutura criada:**
```
10xdev/
├── supabase/
│   ├── config.toml          # Configuração do projeto
│   ├── seed.sql             # Dados iniciais (seeds)
│   └── migrations/          # Histórico de mudanças no schema
├── frontend/
├── backend/
└── mcp-supabase.md          # Este arquivo
```

---

### 📝 Passo 2: Iniciar Supabase Localmente

```bash
# Ainda em 10xdev/
supabase start

# O que isso faz:
# ✅ Baixa containers Docker (na primeira vez)
# ✅ Inicia PostgreSQL local
# ✅ Inicia Supabase Studio (UI web)
# ✅ Inicia MCP Server local (http://localhost:54321/mcp)
# ⏱️  Primeira vez: ~2-5 minutos (download de imagens)
# ⏱️  Próximas vezes: ~30 segundos
```

**Quando terminar, você verá:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGci...
service_role key: eyJhbGci...
```

**⚠️ IMPORTANTE: Guarde essas informações!** Vamos usar depois.

---

### 📝 Passo 3: Verificar Supabase Studio

1. Abra o browser em: http://localhost:54323
2. Você verá a interface do Supabase
3. Navegue até **Table Editor** → Deve estar vazio (projeto novo)
4. Navegue até **SQL Editor** → Consegue executar queries

**Se tudo apareceu corretamente: ✅ Supabase Local está rodando!**

---

### 📝 Passo 4: Instalar Cline no VS Code

```bash
# 1. Abrir VS Code
code .

# 2. No VS Code:
# Extensions (Ctrl+Shift+X) → Buscar "Cline"
# → Instalar "Cline" (by Cline)
```

**Ou via linha de comando:**
```bash
code --install-extension saoudrizwan.claude-dev
```

**Você verá:**
- Ícone do Cline na sidebar esquerda (robozinho)
- Ao clicar, abre painel de chat

---

### 📝 Passo 5: Configurar API Key do Claude (Cline)

> **Por que?** Cline usa a API do Claude (Anthropic) para processar suas mensagens.

#### Opção A: Usar API Key própria (Recomendado)

1. Acesse: https://console.anthropic.com/
2. Login/Cadastro
3. Settings → API Keys → Create Key
4. Copie a key (começa com `sk-ant-...`)

**No VS Code (Cline):**
1. Clique no ícone do Cline
2. Settings (ícone de engrenagem)
3. Cole a API Key
4. Escolha modelo: `claude-sonnet-4` (recomendado)

#### Opção B: Usar através do OpenRouter (alternativa)

Se preferir usar OpenRouter, posso te guiar depois.

---

### 📝 Passo 6: Configurar MCP no Cline

**Localização do arquivo de config:**
```
Windows:
C:\Users\samuel\AppData\Roaming\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json

Mac/Linux:
~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

**Criar/Editar o arquivo:**

```json
{
  "mcpServers": {
    "supabase-local": {
      "type": "http",
      "url": "http://localhost:54321/mcp"
    }
  }
}
```

**O que cada parte significa:**

| Campo | Valor | Explicação |
|-------|-------|------------|
| `supabase-local` | Nome do servidor | Identificador (pode ser qualquer nome) |
| `type` | `http` | Protocolo de comunicação (HTTP Streamable) |
| `url` | `http://localhost:54321/mcp` | Endpoint do MCP Server local |

---

### 📝 Passo 7: Verificar Conexão do MCP

**No VS Code:**

1. Recarregue a janela: `Ctrl+Shift+P` → "Developer: Reload Window"
2. Abra o Cline (sidebar)
3. No chat, clique no ícone de 🔨 (tools/MCPs)
4. Você deve ver: `supabase-local` com ✅ verde

**Se ver ❌ vermelho:**
- Verifique se `supabase start` está rodando
- Teste no browser: http://localhost:54321/mcp (deve retornar algo)
- Veja logs do Cline: `Ctrl+Shift+P` → "Cline: Show Logs"

---

## 5. Parte 2: Testando o MCP Local

### 🧪 Teste 1: Listar Tabelas

**No Cline, digite:**
```
Liste todas as tabelas do meu banco de dados local
```

**O que deve acontecer:**
1. Cline identifica que precisa do MCP
2. Chama tool: `list_tables`
3. Retorna: "Não há tabelas ainda" (projeto novo)

**Se funcionou: ✅ MCP está conectado!**

---

### 🧪 Teste 2: Criar uma Tabela de Exemplo

**No Cline, digite:**
```
Crie uma tabela de exemplo chamada "tasks" com:
- id (uuid, primary key, default gen_random_uuid())
- title (text, not null)
- completed (boolean, default false)
- created_at (timestamp, default now())
```

**O que deve acontecer:**
1. Cline gera o SQL:
   ```sql
   CREATE TABLE tasks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title TEXT NOT NULL,
     completed BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```
2. Pede sua aprovação (se Cline estiver configurado para isso)
3. Executa via `apply_migration`
4. Retorna sucesso

**Verificar:**
- Abra Supabase Studio: http://localhost:54323
- Table Editor → Deve ver tabela `tasks`
- Ou no Cline: "Liste as tabelas novamente"

---

### 🧪 Teste 3: Inserir Dados

**No Cline:**
```
Insira 3 tarefas de exemplo na tabela tasks
```

**O que acontece:**
1. Cline gera INSERT
2. Executa via `execute_sql`
3. Retorna confirmação

**Verificar:**
```
Mostre todas as tasks
```

Deve retornar as 3 tarefas criadas.

---

### 🧪 Teste 4: Buscar na Documentação

**No Cline:**
```
Como faço Row Level Security (RLS) no Supabase?
```

**O que acontece:**
1. Cline chama `search_docs`
2. Busca na documentação oficial
3. Retorna resposta atualizada

**Isso é incrível porque:**
- ✅ Sempre atualizado (busca em tempo real)
- ✅ Exemplos práticos direto da docs
- ✅ Não depende do conhecimento de corte da AI

---

## 6. Parte 3: Setup Remoto (Projeto Real - Opcional)

> **⚠️ ATENÇÃO**: Só faça isso quando estiver confortável com o MCP. Sempre use `read_only=true` inicialmente!

### 📝 Passo 1: Obter Credenciais do Projeto

1. Acesse: https://supabase.com/dashboard
2. Escolha seu projeto
3. Settings → General → copie **Project Reference ID**
   - Exemplo: `abc123xyz`

---

### 📝 Passo 2: Gerar URL do MCP

**Template:**
```
https://mcp.supabase.com/mcp?project_ref=<SEU_PROJECT_REF>&read_only=true&features=database,docs,debugging
```

**Exemplo real:**
```
https://mcp.supabase.com/mcp?project_ref=abc123xyz&read_only=true&features=database,docs,debugging
```

**Parâmetros:**
- `project_ref`: ID do seu projeto
- `read_only=true`: **CRÍTICO** - apenas leitura
- `features`: tools habilitados

---

### 📝 Passo 3: Adicionar no Cline

**Editar `cline_mcp_settings.json`:**

```json
{
  "mcpServers": {
    "supabase-local": {
      "type": "http",
      "url": "http://localhost:54321/mcp"
    },
    "supabase-remote": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=SEU_PROJECT_REF&read_only=true&features=database,docs,debugging"
    }
  }
}
```

---

### 📝 Passo 4: Autenticar via OAuth

1. Reload VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"
2. Cline vai detectar novo MCP
3. Pedirá para fazer login → **Clique em "Authorize"**
4. Browser abre → Login no Supabase
5. Escolha a **organização correta**
6. Autorize o acesso
7. Volta pro VS Code → ✅ verde em `supabase-remote`

---

### 📝 Passo 5: Testar (Read-Only)

**No Cline:**
```
[Especifique usar supabase-remote]
Liste as tabelas do projeto de produção
```

**Deve retornar suas tabelas reais.**

**Tente modificar (deve falhar):**
```
Crie uma tabela test
```

**Deve retornar erro:** "Read-only mode enabled"

✅ **Perfeito! Seu projeto está protegido.**

---

## 7. Parte 4: Usando o MCP na Prática

### 💼 Caso de Uso 1: Criar Schema Completo

**Prompt:**
```
Crie um schema para um sistema de blog com:
- users (id, email, name, created_at)
- posts (id, user_id FK users, title, content, published, created_at)
- comments (id, post_id FK posts, user_id FK users, content, created_at)

Com RLS habilitado.
```

**O que Cline faz:**
1. Gera migrations para cada tabela
2. Adiciona foreign keys
3. Cria policies de RLS
4. Executa tudo em ordem

---

### 💼 Caso de Uso 2: Gerar TypeScript Types

**Prompt:**
```
Gere types TypeScript do meu schema atual
```

**Cline:**
1. Chama `generate_typescript_types`
2. Cria arquivo `types/supabase.ts`
3. Você usa no frontend:
   ```typescript
   import { Database } from '@/types/supabase'
   type Task = Database['public']['Tables']['tasks']['Row']
   ```

---

### 💼 Caso de Uso 3: Debugging com Logs

**Prompt:**
```
Mostre logs de erro do postgres da última hora
```

**Cline:**
1. Chama `get_logs(service: "postgres", level: "error")`
2. Retorna stack traces
3. Você identifica o problema rapidamente

---

### 💼 Caso de Uso 4: Análise de Performance

**Prompt:**
```
Analise quais queries estão mais lentas no meu banco
```

**Cline:**
1. Checa advisors via `get_advisors`
2. Busca slow queries
3. Sugere índices

---

## 8. Troubleshooting

### ❌ "MCP server not connected"

**Causa:** MCP Server não está rodando

**Fix:**
```bash
# Se local:
supabase status  # Verifica se está rodando
supabase start   # Se não estiver

# Se remoto:
# Verifique a URL no browser (deve retornar algo)
```

---

### ❌ "Unauthorized" no remote

**Causa:** OAuth não completou

**Fix:**
1. Cline → Settings → MCP Servers → Remove `supabase-remote`
2. Adicione novamente
3. Refaça OAuth

---

### ❌ "Read-only mode" (quando não deveria)

**Causa:** URL tem `read_only=true`

**Fix:**
```json
// Remova o parâmetro (⚠️ USE COM CUIDADO)
"url": "https://mcp.supabase.com/mcp?project_ref=abc123&features=database"
```

---

### ❌ Supabase não inicia (porta ocupada)

**Causa:** Porta 54321 já em uso

**Fix:**
```bash
# Windows
netstat -ano | findstr :54321
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:54321 | xargs kill -9
```

---

## 9. Boas Práticas e Segurança

### 🔒 Regras de Ouro

1. **SEMPRE use `read_only=true` em produção**
   - Só remova se REALMENTE precisar escrever
   - Nesse caso, use project scoping

2. **Nunca compartilhe credenciais**
   - Service role key é como senha root
   - MCP OAuth é mais seguro

3. **Use local para experimentar**
   - Teste schemas novos em local primeiro
   - Só migre para remote quando validar

4. **Revise antes de aprovar**
   - Cline mostra o que vai executar
   - Leia o SQL antes de confirmar

5. **Backups**
   - Sempre tenha backup antes de mudanças grandes
   - Use branching (planos pagos)

---

### 🎯 Features por Ambiente

| Feature | Local | Remote (read-only) | Remote (write) |
|---------|-------|-------------------|----------------|
| Ler dados | ✅ | ✅ | ✅ |
| Criar tabelas | ✅ | ❌ | ✅ |
| Inserir dados | ✅ | ❌ | ✅ |
| Gerar types | ✅ | ✅ | ✅ |
| Ver logs | ❌ | ✅ | ✅ |
| Advisors | ❌ | ✅ | ✅ |
| Branching | ❌ | ❌ | ✅ (paid) |

---

## 🎉 Próximos Passos

Agora que você configurou tudo:

1. **Pratique com local:**
   - Crie schemas de teste
   - Experimente queries
   - Teste RLS

2. **Explore docs via MCP:**
   - "Como fazer X no Supabase?"
   - AI busca e explica

3. **Integre com seu projeto:**
   - Gere types do seu schema
   - Crie migrations via chat
   - Analise performance

4. **Quando confortável:**
   - Adicione remote (read-only)
   - Use para análise de produção

---

## 📚 Recursos Adicionais

- [Docs MCP Supabase](https://supabase.com/docs/guides/getting-started/mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Cline GitHub](https://github.com/cline/cline)

---

**Pronto para começar? Vamos implementar juntos! 🚀**
