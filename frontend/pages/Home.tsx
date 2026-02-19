"use client"

import { useRouter } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Code2, MessageCircle, Play, ArrowRight, Sparkles, FolderKanban } from "lucide-react"

interface HomeProps {
  /**
   * Quando true, a tela funciona como landing pública:
   * - não chama APIs privadas
   * - cliques que dependem do app redirecionam para /login com ?redirect=...
   */
  isPublic?: boolean
}

export default function Home({ isPublic = false }: HomeProps) {
  const router = useRouter()

  const goToLoginWithRedirect = (redirectTo: string) => {
    router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`)
  }

  const handleGoToCodes = () => {
    if (isPublic) {
      goToLoginWithRedirect('/codes')
      return
    }
    router.push('/codes')
  }

  const handleGoToContents = () => {
    if (isPublic) {
      goToLoginWithRedirect('/contents')
      return
    }
    router.push('/contents')
  }

  const handleGoToProjects = () => {
    if (isPublic) {
      goToLoginWithRedirect('/projects')
      return
    }
    router.push('/projects')
  }

  const handleAccess = () => {
    if (isPublic) {
      goToLoginWithRedirect('/codes')
      return
    }
    router.push('/codes')
  }

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-white px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center space-y-5">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            Devs,{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              bora construir algo foda
            </span>
          </h1>

          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-gray-700">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Plataforma de produtividade para devs
          </div>

          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            A 10xDev surgiu com o intuito de equipar os programadores para alcançar o ápice da produtividade e construir o futuro do país.
          </p>

          <div className="pt-4">
            <Button
              onClick={handleAccess}
              className="w-full bg-gray-900 text-white hover:bg-gray-800 h-12 text-base font-semibold"
            >
              Acessar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {!isPublic && (
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
              <div className="rounded-xl border bg-white/60 px-4 py-3">
                <div className="font-semibold text-gray-900">Snippets</div>
                <div className="text-gray-600">cards prontos e reutilizáveis</div>
              </div>
              <div className="rounded-xl border bg-white/60 px-4 py-3">
                <div className="font-semibold text-gray-900">Conteúdos</div>
                <div className="text-gray-600">vídeos, posts, manuais e tutoriais</div>
              </div>
              <div className="rounded-xl border bg-white/60 px-4 py-3">
                <div className="font-semibold text-gray-900">Projetos</div>
                <div className="text-gray-600">organize cards por objetivo</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Imagina só Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-white px-6 py-12 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        
        <div className="relative mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Imagina só...
          </h2>
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
              mais de 10.000 programadores usando:
            </div>
            
            <ul className="space-y-3 text-base sm:text-lg text-gray-600 text-left">
              <li className="flex items-start gap-3">
                <span className="text-lg">🤖</span>
                <span>as últimas IAs no modo máximo</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">⚡</span>
                <span>IDEs otimizadas ao extremo</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">💎</span>
                <span>códigos prontos validados e de alta qualidade</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-lg">🇧🇷</span>
                <span>uma comunidade ativa, colaborativa e brasileira</span>
              </li>
            </ul>
            
            <p className="text-base sm:text-lg text-gray-900 font-medium pt-2">
              E direcionando todo esse potencial para os maiores desafios do Brasil?
            </p>
            
            <div className="pt-4">
              <Button
                onClick={handleAccess}
                className="w-full bg-gray-900 text-white hover:bg-gray-800 h-12 text-base font-semibold"
              >
                Acessar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Nosso diferencial Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-white px-6 py-12 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        
        <div className="relative mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Nosso diferencial
          </h2>
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="text-base sm:text-lg text-gray-600">
              Queremos que você lance rápido, sim, mas <strong className="font-semibold text-gray-900">sem criar débito técnico</strong>.
            </p>
            
            <p className="text-base sm:text-lg text-gray-600">
              Código gerado rápido mas que quebra em produção não adianta.
            </p>
            
            <p className="text-base sm:text-lg text-gray-600">
              Na 10xDev você ganha velocidade com qualidade: clean code, arquitetura sólida, melhores práticas validadas e conteúdo direto ao ponto.
            </p>
            
            <div className="pt-4">
              <Button
                onClick={handleAccess}
                className="w-full bg-gray-900 text-white hover:bg-gray-800 h-12 text-base font-semibold"
              >
                Acessar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Blocks */}
      <div className="relative overflow-hidden rounded-2xl border bg-white px-6 py-12 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        
        <div className="relative mx-auto max-w-4xl space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center">
            Acesse
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0">
              <CardContent className="p-5">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                  <Code2 className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-base mb-1.5 text-white">Códigos</h3>
                <p className="text-white/90 text-sm mb-3">Ver todos os snippets e cards</p>
                <Button
                  variant="secondary"
                  className="w-full bg-white text-blue-700 hover:bg-gray-100 font-medium"
                  onClick={handleGoToCodes}
                  aria-label="Acessar página de Códigos"
                >
                  Acessar Códigos
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-600 to-cyan-700 text-white border-0">
              <CardContent className="p-5">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                  <Play className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-base mb-1.5 text-white">Conteúdos</h3>
                <p className="text-white/90 text-sm mb-3">Vídeos, posts, manuais e tutoriais</p>
                <Button
                  variant="secondary"
                  className="w-full bg-white text-cyan-700 hover:bg-gray-100 font-medium"
                  onClick={handleGoToContents}
                  aria-label="Acessar página de Conteúdos"
                >
                  Acessar Conteúdos
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0">
              <CardContent className="p-5">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                  <FolderKanban className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-base mb-1.5 text-white">Projetos</h3>
                <p className="text-white/90 text-sm mb-3">Organize cards por objetivo e compartilhe com seu time</p>
                <Button
                  variant="secondary"
                  className="w-full bg-white text-emerald-700 hover:bg-gray-100 font-medium"
                  onClick={handleGoToProjects}
                  aria-label="Acessar página de Projetos"
                >
                  Acessar Projetos
                </Button>
              </CardContent>
            </Card>

            {/* Card Comunidade WhatsApp */}
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
              <CardContent className="p-5">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-base mb-1.5 text-white">Comunidade WhatsApp</h3>
                <p className="text-white/90 text-sm mb-3">
                  Conecte-se com desenvolvedores, compartilhe conhecimento e colabore em projetos.
                </p>
                <Button
                  variant="secondary"
                  className="w-full bg-white text-green-600 hover:bg-gray-100 font-medium"
                  onClick={() => window.open('https://chat.whatsapp.com/BdMZsIsUsDv7F2KAXVBatb?mode=hqrc', '_blank')}
                  aria-label="Abrir comunidade no WhatsApp em nova aba"
                >
                  Entrar na comunidade
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>


    </div>
  )
}