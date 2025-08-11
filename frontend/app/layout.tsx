import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import Navbar from '@/components/Layout/Navbar'

export const metadata: Metadata = {
  title: '10xDev',
  description: 'Plataforma de desenvolvimento para programadores 10x',
  generator: '10xDev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
