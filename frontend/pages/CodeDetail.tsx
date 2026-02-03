"use client"
import { useSearchParams, useRouter } from "next/navigation"
import CodeDetailView from "@/components/CodeDetailView"
interface PlatformState {
  activeTab?: string
  setActiveTab?: (tab: string) => void
}
interface CodeDetailProps {
  platformState?: PlatformState
  id?: string | null
}
export default function CodeDetail({ platformState, id: propId }: CodeDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = propId || searchParams?.get('id') || null
  const handleBack = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    const currentTab = platformState?.activeTab || 'codes'
    params.set('tab', currentTab)
    params.delete('id')
    router.push(`/?${params.toString()}`)
  }
  const goToTab = (tab: 'home' | 'codes' | 'contents' | 'projects') => {
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
    <CodeDetailView
      id={id}
      onBack={handleBack}
      onGoHome={() => goToTab("home")}
    />
  )
}
