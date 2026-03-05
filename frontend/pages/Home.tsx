'use client'

import { useRouter } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Code2, Layout, MessageCircle, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()

  const handleGoToCodes = () => {
    router.push('/codes')
  }

  const handleGoToContents = () => {
    router.push('/contents?tab=tutorials')
  }

  const handleGoToProjects = () => {
    router.push('/projects')
  }

  const handleGoToWhatsApp = () => {
    window.open('https://chat.whatsapp.com/BdMZsIsUsDv7F2KAXVBatb?mode=hqrc', '_blank')
  }

  const handleGoToAdmin = () => {
    router.push('/admin')
  }

  const quickAccessItems = [
    {
      key: 'codes',
      title: 'Códigos',
      description: 'Acesse snippets e cards reutilizáveis prontos para produção.',
      icon: <Code2 className="h-6 w-6" />,
      accent: 'text-blue-600',
      iconBg: 'bg-blue-500/15 text-blue-600',
      border: 'border-blue-200/30 hover:border-blue-500/50',
      onClick: handleGoToCodes,
    },
    {
      key: 'projects',
      title: 'Projetos',
      description: 'Organize cards por objetivo e evolua o trabalho com seu time.',
      icon: <Layout className="h-6 w-6" />,
      accent: 'text-teal-600',
      iconBg: 'bg-teal-500/15 text-teal-600',
      border: 'border-teal-200/30 hover:border-teal-500/50',
      onClick: handleGoToProjects,
    },
    {
      key: 'contents',
      title: 'Conteúdos',
      description: 'Veja materiais práticos para acelerar implementação e estudo.',
      icon: <BookOpen className="h-6 w-6" />,
      accent: 'text-indigo-600',
      iconBg: 'bg-indigo-500/15 text-indigo-600',
      border: 'border-indigo-200/30 hover:border-indigo-500/50',
      onClick: handleGoToContents,
    },
    {
      key: 'community',
      title: 'Comunidade',
      description: 'Entre no WhatsApp e troque aprendizado com outros devs.',
      icon: <MessageCircle className="h-6 w-6" />,
      accent: 'text-green-600',
      iconBg: 'bg-green-500/15 text-green-600',
      border: 'border-green-200/30 hover:border-green-500/50',
      onClick: handleGoToWhatsApp,
    },
    ...(user?.role === 'admin'
      ? [
          {
            key: 'admin',
            title: 'Painel de Controle',
            description: 'Gerencie recursos administrativos e visão global da plataforma.',
            icon: <Shield className="h-6 w-6" />,
            accent: 'text-amber-600',
            iconBg: 'bg-amber-500/15 text-amber-600',
            border: 'border-amber-200/30 hover:border-amber-500/50',
            onClick: handleGoToAdmin,
          },
        ]
      : []),
  ]

  return (
    <section className="py-6 md:py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Acessos rápidos</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Entre direto nas áreas mais importantes para continuar seu fluxo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            {quickAccessItems.map((item) => (
              <Card
                key={item.key}
                className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${item.border}`}
                onClick={item.onClick}
              >
                <CardHeader className="pb-3">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${item.iconBg}`}>
                    {item.icon}
                  </div>
                  <CardTitle className={`text-lg ${item.accent}`}>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{item.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
