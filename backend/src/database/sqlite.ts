/**
 * SQLite Database - Funciona em qualquer máquina localhost
 * Implementação profissional e completa
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'

// Garante que o diretório de dados existe
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, '10xdev-auth.db')
export const db = new Database(dbPath)

// Habilita WAL mode para melhor performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

/**
 * Inicializa as tabelas do banco de dados
 */
export function initializeDatabase() {
  console.log('🚀 Inicializando banco SQLite...')
  
  // Tabela de usuários
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      first_name TEXT,
      last_name TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Tabela de JWT denylist
  db.exec(`
    CREATE TABLE IF NOT EXISTS jwt_denylist (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      jti TEXT UNIQUE NOT NULL,
      exp DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Índices para performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    CREATE INDEX IF NOT EXISTS idx_jwt_denylist_jti ON jwt_denylist(jti);
    CREATE INDEX IF NOT EXISTS idx_jwt_denylist_exp ON jwt_denylist(exp);
  `)

  // Trigger para updated_at
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users FOR EACH ROW
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `)

  // Inicializar prepared statements
  initializeQueries()
  
  // Inserir usuários de teste
  createTestUsers()
  
  console.log('✅ Banco SQLite inicializado com sucesso!')
  console.log(`📄 Arquivo: ${dbPath}`)
}

/**
 * Criar usuários de teste
 */
async function createTestUsers() {
  const checkAdmin = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?')
  const adminExists = checkAdmin.get('admin@10xdev.com') as { count: number }

  if (adminExists.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    // Admin user (password: Admin123!)
    const adminHash = await bcrypt.hash('Admin123!', 12)
    insertUser.run('admin@10xdev.com', adminHash, 'admin', 'Admin', '10xdev', 1)

    // Regular user (password: User123!)
    const userHash = await bcrypt.hash('User123!', 12)
    insertUser.run('user@10xdev.com', userHash, 'user', 'Usuário', 'Teste', 1)

    console.log('👤 Usuários de teste criados:')
    console.log('   • Admin: admin@10xdev.com / Admin123!')
    console.log('   • User:  user@10xdev.com / User123!')
  }
}

/**
 * Prepared Statements para operações CRUD de usuários
 * Inicializados após a criação das tabelas
 */
export let userQueries: any = {}
export let jwtQueries: any = {}

function initializeQueries() {
  userQueries = {
    findById: db.prepare('SELECT * FROM users WHERE id = ?'),
    findByEmail: db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE'),
    create: db.prepare(`
      INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `),
    update: db.prepare(`
      UPDATE users 
      SET email = COALESCE(?, email),
          password_hash = COALESCE(?, password_hash),
          role = COALESCE(?, role),
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
      RETURNING *
    `),
    delete: db.prepare('DELETE FROM users WHERE id = ?'),
    findAll: db.prepare(`
      SELECT * FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `),
    count: db.prepare('SELECT COUNT(*) as total FROM users'),
    countByRole: db.prepare('SELECT COUNT(*) as total FROM users WHERE role = ?'),
    countActive: db.prepare('SELECT COUNT(*) as total FROM users WHERE is_active = 1')
  }

  jwtQueries = {
    addToken: db.prepare(`
      INSERT INTO jwt_denylist (jti, exp)
      VALUES (?, datetime(?, 'unixepoch'))
      RETURNING *
    `),
    findByJti: db.prepare('SELECT * FROM jwt_denylist WHERE jti = ?'),
    cleanupExpired: db.prepare("DELETE FROM jwt_denylist WHERE exp < datetime('now')"),
    countExpired: db.prepare("SELECT COUNT(*) as count FROM jwt_denylist WHERE exp < datetime('now')"),
    findAll: db.prepare(`
      SELECT * FROM jwt_denylist 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `),
    count: db.prepare('SELECT COUNT(*) as total FROM jwt_denylist')
  }
}

/**
 * Funções utilitárias
 */
export const dbUtils = {
  // Verificar se usuário existe
  userExists: (email: string): boolean => {
    const result = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ? COLLATE NOCASE').get(email) as { count: number }
    return result.count > 0
  },

  // Verificar se token está na denylist
  isTokenDenied: (jti: string): boolean => {
    const result = jwtQueries.findByJti.get(jti)
    return !!result
  },

  // Estatísticas gerais
  getStats: () => {
    const totalUsers = userQueries.count.get() as { total: number }
    const activeUsers = userQueries.countActive.get() as { total: number }
    const adminUsers = userQueries.countByRole.get('admin') as { total: number }
    const totalTokens = jwtQueries.count.get() as { total: number }
    const expiredTokens = jwtQueries.countExpired.get() as { count: number }

    return {
      users: {
        total: totalUsers.total,
        active: activeUsers.total,
        inactive: totalUsers.total - activeUsers.total,
        admins: adminUsers.total,
        regular: totalUsers.total - adminUsers.total
      },
      tokens: {
        total: totalTokens.total,
        expired: expiredTokens.count,
        active: totalTokens.total - expiredTokens.count
      },
      database: {
        path: dbPath,
        size: fs.statSync(dbPath).size
      }
    }
  },

  // Limpeza automática de tokens expirados
  cleanupExpired: () => {
    const result = jwtQueries.cleanupExpired.run()
    console.log(`🧹 Limpeza automática: ${result.changes} tokens expirados removidos`)
    return result.changes
  }
}

// Inicializar banco na importação
initializeDatabase()

// Limpeza automática a cada 1 hora
setInterval(() => {
  dbUtils.cleanupExpired()
}, 60 * 60 * 1000)

console.log('🔋 Sistema de banco SQLite carregado e funcional!')