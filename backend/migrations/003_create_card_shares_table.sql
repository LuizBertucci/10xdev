-- Migration: Criar tabela card_shares (versão simplificada)
-- Cards privados podem ser compartilhados adicionando registros nesta tabela

CREATE TABLE IF NOT EXISTS card_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_feature_id UUID NOT NULL REFERENCES card_features(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_feature_id, shared_with_user_id)
);

CREATE INDEX idx_card_shares_card_id ON card_shares(card_feature_id);
CREATE INDEX idx_card_shares_user_id ON card_shares(shared_with_user_id);
