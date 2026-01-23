import { Router } from 'express'
import multer from 'multer'
import { ContentController } from '@/controllers/ContentController'
import { supabaseMiddleware, authenticate, requireAdmin } from '@/middleware'

const router = Router()

// Configuração do multer para upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'))
    }
  }
})

// Base: /api/contents

// ================================================
// ROTAS PÚBLICAS (leitura)
// ================================================
router.get('/', ContentController.list)
router.get('/post-tags', ContentController.listPostTags)
router.get('/:id', ContentController.getById)

// ================================================
// ROTAS PROTEGIDAS (admin only - escrita)
// ================================================
router.post('/upload', supabaseMiddleware, authenticate, requireAdmin, upload.single('file'), ContentController.upload)
router.post('/', supabaseMiddleware, authenticate, requireAdmin, ContentController.create)
router.put('/:id', supabaseMiddleware, authenticate, requireAdmin, ContentController.update)
router.delete('/:id', supabaseMiddleware, authenticate, requireAdmin, ContentController.delete)
router.patch('/:id/card-feature', supabaseMiddleware, authenticate, requireAdmin, ContentController.updateSelectedCardFeature)

export { router as contentRoutes }
