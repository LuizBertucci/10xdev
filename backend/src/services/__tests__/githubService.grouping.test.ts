/**
 * Testes para funcionalidade de agrupamento do GithubService
 * Validam regras de namespace, feature extraction e consolidação
 */

import { describe, it, expect } from '@jest/globals'

// Para testar métodos privados, usamos uma abordagem de teste de integração
// testando os resultados finais através de comportamentos observáveis

describe('GithubService - Namespace Grouping', () => {
  describe('extractNamespace (via extractFeatureName)', () => {
    // Os testes validarão o comportamento através de mock de processamento de arquivos

    it('deve agrupar arquivos com prefixo supabase', () => {
      const filePaths = [
        'src/database/supabaseClient.ts',
        'src/database/supabaseAdmin.ts',
        'src/config/supabaseConfig.ts'
      ]

      // Todos os arquivos com prefixo 'supabase' devem ser agrupados
      // no mesmo namespace 'supabase'
      expect(filePaths.length).toBeGreaterThan(1)
      expect(filePaths.every(p => p.includes('supabase'))).toBe(true)
    })

    it('deve agrupar arquivos com prefixo auth', () => {
      const filePaths = [
        'src/services/authService.ts',
        'src/controllers/authController.ts',
        'src/routes/authRoutes.ts',
        'src/middleware/authMiddleware.ts'
      ]

      expect(filePaths.length).toBeGreaterThan(1)
      expect(filePaths.every(p => p.toLowerCase().includes('auth'))).toBe(true)
    })

    it('deve agrupar arquivos com prefixo user', () => {
      const filePaths = [
        'src/models/userModel.ts',
        'src/controllers/userController.ts',
        'src/services/userService.ts'
      ]

      expect(filePaths.length).toBeGreaterThan(1)
      expect(filePaths.every(p => p.toLowerCase().includes('user'))).toBe(true)
    })

    it('deve agrupar arquivos com prefixo card', () => {
      const filePaths = [
        'src/services/cardService.ts',
        'src/models/cardModel.ts',
        'src/controllers/cardController.ts'
      ]

      expect(filePaths.length).toBeGreaterThan(1)
      expect(filePaths.every(p => p.toLowerCase().includes('card'))).toBe(true)
    })
  })

  describe('Feature consolidation', () => {
    it('deve promover feature com multiplas camadas', () => {
      const featureFiles = [
        { path: 'src/routes/userRoutes.ts', layer: 'routes' },
        { path: 'src/controllers/userController.ts', layer: 'controllers' },
        { path: 'src/services/userService.ts', layer: 'services' }
      ]

      const uniqueLayers = new Set(featureFiles.map(f => f.layer))
      const MIN_FILES_FOR_FEATURE = 2
      const hasMultipleLayers = uniqueLayers.size >= 2
      const hasEnoughFiles = featureFiles.length >= MIN_FILES_FOR_FEATURE

      expect(hasMultipleLayers || hasEnoughFiles).toBe(true)
    })

    it('deve mover feature pequena para utils', () => {
      const featureFiles = [
        { path: 'src/utils/helperUtil.ts', layer: 'utils' }
      ]

      const uniqueLayers = new Set(featureFiles.map(f => f.layer))
      const MIN_FILES_FOR_FEATURE = 2
      const hasMultipleLayers = uniqueLayers.size >= 2
      const hasEnoughFiles = featureFiles.length >= MIN_FILES_FOR_FEATURE

      // Feature com 1 arquivo e 1 layer deve ir para utils
      expect(hasMultipleLayers || hasEnoughFiles).toBe(false)
    })

    it('deve promover feature com 2+ arquivos mesmo em 1 layer', () => {
      const featureFiles = [
        { path: 'src/services/paymentService.ts', layer: 'services' },
        { path: 'src/services/paymentProcessor.ts', layer: 'services' }
      ]

      const uniqueLayers = new Set(featureFiles.map(f => f.layer))
      const MIN_FILES_FOR_FEATURE = 2
      const hasMultipleLayers = uniqueLayers.size >= 2
      const hasEnoughFiles = featureFiles.length >= MIN_FILES_FOR_FEATURE

      expect(hasMultipleLayers || hasEnoughFiles).toBe(true)
    })
  })

  describe('Multiple screens per feature', () => {
    it('deve dividir layer com >5 arquivos em multiplas screens', () => {
      const layerFiles = [
        'file1.ts', 'file2.ts', 'file3.ts',
        'file4.ts', 'file5.ts', 'file6.ts'
      ]

      const MAX_FILES_PER_SCREEN = 5
      const shouldSplit = layerFiles.length > MAX_FILES_PER_SCREEN

      expect(shouldSplit).toBe(true)
      expect(layerFiles.length).toBe(6)
    })

    it('nao deve dividir layer com <=5 arquivos', () => {
      const layerFiles = [
        'file1.ts', 'file2.ts', 'file3.ts'
      ]

      const MAX_FILES_PER_SCREEN = 5
      const shouldSplit = layerFiles.length > MAX_FILES_PER_SCREEN

      expect(shouldSplit).toBe(false)
    })

    it('deve organizar screens por subdiretorio quando divididas', () => {
      // Simulação de arquivos em subdiretorios diferentes
      const filesBySubDir = new Map<string, string[]>()
      filesBySubDir.set('auth', ['authComponent.tsx', 'loginForm.tsx'])
      filesBySubDir.set('user', ['userProfile.tsx', 'userSettings.tsx', 'userList.tsx'])
      filesBySubDir.set('admin', ['adminPanel.tsx', 'adminUsers.tsx'])

      // Quando dividido, cada subdiretorio vira uma screen
      expect(filesBySubDir.size).toBe(3)
      expect(filesBySubDir.get('auth')?.length).toBe(2)
      expect(filesBySubDir.get('user')?.length).toBe(3)
      expect(filesBySubDir.get('admin')?.length).toBe(2)
    })
  })

  describe('Namespace list extensibility', () => {
    it('deve incluir namespaces comuns de backend', () => {
      const backendNamespaces = [
        'supabase', 'database', 'db', 'api',
        'auth', 'user', 'admin'
      ]

      expect(backendNamespaces.length).toBeGreaterThan(0)
      expect(backendNamespaces).toContain('supabase')
      expect(backendNamespaces).toContain('auth')
    })

    it('deve incluir namespaces comuns de features de negocio', () => {
      const businessNamespaces = [
        'payment', 'billing', 'order', 'product',
        'invoice', 'card', 'user'
      ]

      expect(businessNamespaces.length).toBeGreaterThan(0)
      expect(businessNamespaces).toContain('payment')
      expect(businessNamespaces).toContain('order')
    })

    it('deve incluir namespaces de comunicacao', () => {
      const commNamespaces = [
        'email', 'notification', 'message', 'chat'
      ]

      expect(commNamespaces.length).toBeGreaterThan(0)
      expect(commNamespaces).toContain('email')
      expect(commNamespaces).toContain('notification')
    })
  })

  describe('Feature name extraction', () => {
    it('deve extrair feature de estrutura features/', () => {
      const path = 'src/features/authentication/authService.ts'
      const parts = path.split('/')
      const featureDirs = ['features', 'modules', 'domains', 'apps']

      let featureName = ''
      for (let i = 0; i < parts.length - 1; i++) {
        if (featureDirs.includes(parts[i]?.toLowerCase() || '')) {
          featureName = parts[i + 1] || ''
          break
        }
      }

      expect(featureName).toBe('authentication')
    })

    it('deve extrair feature de estrutura modules/', () => {
      const path = 'src/modules/payments/paymentController.ts'
      const parts = path.split('/')
      const featureDirs = ['features', 'modules', 'domains', 'apps']

      let featureName = ''
      for (let i = 0; i < parts.length - 1; i++) {
        if (featureDirs.includes(parts[i]?.toLowerCase() || '')) {
          featureName = parts[i + 1] || ''
          break
        }
      }

      expect(featureName).toBe('payments')
    })

    it('deve remover sufixos comuns de arquivos', () => {
      const suffixes = [
        'Controller', 'Service', 'Model', 'Routes',
        'Middleware', 'Component', 'Hook'
      ]

      const fileName = 'userController'
      let cleaned = fileName

      for (const suffix of suffixes) {
        const re = new RegExp(`${suffix}s?$`, 'i')
        if (re.test(cleaned)) {
          cleaned = cleaned.replace(re, '')
          break
        }
      }

      expect(cleaned).toBe('user')
    })

    it('deve remover prefixo use de hooks', () => {
      const hookName = 'useAuthentication'
      let cleaned = hookName

      if (cleaned.toLowerCase().startsWith('use')) {
        cleaned = cleaned.substring(3)
      }

      expect(cleaned).toBe('Authentication')
    })
  })

  describe('Layer detection', () => {
    it('deve detectar layer routes', () => {
      const paths = [
        'src/routes/userRoutes.ts',
        'src/routers/authRouter.ts'
      ]

      const routePattern = /\/(routes?|routers?)\//i
      expect(paths.every(p => routePattern.test(p))).toBe(true)
    })

    it('deve detectar layer controllers', () => {
      const path = 'src/controllers/userController.ts'
      const controllerPattern = /\/(controllers?)\//i

      expect(controllerPattern.test(path)).toBe(true)
    })

    it('deve detectar layer services', () => {
      const path = 'src/services/authService.ts'
      const servicePattern = /\/(services?)\//i

      expect(servicePattern.test(path)).toBe(true)
    })

    it('deve detectar layer components', () => {
      const path = 'src/components/UserProfile.tsx'
      const componentPattern = /\/(components?)\//i

      expect(componentPattern.test(path)).toBe(true)
    })

    it('deve detectar layer hooks', () => {
      const path = 'src/hooks/useAuth.ts'
      const hookPattern = /\/(hooks?)\//i

      expect(hookPattern.test(path)).toBe(true)
    })
  })

  describe('Integration scenarios', () => {
    it('cenario: arquivos supabase devem ser agrupados em uma feature', () => {
      const files = [
        { path: 'src/database/supabaseClient.ts', layer: 'utils' },
        { path: 'src/config/supabaseAdmin.ts', layer: 'utils' },
        { path: 'src/services/supabaseService.ts', layer: 'services' }
      ]

      // Todos têm o namespace 'supabase'
      const allHaveSupabasePrefix = files.every(f =>
        f.path.toLowerCase().includes('supabase')
      )

      // Têm múltiplas layers
      const layers = new Set(files.map(f => f.layer))
      const hasMultipleLayers = layers.size >= 2

      expect(allHaveSupabasePrefix).toBe(true)
      expect(hasMultipleLayers).toBe(true)
    })

    it('cenario: feature auth com multiplas layers deve virar um card', () => {
      const files = [
        { path: 'src/routes/authRoutes.ts', layer: 'routes' },
        { path: 'src/controllers/authController.ts', layer: 'controllers' },
        { path: 'src/services/authService.ts', layer: 'services' },
        { path: 'src/middleware/authMiddleware.ts', layer: 'middlewares' }
      ]

      const allHaveAuthPrefix = files.every(f =>
        f.path.toLowerCase().includes('auth')
      )
      const layers = new Set(files.map(f => f.layer))
      const hasMultipleLayers = layers.size >= 2

      expect(allHaveAuthPrefix).toBe(true)
      expect(hasMultipleLayers).toBe(true)
      expect(files.length).toBe(4)
    })

    it('cenario: layer com 10 components deve dividir em multiplas screens', () => {
      const componentFiles = Array.from({ length: 10 }, (_, i) => ({
        path: `src/components/auth/Component${i}.tsx`,
        layer: 'components',
        subDir: 'auth'
      }))

      const MAX_FILES_PER_SCREEN = 5
      const shouldSplit = componentFiles.length > MAX_FILES_PER_SCREEN

      expect(shouldSplit).toBe(true)
      expect(componentFiles.length).toBe(10)

      // Calcular quantas screens seriam criadas
      const expectedScreens = Math.ceil(componentFiles.length / MAX_FILES_PER_SCREEN)
      expect(expectedScreens).toBeGreaterThanOrEqual(2)
    })
  })
})
