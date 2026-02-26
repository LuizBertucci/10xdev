'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import LandingPage from '@/components/LandingPage'

const WHATSAPP_URL = 'https://chat.whatsapp.com/BdMZsIsUsDv7F2KAXVBatb?mode=hqrc'

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors"
          >
            10xDev
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <a href="#diferencial" className="hover:text-primary transition-colors">
              Diferencial
            </a>
            <a href="#features" className="hover:text-primary transition-colors">
              Recursos
            </a>
            <a href="#comunidade" className="hover:text-primary transition-colors">
              Comunidade
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="ghost"
              className="hidden sm:flex hover:bg-muted/50"
            >
              <Link href="/login">Login</Link>
            </Button>
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/20 transition-all"
            >
              <Link href="/register">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <LandingPage />

      <footer className="border-t bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <Link
                href="/"
                className="inline-block text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors"
              >
                10xDev
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Plataforma de produtividade feita por devs para devs. Focada em
                eliminar trabalho repetitivo e garantir qualidade.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-5 text-sm">Plataforma</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link href="/codes" className="hover:text-primary transition-colors">
                    Códigos
                  </Link>
                </li>
                <li>
                  <Link href="/projects" className="hover:text-primary transition-colors">
                    Projetos
                  </Link>
                </li>
                <li>
                  <a href="#comunidade" className="hover:text-primary transition-colors">
                    Comunidade
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-5 text-sm">Social</h4>
              <div className="flex items-center gap-3">
                <a
                  href="https://www.linkedin.com/company/startup-10xdev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-[#0077b5] transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                <a
                  href="https://discord.gg/wy2gm2ss"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-[#5865F2] transition-colors"
                  aria-label="Discord"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-[#25D366] transition-colors"
                  aria-label="WhatsApp"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground">
            © 2026 10xDev. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
