# 🔐 Sistema de Autenticação 10xDev

Sistema completo de autenticação implementado com Supabase, seguindo o padrão do **alavanca-dash**.

## 📋 Características

- ✅ **Backend completo** com SupabaseAuthAdapter (JWT customizado + UUID mapping)
- ✅ **Frontend completo** com AuthContext, ProtectedRoute, e páginas de login/registro
- ✅ **Design idêntico** ao alavanca-dash (split-screen com gradiente azul)
- ✅ **Proteção de rotas** com middleware e role-based access control
- ✅ **Logout robusto** com JWT denylist
- ✅ **Sessão persistente** com localStorage + cookies

---

## 🚀 Setup Passo a Passo

### 1️⃣ Configurar Supabase

1. Acesse seu projeto no [Supabase](https://supabase.com)
2. Vá em **SQL Editor**
3. Cole e execute o script: `supabase/migrations/001_create_auth_tables.sql`
4. Verifique se as tabelas foram criadas:
   - `user_id_mapping`
   - `jwt_denylist`

### 2️⃣ Configurar Variáveis de Ambiente

#### Backend (.env)

Crie `backend/.env` baseado em `backend/.env.example`:

```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_ANON_KEY=sua-anon-key

# JWT
JWT_SECRET=gere-uma-chave-secreta-forte-aqui

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000
```

**Como obter as chaves do Supabase:**
1. Acesse seu projeto no Supabase
2. Vá em **Settings** → **API**
3. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Mantenha seguro!)

**Gerar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Frontend (.env.local)

Crie `frontend/.env.local` baseado em `frontend/.env.local.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key

# API
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3️⃣ Instalar Dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4️⃣ Iniciar os Servidores

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

Deve mostrar:
```
🚀 Servidor iniciado com sucesso!
📊 Informações:
   • Porta: 3001
   • Ambiente: development
   • URL: http://localhost:3001
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Deve mostrar:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## 🎨 Páginas Implementadas

### 📄 Login (`/login`)
- Split-screen design com gradiente azul
- Email + Password
- Link para registro
- Validações client-side

### 📄 Registro (`/registrar`)
- Mesmo design do login
- Campos: Nome, Email, Senha, Confirmar Senha
- Validações completas
- Link para login

### 📄 Dashboard (`/dashboard`)
- Protegida com ProtectedRoute
- Redirecionamento automático se não autenticado
- Sidebar com informações do usuário
- Dropdown com perfil e logout

### 📄 Root (`/`)
- Redirecionamento inteligente:
  - Autenticado → `/dashboard`
  - Não autenticado → `/login`

---

## 🔧 Fluxo de Autenticação

### Registro
1. Usuário preenche formulário em `/registrar`
2. Frontend → `POST /api/auth/registrations`
3. Backend cria usuário no Supabase
4. Adapter gera JWT customizado + mapeia UUID → BIGINT
5. Frontend armazena token (localStorage + cookie)
6. Redirecionamento para `/dashboard`

### Login
1. Usuário preenche formulário em `/login`
2. Frontend → `POST /api/auth/sessions`
3. Backend valida credenciais com Supabase
4. Adapter gera JWT customizado
5. Frontend armazena token
6. Redirecionamento para `/dashboard`

### Logout
1. Usuário clica em "Sair" no dropdown
2. Frontend → `DELETE /api/auth/sessions`
3. Backend adiciona JTI do token ao denylist
4. Frontend limpa localStorage + cookies
5. Redirecionamento para `/login`

### Proteção de Rotas
1. ProtectedRoute verifica `isAuthenticated`
2. Se não autenticado → redirect `/login`
3. Se autenticado mas sem role → mostra AccessDenied
4. Se tudo ok → renderiza children

---

## 🗄️ Estrutura de Arquivos

