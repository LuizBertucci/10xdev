"use client"

import { useSearchParams, useRouter } from "next/navigation"
import ContentDetailView from "@/components/ContentDetailView"

interface PlatformState {
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

interface ContentDetailProps {
  platformState?: PlatformState
  id?: string
}

export default function ContentDetail({ platformState, id: propId }: ContentDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = propId || searchParams?.get('id') || null

  const handleBack = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', 'contents')
    params.delete('id')
    router.push(`/?${params.toString()}`)
  }

  const goToTab = (tab: 'home' | 'contents') => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('id')
    if (tab === 'home') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : '/')
  }

  return (
    <ContentDetailView
      id={id}
      onBack={handleBack}
      onGoHome={() => goToTab("home")}
    />
  )
}
