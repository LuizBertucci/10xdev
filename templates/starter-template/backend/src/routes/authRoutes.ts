import { Router, Request, Response } from 'express'
import { supabaseMiddleware } from '@/middleware'

const router = Router()

// Get current user profile
router.get('/profile', supabaseMiddleware, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: req.user
  })
})

export { router as authRoutes }
