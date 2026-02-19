-- Starter Template Database Setup
-- Execute this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Examples table (replace with your own entities)
CREATE TABLE IF NOT EXISTS examples (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_examples_user_id ON examples(user_id);
CREATE INDEX IF NOT EXISTS idx_examples_status ON examples(status);
CREATE INDEX IF NOT EXISTS idx_examples_created_at ON examples(created_at DESC);

-- Enable Row Level Security
ALTER TABLE examples ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data
CREATE POLICY "Users can view own examples"
  ON examples FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own data
CREATE POLICY "Users can insert own examples"
  ON examples FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own data
CREATE POLICY "Users can update own examples"
  ON examples FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own data
CREATE POLICY "Users can delete own examples"
  ON examples FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_examples_updated_at
  BEFORE UPDATE ON examples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
