import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import { UserModel, UserRole, UserPublic } from '../models/UserModel'
import { JwtDenylistModel } from '../models/JwtDenylistModel'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserPublic
    }
  }
}

export interface JwtPayload {
  userId: string
  email: string
  role: UserRole
  jti: string
  iat: number
  exp: number
}

export class AuthMiddleware {
  private static JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
  private static JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

  static generateToken(user: UserPublic): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti: Math.random().toString(36).substr(2, 9) // Random JWT ID
    }

    const options = {
      expiresIn: this.JWT_EXPIRES_IN,
    } as jwt.SignOptions

    return jwt.sign(payload, this.JWT_SECRET as string, options)
  }

  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET as string) as JwtPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      } else {
        throw new Error('Token verification failed')
      }
    }
  }

  static authenticate = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const authHeader = req.headers.authorization
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          error: 'MISSING_TOKEN'
        })
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          error: 'MISSING_TOKEN'
        })
      }

      // Verify token
      const decoded = AuthMiddleware.verifyToken(token)

      // Check if token is in denylist
      const isDenied = await JwtDenylistModel.isTokenDenied(decoded.jti)
      if (isDenied) {
        return res.status(401).json({
          success: false,
          message: 'Token has been revoked',
          error: 'TOKEN_REVOKED'
        })
      }

      // Get user from database
      const user = await UserModel.findById(decoded.userId)
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        })
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'User account is disabled',
          error: 'USER_DISABLED'
        })
      }

      // Add user to request
      req.user = UserModel.toPublic(user)
      next()
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Authentication failed',
        error: 'AUTHENTICATION_FAILED'
      })
    }
  }

  static requireRole(role: UserRole) {
    return (req: Request, res: Response, next: NextFunction): any => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        })
      }

      if (req.user.role !== role) {
        return res.status(403).json({
          success: false,
          message: `${role} role required`,
          error: 'INSUFFICIENT_PERMISSIONS'
        })
      }

      next()
    }
  }

  static requireAdmin = (req: Request, res: Response, next: NextFunction): any => {
    return AuthMiddleware.requireRole('admin')(req, res, next)
  }

  /**
   * Add token to denylist (for logout)
   */
  static async addTokenToDenylist(token: string): Promise<void> {
    try {
      const decoded = AuthMiddleware.verifyToken(token)
      await JwtDenylistModel.addToken(decoded.jti, decoded.exp)
    } catch (error) {
      console.error('Error adding token to denylist:', error)
      throw error
    }
  }

  static requireUser = (req: Request, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      })
    }

    // User or admin can access user endpoints
    if (req.user.role !== 'user' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'User or admin role required',
        error: 'INSUFFICIENT_PERMISSIONS'
      })
    }

    next()
  }

  static async revokeToken(token: string): Promise<void> {
    try {
      const decoded = AuthMiddleware.verifyToken(token)
      await JwtDenylistModel.addToken(decoded.jti, decoded.exp)
    } catch (error) {
      throw new Error('Failed to revoke token')
    }
  }

  static optional = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return next() // Continue without authentication
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader

    if (!token) {
      return next() // Continue without authentication
    }

    // Try to authenticate, but don't fail if it doesn't work
    AuthMiddleware.authenticate(req, res, (error?: any) => {
      if (error) {
        // Clear user and continue without authentication
        delete req.user
      }
      next()
    })
  }
}