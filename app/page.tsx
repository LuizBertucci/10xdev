"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Code2,
  Play,
  FolderOpen,
  Search,
  Heart,
  Star,
  Clock,
  Download,
  GitBranch,
  Filter,
  BookOpen,
  Zap,
  Users,
  Brain,
  Bot,
  Workflow,
  Server,
  FileCode,
  Lightbulb,
  Sparkles,
  ChevronRight,
  Trophy,
  Maximize2,
  X,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function AppSidebar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  const menuItems = [
    {
      title: "Início",
      icon: Zap,
      key: "home",
      description: "Dashboard principal",
    },
    {
      title: "Códigos",
      icon: Code2,
      key: "codes",
      description: "Snippets e exemplos",
    },
    {
      title: "Aulas",
      icon: Play,
      key: "lessons",
      description: "Videoaulas e trilhas",
    },
    {
      title: "Projetos",
      icon: FolderOpen,
      key: "projects",
      description: "Templates completos",
    },
    {
      title: "IA",
      icon: Brain,
      key: "ai",
      description: "Integração com IA",
    },
  ]

  const quickStats = [
    { label: "Snippets", value: "2.5k+" },
    { label: "Aulas", value: "150+" },
    { label: "Projetos", value: "80+" },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-sidebar-primary-foreground">
                <Zap className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">10xDev</span>
                <span className="truncate text-xs">Plataforma Dev</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.key)}
                    isActive={activeTab === item.key}
                    tooltip={item.title}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Estatísticas</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2">
              {quickStats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between px-2 py-1 text-sm">
                  <span className="text-sidebar-foreground/70">{stat.label}</span>
                  <span className="font-medium">{stat.value}</span>
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Favoritos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Heart className="size-4" />
                  <span>Meus Snippets</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <BookOpen className="size-4" />
                  <span>Aulas Salvas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Star className="size-4" />
                  <span>Projetos Favoritos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Avatar className="size-6">
                <AvatarImage src="/placeholder.svg?height=24&width=24" />
                <AvatarFallback>DV</AvatarFallback>
              </Avatar>
              <span>Developer</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export default function DevPlatform() {
  const [activeTab, setActiveTab] = useState("home")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTech, setSelectedTech] = useState("all")
  const [favorites, setFavorites] = useState<string[]>([])
  const [currentScreens, setCurrentScreens] = useState<Record<string, number>>({})
  const [openModalId, setOpenModalId] = useState<string | null>(null)

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]))
  }

  const quickAccessBlocks = [
    { title: "React Hooks", icon: Code2, color: "bg-blue-500", count: "150+ snippets" },
    { title: "Node.js APIs", icon: Code2, color: "bg-green-500", count: "80+ exemplos" },
    { title: "Python Scripts", icon: Code2, color: "bg-yellow-500", count: "200+ códigos" },
    { title: "CSS Animations", icon: Code2, color: "bg-purple-500", count: "60+ efeitos" },
  ]

  const featuredVideos = [
    { title: "React do Zero ao Avançado", duration: "12h", progress: 65, instructor: "João Silva" },
    { title: "Node.js e Express", duration: "8h", progress: 30, instructor: "Maria Santos" },
    { title: "Python para Data Science", duration: "15h", progress: 0, instructor: "Carlos Lima" },
  ]

  const featuredProjects = [
    {
      title: "E-commerce Completo",
      tech: ["React", "Node.js", "MongoDB"],
      difficulty: "Avançado",
      stars: 1250,
      description: "Sistema completo de e-commerce com carrinho, pagamentos e admin",
    },
    {
      title: "Dashboard Analytics",
      tech: ["Vue.js", "Chart.js", "Firebase"],
      difficulty: "Intermediário",
      stars: 890,
      description: "Dashboard responsivo com gráficos e métricas em tempo real",
    },
    {
      title: "API REST com Auth",
      tech: ["Express", "JWT", "PostgreSQL"],
      difficulty: "Intermediário",
      stars: 650,
      description: "API completa com autenticação, validação e documentação",
    },
  ]

  const codeSnippets = [
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

  static findByEmail(email: string): User | undefined {
    const userData = this.users.find(u => u.email === email);
    if (!userData) return undefined;
    
    return new User(
      userData.id,
      userData.email,
      userData.password,
      userData.name,
      userData.role,
      userData.createdAt
    );
  }

  static findById(id: string): User | undefined {
    const userData = this.users.find(u => u.id === id);
    if (!userData) return undefined;
    
    return new User(
      userData.id,
      userData.email,
      userData.password,
      userData.name,
      userData.role,
      userData.createdAt
    );
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

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      createdAt: this.createdAt
    };
  }
}`,
        },
        {
          name: "Controller",
          description: "Controladores para registro, login e autenticação",
          code: `import { Request, Response } from 'express';
import { User } from '../models/User';
import { body, validationResult } from 'express-validator';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;
      
      const existingUser = User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }

      const user = await User.create({ email, password, name, role: 'user' });
      const token = user.generateToken();
      
      res.status(201).json({
        message: 'Usuário criado com sucesso',
        token,
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      const user = User.findByEmail(email);
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      const token = user.generateToken();
      
      res.json({
        message: 'Login realizado com sucesso',
        token,
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const user = User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      res.json({ user: user.toJSON() });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
}

// Validações
export const registerValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('name').notEmpty().withMessage('Nome é obrigatório')
];

export const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Senha é obrigatória')
];`,
        },
        {
          name: "Middleware",
          description: "Middleware de autenticação e validação",
          code: `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(401).json({ message: 'Token inválido' });
  }
};

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado - Apenas admins' });
  }
  next();
};

// Middleware de rate limiting simples
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientIp);
    
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientIp, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        message: 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    clientData.count++;
    next();
  };
};

