import cors from 'cors'

const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://10xdev.vercel.app',
      'https://v0-10xdev.vercel.app',
      'https://ca-txdev-frontend-prod.yellowmeadow-a6a67a6f.eastus.azurecontainerapps.io',
      process.env.CORS_ORIGIN
    ].filter(Boolean)

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-API-Key', 
    'Access-Control-Allow-Origin'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page'
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false
}

export const corsMiddleware = cors(corsOptions)