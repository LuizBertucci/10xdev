-- ================================================
-- Migration: Criar tabela import_jobs (GitHub import)
-- Objetivo: Tracking de progresso em tempo real (Supabase Realtime)
-- Data: 2026-01-02
-- ================================================

-- Tabela: import_jobs
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'error')),
  step TEXT NOT NULL DEFAULT 'starting' CHECK (step IN (
    'starting',
    'downloading_zip',
    'extracting_files',
    'analyzing_repo',
    'generating_cards',
    'creating_cards',
    'linking_cards',
    'done',
    'error'
  )),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT,
  error TEXT,

  ai_requested BOOLEAN NOT NULL DEFAULT false,
  ai_used BOOLEAN NOT NULL DEFAULT false,
  ai_cards_created INTEGER NOT NULL DEFAULT 0,
  files_processed INTEGER NOT NULL DEFAULT 0,
  cards_created INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_import_jobs_project_id ON public.import_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON public.import_jobs(status);

-- RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'import_jobs'
      AND policyname = 'Users can view import jobs for their projects'
  ) THEN
    CREATE POLICY "Users can view import jobs for their projects" ON public.import_jobs
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.project_members pm
          WHERE pm.project_id = import_jobs.project_id
            AND pm.user_id = auth.uid()
        )
        OR created_by = auth.uid()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'import_jobs'
      AND policyname = 'Service role can manage import jobs'
  ) THEN
    CREATE POLICY "Service role can manage import jobs" ON public.import_jobs
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Realtime publication (tenta adicionar e ignora se já existir)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.import_jobs;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
  WHEN undefined_object THEN
    NULL;
END $$;

-- Trigger updated_at (reaproveitável)
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_import_jobs_updated ON public.import_jobs;
CREATE TRIGGER on_import_jobs_updated
  BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

