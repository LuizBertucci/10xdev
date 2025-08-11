-- Migration: Create users and JWT denylist tables
-- Created: 2025-01-11
-- Description: Creates the users and jwt_denylist tables for JWT authentication system

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on role for admin queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create jwt_denylist table
CREATE TABLE IF NOT EXISTS jwt_denylist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jti VARCHAR(255) NOT NULL UNIQUE,
    exp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on jti for fast token lookups
CREATE INDEX IF NOT EXISTS idx_jwt_denylist_jti ON jwt_denylist(jti);

-- Create index on exp for cleanup operations
CREATE INDEX IF NOT EXISTS idx_jwt_denylist_exp ON jwt_denylist(exp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default users for testing
-- Admin user (password: Admin123!)
INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
VALUES (
    'admin@10xdev.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLegNRgKKKK2cka',
    'admin',
    'Admin',
    '10xdev',
    true
) ON CONFLICT (email) DO NOTHING;

-- Regular user (password: User123!)
INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
VALUES (
    'user@10xdev.com',
    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'user',
    'Usuário',
    'Teste',
    true
) ON CONFLICT (email) DO NOTHING;

-- Grant necessary permissions (adjust based on your RLS policies)
-- These are basic permissions for the service role

-- Create RLS policies if needed (uncomment if using Row Level Security)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE jwt_denylist ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own data
-- CREATE POLICY "Users can view own profile" ON users
--     FOR SELECT USING (auth.uid()::text = id::text);

-- Create policy for service role to manage users
-- CREATE POLICY "Service role can manage users" ON users
--     FOR ALL USING (auth.role() = 'service_role');

-- Create policy for service role to manage jwt_denylist
-- CREATE POLICY "Service role can manage jwt_denylist" ON jwt_denylist
--     FOR ALL USING (auth.role() = 'service_role');

-- Migration complete
-- Remember to run this in your Supabase SQL editor or via migrations