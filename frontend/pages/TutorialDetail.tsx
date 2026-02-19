"use client"

import { useSearchParams, useRouter } from "next/navigation"
import TutorialDetailView from "@/components/TutorialDetailView"

interface TutorialDetailProps {
  id?: string
}

export default function TutorialDetail({ id: propId }: TutorialDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = propId || searchParams?.get('id') || null

  const handleBack = () => {
    router.push('/contents?tab=tutorials')
  }

  const handleGoHome = () => {
    router.push('/home')
  }

  const handleGoToTutorials = () => {
    router.push('/contents?tab=tutorials')
  }

  if (!id) {
    return <div className="p-4 text-red-600">ID do tutorial não fornecido</div>
  }

  return (
    <TutorialDetailView
      id={id}
      onBack={handleBack}
      onGoHome={handleGoHome}
      onGoToTutorials={handleGoToTutorials}
    />
  )
}
