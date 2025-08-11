-- Tabela de usuários para autenticação JWT
-- Migration: 001_create_users_table

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários na tabela e colunas
COMMENT ON TABLE users IS 'Tabela de usuários para sistema de autenticação JWT';
COMMENT ON COLUMN users.id IS 'ID único do usuário (UUID)';
COMMENT ON COLUMN users.email IS 'Email do usuário (único, usado para login)';
COMMENT ON COLUMN users.password_hash IS 'Hash da senha usando bcrypt';
COMMENT ON COLUMN users.name IS 'Nome completo do usuário';
COMMENT ON COLUMN users.avatar_url IS 'URL da foto de perfil do usuário (opcional)';
COMMENT ON COLUMN users.email_verified IS 'Indica se o email foi verificado';
COMMENT ON COLUMN users.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN users.updated_at IS 'Data da última atualização (auto)';
COMMENT ON COLUMN users.last_login IS 'Data do último login do usuário';