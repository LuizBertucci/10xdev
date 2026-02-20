import type { AppProps } from 'next/app'

import '../styles/globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import ImportProgressModal from '@/components/ImportProgressModal'
import ImportProgressWidget from '@/components/ImportProgressWidget'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <ImportProgressModal />
      <ImportProgressWidget />
    </AuthProvider>
  )
}


