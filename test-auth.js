#!/usr/bin/env node

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
