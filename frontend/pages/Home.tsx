'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Layout,
  MessageCircle,
  ShieldCheck,
  Terminal,
  Users,
  Zap,
} from 'lucide-react'

interface HomeProps {
  isPublic?: boolean
}

const DIFFERENCIAL_ITEMS = [
  'Foco em problemas reais do mercado',
  'Arquitetura limpa e escalável',
  'Snippets validados e atualizados',
]

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

  const handleGoToWhatsApp = () => {
    window.open('https://chat.whatsapp.com/BdMZsIsUsDv7F2KAXVBatb?mode=hqrc', '_blank')
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-8 pb-12 md:pt-12 md:pb-16 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]" />
        <div className="container mx-auto px-4 flex flex-col items-center text-center">
          <Badge
            variant="outline"
            className="mb-6 px-4 py-1.5 border-primary/20 bg-primary/5 text-primary"
          >
            <Zap className="mr-2 h-3.5 w-3.5 fill-primary" />
            Plataforma de produtividade para devs
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl mb-6 text-foreground">
            Devs, bora construir <br className="hidden md:block" />{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              algo incrível.
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            Chega de perder tempo com código duplicado e conteúdo fragmentado. A
            10xDev equipa você para alcançar o ápice da produtividade sem criar
            débito técnico.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button
              asChild
              size="lg"
              className="text-base px-8 h-12"
            >
              <Link href="/register">
                Começar agora <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 h-12"
              onClick={handleGoToWhatsApp}
            >
              Ver comunidade
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Imagina só...</h2>
            <p className="text-muted-foreground text-lg">
              Um ecossistema focado em entrega de valor real.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Zap className="h-6 w-6 text-yellow-500" />,
                title: 'Velocidade Extrema',
                desc: 'As últimas IAs e ferramentas no modo máximo para você voar.',
              },
              {
                icon: <Terminal className="h-6 w-6 text-blue-500" />,
                title: 'IDEs Otimizadas',
                desc: 'Ambientes configurados ao extremo para foco total.',
              },
              {
                icon: <ShieldCheck className="h-6 w-6 text-green-500" />,
                title: 'Código Validado',
                desc: 'Nada de snippets quebrados. Tudo testado e pronto para produção.',
              },
              {
                icon: <Users className="h-6 w-6 text-purple-500" />,
                title: 'Comunidade BR',
                desc: 'Uma comunidade ativa, colaborativa e 100% brasileira.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-background border shadow-sm hover:shadow-md transition-all"
              >
                <div className="mb-4 p-3 bg-muted rounded-xl">{item.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nosso Diferencial */}
      <section id="diferencial" className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                Nosso Diferencial
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Velocidade <span className="text-primary">com</span> Qualidade.
              </h2>
              <div className="space-y-6">
                <p className="text-lg text-muted-foreground">
                  Queremos que você lance rápido, sim, mas{' '}
                  <strong>sem criar débito técnico</strong>. Código gerado rápido
                  mas que quebra em produção não adianta.
                </p>
                <p className="text-lg text-muted-foreground">
                  Na 10xDev você ganha velocidade com qualidade: clean code,
                  arquitetura sólida, melhores práticas validadas e conteúdo
                  direto ao ponto.
                </p>
                <ul className="space-y-3 mt-4">
                  {DIFFERENCIAL_ITEMS.map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl -z-10" />
              <div className="bg-background border rounded-3xl p-8 shadow-2xl">
                <pre className="text-sm font-mono overflow-x-auto text-muted-foreground">
                  <code className="language-javascript">{`// O jeito 10xDev
const buildAmazingApp = async () => {
  const quality = await validateCode();
  const speed = await optimizeWorkflow();
  
  if (quality && speed) {
    return "Launchable MVP 🚀";
  }
  
  // Sem débito técnico
  // Sem dor de cabeça
};`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tudo em um só lugar */}
      <section id="features" className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Tudo em um só lugar</h2>
            <p className="text-muted-foreground">
              Centralizamos o caos para você focar no código.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/20 hover:border-blue-500/50 transition-all cursor-pointer group"
              onClick={handleGoToCodes}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Code2 className="h-6 w-6" />
                </div>
                <CardTitle className="text-blue-700 dark:text-blue-400">Códigos</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-blue-900/60 dark:text-blue-200/60">
                  Ver todos os snippets e cards. Soluções prontas e reutilizáveis.
                </CardDescription>
                <Button
                  variant="link"
                  className="px-0 text-blue-600 mt-4 group-hover:translate-x-2 transition-transform"
                >
                  Acessar Códigos <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-200/20 hover:border-indigo-500/50 transition-all cursor-pointer group"
              onClick={handleGoToContents}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-indigo-500/20 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-6 w-6" />
                </div>
                <CardTitle className="text-indigo-700 dark:text-indigo-400">
                  Conteúdos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-indigo-900/60 dark:text-indigo-200/60">
                  Vídeos, posts, manuais e tutoriais diretos ao ponto.
                </CardDescription>
                <Button
                  variant="link"
                  className="px-0 text-indigo-600 mt-4 group-hover:translate-x-2 transition-transform"
                >
                  Acessar Conteúdos <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-200/20 hover:border-teal-500/50 transition-all cursor-pointer group"
              onClick={handleGoToProjects}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-teal-500/20 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Layout className="h-6 w-6" />
                </div>
                <CardTitle className="text-teal-700 dark:text-teal-400">Projetos</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-teal-900/60 dark:text-teal-200/60">
                  Organize cards por objetivo e compartilhe com seu time.
                </CardDescription>
                <Button
                  variant="link"
                  className="px-0 text-teal-600 mt-4 group-hover:translate-x-2 transition-transform"
                >
                  Acessar Projetos <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card
              id="comunidade"
              className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/20 hover:border-green-500/50 transition-all cursor-pointer group"
              onClick={handleGoToWhatsApp}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-500/20 text-green-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <CardTitle className="text-green-700 dark:text-green-400">Comunidade</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-green-900/60 dark:text-green-200/60">
                  Conecte-se no WhatsApp, compartilhe conhecimento e colabore.
                </CardDescription>
                <Button
                  variant="link"
                  className="px-0 text-green-600 mt-4 group-hover:translate-x-2 transition-transform font-semibold"
                >
                  Entrar no WhatsApp <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 md:py-32 text-center">
        <div className="container mx-auto px-4 max-w-3xl">
          {isPublic ? (
            <>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                Pronto para codar em outro nível?
              </h2>
              <p className="text-xl text-muted-foreground mb-10">
                Junte-se a milhares de desenvolvedores que estão construindo o futuro
                agora.
              </p>
              <Button
                asChild
                size="lg"
                className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <Link href="/register">Criar conta gratuitamente</Link>
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                Velocidade com qualidade. É o que você merece.
              </h2>
              <p className="text-xl text-muted-foreground mb-10">
                Você já está aqui. Agora é só explorar códigos prontos, conteúdos que
                ensinam de verdade e projetos para elevar seu nível. O futuro que você
                constrói começa no próximo snippet.
              </p>
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
                onClick={() => router.push('/codes')}
              >
                Explorar Códigos <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </section>
    </>
  )
}
