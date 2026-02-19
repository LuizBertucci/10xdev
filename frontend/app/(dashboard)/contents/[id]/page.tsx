'use client'

import { useParams, useSearchParams } from 'next/navigation'
import ContentDetail from '@/pages/ContentDetail'
import TutorialDetail from '@/pages/TutorialDetail'

export default function ContentDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const tab = searchParams?.get('tab') || 'posts'
  
  // Se for tutorial, usa TutorialDetail, senão usa ContentDetail
  if (tab === 'tutorials') {
    return <TutorialDetail id={id} />
  }
  
  return <ContentDetail id={id} />
}
