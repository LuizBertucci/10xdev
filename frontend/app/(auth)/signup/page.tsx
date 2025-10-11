import { SignUpForm } from '@/components/auth/SignUpForm'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Rocket } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95 w-full max-w-md">
        <CardHeader className="space-y-4 pb-8">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Rocket className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Comece sua jornada
          </CardTitle>
          <CardDescription className="text-center text-base text-gray-600">
            Crie sua conta e torne-se um desenvolvedor 10x
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <SignUpForm />
        </CardContent>
      </Card>
    </div>
  )
}
