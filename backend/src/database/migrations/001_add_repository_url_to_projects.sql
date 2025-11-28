-- Migration: Add repository_url column to projects table
-- Date: 2025-11-28
-- Description: Adds support for GitHub repository URL tracking in projects

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS repository_url TEXT NULL;

-- Add comment to document the column
COMMENT ON COLUMN projects.repository_url IS 'GitHub repository URL if project was imported from GitHub';

-- Create index for faster lookups by repository URL
CREATE INDEX IF NOT EXISTS idx_projects_repository_url ON projects(repository_url) WHERE repository_url IS NOT NULL;
