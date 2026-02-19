<!-- eea75a67-1ddc-4f1d-a165-6e619d6b29e8 e87561c0-740c-48a5-b38b-cd4110c0cc81 -->
# Estruturar Feature de Login com Supabase

Estruturar a autenticação completa no estilo do código de referência, organizando backend e frontend com Supabase Auth.

## Backend (TypeScript)

### 1. Atualizar Cliente Supabase Backend

- **Arquivo**: `backend/src/database/supabase.ts`
- Separar cliente admin (SERVICE_ROLE_KEY) do cliente atual (ANON_KEY)
- Criar `supabaseAdmin` export para operações de autenticação
- Manter `supabase` atual para queries regulares

### 2. Criar Middleware de Autenticação

- **Arquivo**: `backend/src/middleware/supabaseMiddleware.ts`
- Validar JWT usando `supabaseAdmin.auth.getUser()` (SERVICE_ROLE_KEY para bypass RLS)
- Verificar se usuário existe na tabela `users`
- Criar perfil padrão se usuário não existir:
- Campos obrigatórios: `id`, `email` (lowercase)
- Campos opcionais: `name` (de user_metadata.name ou email split), `status: 'active'`
- Anexar `req.user` com: `id`, `email`, `name` (se disponível)
- **Nota**: Tabela users tem estrutura simplificada (sem `manager_id`, `first_name`, `last_name`)
- Adicionar ao `middleware/index.ts`

### 3. Criar Controller de Autenticação

- **Arquivo**: `backend/src/controllers/SupabaseController.ts`
- Métodos: `register`, `login`, `logout`, `showProfile`, `updateProfile`, `deleteAccount`
- Usar `supabaseAdmin` para operações de admin
- Não gerar tokens custom (frontend usa tokens do Supabase)
- Tratamento de erros adequado

### 4. Criar Rotas de Autenticação

- **Arquivo**: `backend/src/routes/authRoutes.ts`
- Rotas: POST /api/auth/register, POST /api/auth/login, DELETE /api/auth/logout
- GET /api/auth/profile (protegida), PUT /api/auth/profile (protegida), DELETE /api/auth/profile (protegida)
- Aplicar `supabaseMiddleware` nas rotas protegidas
- Adicionar ao `routes/index.ts`

## Frontend (TypeScript)

### 5. Instalar Dependências Frontend

- Adicionar `@supabase/supabase-js` e `@supabase/ssr` ao package.json do frontend

### 6. Criar Cliente Supabase Frontend

- **Arquivo**: `frontend/lib/supabase.ts`
- Usar `createBrowserClient` do `@supabase/ssr`
- Implementar singleton pattern (cachear instância)
- Validar variáveis de ambiente (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

### 7. Criar Serviço de Autenticação

- **Arquivo**: `frontend/services/auth.ts`
- Exportar cliente Supabase usando singleton
- Definir types: `User` (id, email, name?), `RegisterData` (name, email, password), `LoginData` (email, password)
- **Nota**: Não há mais `role` na tabela users

### 8. Criar Hook de Autenticação

- **Arquivo**: `frontend/hooks/useAuth.tsx`
- Criar `AuthContext` e `AuthProvider` (client component)
- Estado: `user` (id, email, name?), `isLoading`, `isAuthenticated`
- Métodos: `login`, `register`, `logout`, `updateProfile`, `signOut`
- Inicializar sessão ao montar usando `supabase.auth.getSession()`
- Exportar `useAuth()` hook para acessar contexto
- **Nota**: Não criar hooks auxiliares (useAuthGuard/useGuestGuard) - usar apenas ProtectedRoute

### 9. Criar Componente ProtectedRoute

- **Arquivo**: `frontend/components/ProtectedRoute.tsx`
- Validar autenticação antes de renderizar children
- Mostrar loading durante verificação (`isLoading`)
- Redirecionar para `/login` se não autenticado (com query param `redirect` para voltar após login)
- Não precisa de verificação de `role` (remover `requireRole` prop, já que não existe mais role)

### 10. Criar Páginas de Login e Registro

- **Arquivo Login**: `frontend/app/login/page.tsx` ou `frontend/pages/Login.tsx`
- **Arquivo Registro**: `frontend/app/register/page.tsx` ou `frontend/pages/Register.tsx`
- Estilo moderno usando componentes shadcn/ui (Card, Button, Input, Label, Form)
- **Página de Login**:
- Formulário com campos: email, password
- Botão "Entrar" que chama `login()` do `useAuth()`
- Link para página de registro ("Não tem conta? Registre-se")
- Tratamento de erros com toast/alert
- Se já autenticado, redirecionar para `/dashboard` ou query param `redirect`
- Loading state durante autenticação
- **Página de Registro**:
- Formulário com campos: name, email, password, confirmPassword
- Validação de senha (match e mínimo 6 caracteres)
- Botão "Registrar" que chama `register()` do `useAuth()`
- Link para página de login ("Já tem conta? Faça login")
- Tratamento de erros com toast/alert
- Loading state durante registro
- Após registro bem-sucedido, redirecionar para `/dashboard`
- **Design**: Layout centralizado, cards estilizados, gradientes sutis (seguir padrão visual do projeto)
- **Validação**: Validação básica de campos obrigatórios (não precisa de react-hook-form + zod inicialmente)
- Usar `useAuth()` hook para acessar métodos de autenticação

### 11. Integrar AuthProvider no Layout

- **Arquivo**: `frontend/app/layout.tsx`
- Envolver children com `AuthProvider`
- Garantir que funciona em client components

### 12. Adaptar Configuração Docker

- **Arquivo**: `docker-compose.yml`
- Adicionar variáveis de ambiente do Supabase no serviço `frontend`:
- `NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}`
- **Nota**: Backend já tem todas as variáveis necessárias configuradas ✅

- **Arquivo**: `frontend/Dockerfile`
- No stage `builder` (linha ~32-34), adicionar ARG e ENV para variáveis Supabase:
- `ARG NEXT_PUBLIC_SUPABASE_URL`
- `ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL`
- `ARG NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Nota**: Backend Dockerfile não precisa mudanças (variáveis já vêm via docker-compose)

## Notas Importantes

- **Backend usa TypeScript** (diferente da referência que usa JS)
- **Frontend precisa instalar dependências**: `@supabase/supabase-js` e `@supabase/ssr`
- **Variável de ambiente**: `SUPABASE_SERVICE_ROLE_KEY` precisa ser adicionada ao backend
- **Projeto Supabase**: `xgpzbolfhgjhrydtcvug` (Projeto 10xdev)
- **URL**: `https://xgpzbolfhgjhrydtcvug.supabase.co`
- **Tabela `users` estrutura** (baseada em análise MCP):
- Obrigatórios: `id` (UUID, FK para auth.users.id), `email` (text, unique)
- Opcionais: `name`, `avatar_url`, `status` (default 'active'), `bio`, `celular`, `created_at`, `updated_at`, `joined_at`, `invited_by`
- **RLS habilitado**: políticas permitem usuários ver/atualizar apenas seu próprio perfil
- **Middleware**: cria perfil padrão automaticamente se usuário não existir na tabela (usando supabaseAdmin para bypass RLS)