```
10xdev/
├── backend/
│   ├── src/
│   │   ├── adapters/
│   │   │   └── SupabaseAuthAdapter.ts      # Adapter completo
│   │   ├── config/
│   │   │   └── supabase.ts                 # Cliente Supabase
│   │   ├── controllers/
│   │   │   └── AuthController.ts           # Métodos de auth
│   │   ├── middleware/
│   │   │   └── supabaseMiddleware.ts       # Validação JWT
│   │   └── routes/
│   │       └── authRoutes.ts               # Rotas /auth/*
│   └── .env
│
├── frontend/
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx                    # Página de login
│   │   ├── registrar/
│   │   │   └── page.tsx                    # Página de registro
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                  # Com ProtectedRoute
│   │   │   └── page.tsx                    # Dashboard
│   │   ├── layout.tsx                      # Com AuthProvider
│   │   └── page.tsx                        # Redirecionamento
│   ├── components/
│   │   ├── ProtectedRoute.tsx              # HOC de proteção
│   │   ├── LoadingPage.tsx                 # Loading state
│   │   ├── AccessDeniedCard.tsx            # Erro 403
│   │   ├── AppSidebar.tsx                  # Com user info
│   │   └── ui/
│   │       └── password-input.tsx          # Input com toggle
│   ├── hooks/
│   │   └── useAuth.tsx                     # Context + Hook
│   ├── services/
│   │   ├── api.ts                          # Config API
│   │   └── auth.ts                         # AuthService
│   ├── types/
│   │   └── auth.ts                         # TypeScript types
│   └── .env.local
│
└── supabase/
    └── migrations/
        └── 001_create_auth_tables.sql      # Setup DB
```

---

## 🧪 Testando o Sistema

### Teste Manual

1. **Acesse** `http://localhost:3000`
   - ✅ Deve redirecionar para `/login`

2. **Clique** em "Crie sua conta"
   - ✅ Deve ir para `/registrar`

3. **Registre** um usuário:
   ```
   Nome: João Developer
   Email: joao@10xdev.com
   Senha: 123456
   ```
   - ✅ Deve criar conta e redirecionar para `/dashboard`

4. **Verifique** o sidebar:
   - ✅ Deve mostrar nome e email do usuário
   - ✅ Avatar com iniciais "JO"

5. **Clique** no dropdown do usuário:
   - ✅ Deve mostrar "Perfil" e "Sair"

6. **Clique** em "Sair":
   - ✅ Deve fazer logout e redirecionar para `/login`

7. **Tente acessar** `http://localhost:3000/dashboard` sem login:
   - ✅ Deve redirecionar para `/login`

8. **Faça login** novamente:
   - ✅ Deve funcionar e manter sessão

9. **Recarregue** a página:
   - ✅ Deve manter usuário logado

### Teste de API (Postman/Thunder Client)

#### 1. Registro
```http
POST http://localhost:3001/api/auth/registrations
Content-Type: application/json

{
  "name": "Maria Silva",
  "email": "maria@10xdev.com",
  "password": "senha123"
}
```

Resposta esperada:
```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": 1,
    "email": "maria@10xdev.com",
    "name": "Maria Silva",
    "role": "user",
    "created_at": "..."
  },
  "token": "eyJhbGc..."
}
```

#### 2. Login
```http
POST http://localhost:3001/api/auth/sessions
Content-Type: application/json

{
  "email": "maria@10xdev.com",
  "password": "senha123"
}
```

#### 3. Perfil (com token)
```http
GET http://localhost:3001/api/auth/members
Authorization: Bearer eyJhbGc...
```

#### 4. Logout
```http
DELETE http://localhost:3001/api/auth/sessions
Authorization: Bearer eyJhbGc...
```

---

## 🎨 Customizações de Design

### Cores Aplicadas

Substituímos o roxo/índigo do Alavanca por azul:

```css
/* Gradiente do painel esquerdo */
from-blue-600 via-cyan-600 to-blue-800

/* Botões primários */
bg-blue-600 hover:bg-blue-700

/* Avatar/Logo */
bg-blue-600

/* Focus rings */
focus:ring-blue-500
```

### Textos Adaptados

#### Login:
- **Título**: "10xDev"
- **Descrição**: "Plataforma completa de desenvolvimento..."
- **Features**:
  - Conteúdos práticos e direto ao ponto
  - Projetos reais para seu portfólio
  - Comunidade de desenvolvedores 10x

