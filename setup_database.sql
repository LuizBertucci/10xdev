-- ================================================
-- 10xDev Platform Database Setup
-- Execute this in your Supabase SQL Editor or PostgreSQL
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- USERS TABLE: Authentication and authorization
-- ================================================

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ================================================
-- JWT DENYLIST TABLE: Manage revoked tokens
-- ================================================

-- Create JWT Denylist table
CREATE TABLE IF NOT EXISTS jwt_denylist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jti VARCHAR(255) UNIQUE NOT NULL,
    exp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for jwt_denylist table
CREATE INDEX IF NOT EXISTS idx_jwt_denylist_jti ON jwt_denylist(jti);
CREATE INDEX IF NOT EXISTS idx_jwt_denylist_exp ON jwt_denylist(exp);

-- ================================================
-- CARDFEATURES TABLE: Code snippets and examples
-- ================================================

-- Create CardFeatures table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS card_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    tech VARCHAR(100) NOT NULL,
    language VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    screens JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_card_features_tech ON card_features(tech);
CREATE INDEX IF NOT EXISTS idx_card_features_language ON card_features(language);
CREATE INDEX IF NOT EXISTS idx_card_features_created_at ON card_features(created_at);
CREATE INDEX IF NOT EXISTS idx_card_features_updated_at ON card_features(updated_at);

-- Create GIN index for JSONB screens column
CREATE INDEX IF NOT EXISTS idx_card_features_screens ON card_features USING GIN(screens);

-- Add constraint to ensure screens is a valid array
ALTER TABLE card_features 
ADD CONSTRAINT IF NOT EXISTS check_screens_is_array 
CHECK (jsonb_typeof(screens) = 'array');

-- ================================================
-- TRIGGERS: Automatic timestamp updates
-- ================================================

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for card_features table
DROP TRIGGER IF EXISTS update_card_features_updated_at ON card_features;
CREATE TRIGGER update_card_features_updated_at 
    BEFORE UPDATE ON card_features 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- SEED DATA: Initial Admin User
-- ================================================

-- Create initial admin user (password: Admin123!)
-- Note: In production, create this user manually with a secure password
INSERT INTO users (email, password_hash, role, first_name, last_name, is_active) VALUES 
(
    'admin@10xdev.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLegNRgKKKK2cka', -- Admin123!
    'admin',
    'Admin',
    'User',
    true
) ON CONFLICT (email) DO NOTHING;

-- ================================================
-- ROW LEVEL SECURITY (Optional - for Supabase)
-- ================================================

-- Enable RLS on the tables (uncomment if using Supabase RLS)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE jwt_denylist ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE card_features ENABLE ROW LEVEL SECURITY;

-- Basic policies (uncomment and modify as needed)
-- CREATE POLICY "Allow all operations on users for service role" ON users FOR ALL USING (true);
-- CREATE POLICY "Allow all operations on jwt_denylist for service role" ON jwt_denylist FOR ALL USING (true);
-- CREATE POLICY "Allow all operations on card_features" ON card_features FOR ALL USING (true);

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'jwt_denylist', 'card_features');

-- Verify admin user was created
SELECT email, role, created_at 
FROM users 
WHERE email = 'admin@10xdev.com';

-- Show table structures
\d users;
\d jwt_denylist;
\d card_features;