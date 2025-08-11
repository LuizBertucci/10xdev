# Database Migrations - JWT Authentication System

## Visão Geral

Este diretório contém as migrações SQL para implementar o sistema de autenticação JWT no 10xDev Backend.

## Migrações Disponíveis

### 001_create_users_table.sql
Cria a tabela `users` com os seguintes recursos:
- **Campos**: id, email, password_hash, name, avatar_url, email_verified, created_at, updated_at, last_login
- **Índices**: email, created_at, email_verified 
- **Triggers**: Auto-update para updated_at
- **Constraints**: email único, password_hash obrigatório

### 002_create_jwt_blacklist_table.sql  
Cria a tabela `jwt_blacklist` com os seguintes recursos:
- **Campos**: id, token, user_id, expires_at, reason, created_at
- **Índices**: token, user_id, expires_at, token+expires_at (composto)
- **Foreign Keys**: user_id referencia users(id) com CASCADE DELETE
- **Functions**: cleanup_expired_tokens() para limpeza automática
- **Views**: active_blacklisted_tokens para consulta de tokens ativos

## Como Executar as Migrações

### Usando Supabase Dashboard
1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá para seu projeto
3. Navegue até **SQL Editor**
4. Execute os arquivos SQL na ordem:
   - Primeiro: `001_create_users_table.sql`
   - Segundo: `002_create_jwt_blacklist_table.sql`

### Usando linha de comando (psql)
```bash
# Conectar ao banco
psql "postgresql://user:password@host:port/database"

# Executar migrações na ordem
\i src/database/migrations/001_create_users_table.sql
\i src/database/migrations/002_create_jwt_blacklist_table.sql
```

### Usando cliente SQL
1. Conecte-se ao seu banco PostgreSQL
2. Execute o conteúdo dos arquivos SQL na ordem numerada

## Estrutura das Tabelas

### Tabela `users`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   TEXT NOT NULL  
name            VARCHAR(255) NOT NULL
avatar_url      TEXT NULL
email_verified  BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
last_login      TIMESTAMP WITH TIME ZONE NULL
```

### Tabela `jwt_blacklist`
```sql  
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
token           TEXT NOT NULL
user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
expires_at      TIMESTAMP WITH TIME ZONE NOT NULL
reason          VARCHAR(100) DEFAULT 'logout'
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

## Recursos Avançados

### Limpeza Automática de Tokens
Execute periodicamente para remover tokens expirados:
```sql
SELECT cleanup_expired_tokens();
```

### Monitoramento de Tokens Ativos
Consulte a view para ver tokens ativos na blacklist:
```sql
SELECT * FROM active_blacklisted_tokens;
```

### Estatísticas da Blacklist
```sql
-- Total de tokens na blacklist
SELECT COUNT(*) FROM jwt_blacklist;

-- Tokens ativos (não expirados) 
SELECT COUNT(*) FROM active_blacklisted_tokens;

-- Tokens por motivo de invalidação
SELECT reason, COUNT(*) FROM jwt_blacklist GROUP BY reason;
```

## Segurança

- Todos os passwords são hasheados usando bcrypt (cost 12)
- Tokens JWT incluem issuer e audience para validação adicional
- Foreign keys garantem integridade referencial
- Índices otimizam consultas de autenticação
- Timestamps com timezone para auditoria precisa

## Troubleshooting

### Erro: "relation already exists"
Se as tabelas já existirem, use `IF NOT EXISTS` ou execute:
```sql
DROP TABLE IF EXISTS jwt_blacklist CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

### Erro de permissões
Certifique-se de ter privilégios CREATE TABLE:
```sql
GRANT CREATE ON DATABASE your_database TO your_user;
```

### Performance lenta
Verifique se os índices foram criados:
```sql
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('users', 'jwt_blacklist');
```