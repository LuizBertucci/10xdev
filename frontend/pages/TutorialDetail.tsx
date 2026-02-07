"use client"

import { useSearchParams, useRouter } from "next/navigation"
import TutorialDetailView from "@/components/TutorialDetailView"

interface PlatformState {
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

interface TutorialDetailProps {
  platformState?: PlatformState
  id?: string
}

export default function TutorialDetail({ platformState: _platformState, id: propId }: TutorialDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = propId || searchParams?.get('id') || null

  const handleBack = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', 'contents')
    params.set('contentsTab', 'tutorials')
    params.delete('id')
    router.push(`/?${params.toString()}`)
  }

  const goToTab = (tab: 'home' | 'contents') => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('id')
    params.delete('contentsTab')
    if (tab === 'home') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const qs = params.toString()
    router.push(qs ? `/?${qs}` : '/')
  }

  const goToTutorials = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', 'contents')
    params.set('contentsTab', 'tutorials')
    params.delete('id')
    router.push(`/?${params.toString()}`)
  }

  return (
    <TutorialDetailView
      id={id}
      onBack={handleBack}
      onGoHome={() => goToTab("home")}
      onGoToTutorials={goToTutorials}
    />
  )
}
