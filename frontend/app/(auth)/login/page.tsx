import { LoginForm } from '@/components/auth/LoginForm'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Bem-vindo de volta
        </CardTitle>
        <CardDescription className="text-center">
          Entre com suas credenciais para acessar sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  )
}
