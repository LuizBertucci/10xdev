# Workflow para Inicialização de Projeto do Zero

Este documento contém o workflow completo e testado para inicializar um novo projeto Alavanca Dash a partir do zero, evitando problemas comuns como submódulos Git indesejados.

## Pré-requisitos

- Node.js instalado
- Git instalado
- Conta no GitHub
- Terminal/Prompt de comando

## Processo de Inicialização

### Passo 1: Preparação do Ambiente

1. Crie uma pasta para o seu novo projeto (ex: `alavanca-dash-novo`)
2. Abra essa pasta no seu editor de código (VS Code, Cursor, etc.)
3. Abra o terminal dentro dessa pasta

### Passo 2: Execução do Script de Configuração Local

Copie e cole o script completo abaixo no seu terminal e pressione Enter:

```bash
# --- 1. Inicialização do Git ---
git init
git branch -M main

# --- 2. Criação e Configuração do Frontend ---
npx create-next-app@latest frontend
rd /s /q frontend\.git
cd frontend
npm install
npx shadcn-ui@latest init
npm install lucide-react dotenv
npx shadcn-ui@latest add sidebar-01
cd ..

# --- 3. Criação e Configuração do Backend ---
mkdir backend
cd backend
npm init -y
npm install express cors dotenv @supabase/supabase-js
mkdir -p src/routes src/controllers src/models
cd ..

# --- 4. Criação do .gitignore ---
echo # Dependencias e Modulos > .gitignore
echo /node_modules >> .gitignore
echo /frontend/node_modules >> .gitignore
echo /backend/node_modules >> .gitignore
echo. >> .gitignore
echo # Arquivos de Build e Cache do Next.js >> .gitignore
echo /frontend/.next/ >> .gitignore
echo /frontend/out/ >> .gitignore
echo. >> .gitignore
echo # Arquivos de Ambiente >> .gitignore
echo .env >> .gitignore
echo .env* >> .gitignore
echo !.env.example >> .gitignore
echo. >> .gitignore
echo # Logs >> .gitignore
echo npm-debug.log* >> .gitignore
echo yarn-debug.log* >> .gitignore
echo yarn-error.log* >> .gitignore
echo. >> .gitignore
echo # Arquivos de Sistema e IDE >> .gitignore
echo .DS_Store >> .gitignore
echo Thumbs.db >> .gitignore
echo .vscode/ >> .gitignore
echo .idea/ >> .gitignore

# --- 5. Primeiro Commit Local ---
git add .
git commit -m "feat: setup inicial do monorepo com Next.js e Express"

# --- Fim do Script ---
echo "Configuração local concluída com sucesso!"
echo "O próximo passo é conectar ao seu repositório no GitHub."
```

### Passo 3: Interações Durante a Execução

Durante a execução do script, você será solicitado a responder algumas perguntas:

#### Para o Next.js (`create-next-app`):
- **TypeScript?** → Sim (recomendado)
- **ESLint?** → Sim
- **Tailwind CSS?** → Sim
- **`src/` directory?** → Sim
- **App Router?** → Sim
- **Import alias?** → Sim (mantenha o padrão `@/*`)

#### Para o Shadcn UI (`shadcn-ui init`):
- **Style?** → Default
- **Base color?** → Slate (ou sua preferência)
- **CSS variables?** → Sim

### Passo 4: Conexão com o GitHub (Manual)

Após o script terminar com sucesso:

1. **Vá para o GitHub** (https://github.com)
2. **Crie um novo repositório:**
   - Clique em "New repository"
   - Dê um nome ao repositório
   - **NÃO** adicione README, .gitignore ou licença (já criamos tudo)
   - Clique em "Create repository"
3. **Copie a URL do repositório** (será algo como `https://github.com/seu-usuario/seu-repo.git`)
4. **No seu terminal, execute os comandos abaixo** (substituindo pela sua URL):

```bash
# Conecta ao repositório remoto
git remote add origin https://github.com/seu-usuario/seu-repo.git

# Envia o código para o GitHub
git push -u origin main
```
