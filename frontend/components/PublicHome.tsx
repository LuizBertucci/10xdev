'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import Home from '@/pages/Home'

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <img
              src="https://customer-assets.emergentagent.com/job_snippet-central/artifacts/ay9ovqle_WhatsApp%20Image%202026-02-23%20at%2001.18.28.jpeg"
              alt="10xDev Logo"
              className="h-24 w-auto filter invert mix-blend-multiply object-contain scale-[1.8]"
            />
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#diferencial" className="hover:text-foreground transition-colors">
              Diferencial
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="#comunidade" className="hover:text-foreground transition-colors">
              Comunidade
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Home
          isPublic
          videoUrl={process.env.NEXT_PUBLIC_LANDING_VIDEO_URL}
        />
      </main>

      <footer className="border-t bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="font-bold text-lg">10xDev</div>
              <p className="text-sm text-muted-foreground">
                Plataforma de produtividade feita por devs para devs.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Plataforma</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/codes" className="hover:text-foreground">
                    Códigos
                  </Link>
                </li>
                <li>
                  <Link href="/projects" className="hover:text-foreground">
                    Projetos
                  </Link>
                </li>
                <li>
                  <a href="#comunidade" className="hover:text-foreground">
                    Comunidade
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Termos de Uso</li>
                <li>Privacidade</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Social</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="https://chat.whatsapp.com/BdMZsIsUsDv7F2KAXVBatb?mode=hqrc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground"
                  >
                    WhatsApp
                  </a>
                </li>
                <li>Twitter</li>
                <li>GitHub</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2026 10xDev. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
