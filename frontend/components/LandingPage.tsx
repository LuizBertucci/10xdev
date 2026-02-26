'use client'

import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  FileCode,
  FolderGit2,
  Layout,
  MessageCircle,
  Terminal,
} from 'lucide-react'
const WHATSAPP_URL = 'https://chat.whatsapp.com/BdMZsIsUsDv7F2KAXVBatb?mode=hqrc'

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M19.11 4.93A9.92 9.92 0 0 0 12.07 2C6.58 2 2.11 6.47 2.11 11.96c0 1.76.46 3.48 1.33 4.99L2 22l5.21-1.37a9.9 9.9 0 0 0 4.86 1.24h.01c5.49 0 9.96-4.47 9.96-9.96 0-2.66-1.04-5.16-2.93-6.98ZM12.08 20.2h-.01a8.2 8.2 0 0 1-4.17-1.13l-.3-.18-3.09.81.83-3.01-.19-.31a8.26 8.26 0 0 1-1.27-4.42c0-4.56 3.71-8.27 8.28-8.27 2.21 0 4.28.86 5.84 2.43a8.2 8.2 0 0 1 2.42 5.84c0 4.56-3.71 8.27-8.27 8.27Zm4.54-6.19c-.25-.12-1.48-.73-1.71-.81-.23-.08-.39-.12-.55.12-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.21-.73-.65-1.23-1.45-1.37-1.7-.15-.25-.02-.39.11-.52.11-.11.25-.29.37-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.07-.12-.56-1.35-.77-1.85-.2-.48-.41-.41-.55-.42h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.43 1.02 2.6.12.17 1.76 2.68 4.25 3.76.59.26 1.05.41 1.41.53.59.19 1.13.16 1.55.1.47-.07 1.48-.6 1.69-1.18.21-.58.21-1.08.14-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  )
}

