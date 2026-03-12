import { notFound } from 'next/navigation'
import CodeDetailClient from './CodeDetailClient'
import type { CardFeature } from '@/types'

async function fetchCard(id: string): Promise<CardFeature | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://web-backend-10xdev.azurewebsites.net/api'
  try {
    const res = await fetch(`${apiUrl}/card-features/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json() as { success: boolean; data?: CardFeature }
    return data.success && data.data ? data.data : null
  } catch {
    return null
  }
}

export default async function CodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = await fetchCard(id)

  if (!card) notFound()

  return <CodeDetailClient initialCard={card} />
}
