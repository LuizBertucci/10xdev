'use client'

import { useParams, useSearchParams } from 'next/navigation'
import ContentDetail from '@/pages/ContentDetail'
import TutorialDetail from '@/pages/TutorialDetail'

export default function ContentDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const contentsTab = searchParams?.get('contentsTab') || 'posts'
  
  // Se for tutorial, usa TutorialDetail, senão usa ContentDetail
  if (contentsTab === 'tutorials') {
    return <TutorialDetail id={id} />
  }
  
  return <ContentDetail id={id} />
}
