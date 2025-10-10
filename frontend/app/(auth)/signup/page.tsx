import { SignUpForm } from '@/components/auth/SignUpForm'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Criar conta
        </CardTitle>
        <CardDescription className="text-center">
          Preencha os dados abaixo para criar sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
    </Card>
  )
}
