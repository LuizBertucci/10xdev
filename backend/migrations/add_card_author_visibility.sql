-- ================================================
-- Migration: Adicionar autoria e visibilidade aos cards
-- ================================================

-- Adicionar colunas created_by e is_private
ALTER TABLE card_features 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Criar índices para performance (seguindo padrão do projeto)
CREATE INDEX IF NOT EXISTS idx_card_features_created_by ON card_features(created_by);
CREATE INDEX IF NOT EXISTS idx_card_features_is_private ON card_features(is_private);
CREATE INDEX IF NOT EXISTS idx_card_features_visibility ON card_features(is_private, created_by);

-- Atribuir cards existentes aos usuários
-- 70% para augustoc.amado@gmail.com, 30% para luizbertucci
DO $$
DECLARE
  augusto_id UUID;
  luiz_id UUID;
  total_cards INTEGER;
  augusto_count INTEGER;
BEGIN
  -- Buscar IDs dos usuários
  SELECT id INTO augusto_id FROM auth.users WHERE email = 'augustoc.amado@gmail.com' LIMIT 1;
  SELECT id INTO luiz_id FROM auth.users 
  WHERE email LIKE '%luizbertucci%' OR email LIKE '%luiz%bertucci%' 
  LIMIT 1;
  
  -- Contar cards sem autor
  SELECT COUNT(*) INTO total_cards FROM card_features WHERE created_by IS NULL;
  
  -- Calcular quantos para cada (70% augusto, 30% luiz)
  augusto_count := FLOOR(total_cards * 0.7);
  
  -- Atribuir para augusto
  IF augusto_id IS NOT NULL AND augusto_count > 0 THEN
    UPDATE card_features 
    SET created_by = augusto_id
    WHERE created_by IS NULL
    AND id IN (
      SELECT id FROM card_features 
      WHERE created_by IS NULL 
      ORDER BY created_at 
      LIMIT augusto_count
    );
  END IF;
  
  -- Atribuir restante para luiz
  IF luiz_id IS NOT NULL THEN
    UPDATE card_features 
    SET created_by = luiz_id
    WHERE created_by IS NULL;
  END IF;
  
  -- Todos os cards existentes são públicos
  UPDATE card_features SET is_private = false WHERE is_private IS NULL;
END $$;

-- Habilitar Row Level Security (seguindo padrão do projeto)
ALTER TABLE card_features ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver cards públicos OU seus próprios cards privados
CREATE POLICY "Users can view public cards or their own private cards"
ON card_features FOR SELECT
USING (
  is_private = false 
  OR (is_private = true AND created_by = auth.uid())
);

-- Política: Usuários autenticados podem criar cards
CREATE POLICY "Authenticated users can create cards"
ON card_features FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Política: Usuários podem atualizar apenas seus próprios cards
CREATE POLICY "Users can update their own cards"
ON card_features FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Política: Usuários podem deletar apenas seus próprios cards
CREATE POLICY "Users can delete their own cards"
ON card_features FOR DELETE
USING (created_by = auth.uid());
