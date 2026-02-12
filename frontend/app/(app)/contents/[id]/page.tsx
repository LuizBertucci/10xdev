'use client'

import { useParams } from 'next/navigation'
import ContentDetail from '@/pages/ContentDetail'

export default function ContentDetailPage() {
  const params = useParams()
  const id = params?.id as string

  return <ContentDetail id={id} />
}
