import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, ChevronRight, Maximize2, Code2, X } from "lucide-react"

interface CodeSnippet {
  id: string
  title: string
  tech: string
  language: string
  description: string
  screens: {
    name: string
    description: string
    code: string
  }[]
}

interface PlatformState {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedTech: string
  setSelectedTech: (tech: string) => void
  filteredSnippets: (snippets: CodeSnippet[]) => CodeSnippet[]
}

interface CodesProps {
  platformState: PlatformState
}

const getTechConfig = (tech: string) => {
  switch (tech.toLowerCase()) {
    case 'react':
      return {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: '⚛️'
      }
    case 'node.js':
      return {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: '🟢'
      }
    case 'python':
      return {
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: '🐍'
      }
    case 'javascript':
      return {
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: '🟨'
      }
    default:
      return {
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: '💻'
      }
  }
}

const getLanguageConfig = (language: string) => {
  switch (language.toLowerCase()) {
    case 'typescript':
      return {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: 'TS'
      }
    case 'javascript':
      return {
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: 'JS'
      }
    case 'python':
      return {
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: 'PY'
      }
    default:
      return {
        color: 'bg-gray-50 text-gray-700 border-gray-200',
        icon: language.substring(0, 2).toUpperCase()
      }
  }
}

export default function Codes({ platformState }: CodesProps) {
  const [currentScreens, setCurrentScreens] = useState<Record<string, number>>({})
  const [openModalId, setOpenModalId] = useState<string | null>(null)

  const codeSnippets: CodeSnippet[] = [
    {
      id: "1",
      title: "Sistema de Autenticação JWT",
      tech: "Node.js",
      language: "typescript",
      description: "Sistema completo de autenticação com JWT, middleware e validação",
      screens: [
        {
          name: "Model",
          description: "Classe User com métodos de autenticação",
          code: `import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

export class User {
  private static users: IUser[] = [];
  private static nextId = 1;

  constructor(
    public id: string,
    public email: string,
    public password: string,
    public name: string,
    public role: 'user' | 'admin' = 'user',
    public createdAt: Date = new Date()
  ) {}

  static async create(userData: Omit<IUser, 'id' | 'createdAt'>): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const user = new User(
      String(this.nextId++),
      userData.email,
      hashedPassword,
      userData.name,
      userData.role,
      new Date()
    );
    
    this.users.push(user);
    return user;
  }

  async comparePassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
  }

  generateToken(): string {
    return jwt.sign(
      { id: this.id, email: this.email, role: this.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
  }
}`
        },
        {
          name: "Controller",
          description: "Controlador de autenticação com login e registro",
          code: `import { Request, Response } from 'express';
import { User } from '../models/User';
import { validationResult } from 'express-validator';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role } = req.body;

      const existingUser = User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Usuário já existe' });
      }

      const user = await User.create({ email, password, name, role });
      const token = user.generateToken();

      res.status(201).json({
        message: 'Usuário criado com sucesso',
        token,
        user: user.toJSON()
      });
    } catch (error) {
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      const token = user.generateToken();

      res.json({
        message: 'Login realizado com sucesso',
        token,
        user: user.toJSON()
      });
    } catch (error) {
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
}`
        }
      ]
    },
    {
      id: "2",
      title: "CRUD Completo React + TypeScript",
      tech: "React",
      language: "typescript",
      description: "Implementação completa de CRUD com hooks customizados, formulários e estado global",
      screens: [
        {
          name: "Hook",
          description: "Hook customizado para gerenciar operações CRUD",
          code: `import { useState, useEffect, useCallback } from 'react';

interface CrudItem {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface UseCrudReturn {
  items: CrudItem[];
  loading: boolean;
  error: string | null;
  createItem: (item: Omit<CrudItem, 'id' | 'createdAt'>) => Promise<void>;
  updateItem: (id: string, item: Partial<CrudItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  refreshItems: () => Promise<void>;
}

export const useCrud = (apiEndpoint: string): UseCrudReturn => {
  const [items, setItems] = useState<CrudItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        throw new Error('Falha ao carregar itens');
      }
      
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  const createItem = useCallback(async (newItem: Omit<CrudItem, 'id' | 'createdAt'>) => {
    try {
      setError(null);
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      
      if (!response.ok) {
        throw new Error('Falha ao criar item');
      }
      
      const createdItem = await response.json();
      setItems(prev => [...prev, createdItem]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar item');
      throw err;
    }
  }, [apiEndpoint]);

  const updateItem = useCallback(async (id: string, updates: Partial<CrudItem>) => {
    try {
      setError(null);
      
      const response = await fetch(\`\${apiEndpoint}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar item');
      }
      
      const updatedItem = await response.json();
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar item');
      throw err;
    }
  }, [apiEndpoint]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      setError(null);
      
      const response = await fetch(\`\${apiEndpoint}/\${id}\`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao deletar item');
      }
      
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar item');
      throw err;
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    refreshItems: fetchItems
  };
};`
        }
      ]
    },
    {
      id: "3",
      title: "API REST com Validação",
      tech: "Python",
      language: "python",
      description: "API REST completa com FastAPI, validação Pydantic e operações CRUD",
      screens: [
        {
          name: "Models",
          description: "Modelos Pydantic para validação de dados",
          code: `from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    MODERATOR = "moderator"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.ACTIVE

    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Nome não pode estar vazio')
        return v.strip()

    @validator('email')
    def email_must_be_valid(cls, v):
        if not v:
            raise ValueError('Email é obrigatório')
        return v.lower()

class UserCreate(UserBase):
    password: str

    @validator('password')
    def password_validation(cls, v):
        if len(v) < 8:
            raise ValueError('Senha deve ter pelo menos 8 caracteres')
        if not any(c.isupper() for c in v):
            raise ValueError('Senha deve conter pelo menos uma letra maiúscula')
        if not any(c.islower() for c in v):
            raise ValueError('Senha deve conter pelo menos uma letra minúscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('Senha deve conter pelo menos um número')
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None

    @validator('name')
    def name_validator(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Nome não pode estar vazio')
        return v.strip() if v else v

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool`
        }
      ]
    },
    {
      id: "dashboard-metrics",
      title: "Cards de Métricas Dashboard",
      tech: "React",
      language: "typescript",
      description: "Componentes de métricas para dashboard com gráficos, mudanças percentuais e dados em tempo real",
      screens: [
        {
          name: "Component",
          description: "Componente principal do card de métrica",
          code: `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'positive' | 'negative' | 'neutral';
    period: string;
  };
  icon?: React.ComponentType<any>;
  formatter?: 'currency' | 'number' | 'percentage';
  description?: string;
  loading?: boolean;
  className?: string;
}

const formatValue = (value: string | number, formatter?: string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  switch (formatter) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(numValue);
    case 'percentage':
      return \`\${numValue.toFixed(1)}%\`;
    case 'number':
      return new Intl.NumberFormat('pt-BR').format(numValue);
    default:
      return value.toString();
  }
};

const getTrendIcon = (type: 'positive' | 'negative' | 'neutral') => {
  switch (type) {
    case 'positive':
      return <TrendingUp className="h-4 w-4" />;
    case 'negative':
      return <TrendingDown className="h-4 w-4" />;
    case 'neutral':
      return <Minus className="h-4 w-4" />;
  }
};

const getTrendColor = (type: 'positive' | 'negative' | 'neutral') => {
  switch (type) {
    case 'positive':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'negative':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'neutral':
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  formatter,
  description,
  loading = false,
  className = ''
}) => {
  if (loading) {
    return (
      <Card className={\`\${className} animate-pulse\`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(value, formatter)}
        </div>
        <div className="flex items-center space-x-2 mt-2">
          {change && (
            <Badge 
              variant="outline" 
              className={\`flex items-center space-x-1 \${getTrendColor(change.type)}\`}
            >
              {getTrendIcon(change.type)}
              <span className="text-xs font-medium">
                {Math.abs(change.value)}%
              </span>
            </Badge>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
          {change && (
            <p className="text-xs text-muted-foreground">
              vs {change.period}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};`
        }
      ]
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-2 text-sm mb-2">
            <button
              onClick={() => platformState.setActiveTab("home")}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Início
            </button>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => {
                platformState.setSelectedTech("all")
                platformState.setSearchTerm("")
              }}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Biblioteca de Códigos
            </button>
            {platformState.selectedTech !== "all" && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 font-medium capitalize">{platformState.selectedTech}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar snippets..."
              value={platformState.searchTerm}
              onChange={(e) => platformState.setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={platformState.selectedTech} onValueChange={platformState.setSelectedTech}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="node.js">Node.js</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {platformState.filteredSnippets(codeSnippets).map((snippet) => {
          const currentScreen = currentScreens[snippet.id] || 0
          const screen = snippet.screens[currentScreen]

          return (
            <Card key={snippet.id} className="hover:shadow-lg transition-shadow h-80">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{snippet.title}</CardTitle>
                    <CardDescription className="text-sm h-10 leading-5 overflow-hidden">{snippet.description}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpenModalId(snippet.id)}
                    className="text-gray-500 hover:text-gray-900"
                  >
                    <Maximize2 className="h-4 w-4 mr-1" />
                    Expandir
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-end space-x-2">
                    <Badge 
                      className={`text-xs rounded-md shadow-sm border pointer-events-none ${getTechConfig(snippet.tech).color}`}
                    >
                      <span className="mr-1">{getTechConfig(snippet.tech).icon}</span>
                      {snippet.tech}
                    </Badge>
                    <Badge 
                      className={`text-xs rounded-md shadow-sm border pointer-events-none ${getLanguageConfig(snippet.language).color}`}
                    >
                      <span className="mr-1 text-xs font-bold">{getLanguageConfig(snippet.language).icon}</span>
                      {snippet.language}
                    </Badge>
                  </div>

                  <div className="bg-gray-900 rounded-md p-4 h-44 overflow-hidden relative group">
                    <pre className="text-xs text-gray-100 leading-tight">
                      <code>{snippet.screens[0]?.code.slice(0, 200)}...</code>
                    </pre>
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity"></div>
                    <div className="absolute bottom-2 right-2 text-xs text-gray-400 group-hover:text-gray-300">
                      {snippet.screens.length} arquivo{snippet.screens.length > 1 ? "s" : ""}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Code Expansion Modal */}
      {openModalId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-xl font-semibold">
                  {codeSnippets.find(s => s.id === openModalId)?.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {codeSnippets.find(s => s.id === openModalId)?.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpenModalId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {(() => {
                const snippet = codeSnippets.find(s => s.id === openModalId);
                if (!snippet) return null;
                
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    {snippet.screens.map((screen, index) => (
                      <div key={index} className="flex flex-col">
                        <div className="mb-3">
                          <h4 className="font-medium text-gray-900">{screen.name}</h4>
                          <p className="text-sm text-gray-600">{screen.description}</p>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4 overflow-auto flex-1">
                          <pre className="text-sm text-gray-100 leading-relaxed">
                            <code>{screen.code}</code>
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}