export default function LandingPage() {
  const router = useRouter()

  const goToRegister = () => router.push('/register')
  const goToLoginWithRedirect = (path: string) =>
    router.push(`/login?redirect=${encodeURIComponent(path)}`)

  return (
    <main className="flex-1">
      {/* Hero */}
      <section
        id="diferencial"
        className="relative pt-16 pb-4 md:pt-24 md:pb-8 overflow-hidden"
      >
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"
          aria-hidden
        />
        <div
          className="absolute left-1/2 right-0 top-0 -z-10 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]"
          aria-hidden
        />
        <div
          className="absolute right-0 bottom-0 -z-10 h-[400px] w-[400px] rounded-full bg-teal-500/10 blur-[100px]"
          aria-hidden
        />

        <div className="container mx-auto px-4 flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground bg-background/50 backdrop-blur-sm mb-6 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Plataforma de produtividade para devs
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-5xl mb-6 leading-tight">
            Devs, bora construir <br className="hidden md:block" />{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500">
              algo incrível.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mb-10 leading-relaxed font-light">
            A 10xDev te equipa - com códigos prontos, conteúdos validados e IA de
            ponta - a produzir 10x mais e tirar seus projetos do papel.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-12">
            <Button
              size="lg"
              className="text-sm px-8 h-12 rounded-full bg-primary hover:bg-primary/90 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              onClick={goToRegister}
            >
              Acessar 10xdev.com.br
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-sm px-8 h-12 rounded-full border-green-500/40 text-green-700 hover:bg-green-50 hover:text-green-800 backdrop-blur-sm"
              onClick={() => window.open(WHATSAPP_URL, '_blank')}
            >
              <WhatsAppIcon className="mr-2 h-4 w-4" />
              Ver comunidade
            </Button>
          </div>

          {/* Área de vídeo da hero temporariamente oculta até disponibilizarmos o vídeo oficial. */}
        </div>
      </section>

      {/* Diretório de funcionalidades */}
      <section
        id="features"
        className="py-20 md:py-28 bg-muted/20 relative overflow-hidden"
      >
        <div
          className="absolute left-0 top-1/4 -z-10 h-[600px] w-[600px] bg-blue-500/5 blur-[100px] rounded-full"
          aria-hidden
        />
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div
                className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl blur-2xl opacity-10"
                aria-hidden
              />
              <div className="bg-background border rounded-2xl shadow-2xl overflow-hidden relative">
                <div className="border-b bg-muted/30 p-4 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <div className="mx-auto text-xs text-muted-foreground font-mono bg-background px-3 py-1 rounded-md border">
                    10xdev.com/snippets
                  </div>
                </div>
                <div className="p-6 grid gap-4">
                  <div className="bg-background border rounded-xl p-4 shadow-sm hover:border-blue-500/50 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                          <Code2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">Auth Middleware</h4>
                          <p className="text-xs text-muted-foreground">
                            Backend • Node.js
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors"
                      >
                        Ready
                      </Badge>
                    </div>
                    <div className="h-2 w-3/4 bg-muted rounded mb-2" />
                    <div className="h-2 w-1/2 bg-muted rounded" />
                  </div>
                  <div className="bg-background border rounded-xl p-4 shadow-lg scale-105 border-blue-500/20 ring-1 ring-blue-500/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        Card #1042
                      </span>
                    </div>
                    <pre className="text-[10px] leading-relaxed font-mono text-muted-foreground overflow-x-auto">
                      <span className="text-purple-600">const</span>{' '}
                      <span className="text-blue-600">validateUser</span> ={' '}
                      <span className="text-foreground">async</span> (req) =&gt;{' '}
                      {'{\n'}
                      {'  '}
                      <span className="text-purple-600">const</span> token =
                      req.headers.authorization;
                      {'\n  '}
                      <span className="text-green-600">
                        // Validated logic here
                      </span>
                      {'\n'}
                      {'}'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 text-blue-700 text-sm font-medium mb-6">
                <Terminal size={14} />
                Diretório de Funcionalidades
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                Diretório de{' '}
                <span className="text-blue-600">funcionalidades prontas</span>.
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Empacotamos funcionalidades completas e te disponibilizamos
                através de <strong>Cards</strong>. Cada um resolve um problema
                de ponta a ponta: arquitetura, backend, frontend e integrações.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Código validado e pronto para produção',
                  'Integração simples: copie, cole e adapte',
                  'Economize horas de configuração inicial',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-foreground/80"
                  >
                    <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 h-auto text-lg shadow-lg shadow-blue-500/20"
                onClick={() => goToLoginWithRedirect('/codes')}
              >
                Acessar 10xdev.com.br
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Biblioteca - Séries de Conteúdos */}
      <section className="py-24 md:py-32 bg-background relative">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/50 text-indigo-700 text-sm font-medium mb-6">
                <BookOpen size={14} />
                Biblioteca Completa
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
                Séries de <span className="text-indigo-600">Conteúdos</span>.
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Vídeos, PDFs, Comandos de terminal, Blocos de texto, Blocos de
                Código - Tudo organizado. Passo a passos completos e práticos.
              </p>
              <div className="border-l-2 border-indigo-200 pl-5 space-y-3">
                <p className="font-medium text-foreground">
                  E, de baixo dos panos, estruturado em JSON para ser facilmente
                  consumido pela sua IA também.
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-6 rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-6 py-5 h-auto text-base"
                onClick={() => goToLoginWithRedirect('/contents')}
              >
                Acessar 10xdev.com.br
              </Button>
            </div>

            <div className="relative">
              <div
                className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"
                aria-hidden
              />
              <div
                className="absolute -left-8 -bottom-8 w-32 h-32 bg-purple-500/10 rounded-full blur-xl"
                aria-hidden
              />
              <div className="bg-background border rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden relative">
                <div className="h-60 bg-muted/50 relative overflow-hidden group flex items-center justify-center">
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10"
                    aria-hidden
                  />
                </div>
                <div className="text-center p-5">
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mx-auto mb-3 flex items-center justify-center text-indigo-600">
                    <BookOpen size={28} />
                  </div>
                  <p className="text-xs font-medium text-indigo-900/60 dark:text-indigo-200/60">
                    Trilhas de Conhecimento
                  </p>
                </div>
                <div className="p-5">
                  <div className="flex gap-2 mb-3">
                    <Badge
                      variant="outline"
                      className="bg-indigo-50 border-indigo-100 text-indigo-600"
                    >
                      Em Breve
                    </Badge>
                    <Badge variant="outline">Backend & Frontend</Badge>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Séries e Tutoriais</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conteúdos estruturados para você dominar novas stacks.
                  </p>
                  <div className="space-y-3">
                    <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-indigo-500/20" />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Módulos planejados</span>
                      <span>Conteúdo em produção</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Importação Git */}
      <section className="py-20 md:py-28 bg-muted/20 border-t border-b border-border/50 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-background border rounded-2xl shadow-xl overflow-hidden">
                <div className="flex border-b">
                  <div className="w-56 border-r bg-muted/10 p-3 hidden md:block">
                    <div className="text-xs font-bold text-muted-foreground mb-3 tracking-wider">
                      ARQUIVOS
                    </div>
                    <div className="space-y-2">
                      {['src', 'components', 'hooks', 'utils'].map((folder) => (
                        <div
                          key={folder}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <FolderGit2 size={14} className="text-teal-600" />
                          {folder}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-sm text-foreground font-medium bg-teal-50/50 p-1 rounded">
                        <FileCode size={14} className="text-teal-600" />
                        App.tsx
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-5 bg-background">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold flex items-center gap-2">
                        <Layout size={18} className="text-teal-600" />
                        Dashboard V2
                      </h3>
                      <Badge className="bg-teal-600 hover:bg-teal-700">
                        Ativo
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl border border-teal-100 bg-teal-50/30">
                        <h4 className="text-sm font-semibold text-teal-900 mb-1">
                          Estrutura Pronta
                        </h4>
                        <p className="text-xs text-teal-700/80">
                          Todo o boilerplate configurado. Rotas, Context API e
                          Tailwind prontos.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-20 flex-1 bg-muted/50 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                          Chart Component
                        </div>
                        <div className="h-20 flex-1 bg-muted/50 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                          Sidebar
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100/50 text-teal-700 text-xs font-medium mb-5">
                <Layout size={12} />
                Importação Git Inteligente
              </div>
              <h2 className="text-2xl md:text-4xl font-bold mb-5 tracking-tight">
                Seu <span className="text-teal-600">Repositório Inteligente</span>
              </h2>
              <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                Conecte seu GitHub e veja a mágica acontecer. A 10xDev processa
                seu código, segmenta funcionalidades e entrega tudo em cards
                estruturados.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2.5 shrink-0" />
                  <p className="text-muted-foreground">
                    Acesse cada funcionalidade do início ao fim em uma
                    visualização única.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2.5 shrink-0" />
                  <p className="text-muted-foreground">
                    Trabalhe com IA integrada para acelerar seu desenvolvimento.
                  </p>
                </li>
              </ul>
              <Button
                className="mt-5 bg-teal-600 hover:bg-teal-700 text-white rounded-full px-8 py-6 h-auto text-lg shadow-lg shadow-teal-500/20"
                onClick={() => goToLoginWithRedirect('/projects')}
              >
                Acessar 10xdev.com.br
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Comunidade */}
      <section id="comunidade" className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div
            className="bg-gradient-to-br from-[#111] to-[#222] rounded-3xl p-6 md:p-12 text-white text-center relative overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-20 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')`,
              }}
              aria-hidden
            />
            <div
              className="absolute -top-24 -left-24 w-64 h-64 bg-green-500/20 blur-[80px] rounded-full"
              aria-hidden
            />
            <div
              className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full"
              aria-hidden
            />
            <div className="relative z-10 max-w-3xl mx-auto">
              <MessageCircle className="w-14 h-14 text-green-400 mx-auto mb-5" />
              <h2 className="text-2xl md:text-4xl font-bold mb-5">
                Comunidade Brasileira Ativa
              </h2>
              <p className="text-gray-400 text-base md:text-lg mb-8">
                Não construa sozinho. Tire dúvidas, compartilhe conquistas e
                faça networking com devs que estão no mesmo corre que você.
              </p>
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 h-12 text-base border-0 shadow-[0_0_20px_rgba(22,163,74,0.4)]"
                onClick={() => window.open(WHATSAPP_URL, '_blank')}
              >
                Acessar 10xdev.com.br
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 md:py-28 text-center bg-muted/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Pronto para codar em <br />
            <span className="text-primary">outro nível?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Junte-se a milhares de desenvolvedores que estão construindo o
            futuro agora.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="h-12 px-8 text-base rounded-full shadow-lg hover:shadow-xl transition-all"
              onClick={goToRegister}
            >
              Acessar 10xdev.com.br
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
