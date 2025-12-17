-- Migration: Criar tabela de reviews para CardFeatures
-- Objetivo: Permitir que usuários avaliem cards com estrelas (1-5)
-- Data: 2025-01-XX

-- Criar tabela de reviews
CREATE TABLE IF NOT EXISTS card_feature_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_feature_id UUID NOT NULL REFERENCES card_features(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_feature_id, user_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_reviews_card_feature ON card_feature_reviews(card_feature_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON card_feature_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON card_feature_reviews(rating);

-- Comentários para documentação
COMMENT ON TABLE card_feature_reviews IS 'Reviews de usuários para CardFeatures com rating de 1 a 5 estrelas';
COMMENT ON COLUMN card_feature_reviews.card_feature_id IS 'ID do CardFeature sendo avaliado';
COMMENT ON COLUMN card_feature_reviews.user_id IS 'ID do usuário que fez a avaliação';
COMMENT ON COLUMN card_feature_reviews.rating IS 'Avaliação de 1 a 5 estrelas';
COMMENT ON CONSTRAINT card_feature_reviews_card_feature_id_user_id_key ON card_feature_reviews IS 'Garante que cada usuário pode ter apenas um review por card';
