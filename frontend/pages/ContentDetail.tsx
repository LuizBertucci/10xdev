"use client"

import { useSearchParams, useRouter } from "next/navigation"
import ContentDetailView from "@/components/ContentDetailView"

interface ContentDetailProps {
  id?: string
}

export default function ContentDetail({ id: propId }: ContentDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = propId || searchParams?.get('id') || null

  const handleBack = () => {
    router.push('/contents')
  }

  const handleGoHome = () => {
    router.push('/home')
  }

  return (
    <ContentDetailView
      id={id}
      onBack={handleBack}
      onGoHome={handleGoHome}
    />
  )
}
