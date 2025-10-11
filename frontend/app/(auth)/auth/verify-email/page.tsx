import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Verifique seu email
          </CardTitle>
          <CardDescription>
            Enviamos um link de confirmação para o seu email.
            Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-center text-gray-600 dark:text-gray-400">
            <p>Não recebeu o email?</p>
            <p>Verifique sua pasta de spam ou lixo eletrônico.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              Voltar para o login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
