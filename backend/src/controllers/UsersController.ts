import { Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { UserModel, UpdateUserData } from '@/models/UserModel'

export class UsersController {
  // Update user validation rules
  static updateValidation = [
    param('id')
      .notEmpty()
      .withMessage('User ID is required'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('first_name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('last_name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('role')
      .optional()
      .isIn(['admin', 'user'])
      .withMessage('Role must be either admin or user'),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean')
  ]

  // List users validation
  static listValidation = [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]

  static async list(req: Request, res: Response) {
    try {
      // Check validation results
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20

      const { users, total } = await UserModel.findAll(page, limit)

      return res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      })
    } catch (error: any) {
      console.error('List users error:', error)
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'LIST_USERS_FAILED'
      })
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          error: 'MISSING_USER_ID'
        })
      }

      const user = await UserModel.findById(id)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        })
      }

      return res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: {
          user: UserModel.toPublic(user)
        }
      })
    } catch (error: any) {
      console.error('Get user error:', error)
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'GET_USER_FAILED'
      })
    }
  }

  static async update(req: Request, res: Response) {
    try {
      // Check validation results
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const { id } = req.params
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          error: 'MISSING_USER_ID'
        })
      }
      
      const { email, password, first_name, last_name, role, is_active } = req.body

      // Check if user exists
      const existingUser = await UserModel.findById(id)
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        })
      }

      // Prevent non-admin users from changing roles
      if (role && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can change user roles',
          error: 'INSUFFICIENT_PERMISSIONS'
        })
      }

      // Prevent users from deactivating themselves
      if (is_active === false && req.user?.id === id) {
        return res.status(400).json({
          success: false,
          message: 'Users cannot deactivate their own account',
          error: 'CANNOT_DEACTIVATE_SELF'
        })
      }

      // Create update data
      const updateData: UpdateUserData = {}
      if (email !== undefined) updateData.email = email
      if (password !== undefined) updateData.password = password
      if (first_name !== undefined) updateData.first_name = first_name
      if (last_name !== undefined) updateData.last_name = last_name
      if (role !== undefined) updateData.role = role
      if (is_active !== undefined) updateData.is_active = is_active

      // Update user
      const updatedUser = await UserModel.update(id, updateData)

      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: {
          user: updatedUser
        }
      })
    } catch (error: any) {
      console.error('Update user error:', error)
      
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          message: error.message,
          error: 'EMAIL_ALREADY_EXISTS'
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'UPDATE_USER_FAILED'
      })
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          error: 'MISSING_USER_ID'
        })
      }

      // Check if user exists
      const existingUser = await UserModel.findById(id)
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND'
        })
      }

      // Prevent users from deleting themselves
      if (req.user?.id === id) {
        return res.status(400).json({
          success: false,
          message: 'Users cannot delete their own account',
          error: 'CANNOT_DELETE_SELF'
        })
      }

      await UserModel.delete(id)

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      })
    } catch (error: any) {
      console.error('Delete user error:', error)
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'DELETE_USER_FAILED'
      })
    }
  }
}