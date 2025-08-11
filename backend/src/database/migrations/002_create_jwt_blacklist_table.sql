-- Tabela de blacklist para tokens JWT invalidados
-- Migration: 002_create_jwt_blacklist_table

CREATE TABLE IF NOT EXISTS jwt_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reason VARCHAR(100) DEFAULT 'logout',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_token ON jwt_blacklist(token);
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_user_id ON jwt_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_expires_at ON jwt_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_created_at ON jwt_blacklist(created_at);

-- Índice composto para consultas de validação
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_token_expires ON jwt_blacklist(token, expires_at);

-- Função para limpeza automática de tokens expirados
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM jwt_blacklist WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Removed % expired tokens from blacklist', deleted_count;
  END IF;
  
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Comentários na tabela e colunas
COMMENT ON TABLE jwt_blacklist IS 'Blacklist de tokens JWT invalidados';
COMMENT ON COLUMN jwt_blacklist.id IS 'ID único do registro de blacklist';
COMMENT ON COLUMN jwt_blacklist.token IS 'Token JWT invalidado (hash)';
COMMENT ON COLUMN jwt_blacklist.user_id IS 'ID do usuário proprietário do token';
COMMENT ON COLUMN jwt_blacklist.expires_at IS 'Data de expiração do token';
COMMENT ON COLUMN jwt_blacklist.reason IS 'Motivo da invalidação (logout, security, etc)';
COMMENT ON COLUMN jwt_blacklist.created_at IS 'Data de criação do registro de blacklist';

-- View para consulta de tokens ativos na blacklist
CREATE OR REPLACE VIEW active_blacklisted_tokens AS
SELECT 
  id,
  token,
  user_id,
  expires_at,
  reason,
  created_at,
  (expires_at - NOW()) AS time_until_expiry
FROM jwt_blacklist
WHERE expires_at > NOW()
ORDER BY expires_at DESC;

COMMENT ON VIEW active_blacklisted_tokens IS 'View de tokens ativos na blacklist (não expirados)';