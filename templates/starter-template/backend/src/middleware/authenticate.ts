import { Request, Response, NextFunction } from 'express'

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'User not authenticated'
    })
    return
  }
  next()
}
