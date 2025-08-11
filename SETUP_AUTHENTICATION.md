# 🔐 10xDev Authentication System Setup

Este guia irá ajudá-lo a configurar o sistema de autenticação JWT completo para a plataforma 10xDev.

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL ou conta Supabase
- Git

## 🚀 Configuração Rápida

### 1. Configurar Banco de Dados

#### Opção A: Usando Supabase (Recomendado)
1. Crie uma conta em [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Vá para SQL Editor no painel
4. Cole e execute o conteúdo de `setup_database.sql`
5. Copie suas credenciais do projeto:
   - Project URL
   - Anon Key
   - Service Role Key

#### Opção B: PostgreSQL Local
1. Instale PostgreSQL
2. Crie um banco de dados: `createdb 10xdev_db`
3. Execute: `psql -d 10xdev_db -f setup_database.sql`

### 2. Configurar Backend

```bash
cd backend
npm install
```

Edite o arquivo `.env` com suas credenciais:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# JWT Configuration  
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=24h

# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### 3. Configurar Frontend

```bash
cd frontend
npm install
```

### 4. Iniciar Servidores

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## 🎯 Testando o Sistema

1. Acesse http://localhost:3000
2. Clique em "Sign In" ou "Sign Up"
3. Use as credenciais de teste:
   - **Admin**: admin@10xdev.com / Admin123!
   - Ou crie uma nova conta

## 🔧 Funcionalidades Implementadas

### Backend API
- ✅ **POST /api/auth/register** - Registro de usuários
- ✅ **POST /api/auth/login** - Login de usuários  
- ✅ **POST /api/auth/logout** - Logout (adiciona token à denylist)
- ✅ **GET /api/auth/me** - Perfil do usuário atual
- ✅ **POST /api/auth/refresh** - Renovar token JWT
- ✅ **GET /api/auth/users** - Listar usuários (admin only)
- ✅ **GET /api/auth/users/:id** - Buscar usuário por ID (admin only)
- ✅ **PUT /api/auth/users/:id** - Atualizar usuário (admin only)
- ✅ **DELETE /api/auth/users/:id** - Deletar usuário (admin only)

### Frontend
- ✅ **Página de Login** - Com logo 10xDev (raio)
- ✅ **Página de Registro** - Formulário completo
- ✅ **Contexto de Autenticação** - Estado global
- ✅ **Rotas Protegidas** - Baseadas em autenticação
- ✅ **Perfil do Usuário** - Exibição de informações
- ✅ **Controle de Acesso** - Admin vs User

### Segurança
- ✅ **Hash de Senhas** - bcrypt com salt rounds 12
- ✅ **JWT com Expiração** - Tokens de 24h por padrão
- ✅ **Denylist de Tokens** - Revogação segura
- ✅ **Validação de Entrada** - Sanitização e validação
- ✅ **Rate Limiting** - Proteção contra spam
- ✅ **Roles de Usuário** - Admin e User

## 📊 Estrutura do Banco de Dados

### Tabela `users`
```sql
- id (UUID, PK)
- email (VARCHAR, UNIQUE)  
- password_hash (VARCHAR)
- role ('admin' | 'user')
- first_name (VARCHAR, opcional)
- last_name (VARCHAR, opcional)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabela `jwt_denylist`
```sql
- id (UUID, PK)
- jti (VARCHAR, UNIQUE) // JWT ID
- exp (TIMESTAMP)       // Expiração
- created_at (TIMESTAMP)
```

## 🛠 Comandos Úteis

### Backend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run start        # Produção
npm run lint         # Verificar código
npm test             # Testes
```

### Frontend
```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run start        # Produção
npm run lint         # Verificar código
```

## 🔐 Credenciais de Teste

**Usuário Admin:**
- Email: admin@10xdev.com
- Senha: Admin123!
- Role: admin

Este usuário tem acesso a todas as funcionalidades administrativas.

## 🚨 Problemas Comuns

### Backend não inicia
1. Verifique se as variáveis de ambiente estão corretas
2. Certifique-se de que o banco está acessível
3. Execute `npm install` novamente

### Erro de conexão com banco
1. Verifique as credenciais do Supabase
2. Confirme se as tabelas foram criadas
3. Teste a conexão no painel do Supabase

### Frontend não carrega
1. Certifique-se de que o backend está rodando
2. Verifique se a URL da API está correta
3. Abra o DevTools para ver erros

## 📚 Próximos Passos

1. **Personalizar**: Adapte o design às suas necessidades
2. **Expandir**: Adicione mais funcionalidades de usuário
3. **Segurança**: Configure HTTPS em produção
4. **Monitoramento**: Adicione logs e métricas
5. **Testes**: Implemente testes automatizados

## 💡 Dicas de Produção

- Change o JWT_SECRET para algo seguro
- Configure HTTPS
- Use variáveis de ambiente seguras
- Monitore logs de segurança
- Implemente backup do banco
- Configure alertas para falhas

---

**🎉 Pronto! Seu sistema de autenticação 10xDev está funcionando!**