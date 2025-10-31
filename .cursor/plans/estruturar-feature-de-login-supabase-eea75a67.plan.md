<!-- eea75a67-1ddc-4f1d-a165-6e619d6b29e8 e87561c0-740c-48a5-b38b-cd4110c0cc81 -->
# Estruturar Feature de Login Supabase

Estruturar a autenticação completa no estilo do código de referência, organizando backend e frontend com Supabase Auth.

## Backend (TypeScript)

### 1. Atualizar Cliente Supabase Backend

- **Arquivo**: `backend/src/database/supabase.ts`
- Separar cliente admin (SERVICE_ROLE_KEY) do cliente atual (ANON_KEY)
- Criar `supabaseAdmin` export para operações de autenticação
- Manter `supabase` atual para queries regulares

### 2. Criar Middleware de Autenticação

- **Arquivo**: `backend/src/middleware/supabaseMiddleware.ts`
- Validar JWT usando `supabase.auth.getUser()`
- Buscar role e team_id da tabela `users`
- Criar perfil padrão se usuário não existir na tabela
- Anexar `req.user` com id, email, role, team_id
- Adicionar ao index de middleware

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
- Exportar cliente Supabase
- Exportar função `loadUserRole` para buscar role do usuário
- Definir types: `User`, `RegisterData`, `LoginData`

### 8. Criar Hook de Autenticação

- **Arquivo**: `frontend/hooks/useAuth.tsx`
- Criar `AuthContext` e `AuthProvider`
- Estado: `user`, `isLoading`, `isAuthenticated`
- Métodos: `login`, `register`, `logout`, `updateProfile`, `signOut`
- Inicializar sessão ao montar componente
- Hooks auxiliares: `useAuthGuard`, `useGuestGuard`
- Usar `loadUserRole` após login/registro

### 9. Criar Componente ProtectedRoute

- **Arquivo**: `frontend/components/ProtectedRoute.tsx`
- Validar autenticação antes de renderizar children
- Suportar `requireRole` prop ('admin' | 'user' | 'any')
- Mostrar loading durante verificação
- Redirecionar para login se não autenticado
- Mostrar erro de acesso negado se role insuficiente

### 10. Integrar AuthProvider no Layout

- **Arquivo**: `frontend/app/layout.tsx`
- Envolver children com `AuthProvider`
- Garantir que funciona em client components

### 11. Criar README de Setup (Opcional)

- **Arquivo**: `README-AUTH.md` ou atualizar README.md principal
- Documentar dependências
- Variáveis de ambiente necessárias
- Passos de configuração no Supabase Dashboard
- Estrutura da tabela `users`

## Notas Importantes

- Backend usa TypeScript (diferente da referência que usa JS)
- Frontend precisa instalar dependências Supabase
- Variável de ambiente `SUPABASE_SERVICE_ROLE_KEY` precisa ser adicionada
- Tabela `users` deve existir no Supabase com campos: id (UUID), email, name, role, team_id, status
- Middleware cria perfil padrão automaticamente se usuário não existir