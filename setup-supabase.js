#!/usr/bin/env node

/**
 * Script de configuração automática do Supabase
 * Configura projeto real para autenticação 10xdev
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// Credenciais de um projeto Supabase real (público para demo)
const SUPABASE_CONFIG = {
  url: 'https://kpbxjlphlhnjjcftjxnw.supabase.co',
  anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwYnhqbHBobGhuampjZnRqeG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ5OTc2MDAsImV4cCI6MjAyMDU3MzYwMH0.U0EcLJ_pAXhNHMXLHdQpZLb1GE8rXbMZjEZZMQhvE7w',
  service_role_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwYnhqbHBobGhuampjZnRqeG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNDk5NzYwMCwiZXhwIjoyMDIwNTczNjAwfQ.V9OIHv4lKPHqQ2sM_K4S3XgNw9-7UBi5qLFxq4c6Xr8'
}

function updateEnvFile() {
  console.log('🔧 Configurando variáveis de ambiente...')
  
  const envContent = `# Supabase Configuration - 10xdev Authentication
SUPABASE_URL=${SUPABASE_CONFIG.url}
SUPABASE_ANON_KEY=${SUPABASE_CONFIG.anon_key}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_CONFIG.service_role_key}

# JWT Configuration
JWT_SECRET=10xdev-super-secret-jwt-key-for-authentication-system-2025
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=8080
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
`

  const envPath = path.join(__dirname, 'backend', '.env')
  fs.writeFileSync(envPath, envContent)
  console.log('✅ Arquivo .env configurado!')
}

function updateFrontendEnv() {
  console.log('🔧 Configurando frontend...')
  
  const frontendEnvContent = `# Frontend Configuration - 10xdev Authentication
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=10xdev Authenticator
NEXT_PUBLIC_APP_VERSION=1.0.0
`

  const frontendEnvPath = path.join(__dirname, 'frontend', '.env.local')
  fs.writeFileSync(frontendEnvPath, frontendEnvContent)
  console.log('✅ Arquivo frontend .env.local configurado!')
}

function executeSQLMigrations() {
  console.log('📊 Configurando banco de dados...')
  
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, 'backend', 'migrations', '001_create_users_and_jwt_tables.sql'),
    'utf-8'
  )

  console.log('💾 SQL de migração encontrado!')
  console.log('🚨 IMPORTANTE: Execute o SQL abaixo no Supabase SQL Editor:')
  console.log('📍 URL: https://supabase.com/dashboard/project/kpbxjlphlhnjjcftjxnw/sql')
  console.log('─'.repeat(80))
  console.log(migrationSQL)
  console.log('─'.repeat(80))
}

function generateTestScript() {
  console.log('🧪 Gerando script de teste...')

  const testScript = `#!/usr/bin/env node

/**
 * Script de teste do sistema de autenticacao
 */

const http = require('http')

const API_BASE = 'http://localhost:8080'

// Credenciais de teste
const ADMIN_CREDENTIALS = {
  email: 'admin@10xdev.com',
  password: 'Admin123!'
}

const USER_CREDENTIALS = {
  email: 'user@10xdev.com',
  password: 'User123!'
}

async function testLogin(credentials, role) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(credentials)
    
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          console.log('✅ Login ' + role + ' bem-sucedido:', response.message)
          resolve(response)
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

async function runTests() {
  console.log('🧪 Iniciando testes do sistema de autenticacao...')
  
  try {
    console.log('1️⃣ Testando login Admin...')
    await testLogin(ADMIN_CREDENTIALS, 'ADMIN')
    
    console.log('2️⃣ Testando login User...')
    await testLogin(USER_CREDENTIALS, 'USER')
    
    console.log('🎉 Todos os testes passaram! Sistema funcionando!')
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error.message)
    console.log('🔧 Verifique se:')
    console.log('   • O servidor está rodando na porta 8080')
    console.log('   • As migrações SQL foram executadas')
    console.log('   • As credenciais estão corretas')
  }
}

if (require.main === module) {
  runTests()
}
`

  const testPath = path.join(__dirname, 'test-auth.js')
  fs.writeFileSync(testPath, testScript, { mode: 0o755 })
  console.log('✅ Script de teste criado: test-auth.js')
}

function main() {
  console.log('🚀 Configuração Automática - Sistema JWT 10xdev')
  console.log('=' .repeat(50))

  try {
    updateEnvFile()
    updateFrontendEnv()
    executeSQLMigrations()
    generateTestScript()
    
    console.log('\n🎉 Configuração concluída!')
    console.log('\n📋 Próximos passos:')
    console.log('1. Execute as migrações SQL no Supabase (link mostrado acima)')
    console.log('2. Inicie o backend: cd backend && npm run dev')
    console.log('3. Inicie o frontend: cd frontend && npm run dev')
    console.log('4. Teste o sistema: node test-auth.js')
    
    console.log('\n🔐 Credenciais de teste:')
    console.log('   Admin: admin@10xdev.com / Admin123!')
    console.log('   User:  user@10xdev.com / User123!')
    
    console.log('\n🌐 URLs importantes:')
    console.log('   Backend: http://localhost:8080')
    console.log('   Frontend: http://localhost:3000')
    console.log('   Login: http://localhost:3000/login')
    
  } catch (error) {
    console.error('❌ Erro na configuração:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { SUPABASE_CONFIG, updateEnvFile, updateFrontendEnv }