import { ThemeProvider } from '@/components/theme-provider'
import { Zap, Code2, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Elementos decorativos de fundo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 right-20 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header com logo */}
          <header className="backdrop-blur-sm bg-white/80 shadow-sm border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <Link href="/login" className="flex items-center space-x-2 group">
                  <div className="relative">
                    <Zap className="h-8 w-8 text-blue-600 group-hover:text-blue-700 transition-colors" />
                    <Sparkles className="h-4 w-4 text-blue-400 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    10xDev
                  </span>
                </Link>
              </div>
            </div>
          </header>

          {/* Conteúdo centralizado */}
          <div className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
              {children}
            </div>
          </div>

          {/* Footer */}
          <footer className="backdrop-blur-sm bg-white/60 border-t border-white/20 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center space-y-2">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Code2 className="h-4 w-4" />
                  <span className="text-sm">Desenvolvido para programadores 10x</span>
                </div>
                <p className="text-xs text-gray-500">
                  © 2025 10xDev. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  )
}
