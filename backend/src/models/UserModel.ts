import bcrypt from 'bcryptjs'
import { userQueries, dbUtils } from '../database/sqlite'

export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  email: string
  password_hash: string
  role: UserRole
  first_name?: string
  last_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  email: string
  password: string
  role?: UserRole
  first_name?: string
  last_name?: string
  is_active?: boolean
}

export interface UpdateUserData {
  email?: string
  password?: string
  role?: UserRole
  first_name?: string
  last_name?: string
  is_active?: boolean
}

export interface UserPublic {
  id: string
  email: string
  role: UserRole
  first_name?: string
  last_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserStats {
  total: number
  active: number
  inactive: number
  admins: number
  users: number
}

export class UserModel {
  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    try {
      const user = userQueries.findById.get(id) as User | undefined
      return user || null
    } catch (error) {
      console.error('Error finding user by ID:', error)
      throw error
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const user = userQueries.findByEmail.get(email) as User | undefined
      return user || null
    } catch (error) {
      console.error('Error finding user by email:', error)
      throw error
    }
  }

  /**
   * Create new user
   */
  static async create(userData: CreateUserData): Promise<UserPublic> {
    try {
      // Check if user already exists
      if (dbUtils.userExists(userData.email)) {
        throw new Error('User with this email already exists')
      }

      // Hash password
      const saltRounds = 12
      const password_hash = await bcrypt.hash(userData.password, saltRounds)

      // Create user
      const user = userQueries.create.get(
        userData.email.toLowerCase(),
        password_hash,
        userData.role || 'user',
        userData.first_name || null,
        userData.last_name || null,
        userData.is_active !== undefined ? (userData.is_active ? 1 : 0) : 1
      ) as User

      return this.toPublic(user)
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  /**
   * Update user
   */
  static async update(id: string, userData: UpdateUserData): Promise<UserPublic> {
    try {
      let password_hash: string | null = null
      
      if (userData.password) {
        const saltRounds = 12
        password_hash = await bcrypt.hash(userData.password, saltRounds)
      }

      const user = userQueries.update.get(
        userData.email?.toLowerCase() || null,
        password_hash,
        userData.role || null,
        userData.first_name !== undefined ? userData.first_name : null,
        userData.last_name !== undefined ? userData.last_name : null,
        userData.is_active !== undefined ? (userData.is_active ? 1 : 0) : null,
        id
      ) as User | undefined

      if (!user) {
        throw new Error('User not found')
      }

      return this.toPublic(user)
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<boolean> {
    try {
      const result = userQueries.delete.run(id)
      return result.changes > 0
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  /**
   * Validate user password
   */
  static async validatePassword(user: User, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, user.password_hash)
    } catch (error) {
      console.error('Error validating password:', error)
      return false
    }
  }

  /**
   * Find all users with pagination
   */
  static async findAll(
    page = 1,
    limit = 20,
    filters?: {
      role?: UserRole
      is_active?: boolean
      search?: string
    }
  ): Promise<{ users: UserPublic[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit
      
      // For simplicity, basic pagination without complex filters
      const users = userQueries.findAll.all(limit, offset) as User[]
      const totalResult = userQueries.count.get() as { total: number }

      return {
        users: users.map(user => this.toPublic(user)),
        total: totalResult.total,
        page,
        limit
      }
    } catch (error) {
      console.error('Error finding all users:', error)
      throw error
    }
  }

  /**
   * Get user statistics
   */
  static async getStats(): Promise<UserStats> {
    try {
      const stats = dbUtils.getStats()
      return {
        total: stats.users.total,
        active: stats.users.active,
        inactive: stats.users.inactive,
        admins: stats.users.admins,
        users: stats.users.regular
      }
    } catch (error) {
      console.error('Error getting user stats:', error)
      throw error
    }
  }

  /**
   * Activate/Deactivate user
   */
  static async setActiveStatus(id: string, is_active: boolean): Promise<UserPublic> {
    return this.update(id, { is_active })
  }

  /**
   * Change user role
   */
  static async changeRole(id: string, role: UserRole): Promise<UserPublic> {
    return this.update(id, { role })
  }

  /**
   * Convert User to UserPublic (remove sensitive data)
   */
  static toPublic(user: User): UserPublic {
    const { password_hash, ...publicUser } = user
    return publicUser
  }

  /**
   * Bulk create users (for admin operations)
   */
  static async bulkCreate(usersData: CreateUserData[]): Promise<UserPublic[]> {
    try {
      const results: UserPublic[] = []
      const errors: string[] = []

      for (const userData of usersData) {
        try {
          const user = await this.create(userData)
          results.push(user)
        } catch (error) {
          errors.push(`Failed to create ${userData.email}: ${error}`)
        }
      }

      if (errors.length > 0) {
        console.warn('Bulk create warnings:', errors)
      }

      return results
    } catch (error) {
      console.error('Error in bulk create:', error)
      throw error
    }
  }

  /**
   * Check if user has permission for operation
   */
  static hasPermission(user: User, operation: 'read' | 'write' | 'delete' | 'admin'): boolean {
    if (!user.is_active) {
      return false
    }

    switch (operation) {
      case 'read':
        return true // All active users can read
      case 'write':
        return true // All active users can write their own data
      case 'delete':
        return user.role === 'admin' // Only admins can delete
      case 'admin':
        return user.role === 'admin' // Only admins have admin operations
      default:
        return false
    }
  }
}