import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthContext'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: '10xDev - Plataforma de Desenvolvimento',
  description: 'Plataforma brasileira de desenvolvimento para programadores 10x',
  generator: '10xDev Brasil',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
