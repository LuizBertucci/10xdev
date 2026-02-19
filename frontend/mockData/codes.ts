import type { CodeSnippet } from './types'

export const codeSnippets: CodeSnippet[] = [
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

        export const rateLimitMiddleware = (
          maxRequests: number = 100, 
          windowMs: number = 15 * 60 * 1000
        ) => {
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
        export const loggerMiddleware = (
          req: Request, 
          res: Response, 
          next: NextFunction
        ) => {
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

        export function useCrud<T extends CrudItem>({
          apiUrl, 
          initialData = [] 
        }: UseCrudOptions<T>) {
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
                raise HTTPException(
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