// Middleware de logging
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(\`\${req.method} \${req.path} - \${res.statusCode} - \${duration}ms\`);
  });
  
  next();
};`,
        },
      ],
    },
    {
      id: "2",
      title: "CRUD Completo React + TypeScript",
      tech: "React",
      language: "typescript",
      description: "Sistema CRUD completo com hooks customizados e componentes reutilizáveis",
      screens: [
        {
          name: "Hook",
          description: "Hook customizado para operações CRUD",
          code: `import { useState, useEffect, useCallback } from 'react';

interface CrudItem {
  id: string;
  [key: string]: any;
}

interface UseCrudOptions<T> {
  apiUrl: string;
  initialData?: T[];
}

export function useCrud<T extends CrudItem>({ apiUrl, initialData = [] }: UseCrudOptions<T>) {
  const [items, setItems] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Erro ao buscar dados');
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const createItem = useCallback(async (newItem: Omit<T, 'id'>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) throw new Error('Erro ao criar item');
      const createdItem = await response.json();
      setItems(prev => [...prev, createdItem]);
      return createdItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const updateItem = useCallback(async (id: string, updates: Partial<T>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(\`\${apiUrl}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Erro ao atualizar item');
      const updatedItem = await response.json();
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
      return updatedItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const deleteItem = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(\`\${apiUrl}/\${id}\`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao deletar item');
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

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
    refetch: fetchItems,
  };
}`,
        },
        {
          name: "Component",
          description: "Componente principal da lista CRUD",
          code: `import React, { useState } from 'react';
import { useCrud } from './useCrud';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function UserList() {
  const { items: users, loading, error, createItem, updateItem, deleteItem } = useCrud<User>({
    apiUrl: '/api/users'
  });
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (userData: Omit<User, 'id'>) => {
    try {
      if (editingUser) {
        await updateItem(editingUser.id, userData);
        setEditingUser(null);
      } else {
        await createItem(userData);
      }
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja deletar este usuário?')) {
      try {
        await deleteItem(id);
      } catch (error) {
        console.error('Erro ao deletar usuário:', error);
      }
    }
  };

  if (loading) return <div className="text-center p-4">Carregando...</div>;
  if (error) return <div className="text-red-500 p-4">Erro: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Novo Usuário
        </button>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <div key={user.id} className="border rounded-lg p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{user.name}</h3>
              <p className="text-gray-600">{user.email}</p>
              <span className="text-sm bg-gray-100 px-2 py-1 rounded">{user.role}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(user)}
                className="text-blue-500 hover:text-blue-700"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(user.id)}
                className="text-red-500 hover:text-red-700"
              >
                Deletar
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <UserForm
          user={editingUser}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}`,
        },
        {
          name: "Form",
          description: "Formulário reutilizável para criar/editar",
          code: `import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserFormProps {
  user?: User | null;
  onSubmit: (userData: Omit<User, 'id'>) => void;
  onCancel: () => void;
}

export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.role) {
      newErrors.role = 'Role é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {user ? 'Editar Usuário' : 'Novo Usuário'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={\`w-full border rounded px-3 py-2 \${errors.name ? 'border-red-500' : 'border-gray-300'}\`}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={\`w-full border rounded px-3 py-2 \${errors.email ? 'border-red-500' : 'border-gray-300'}\`}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={\`w-full border rounded px-3 py-2 \${errors.role ? 'border-red-500' : 'border-gray-300'}\`}
            >
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
              <option value="moderator">Moderador</option>
            </select>
            {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              {user ? 'Atualizar' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}`,
        },
      ],
    },
    {
      id: "3",
      title: "API REST com Validação",
      tech: "Python",
      language: "python",
      description: "API REST completa com FastAPI, validação e documentação automática",
      screens: [
        {
          name: "Models",
          description: "Modelos Pydantic para validação de dados",
          code: `from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.USER
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Nome não pode estar vazio')
        return v.strip()

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def password_validation(cls, v):
        if len(v) < 6:
            raise ValueError('Senha deve ter pelo menos 6 caracteres')
        return v

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[UserRole] = None
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Nome não pode estar vazio')
        return v.strip() if v else v

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserList(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int
    
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class LoginRequest(BaseModel):
    email: EmailStr
    password: str`,
        },
        {
          name: "Routes",
          description: "Rotas da API com validação e documentação",
          code: `from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import List, Optional
import math

from .models import UserCreate, UserUpdate, UserResponse, UserList, LoginRequest, Token
from .database import get_db
from .auth import get_current_user, create_access_token, verify_password
from .crud import UserCRUD

router = APIRouter(prefix="/api/users", tags=["users"])
security = HTTPBearer()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Registra um novo usuário no sistema.
    
    - **email**: Email único do usuário
    - **name**: Nome completo do usuário
    - **password**: Senha com pelo menos 6 caracteres
    - **role**: Role do usuário (user, admin, moderator)
    """
    # Verificar se email já existe
    if UserCRUD.get_by_email(db, user_data.email):
        throw HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    
    user = UserCRUD.create(db, user_data)
    return user

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Autentica um usuário e retorna um token de acesso.
    """
    user = UserCRUD.get_by_email(db, login_data.email)
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas"
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 3600
    }

@router.get("/", response_model=UserList)
async def list_users(
    page: int = Query(1, ge=1, description="Número da página"),
    per_page: int = Query(10, ge=1, le=100, description="Itens por página"),
    search: Optional[str] = Query(None, description="Buscar por nome ou email"),
    role: Optional[str] = Query(None, description="Filtrar por role"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista usuários com paginação e filtros.
    
    Requer autenticação.
    """
    users, total = UserCRUD.get_multi(
        db, 
        skip=(page - 1) * per_page,
        limit=per_page,
        search=search,
        role=role
    )
    
    return UserList(
        users=users,
        total=total,
        page=page,
        per_page=per_page
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Busca um usuário específico por ID.
    """
    user = UserCRUD.get(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Atualiza dados de um usuário.
    
    Apenas o próprio usuário ou admins podem atualizar.
    """
    user = UserCRUD.get(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    # Verificar permissões
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para atualizar este usuário"
        )
    
    updated_user = UserCRUD.update(db, user_id, user_data)
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove um usuário do sistema.
    
    Apenas admins podem deletar usuários.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas admins podem deletar usuários"
        )
    
    user = UserCRUD.get(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    UserCRUD.delete(db, user_id)
    return None`,
        },
        {
          name: "CRUD",
          description: "Operações de banco de dados",
          code: `from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Tuple
from passlib.context import CryptContext

from .database import User as UserModel
from .models import UserCreate, UserUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserCRUD:
    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)
    
    @staticmethod
    def create(db: Session, user_data: UserCreate) -> UserModel:
        """Cria um novo usuário"""
        password_hash = UserCRUD.get_password_hash(user_data.password)
        
        db_user = UserModel(
            email=user_data.email,
            name=user_data.name,
            role=user_data.role,
            password_hash=password_hash
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def get(db: Session, user_id: int) -> Optional[UserModel]:
        """Busca usuário por ID"""
        return db.query(UserModel).filter(UserModel.id == user_id).first()
    
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[UserModel]:
        """Busca usuário por email"""
        return db.query(UserModel).filter(UserModel.email == email).first()
    
    @staticmethod
    def get_multi(
        db: Session,
        skip: int = 0,
        limit: int = 10,
        search: Optional[str] = None,
        role: Optional[str] = None
    ) -> Tuple[List[UserModel], int]:
        """Lista usuários com filtros e paginação"""
        query = db.query(UserModel)
        
        # Aplicar filtros
        filters = []
        
        if search:
            search_filter = or_(
                UserModel.name.ilike(f"%{search}%"),
                UserModel.email.ilike(f"%{search}%")
            )
            filters.append(search_filter)
        
        if role:
            filters.append(UserModel.role == role)
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Contar total
        total = query.count()
        
        # Aplicar paginação
        users = query.offset(skip).limit(limit).all()
        
        return users, total
    
    @staticmethod
    def update(db: Session, user_id: int, user_data: UserUpdate) -> Optional[UserModel]:
        """Atualiza dados do usuário"""
        db_user = UserCRUD.get(db, user_id)
        if not db_user:
            return None
        
        update_data = user_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(db_user, field, value)
        
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def delete(db: Session, user_id: int) -> bool:
        """Remove usuário"""
        db_user = UserCRUD.get(db, user_id)
        if not db_user:
            return False
        
        db.delete(db_user)
        db.commit()
        return True
    
    @staticmethod
    def update_last_login(db: Session, user_id: int) -> None:
        """Atualiza último login do usuário"""
        from datetime import datetime
        
        db_user = UserCRUD.get(db, user_id)
        if db_user:
            db_user.last_login = datetime.utcnow()
            db.commit()
    
    @staticmethod
    def get_active_users(db: Session) -> List[UserModel]:
        """Retorna usuários ativos (logaram nos últimos 30 dias)"""
        from datetime import datetime, timedelta
        
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        return db.query(UserModel).filter(
            UserModel.last_login >= thirty_days_ago
        ).all()
    
    @staticmethod
    def count_by_role(db: Session) -> dict:
        """Conta usuários por role"""
        from sqlalchemy import func
        
        result = db.query(
            UserModel.role,
            func.count(UserModel.id).label('count')
        ).group_by(UserModel.role).all()
        
        return {role: count for role, count in result}`,
        },
      ],
    },
    {
      id: "dashboard-metrics",
      title: "Cards de Métricas Dashboard",
      tech: "React",
      language: "typescript",
      description: "Componentes para exibir KPIs principais do dashboard",
      screens: [
        {
          name: "Installation",
          description: "Dependências e configuração inicial",
          code: `# 1. Instalar Dependências
npm install @radix-ui/react-slot lucide-react class-variance-authority

# 2. Configurar Tailwind CSS
# Certifique-se de que o Tailwind CSS está configurado no seu projeto

# 3. Adicionar Componentes
# Copie os componentes Card e Button do shadcn/ui para seu projeto

# 4. Implementar API
# Crie o endpoint /api/dashboard conforme mostrado na aba API`,
        },
        {
          name: "Component",
          description: "Componente principal dos cards de métricas",
          code: `import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, Percent } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: 'revenue' | 'users' | 'conversion';
}

const iconMap = {
  revenue: TrendingUp,
  users: Users,
  conversion: Percent,
};

const colorMap = {
  positive: {
    text: 'text-green-600',
    bg: 'bg-green-100',
    icon: 'text-green-600'
  },
  negative: {
    text: 'text-red-600',
    bg: 'bg-red-100',
    icon: 'text-red-600'
  },
  neutral: {
    text: 'text-gray-600',
    bg: 'bg-gray-100',
    icon: 'text-gray-600'
  }
};

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon 
}: MetricCardProps) {
  const IconComponent = iconMap[icon];
  const colors = colorMap[changeType];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={\`h-12 w-12 \${colors.bg} rounded-full flex items-center justify-center\`}>
            <IconComponent className={\`h-6 w-6 \${colors.icon}\`} />
          </div>
        </div>
        <p className={\`text-xs \${colors.text} mt-2\`}>{change}</p>
      </CardContent>
    </Card>
  );
}

// Uso do componente
export function DashboardMetrics() {
  const metrics = [
    {
      title: "Receita Total",
      value: "R$ 45.231,89",
      change: "+20.1% em relação ao mês anterior",
      changeType: "positive" as const,
      icon: "revenue" as const
    },
    {
      title: "Novos Usuários",
      value: "+2,350",
      change: "+180 nas últimas 24 horas",
      changeType: "positive" as const,
      icon: "users" as const
    },
    {
      title: "Taxa de Conversão",
      value: "3.2%",
      change: "+0.4% em relação à semana anterior",
      changeType: "positive" as const,
      icon: "conversion" as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}`,
        },
        {
          name: "Types",
          description: "Definições de tipos TypeScript",
          code: `// types/dashboard.ts
export interface DashboardMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: 'revenue' | 'users' | 'conversion' | 'orders';
  format: 'currency' | 'number' | 'percentage';
}

export interface DashboardData {
  metrics: DashboardMetric[];
  charts: ChartData[];
  tables: TableData[];
  lastUpdated: Date;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
}

export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: Array<Record<string, any>>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// Utility types
export type MetricChangeType = 'positive' | 'negative' | 'neutral';
export type MetricIconType = 'revenue' | 'users' | 'conversion' | 'orders';
export type MetricFormatType = 'currency' | 'number' | 'percentage';`,
        },
        {
          name: "Hooks",
          description: "Hook customizado para buscar dados do dashboard",
          code: `import { useState, useEffect } from 'react';
import { DashboardData, DashboardMetric } from '../types/dashboard';

interface UseDashboardOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export function useDashboard(options: UseDashboardOptions = {}) {
  const { refreshInterval = 30000, autoRefresh = true } = options;
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do dashboard');
      }
      
      const dashboardData = await response.json();
      setData(dashboardData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, autoRefresh]);

  const refreshData = () => {
    fetchDashboardData();
  };

  return {
    data,
    loading,
    error,
    lastUpdated,
    refreshData,
  };
}`,
        },
        {
          name: "API",
          description: "Endpoint da API para dados do dashboard",
          code: `// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { DashboardData } from '@/types/dashboard';

export async function GET() {
  try {
    // Simular busca de dados do banco
    const dashboardData: DashboardData = {
      metrics: [
        {
          id: '1',
          title: 'Receita Total',
          value: 'R$ 45.231,89',
          change: 20.1,
          changeType: 'positive',
          icon: 'revenue',
          format: 'currency'
        },
        {
          id: '2',
          title: 'Novos Usuários',
          value: '+2,350',
          change: 15.3,
          changeType: 'positive',
          icon: 'users',
          format: 'number'
        },
        {
          id: '3',
          title: 'Taxa de Conversão',
          value: '3.2%',
          change: 0.4,
          changeType: 'positive',
          icon: 'conversion',
          format: 'percentage'
        }
      ],
      charts: [],
      tables: [],
      lastUpdated: new Date()
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}`,
        },
      ],
    },
  ]

  const filteredSnippets = codeSnippets.filter((snippet) => {
    const matchesSearch =
      snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      snippet.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTech = selectedTech === "all" || snippet.tech.toLowerCase() === selectedTech.toLowerCase()
    return matchesSearch && matchesTech
  })

  const videoLessons = [
    {
      id: "1",
      title: "Introdução ao React",
      description: "Conceitos básicos e setup do ambiente",
      duration: "30min",
      chapter: 1,
      completed: true,
      track: "React Fundamentals",
    },
    {
      id: "2",
      title: "Componentes e Props",
      description: "Aprenda a criar componentes reutilizáveis",
      duration: "45min",
      chapter: 2,
      completed: true,
      track: "React Fundamentals",
    },
    {
      id: "3",
      title: "Estado e Eventos",
      description: "Gerenciamento de estado e manipulação de eventos",
      duration: "60min",
      chapter: 3,
      completed: false,
      track: "React Fundamentals",
    },
    {
      id: "4",
      title: "Hooks em React",
      description: "Aprenda a usar hooks para gerenciar o estado e o ciclo de vida",
      duration: "75min",
      chapter: 1,
      completed: false,
      track: "React Avançado",
    },
    {
      id: "5",
      title: "Context API",
      description: "Compartilhamento de estado entre componentes",
      duration: "90min",
      chapter: 2,
      completed: false,
      track: "React Avançado",
    },
  ]

  const projectTemplates = [
    {
      id: "1",
      title: "E-commerce React",
      description: "Template completo de e-commerce com React e Firebase",
      tech: ["React", "Firebase", "Stripe"],
      difficulty: "Avançado",
      stars: 1250,
      downloads: "5.2k",
      requirements: ["Node.js v16+", "Firebase Account", "Stripe Account"],
    },
    {
      id: "2",
      title: "Dashboard Admin Vue",
      description: "Template de dashboard administrativo com Vue.js e Tailwind CSS",
      tech: ["Vue.js", "Tailwind CSS", "Chart.js"],
      difficulty: "Intermediário",
      stars: 890,
      downloads: "3.8k",
      requirements: ["Node.js v16+", "Vue CLI"],
    },
    {
      id: "3",
      title: "API REST Node.js",
      description: "Template de API REST com Node.js, Express e MongoDB",
      tech: ["Node.js", "Express", "MongoDB"],
      difficulty: "Intermediário",
      stars: 650,
      downloads: "2.5k",
      requirements: ["Node.js v16+", "MongoDB Atlas Account"],
    },
  ]

  return (
    <SidebarProvider>
      <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger />
                  <div className="flex items-center space-x-2">
                    <Zap className="h-8 w-8 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">10xDev</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Todo o conteúdo das abas permanece exatamente igual */}
            {activeTab === "home" && (
              <div className="space-y-8">
                {/* Hero Section */}
                <div className="text-center space-y-4">
                  <h1 className="text-4xl font-bold text-gray-900">Acelere seu desenvolvimento com códigos prontos</h1>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Acesse milhares de snippets, videoaulas organizadas e templates de projetos para turbinar sua
                    produtividade como desenvolvedor.
                  </p>
                </div>

                {/* Quick Access Blocks */}
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Acesso Rápido por Linguagem</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {quickAccessBlocks.map((block, index) => (
                      <Card
                        key={index}
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => {
                          if (block.title === "Node.js APIs") {
                            setActiveTab("codes")
                            setSelectedTech("node.js")
                          }
                        }}
                      >
                        <CardContent className="p-6">
                          <div className={`w-12 h-12 ${block.color} rounded-lg flex items-center justify-center mb-4`}>
                            <block.icon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="font-semibold text-lg mb-2">{block.title}</h3>
                          <p className="text-gray-600 text-sm">{block.count}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Featured Videos */}
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Videoaulas em Destaque</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {featuredVideos.map((video, index) => (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{video.title}</CardTitle>
                          <CardDescription>
                            Por {video.instructor} • {video.duration}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progresso</span>
                              <span>{video.progress}%</span>
                            </div>
                            <Progress value={video.progress} className="h-2" />
                          </div>
                          <Button className="w-full mt-4" variant={video.progress > 0 ? "default" : "outline"}>
                            <Play className="h-4 w-4 mr-2" />
                            {video.progress > 0 ? "Continuar" : "Começar"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Featured Projects */}
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Projetos em Destaque</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {featuredProjects.map((project, index) => (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg">{project.title}</CardTitle>
                            <Badge variant="secondary">{project.difficulty}</Badge>
                          </div>
                          <CardDescription>{project.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              {project.tech.map((tech, techIndex) => (
                                <Badge key={techIndex} variant="outline">
                                  {tech}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm">{project.stars}</span>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (project.title === "Dashboard Analytics") {
                                      setActiveTab("dashboard")
                                    }
                                  }}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Acessar
                                </Button>
                                <Button size="sm">
                                  <GitBranch className="h-4 w-4 mr-2" />
                                  Clonar
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Codes Tab */}
            {activeTab === "codes" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-2 text-sm mb-2">
                      <button
                        onClick={() => {
                          setSelectedTech("all")
                          setSearchTerm("")
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        Biblioteca de Códigos
                      </button>
                      {selectedTech !== "all" && (
                        <>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900 font-medium capitalize">{selectedTech}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar snippets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Select value={selectedTech} onValueChange={setSelectedTech}>
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
                  {filteredSnippets.map((snippet) => {
                    const currentScreen = currentScreens[snippet.id] || 0
                    const screen = snippet.screens[currentScreen]

                    return (
                      <Card key={snippet.id} className="hover:shadow-lg transition-shadow h-64">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-base">{snippet.title}</CardTitle>
                              <CardDescription className="text-sm line-clamp-2">{snippet.description}</CardDescription>
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
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-xs">
                                {snippet.tech}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {snippet.language}
                              </Badge>
                            </div>

                            <div className="bg-gray-900 rounded-md p-3 h-32 overflow-hidden relative group">
                              <pre className="text-xs text-gray-100 leading-tight">
                                <code>{snippet.screens[0]?.code.slice(0, 200)}...</code>
                              </pre>
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity"></div>
                              <div className="absolute bottom-2 right-2 text-xs text-gray-400 group-hover:text-gray-300">
                                {snippet.screens.length} arquivo{snippet.screens.length > 1 ? "s" : ""}
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-1">
                              <span className="text-xs text-gray-500">{snippet.screens[0]?.name}</span>
                              <Button size="sm" variant="outline" className="h-6 text-xs px-2">
                                <Code2 className="h-3 w-3 mr-1" />
                                Ver código
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Lessons Tab */}
            {activeTab === "lessons" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-bold text-gray-900">Videoaulas</h1>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium">Progresso: 45%</span>
                    </div>
                    <Progress value={45} className="w-32" />
                  </div>
                </div>

                <Tabs defaultValue="react-fundamentals" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="react-fundamentals">React Fundamentals</TabsTrigger>
                    <TabsTrigger value="react-advanced">React Avançado</TabsTrigger>
                    <TabsTrigger value="node-backend">Node.js Backend</TabsTrigger>
                  </TabsList>

                  <TabsContent value="react-fundamentals" className="space-y-4">
                    {videoLessons
                      .filter((lesson) => lesson.track === "React Fundamentals")
                      .map((lesson) => (
                        <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    lesson.completed ? "bg-green-500" : "bg-gray-200"
                                  }`}
                                >
                                  {lesson.completed ? (
                                    <span className="text-white font-bold">✓</span>
                                  ) : (
                                    <span className="text-gray-600 font-bold">{lesson.chapter}</span>
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">{lesson.title}</h3>
                                  <p className="text-gray-600">{lesson.description}</p>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">{lesson.duration}</span>
                                    </div>
                                    <Badge variant="outline">Capítulo {lesson.chapter}</Badge>
                                  </div>
                                </div>
                              </div>
                              <Button variant={lesson.completed ? "outline" : "default"}>
                                <Play className="h-4 w-4 mr-2" />
                                {lesson.completed ? "Revisar" : "Assistir"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </TabsContent>

                  <TabsContent value="react-advanced" className="space-y-4">
                    {videoLessons
                      .filter((lesson) => lesson.track === "React Avançado")
                      .map((lesson) => (
                        <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    lesson.completed ? "bg-green-500" : "bg-gray-200"
                                  }`}
                                >
                                  {lesson.completed ? (
                                    <span className="text-white font-bold">✓</span>
                                  ) : (
                                    <span className="text-gray-600 font-bold">{lesson.chapter}</span>
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">{lesson.title}</h3>
                                  <p className="text-gray-600">{lesson.description}</p>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-4 w-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">{lesson.duration}</span>
                                    </div>
                                    <Badge variant="outline">Capítulo {lesson.chapter}</Badge>
                                  </div>
                                </div>
                              </div>
                              <Button variant={lesson.completed ? "outline" : "default"}>
                                <Play className="h-4 w-4 mr-2" />
                                {lesson.completed ? "Revisar" : "Assistir"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </TabsContent>

                  <TabsContent value="node-backend">
                    <Card>
                      <CardContent className="p-6 text-center">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Em breve</h3>
                        <p className="text-gray-600">Trilha de Node.js Backend em desenvolvimento</p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Projects Tab */}
            {activeTab === "projects" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-bold text-gray-900">Templates de Projetos</h1>
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">+50k downloads este mês</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {projectTemplates.map((project) => (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-xl font-semibold">{project.title}</h3>
                                <p className="text-gray-600 mt-1">{project.description}</p>
                              </div>
                              <Badge variant="secondary">{project.difficulty}</Badge>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {project.tech.map((tech, techIndex) => (
                                <Badge key={techIndex} variant="outline">
                                  {tech}
                                </Badge>
                              ))}
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Requisitos do Projeto:</h4>
                              <ul className="space-y-1">
                                {project.requirements.map((req, index) => (
                                  <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                    <span>{req}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-1">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm font-medium">{project.stars}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Download className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{project.downloads}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Button className="w-full">
                                <GitBranch className="h-4 w-4 mr-2" />
                                Clonar Repositório
                              </Button>
                              <Button variant="outline" className="w-full">
                                <Download className="h-4 w-4 mr-2" />
                                Download ZIP
                              </Button>
                            </div>

                            <div className="text-xs text-gray-500 text-center">
                              Inclui documentação completa e guia de setup
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {/* AI Integration Tab */}
            {activeTab === "ai" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-bold text-gray-900">Integrando com IA</h1>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <span className="text-sm text-gray-600">Potencialize seu desenvolvimento</span>
                  </div>
                </div>

                {/* AI Categories */}
                <Tabs defaultValue="automation" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="automation">
                      <Workflow className="h-4 w-4 mr-2" />
                      Automação
                    </TabsTrigger>
                    <TabsTrigger value="cursor">
                      <FileCode className="h-4 w-4 mr-2" />
                      Cursor Rules
                    </TabsTrigger>
                    <TabsTrigger value="servers">
                      <Server className="h-4 w-4 mr-2" />
                      MCP Servers
                    </TabsTrigger>
                    <TabsTrigger value="tips">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Dicas & Truques
                    </TabsTrigger>
                  </TabsList>

                  {/* Automation Tab Content */}
                  <TabsContent value="automation" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Bot className="h-5 w-5 mr-2 text-purple-500" />
                            Introdução ao n8n
                          </CardTitle>
                          <CardDescription>Aprenda a criar fluxos de automação com IA</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="aspect-video bg-slate-200 rounded-md mb-4 flex items-center justify-center">
                            <Play className="h-12 w-12 text-slate-400" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Duração: 45min</span>
                              <span>Nível: Iniciante</span>
                            </div>
                            <Button className="w-full">
                              <Play className="h-4 w-4 mr-2" />
                              Assistir Aula
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Workflow className="h-5 w-5 mr-2 text-purple-500" />
                            Fluxos de Trabalho com GPT
                          </CardTitle>
                          <CardDescription>Integre o ChatGPT em seus fluxos de automação</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="aspect-video bg-slate-200 rounded-md mb-4 flex items-center justify-center">
                            <Play className="h-12 w-12 text-slate-400" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Duração: 60min</span>
                              <span>Nível: Intermediário</span>
                            </div>
                            <Button className="w-full">
                              <Play className="h-4 w-4 mr-2" />
                              Assistir Aula
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="md:col-span-2">
                        <CardHeader>
                          <CardTitle>Projetos de Automação com IA</CardTitle>
                          <CardDescription>Templates prontos para acelerar sua integração</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              {
                                title: "Gerador de Conteúdo",
                                description: "Automatize a criação de posts para redes sociais com IA",
                                tech: ["n8n", "OpenAI", "Twitter API"],
                              },
                              {
                                title: "Análise de Sentimento",
                                description: "Monitore menções da sua marca e analise o sentimento",
                                tech: ["n8n", "HuggingFace", "Slack"],
                              },
                              {
                                title: "Resumo de Reuniões",
                                description: "Transcreva e resuma automaticamente suas reuniões",
                                tech: ["n8n", "Whisper", "GPT-4"],
                              },
                            ].map((project, index) => (
                              <Card key={index}>
                                <CardContent className="p-4">
                                  <h3 className="font-medium mb-2">{project.title}</h3>
                                  <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {project.tech.map((tech, techIndex) => (
                                      <Badge key={techIndex} variant="outline" className="text-xs">
                                        {tech}
                                      </Badge>
                                    ))}
                                  </div>
                                  <Button size="sm" className="w-full">
                                    <Download className="h-3 w-3 mr-2" />
                                    Importar
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Cursor Rules Tab Content */}
                  <TabsContent value="cursor" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Cursor Rules para Desenvolvimento</CardTitle>
                        <CardDescription>
                          Regras otimizadas para aumentar sua produtividade com o Cursor AI
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            {
                              name: "Clean Code Expert",
                              description: "Otimiza seu código seguindo princípios de Clean Code",
                              language: "Todas",
                              rule: "Atue como um especialista em Clean Code. Analise meu código e sugira melhorias seguindo os princípios SOLID, DRY e KISS. Identifique code smells e forneça refatorações específicas.",
                            },
                            {
                              name: "React Component Builder",
                              description: "Cria componentes React otimizados e com boas práticas",
                              language: "React",
                              rule: "Crie componentes React seguindo as melhores práticas. Use hooks apropriados, evite re-renderizações desnecessárias, e organize o código de forma modular. Adicione comentários explicativos e tipos TypeScript.",
                            },
                            {
                              name: "API Documentation",
                              description: "Gera documentação detalhada para APIs",
                              language: "Backend",
                              rule: "Gere documentação completa para esta API. Inclua descrição dos endpoints, parâmetros, respostas, códigos de status, exemplos de requisição e resposta em formato JSON, e possíveis erros.",
                            },
                            {
                              name: "Test Generator",
                              description: "Cria testes unitários e de integração",
                              language: "Todas",
                              rule: "Gere testes abrangentes para este código. Inclua testes unitários para funções individuais e testes de integração para fluxos completos. Use mocks quando apropriado e cubra casos de borda e exceções.",
                            },
                          ].map((rule, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-medium">{rule.name}</h3>
                                  <p className="text-sm text-gray-600">{rule.description}</p>
                                </div>
                                <Badge>{rule.language}</Badge>
                              </div>
                              <div className="bg-gray-100 rounded-md p-3 text-sm font-mono mb-3">{rule.rule}</div>
                              <div className="flex justify-end">
                                <Button size="sm" variant="outline">
                                  <Code2 className="h-4 w-4 mr-2" />
                                  Copiar Rule
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* MCP Servers Tab Content */}
                  <TabsContent value="servers" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>MCP Servers Recomendados</CardTitle>
                        <CardDescription>Servidores otimizados para desenvolvimento com IA</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="text-left p-3 border">Nome</th>
                                  <th className="text-left p-3 border">Modelos</th>
                                  <th className="text-left p-3 border">Latência</th>
                                  <th className="text-left p-3 border">Custo</th>
                                  <th className="text-left p-3 border">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  {
                                    name: "FastGPT Server",
                                    models: ["GPT-4o", "Claude 3", "Llama 3"],
                                    latency: "Baixa",
                                    cost: "$$",
                                    url: "#",
                                  },
                                  {
                                    name: "DevAI Hub",
                                    models: ["GPT-4o", "Mixtral", "CodeLlama"],
                                    latency: "Média",
                                    cost: "$",
                                    url: "#",
                                  },
                                  {
                                    name: "CodeForge MCP",
                                    models: ["GPT-4o", "Claude 3 Opus", "Llama 3"],
                                    latency: "Muito Baixa",
                                    cost: "$$$",
                                    url: "#",
                                  },
                                  {
                                    name: "AIDevTools",
                                    models: ["GPT-3.5", "Llama 2", "Mistral"],
                                    latency: "Baixa",
                                    cost: "Gratuito",
                                    url: "#",
                                  },
                                ].map((server, index) => (
                                  <tr key={index} className="border-b hover:bg-gray-50">
                                    <td className="p-3 border">{server.name}</td>
                                    <td className="p-3 border">
                                      <div className="flex flex-wrap gap-1">
                                        {server.models.map((model, modelIndex) => (
                                          <Badge key={modelIndex} variant="outline" className="text-xs">
                                            {model}
                                          </Badge>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="p-3 border">{server.latency}</td>
                                    <td className="p-3 border">{server.cost}</td>
                                    <td className="p-3 border">
                                      <Button size="sm">
                                        <Server className="h-4 w-4 mr-2" />
                                        Conectar
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm">
                            <h4 className="font-medium text-blue-800 mb-1">Como conectar ao MCP Server</h4>
                            <p className="text-blue-700">
                              Configure seu editor Cursor ou VS Code para usar estes servidores MCP e aproveite modelos
                              de IA mais rápidos e personalizados para desenvolvimento.
                            </p>
                            <Button size="sm" variant="link" className="p-0 mt-2 text-blue-600">
                              Ver tutorial completo
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tips & Tricks Tab Content */}
                  <TabsContent value="tips" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Dicas para Prompts Eficientes</CardTitle>
                          <CardDescription>Otimize suas interações com IA</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {[
                              {
                                title: "Seja específico com contexto",
                                description: "Forneça detalhes sobre o projeto, tecnologias e requisitos específicos.",
                              },
                              {
                                title: "Use exemplos concretos",
                                description: "Demonstre o formato de saída desejado com exemplos claros.",
                              },
                              {
                                title: "Divida tarefas complexas",
                                description: "Quebre problemas grandes em etapas menores e sequenciais.",
                              },
                              {
                                title: "Refine iterativamente",
                                description: "Use os resultados anteriores para melhorar prompts subsequentes.",
                              },
                            ].map((tip, index) => (
                              <div key={index} className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-medium">
                                  {index + 1}
                                </div>
                                <div>
                                  <h4 className="font-medium">{tip.title}</h4>
                                  <p className="text-sm text-gray-600">{tip.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Ferramentas Recomendadas</CardTitle>
                          <CardDescription>Potencialize seu fluxo de trabalho com IA</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {[
                              {
                                name: "Cursor IDE",
                                description: "Editor de código com IA integrada para desenvolvimento acelerado",
                                url: "https://cursor.sh",
                              },
                              {
                                name: "GitHub Copilot",
                                description: "Assistente de codificação baseado em IA da GitHub",
                                url: "https://github.com/features/copilot",
                              },
                              {
                                name: "n8n",
                                description: "Plataforma de automação de fluxo de trabalho com suporte a IA",
                                url: "https://n8n.io",
                              },
                              {
                                name: "Codeium",
                                description: "Alternativa gratuita ao Copilot com recursos avançados",
                                url: "https://codeium.com",
                              },
                            ].map((tool, index) => (
                              <div key={index} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-md">
                                <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                                  {tool.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium">{tool.name}</h4>
                                  <p className="text-sm text-gray-600">{tool.description}</p>
                                </div>
                                <Button size="sm" variant="outline" asChild>
                                  <a href={tool.url} target="_blank" rel="noopener noreferrer">
                                    Visitar
                                  </a>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="md:col-span-2">
                        <CardHeader>
                          <CardTitle>Recursos de Aprendizado</CardTitle>
                          <CardDescription>Aprofunde seus conhecimentos em desenvolvimento com IA</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                              {
                                title: "Curso: Prompt Engineering para Desenvolvedores",
                                type: "Curso",
                                duration: "4 horas",
                                level: "Intermediário",
                              },
                              {
                                title: "Webinar: Integrando GPT-4 em Aplicações Web",
                                type: "Webinar",
                                duration: "90 minutos",
                                level: "Avançado",
                              },
                              {
                                title: "Guia: Otimizando Custos com APIs de IA",
                                type: "E-book",
                                duration: "45 páginas",
                                level: "Todos os níveis",
                              },
                            ].map((resource, index) => (
                              <Card key={index}>
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary">{resource.type}</Badge>
                                    <Badge variant="outline">{resource.level}</Badge>
                                  </div>
                                  <h3 className="font-medium mb-2">{resource.title}</h3>
                                  <div className="flex items-center text-sm text-gray-600 mb-3">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {resource.duration}
                                  </div>
                                  <Button size="sm" className="w-full">
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    Acessar
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Breadcrumb Navigation */}
                <div className="flex items-center space-x-2 text-sm">
                  <button
                    onClick={() => setActiveTab("home")}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Projetos
                  </button>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 font-medium">Dashboard Analytics</span>
                </div>

                <div className="flex gap-6">
                  {/* Sidebar com Funcionalidades */}
                  <div className="w-80 space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Funcionalidades</CardTitle>
                        <CardDescription>Componentes do dashboard</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          {
                            id: "overview",
                            title: "Cards de Métricas",
                            description: "Componentes para exibir KPIs principais",
                            icon: "📊",
                            active: true,
                          },
                          {
                            id: "charts",
                            title: "Gráficos Interativos",
                            description: "Charts com Recharts e animações",
                            icon: "📈",
                            active: false,
                          },
                          {
                            id: "tables",
                            title: "Tabelas de Dados",
                            description: "Tabelas responsivas com filtros",
                            icon: "📋",
                            active: false,
                          },
                          {
                            id: "filters",
                            title: "Filtros e Busca",
                            description: "Sistema de filtros avançados",
                            icon: "🔍",
                            active: false,
                          },
                          {
                            id: "export",
                            title: "Exportação",
                            description: "Export para PDF, CSV e Excel",
                            icon: "📤",
                            active: false,
                          },
                          {
                            id: "realtime",
                            title: "Tempo Real",
                            description: "WebSockets e atualizações live",
                            icon: "⚡",
                            active: false,
                          },
                        ].map((feature) => (
                          <div
                            key={feature.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              feature.active ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <span className="text-lg">{feature.icon}</span>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{feature.title}</h4>
                                <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                              </div>
                              {feature.active && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Stack Tecnológica</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {[
                            { name: "Next.js 15", version: "^15.0.0" },
                            { name: "TypeScript", version: "^5.0.0" },
                            { name: "Tailwind CSS", version: "^3.4.0" },
                            { name: "Recharts", version: "^2.8.0" },
                            { name: "Shadcn/ui", version: "latest" },
                            { name: "Lucide React", version: "^0.400.0" },
                          ].map((tech, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="font-medium">{tech.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {tech.version}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Próximos Passos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {[
                            { task: "Configurar banco de dados", done: true },
                            { task: "Implementar autenticação", done: true },
                            { task: "Criar API endpoints", done: false },
                            { task: "Adicionar testes", done: false },
                            { task: "Deploy em produção", done: false },
                          ].map((step, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <div
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                  step.done ? "bg-green-500 border-green-500" : "border-gray-300"
                                }`}
                              >
                                {step.done && <span className="text-white text-xs">✓</span>}
                              </div>
                              <span className={step.done ? "line-through text-gray-500" : ""}>{step.task}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Área Principal com Código */}
                  <div className="flex-1 space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">Cards de Métricas</h1>
                        <p className="text-gray-600">Componentes para exibir KPIs principais do dashboard</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Code2 className="h-4 w-4 mr-2" />
                          Copiar Código
                        </Button>
                        <Button size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Baixar Projeto
                        </Button>
                      </div>
                    </div>

                    {/* Preview do Componente */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Preview</CardTitle>
                        <CardDescription>Visualização do componente em funcionamento</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600">Receita Total</p>
                                <p className="text-2xl font-bold text-gray-900">R$ 45.231,89</p>
                              </div>
                              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 text-sm">↗</span>
                              </div>
                            </div>
                            <p className="text-xs text-green-600 mt-2">+20.1% em relação ao mês anterior</p>
                          </div>

                          <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600">Novos Usuários</p>
                                <p className="text-2xl font-bold text-gray-900">+2,350</p>
                              </div>
                              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 text-sm">👥</span>
                              </div>
                            </div>
                            <p className="text-xs text-blue-600 mt-2">+180 nas últimas 24 horas</p>
                          </div>

                          <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                                <p className="text-2xl font-bold text-gray-900">3.2%</p>
                              </div>
                              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 text-sm">%</span>
                              </div>
                            </div>
                            <p className="text-xs text-purple-600 mt-2">+0.4% em relação à semana anterior</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Código do Componente */}
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">Implementação</CardTitle>
                            <CardDescription>Código TypeScript + React para os cards de métricas</CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpenModalId("dashboard-metrics")}
                            className="text-gray-500 hover:text-gray-900"
                          >
                            <Maximize2 className="h-4 w-4 mr-1" />
                            Expandir
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Tabs defaultValue="installation" className="w-full">
                          <TabsList>
                            <TabsTrigger value="installation">Instalação</TabsTrigger>
                            <TabsTrigger value="component">Componente</TabsTrigger>
                            <TabsTrigger value="types">Types</TabsTrigger>
                            <TabsTrigger value="hooks">Hooks</TabsTrigger>
                            <TabsTrigger value="api">API</TabsTrigger>
                          </TabsList>
                          <TabsContent value="installation" className="mt-4">
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">1. Instalar Dependências</h4>
                                <div className="bg-gray-100 rounded-md p-3 text-sm font-mono">
                                  npm install @radix-ui/react-slot lucide-react class-variance-authority
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">2. Configurar Tailwind CSS</h4>
                                <div className="bg-gray-100 rounded-md p-3 text-sm">
                                  Certifique-se de que o Tailwind CSS está configurado no seu projeto
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">3. Adicionar Componentes</h4>
                                <div className="bg-gray-100 rounded-md p-3 text-sm">
                                  Copie os componentes Card e Button do shadcn/ui para seu projeto
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">4. Implementar API</h4>
                                <div className="bg-gray-100 rounded-md p-3 text-sm">
                                  Crie o endpoint /api/dashboard conforme mostrado na aba API
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="component" className="mt-4">
                            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                              <pre className="text-sm text-gray-100">
                                <code>{`import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, Percent } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: 'revenue' | 'users' | 'conversion';
}

const iconMap = {
  revenue: TrendingUp,
  users: Users,
  conversion: Percent,
};

const colorMap = {
  positive: {
    text: 'text-green-600',
    bg: 'bg-green-100',
    icon: 'text-green-600'
  },
  negative: {
    text: 'text-red-600',
    bg: 'bg-red-100',
    icon: 'text-red-600'
  },
  neutral: {
    text: 'text-gray-600',
    bg: 'bg-gray-100',
    icon: 'text-gray-600'
  }
};

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon 
}: MetricCardProps) {
  const IconComponent = iconMap[icon];
  const colors = colorMap[changeType];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={\`h-12 w-12 \${colors.bg} rounded-full flex items-center justify-center\`}>
            <IconComponent className={\`h-6 w-6 \${colors.icon}\`} />
          </div>
        </div>
        <p className={\`text-xs \${colors.text} mt-2\`}>{change}</p>
      </CardContent>
    </Card>
  );
}

// Uso do componente
export function DashboardMetrics() {
  const metrics = [
    {
      title: "Receita Total",
      value: "R$ 45.231,89",
      change: "+20.1% em relação ao mês anterior",
      changeType: "positive" as const,
      icon: "revenue" as const
    },
    {
      title: "Novos Usuários",
      value: "+2,350",
      change: "+180 nas últimas 24 horas",
      changeType: "positive" as const,
      icon: "users" as const
    },
    {
      title: "Taxa de Conversão",
      value: "3.2%",
      change: "+0.4% em relação à semana anterior",
      changeType: "positive" as const,
      icon: "conversion" as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}`}</code>
                              </pre>
                            </div>
                          </TabsContent>
                          <TabsContent value="types" className="mt-4">
                            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                              <pre className="text-sm text-gray-100">
                                <code>{`// types/dashboard.ts
export interface DashboardMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: 'revenue' | 'users' | 'conversion' | 'orders';
  format: 'currency' | 'number' | 'percentage';
}

export interface DashboardData {
  metrics: DashboardMetric[];
  charts: ChartData[];
  tables: TableData[];
  lastUpdated: Date;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
}

export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: Array<Record<string, any>>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// Utility types
export type MetricChangeType = 'positive' | 'negative' | 'neutral';
export type MetricIconType = 'revenue' | 'users' | 'conversion' | 'orders';
export type
MetricFormatType = 'currency' | 'number' | 'percentage';`}</code>
                              </pre>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </SidebarInset>
      {/* Code Expansion Modal */}
      {openModalId &&
        codeSnippets.map((snippet) => {
          if (snippet.id === openModalId) {
            return (
              <div
                key={`modal-${snippet.id}`}
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              >
                <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div>
                      <h3 className="text-xl font-semibold">{snippet.title}</h3>
                      <p className="text-gray-600">{snippet.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenModalId(null)}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-x-auto p-4">
                    <div className="flex gap-4 pb-4">
                      {snippet.screens.map((screen, index) => (
                        <div key={index} className="flex flex-col h-full min-w-[400px] max-w-[500px]">
                          <div className="mb-2">
                            <h4 className="font-medium">{screen.name}</h4>
                            <p className="text-sm text-gray-600">{screen.description}</p>
                          </div>
                          <div className="bg-gray-900 rounded-lg p-4 overflow-auto flex-1">
                            <pre className="text-sm text-gray-100 h-full">
                              <code>{screen.code}</code>
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t p-4 flex justify-between items-center">
                    <Badge variant="secondary">{snippet.language}</Badge>
                    <Button onClick={() => setOpenModalId(null)}>Fechar</Button>
                  </div>
                </div>
              </div>
            )
          }
          return null
        })}
    </SidebarProvider>
  )
}