#### Registro:
- **Título**: "10xDev"
- **Descrição**: "Junte-se à revolução no desenvolvimento de software..."
- **Features**:
  - Interface intuitiva e moderna
  - Segurança e confiabilidade
  - Aumente suas habilidades e produtividade

---

## 🔒 Segurança

### Implementado
- ✅ Tokens JWT com expiração (24h)
- ✅ JWT Denylist para logout imediato
- ✅ Password hashing (Supabase)
- ✅ CORS configurado
- ✅ Rate limiting no backend
- ✅ Input sanitization
- ✅ XSS protection (React escaping)
- ✅ HTTPS recomendado para produção

### Recomendações Adicionais
- [ ] Implementar refresh tokens
- [ ] Adicionar 2FA (Two-Factor Authentication)
- [ ] Rate limiting no login (proteção contra brute force)
- [ ] Email verification obrigatória
- [ ] Password reset flow
- [ ] Audit logging de ações sensíveis

---

## 🐛 Troubleshooting

### Erro: "Token de acesso requerido"
**Causa**: Token não está sendo enviado ou é inválido
**Solução**:
1. Verifique localStorage: `localStorage.getItem('auth_token')`
2. Faça login novamente
3. Limpe cookies e tente novamente

### Erro: "Missing Supabase environment variables"
**Causa**: `.env` não configurado
**Solução**:
1. Copie `.env.example` para `.env`
2. Preencha as variáveis com dados do seu projeto Supabase

### Erro: Redirect loop entre `/` e `/login`
**Causa**: AuthContext não está inicializando corretamente
**Solução**:
1. Verifique se `AuthProvider` está no `layout.tsx`
2. Limpe localStorage: `localStorage.clear()`
3. Recarregue a página

### Backend não conecta ao Supabase
**Causa**: Chaves incorretas ou projeto pausado
**Solução**:
1. Verifique se o projeto Supabase está ativo
2. Confirme as chaves em Settings → API
3. Teste a conexão: `curl SUPABASE_URL/rest/v1/`

### Tabelas não foram criadas
**Causa**: Migration SQL não executada
**Solução**:
1. Acesse SQL Editor no Supabase
2. Execute `supabase/migrations/001_create_auth_tables.sql`
3. Verifique em Table Editor se as tabelas existem

---

## 📚 Próximos Passos

### Features Sugeridas
- [ ] Password reset (esqueci minha senha)
- [ ] Email verification
- [ ] OAuth (Google, GitHub)
- [ ] Profile editing page
- [ ] Admin dashboard
- [ ] User management (admin)
- [ ] Activity logs
- [ ] Session management (multiple devices)

### Melhorias de UX
- [ ] Animações na transição de páginas
- [ ] Toast notifications
- [ ] Loading skeletons
- [ ] Dark mode support
- [ ] Internacionalização (i18n)

---

## 🎯 Checklist de Deploy

Antes de fazer deploy em produção:

- [ ] Trocar `JWT_SECRET` por um valor forte e único
- [ ] Configurar HTTPS
- [ ] Atualizar `FRONTEND_URL` no backend
- [ ] Atualizar `NEXT_PUBLIC_API_URL` no frontend
- [ ] Habilitar RLS (Row Level Security) no Supabase
- [ ] Configurar backup do banco de dados
- [ ] Setup de logs (Sentry, LogRocket, etc)
- [ ] Configurar cron job para limpeza de tokens expirados:
  ```sql
  SELECT cron.schedule(
    'cleanup-expired-tokens',
    '0 0 * * *', -- Diariamente à meia-noite
    $$ SELECT cleanup_expired_jwt_tokens(); $$
  );
  ```

---

## 📞 Suporte

Caso encontre problemas:

1. Verifique os logs do backend e frontend
2. Teste os endpoints da API com Postman
3. Valide as variáveis de ambiente
4. Consulte a documentação do Supabase

---

**Sistema implementado com sucesso! 🚀**

Todas as funcionalidades da issue #42 do alavanca-dash foram implementadas e adaptadas para o 10xDev.
