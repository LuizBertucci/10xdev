-- ================================================
-- MIGRATION: Create CardFeatures table
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create CardFeatures table
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
ADD CONSTRAINT check_screens_is_array 
CHECK (jsonb_typeof(screens) = 'array');

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function
CREATE TRIGGER update_card_features_updated_at 
    BEFORE UPDATE ON card_features 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- SEED DATA: Initial CardFeatures
-- ================================================

INSERT INTO card_features (title, tech, language, description, screens) VALUES 
(
    'Sistema de Autenticação JWT',
    'Node.js',
    'typescript',
    'Sistema completo de autenticação com JWT, middleware e validação',
    '[
        {
            "name": "Model",
            "description": "Classe User com métodos de autenticação",
            "code": "import bcrypt from ''bcrypt'';\nimport jwt from ''jsonwebtoken'';\n\ninterface IUser {\n  id: string;\n  email: string;\n  password: string;\n  name: string;\n  role: ''user'' | ''admin'';\n  createdAt: Date;\n}\n\nexport class User {\n  private static users: IUser[] = [];\n  private static nextId = 1;\n\n  constructor(\n    public id: string,\n    public email: string,\n    public password: string,\n    public name: string,\n    public role: ''user'' | ''admin'' = ''user'',\n    public createdAt: Date = new Date()\n  ) {}\n\n  static async create(userData: Omit<IUser, ''id'' | ''createdAt''>): Promise<User> {\n    const hashedPassword = await bcrypt.hash(userData.password, 12);\n    \n    const user = new User(\n      String(this.nextId++),\n      userData.email,\n      hashedPassword,\n      userData.name,\n      userData.role,\n      new Date()\n    );\n    \n    this.users.push(user);\n    return user;\n  }\n\n  async comparePassword(password: string): Promise<boolean> {\n    return await bcrypt.compare(password, this.password);\n  }\n\n  generateToken(): string {\n    return jwt.sign(\n      { id: this.id, email: this.email, role: this.role },\n      process.env.JWT_SECRET!,\n      { expiresIn: ''7d'' }\n    );\n  }\n}"
        },
        {
            "name": "Controller",
            "description": "Controlador de autenticação com login e registro",
            "code": "import { Request, Response } from ''express'';\nimport { User } from ''../models/User'';\nimport { validationResult } from ''express-validator'';\n\nexport class AuthController {\n  static async register(req: Request, res: Response) {\n    try {\n      const errors = validationResult(req);\n      if (!errors.isEmpty()) {\n        return res.status(400).json({ errors: errors.array() });\n      }\n\n      const { email, password, name, role } = req.body;\n\n      const existingUser = User.findByEmail(email);\n      if (existingUser) {\n        return res.status(400).json({ message: ''Usuário já existe'' });\n      }\n\n      const user = await User.create({ email, password, name, role });\n      const token = user.generateToken();\n\n      res.status(201).json({\n        message: ''Usuário criado com sucesso'',\n        token,\n        user: user.toJSON()\n      });\n    } catch (error) {\n      res.status(500).json({ message: ''Erro interno do servidor'' });\n    }\n  }\n\n  static async login(req: Request, res: Response) {\n    try {\n      const { email, password } = req.body;\n\n      const user = User.findByEmail(email);\n      if (!user) {\n        return res.status(401).json({ message: ''Credenciais inválidas'' });\n      }\n\n      const isValidPassword = await user.comparePassword(password);\n      if (!isValidPassword) {\n        return res.status(401).json({ message: ''Credenciais inválidas'' });\n      }\n\n      const token = user.generateToken();\n\n      res.json({\n        message: ''Login realizado com sucesso'',\n        token,\n        user: user.toJSON()\n      });\n    } catch (error) {\n      res.status(500).json({ message: ''Erro interno do servidor'' });\n    }\n  }\n}"
        }
    ]'::jsonb
),
(
    'CRUD Completo React + TypeScript',
    'React',
    'typescript',
    'Sistema CRUD completo com hooks customizados e componentes reutilizáveis',
    '[
        {
            "name": "Hook",
            "description": "Hook customizado para operações CRUD",
            "code": "import { useState, useEffect, useCallback } from ''react'';\n\ninterface CrudItem {\n  id: string;\n  [key: string]: any;\n}\n\ninterface UseCrudOptions<T> {\n  apiUrl: string;\n  initialData?: T[];\n}\n\nexport function useCrud<T extends CrudItem>({\n  apiUrl, \n  initialData = [] \n}: UseCrudOptions<T>) {\n  const [items, setItems] = useState<T[]>(initialData);\n  const [loading, setLoading] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n\n  const fetchItems = useCallback(async () => {\n    setLoading(true);\n    setError(null);\n    try {\n      const response = await fetch(apiUrl);\n      if (!response.ok) throw new Error(''Erro ao buscar dados'');\n      const data = await response.json();\n      setItems(data);\n    } catch (err) {\n      setError(err instanceof Error ? err.message : ''Erro desconhecido'');\n    } finally {\n      setLoading(false);\n    }\n  }, [apiUrl]);\n\n  const createItem = useCallback(async (newItem: Omit<T, ''id''>) => {\n    setLoading(true);\n    setError(null);\n    try {\n      const response = await fetch(apiUrl, {\n        method: ''POST'',\n        headers: { ''Content-Type'': ''application/json'' },\n        body: JSON.stringify(newItem),\n      });\n      if (!response.ok) throw new Error(''Erro ao criar item'');\n      const createdItem = await response.json();\n      setItems(prev => [...prev, createdItem]);\n      return createdItem;\n    } catch (err) {\n      setError(err instanceof Error ? err.message : ''Erro desconhecido'');\n      throw err;\n    } finally {\n      setLoading(false);\n    }\n  }, [apiUrl]);\n\n  return {\n    items,\n    loading,\n    error,\n    createItem,\n    refetch: fetchItems,\n  };\n}"
        }
    ]'::jsonb
);

