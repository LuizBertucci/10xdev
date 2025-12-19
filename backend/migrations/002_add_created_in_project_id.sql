-- Migration: Adicionar campo created_in_project_id à tabela card_features
-- Objetivo: Separar cards criados em projetos dos criados na aba códigos
-- Data: 2025-12-15

-- Adicionar coluna created_in_project_id
ALTER TABLE card_features
ADD COLUMN created_in_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Criar índice para melhor performance nas queries
CREATE INDEX idx_card_features_created_in_project ON card_features(created_in_project_id);

-- Comentários para documentação
COMMENT ON COLUMN card_features.created_in_project_id IS 'ID do projeto onde o card foi criado. NULL = criado na aba Códigos, NOT NULL = criado dentro de um projeto específico';
