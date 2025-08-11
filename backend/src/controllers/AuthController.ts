import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { UserModel, CreateUserData, UserPublic } from '../models/UserModel'
import { AuthMiddleware } from '../middleware/auth'

export class AuthController {
  // Regras de validação para registro (padrão brasileiro)
  static registrationValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Por favor, informe um e-mail válido'),
    body('password')
      .isLength({ min: 3 })
      .withMessage('A senha deve ter pelo menos 3 caracteres'),
    body('first_name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('O nome deve ter entre 2 e 50 caracteres'),
    body('last_name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('O sobrenome deve ter entre 2 e 50 caracteres')
  ]

  // Regras de validação para login
  static loginValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Por favor, informe um e-mail válido'),
    body('password')
      .notEmpty()
      .withMessage('A senha é obrigatória')
  ]

  /**
   * Register new user (simplified)
   */
  static async register(req: Request, res: Response) {
    try {
      // Check validation results
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        })
      }

      const { email, password, first_name, last_name } = req.body

      // Create user data (always 'user' role by default)
      const userData: CreateUserData = {
        email,
        password,
        role: 'user', // Default role
        first_name,
        last_name
      }

      // Create user
      const user = await UserModel.create(userData)

      // Generate token
      const token = AuthMiddleware.generateToken(user)

      return res.status(201).json({
        success: true,
        message: 'Usuário registrado com sucesso',
        data: {
          user,
          token
        }
      })

    } catch (error: any) {
      console.error('Registration error:', error)
      
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          message: 'Já existe um usuário cadastrado com este e-mail'
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor. Tente novamente.'
      })
    }
  }

  /**
   * Login user (admin or regular user)
   */
  static async login(req: Request, res: Response) {
    try {
      // Check validation results
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        })
      }

      const { email, password } = req.body

      // Find user by email
      const user = await UserModel.findByEmail(email)
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'E-mail ou senha incorretos'
        })
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Sua conta está desativada. Entre em contato com o suporte.'
        })
      }

      // Validate password
      const isValidPassword = await UserModel.validatePassword(user, password)
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'E-mail ou senha incorretos'
        })
      }

      // Generate token
      const userPublic = UserModel.toPublic(user)
      const token = AuthMiddleware.generateToken(userPublic)

      const roleMessage = user.role === 'admin' ? 'administrador' : 'usuário'

      return res.status(200).json({
        success: true,
        message: `Bem-vindo(a)! Login realizado como ${roleMessage}.`,
        data: {
          user: userPublic,
          token,
          role: user.role
        }
      })

    } catch (error) {
      console.error('Login error:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      })
    }
  }

  /**
   * Logout user (add token to denylist)
   */
  static async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Token não fornecido'
        })
      }

      const token = authHeader.split(' ')[1]
      
      try {
        await AuthMiddleware.addTokenToDenylist(token)
        
        return res.status(200).json({
          success: true,
          message: 'Logout realizado com sucesso'
        })
      } catch (error) {
        console.error('Logout error:', error)
        return res.status(200).json({
          success: true,
          message: 'Logout realizado'
        })
      }

    } catch (error) {
      console.error('Logout error:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      })
    }
  }

  /**
   * Get current user profile
   */
  static async me(req: Request, res: Response) {
    try {
      const user = req.user
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Não autenticado'
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Perfil obtido com sucesso',
        data: user
      })

    } catch (error) {
      console.error('Me error:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      })
    }
  }
}