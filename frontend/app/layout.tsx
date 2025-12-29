import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { SavedItemsProvider } from '@/hooks/useSavedItems'

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
      <body>
        <AuthProvider>
          <SavedItemsProvider>{children}</SavedItemsProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
