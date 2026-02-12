'use client'

import { useParams } from 'next/navigation'
import CodeDetailView from '@/components/CodeDetailView'

export default function CodeDetailPage() {
  const params = useParams()
  const id = params?.id as string

  return <CodeDetailView codeId={id} />
}