-- ================================================
-- SECURITY: Row Level Security (RLS)
-- ================================================

-- Enable RLS on the table
ALTER TABLE card_features ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (can be restricted later)
CREATE POLICY "Allow all operations on card_features" ON card_features
    FOR ALL USING (true);

-- ================================================
-- FUNCTIONS: Custom database functions
-- ================================================

-- Function to search CardFeatures by text
CREATE OR REPLACE FUNCTION search_card_features(search_term TEXT)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    tech VARCHAR(100),
    language VARCHAR(50),
    description TEXT,
    screens JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    relevance FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cf.id,
        cf.title,
        cf.tech,
        cf.language,
        cf.description,
        cf.screens,
        cf.created_at,
        cf.updated_at,
        (
            CASE 
                WHEN cf.title ILIKE '%' || search_term || '%' THEN 3.0
                ELSE 0.0
            END +
            CASE 
                WHEN cf.description ILIKE '%' || search_term || '%' THEN 2.0
                ELSE 0.0
            END +
            CASE 
                WHEN cf.tech ILIKE '%' || search_term || '%' THEN 1.5
                ELSE 0.0
            END
        ) as relevance
    FROM card_features cf
    WHERE 
        cf.title ILIKE '%' || search_term || '%' OR
        cf.description ILIKE '%' || search_term || '%' OR
        cf.tech ILIKE '%' || search_term || '%' OR
        cf.language ILIKE '%' || search_term || '%'
    ORDER BY relevance DESC, cf.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get CardFeatures by technology
CREATE OR REPLACE FUNCTION get_card_features_by_tech(tech_filter TEXT)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    tech VARCHAR(100),
    language VARCHAR(50),
    description TEXT,
    screens JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF tech_filter = 'all' THEN
        RETURN QUERY
        SELECT * FROM card_features
        ORDER BY created_at DESC;
    ELSE
        RETURN QUERY
        SELECT * FROM card_features cf
        WHERE cf.tech ILIKE tech_filter
        ORDER BY cf.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- MIGRATION: Create Educational Videos table
-- ================================================

-- Create Educational Videos table
CREATE TABLE IF NOT EXISTS educational_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    youtube_url TEXT NOT NULL,
    video_id TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for educational_videos
CREATE INDEX IF NOT EXISTS idx_educational_videos_created_at ON educational_videos(created_at);
CREATE INDEX IF NOT EXISTS idx_educational_videos_video_id ON educational_videos(video_id);

-- Trigger function to update updated_at for educational_videos
CREATE OR REPLACE FUNCTION update_educational_videos_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger bind
CREATE TRIGGER update_educational_videos_updated_at
    BEFORE UPDATE ON educational_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_educational_videos_updated_at_column();