import cors from 'cors'
import { Request } from 'express'

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    // Lista de origens permitidas
    const allowedOrigins = [
      'http://localhost:3000',        // Frontend development
      'http://127.0.0.1:3000',       // Alternative localhost
      'https://10xdev.vercel.app',    // Production frontend
      'https://v0-10xdev.vercel.app', // Current Vercel deployment
      process.env.CORS_ORIGIN         // Origem do .env
    ].filter(Boolean) // Remove undefined values

    // Permite requests sem origin (ex: Postman, mobile apps)
    if (!origin) {
      return callback(null, true)
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Não permitido pelo CORS'))
    }
  },
  
  credentials: true, // Permite cookies e headers de autenticação
  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-API-Key'
  ],
  
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page'
  ],
  
  optionsSuccessStatus: 200, // Para suporte a browsers legados
  
  preflightContinue: false
}

export const corsMiddleware = cors(corsOptions)