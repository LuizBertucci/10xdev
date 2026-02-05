-- Migration: Criar tabelas para feature gitsync
-- Data: 2026-02-05
-- Autor: AI Assistant

-- ============================================
-- TABELAS PRINCIPAIS
-- ============================================

-- Tokens OAuth do GitHub (por usuário)
CREATE TABLE IF NOT EXISTS gitsync_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token VARCHAR NOT NULL,
  scope VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conexões repo ↔ projeto (um repo por projeto)
CREATE TABLE IF NOT EXISTS gitsync_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  github_owner VARCHAR NOT NULL,
  github_repo VARCHAR NOT NULL,
  github_installation_id BIGINT,
  default_branch VARCHAR DEFAULT 'main',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, github_owner, github_repo)
);

-- Mapeamento card ↔ arquivo
CREATE TABLE IF NOT EXISTS gitsync_file_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES gitsync_connections(id) ON DELETE CASCADE,
  card_feature_id UUID REFERENCES card_features(id) ON DELETE CASCADE,
  file_path VARCHAR NOT NULL,
  branch_name VARCHAR DEFAULT 'main',
  last_commit_sha VARCHAR,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connection_id, card_feature_id, file_path)
);

-- Pull Requests criados pelo 10xDev
CREATE TABLE IF NOT EXISTS gitsync_pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES gitsync_connections(id) ON DELETE CASCADE,
  card_feature_id UUID REFERENCES card_features(id) ON DELETE SET NULL,
  pr_number INTEGER NOT NULL,
  pr_title VARCHAR NOT NULL,
  pr_url VARCHAR,
  pr_state VARCHAR,
  source_branch VARCHAR,
  target_branch VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  merged_at TIMESTAMP WITH TIME ZONE
);

-- Logs de sincronização
CREATE TABLE IF NOT EXISTS gitsync_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES gitsync_connections(id) ON DELETE CASCADE,
  direction VARCHAR NOT NULL, -- 'inbound' | 'outbound'
  event_type VARCHAR,
  status VARCHAR DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_gitsync_oauth_user ON gitsync_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_gitsync_connections_project ON gitsync_connections(project_id);
CREATE INDEX IF NOT EXISTS idx_gitsync_connections_user ON gitsync_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_gitsync_file_mappings_connection ON gitsync_file_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_gitsync_file_mappings_card ON gitsync_file_mappings(card_feature_id);
CREATE INDEX IF NOT EXISTS idx_gitsync_pr_connection ON gitsync_pull_requests(connection_id);
CREATE INDEX IF NOT EXISTS idx_gitsync_pr_number ON gitsync_pull_requests(pr_number);
CREATE INDEX IF NOT EXISTS idx_gitsync_sync_connection ON gitsync_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_gitsync_sync_created ON gitsync_sync_logs(created_at);

-- ============================================
-- POLICIES RLS (Row Level Security)
-- ============================================

ALTER TABLE gitsync_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE gitsync_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE gitsync_file_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gitsync_pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gitsync_sync_logs ENABLE ROW LEVEL SECURITY;

-- Usuário só vê seus próprios tokens
CREATE POLICY "users_own_gitsync_tokens" ON gitsync_oauth_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Usuário vê conexões dos projetos que é membro
CREATE POLICY "users_see_gitsync_connections" ON gitsync_connections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = gitsync_connections.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Usuário gerencia conexões que criou
CREATE POLICY "users_manage_gitsync_connections" ON gitsync_connections
  FOR ALL USING (auth.uid() = user_id);

-- Usuário gerencia mapeamentos das conexões que tem acesso
CREATE POLICY "users_manage_gitsync_file_mappings" ON gitsync_file_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gitsync_connections
      WHERE gitsync_connections.id = gitsync_file_mappings.connection_id
      AND EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = gitsync_connections.project_id
        AND project_members.user_id = auth.uid()
      )
    )
  );

-- Usuário gerencia PRs das conexões que tem acesso
CREATE POLICY "users_manage_gitsync_pull_requests" ON gitsync_pull_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gitsync_connections
      WHERE gitsync_connections.id = gitsync_pull_requests.connection_id
      AND EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = gitsync_connections.project_id
        AND project_members.user_id = auth.uid()
      )
    )
  );

-- Usuário vê logs das conexões que tem acesso
CREATE POLICY "users_see_gitsync_sync_logs" ON gitsync_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gitsync_connections
      WHERE gitsync_connections.id = gitsync_sync_logs.connection_id
      AND EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = gitsync_connections.project_id
        AND project_members.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- COMENTÁRIOS (Documentação)
-- ============================================

COMMENT ON TABLE gitsync_oauth_tokens IS 'Tokens OAuth do GitHub armazenados por usuário';
COMMENT ON TABLE gitsync_connections IS 'Conexões entre projetos 10xDev e repositórios GitHub';
COMMENT ON TABLE gitsync_file_mappings IS 'Mapeamento entre cards e arquivos do repositório';
COMMENT ON TABLE gitsync_pull_requests IS 'Pull Requests criados automaticamente pelo 10xDev';
COMMENT ON TABLE gitsync_sync_logs IS 'Logs de sincronização entre GitHub e 10xDev';
