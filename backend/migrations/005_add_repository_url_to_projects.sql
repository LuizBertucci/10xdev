-- ================================================
-- Migration: Adicionar repository_url à tabela projects
-- Objetivo: Persistir origem do projeto importado do GitHub
-- Data: 2026-01-02
-- ================================================

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS repository_url TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_repository_url ON public.projects(repository_url);

COMMENT ON COLUMN public.projects.repository_url IS 'URL do repositório GitHub associado ao projeto (quando aplicável)';

