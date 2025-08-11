# 🚀 Guia de Configuração - Sistema JWT 10xdev

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- Conta no Supabase (gratuita)
- Git
- Editor de código (VS Code recomendado)

---

## 🏗️ **PASSO 1: Configurar Supabase**

### 1.1 Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Clique em "Start your project"
3. Faça login/cadastro
4. Clique em "New Project"
5. Configure:
   - **Name:** `10xdev-authenticator`
   - **Database Password:** Escolha uma senha forte
   - **Region:** South America (São Paulo) - sa-east-1
6. Clique em "Create new project"
7. Aguarde 2-3 minutos para o projeto ficar pronto

### 1.2 Obter Credenciais
1. No painel do Supabase, vá em **Settings** > **API**
2. Anote as informações:
   ```
   Project URL: https://[seu-projeto].supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 1.3 Executar Migrações SQL
1. No painel do Supabase, vá em **SQL Editor**
2. Clique em "New Query"
3. Copie e cole o conteúdo do arquivo:
   ```
   backend/migrations/001_create_users_and_jwt_tables.sql
   ```
4. Clique em "RUN" para executar
5. Verifique se apareceu "Success" ✅

---

## 🔧 **PASSO 2: Configurar Backend**

### 2.1 Configurar Variáveis de Ambiente
1. No diretório `backend/`, edite o arquivo `.env`:
   ```env
   # Supabase Configuration (substitua pelos seus valores reais)
   SUPABASE_URL=https://[seu-projeto].supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # JWT Configuration
   JWT_SECRET=10xdev-super-secret-jwt-key-for-authentication-system-2025
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d

   # Server Configuration
   PORT=8080
   NODE_ENV=development

   # CORS Configuration
   FRONTEND_URL=http://localhost:3000
   ```

### 2.2 Instalar Dependências
```bash
cd backend
npm install
```

### 2.3 Iniciar Backend
```bash
npm run dev
```

**Você deve ver:**
```
🚀 Supabase client configured successfully
📍 Database URL: https://[seu-projeto].supabase.co
✅ Database connection successful
✅ Admin user already exists
🚀 Server running on port 8080
```

---

## 🖥️ **PASSO 3: Configurar Frontend**

### 3.1 Instalar Dependências
```bash
cd frontend
npm install
```

### 3.2 Configurar Variáveis de Ambiente
Crie o arquivo `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 3.3 Iniciar Frontend
```bash
npm run dev
```

**Acesse:** http://localhost:3000

---

## 🧪 **PASSO 4: Testar Sistema**

### 4.1 Testar Login Padrão
1. Acesse: http://localhost:3000/login
2. Use as credenciais:
   - **Email:** admin@10xdev.com
   - **Senha:** Admin123!
3. Deve fazer login com sucesso ✅

### 4.2 Testar Registro
1. Acesse: http://localhost:3000/register
2. Crie um novo usuário
3. Faça login com o usuário criado

### 4.3 Verificar Banco de Dados
No Supabase:
1. Vá em **Table Editor**
2. Clique na tabela `users`
3. Verifique se os usuários estão sendo criados

---

## 🔍 **PASSO 5: Endpoints da API**

### Autenticação
```http
POST http://localhost:8080/api/auth/register
POST http://localhost:8080/api/auth/login  
POST http://localhost:8080/api/auth/logout
GET  http://localhost:8080/api/auth/me
```

### Usuários (Admin)
```http
GET    http://localhost:8080/api/users
POST   http://localhost:8080/api/users
GET    http://localhost:8080/api/users/:id
PUT    http://localhost:8080/api/users/:id
DELETE http://localhost:8080/api/users/:id
```

### Exemplo de Teste com curl:
```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@10xdev.com",
    "password": "Admin123!"
  }'
```

---

## 🛠️ **PASSO 6: Troubleshooting**

### Erro: "Supabase configuration error"
- Verifique se as variáveis de ambiente estão corretas
- Confirme se não há espaços extras nas chaves

### Erro: "Database connection failed"
- Verifique se o projeto Supabase está ativo
- Confirme se as migrações foram executadas
- Teste a URL do projeto no browser

### Erro: "Port already in use"
- Mude a porta no `.env`: `PORT=8081`
- Ou mate o processo: `npx kill-port 8080`

### Erro: "Token invalid"
- Limpe o localStorage do browser
- Reinicie o servidor backend
- Verifique se o JWT_SECRET está correto

---

## 📁 **Estrutura do Projeto**

```
10xdev-authenticator-jwt/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Lógica de negócio
│   │   ├── middleware/      # Autenticação JWT
│   │   ├── models/         # UserModel, JwtDenylistModel
│   │   ├── routes/         # Rotas da API
│   │   └── database/       # Configuração Supabase
│   ├── migrations/         # Scripts SQL
│   └── .env               # Variáveis de ambiente
├── frontend/
│   ├── pages/             # Páginas Next.js
│   ├── components/        # Componentes React
│   ├── services/         # API clients
│   └── .env.local        # Variáveis frontend
└── SETUP-GUIDE.md        # Este guia
```

---

## ✅ **Checklist Final**

- [ ] Projeto Supabase criado
- [ ] Migrações SQL executadas
- [ ] Backend rodando na porta 8080
- [ ] Frontend rodando na porta 3000
- [ ] Login admin funcionando
- [ ] Registro de usuário funcionando
- [ ] Tabelas no Supabase populadas

---

## 🎯 **Próximos Passos**

1. **Personalizar UI:** Ajustar cores, logo, layout
2. **Adicionar Features:** Reset de senha, verificação de email
3. **Deploy:** Vercel (frontend) + Railway/Heroku (backend)
4. **Segurança:** Rate limiting, HTTPS, validações extras

---

## 📞 **Suporte**

Se tiver problemas:
1. Verifique os logs do console
2. Confirme se todas as dependências foram instaladas
3. Teste cada endpoint individualmente
4. Verifique se o Supabase está respondendo

**Sistema JWT empresarial completo pronto para produção!** 🚀⚡