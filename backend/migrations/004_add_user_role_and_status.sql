-- Migration: Adicionar campos role e status na tabela users
-- Esta migration adiciona suporte para controle de acesso baseado em roles e status de usuário

-- Adicionar coluna role (tipo de usuário: admin, user, consultor)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'consultor'));

-- Adicionar coluna status (ativo/inativo)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Criar índice para role (melhorar performance de queries filtradas por role)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Criar índice para status
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Criar índice composto role + status para queries combinadas
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);

-- Atualizar usuários específicos para admin (Luiz Bertucci e Augusto Amado)
-- NOTA: Ajuste os emails conforme necessário
UPDATE users
SET role = 'admin', updated_at = NOW()
WHERE email ILIKE '%luizbertucci%'
   OR email ILIKE '%luiz@10xdev%'
   OR email ILIKE '%augustoamado%'
   OR email ILIKE '%augusto@10xdev%';

-- Comentários sobre a migration
COMMENT ON COLUMN users.role IS 'Role do usuário no sistema: admin (acesso total), user (acesso padrão), consultor (acesso consultor)';
COMMENT ON COLUMN users.status IS 'Status da conta do usuário: active (ativo, pode fazer login), inactive (desativado, não pode fazer login)';
