'use client'

import { useParams } from 'next/navigation'
import ProjectDetail from '@/pages/ProjectDetail'

export default function ProjectDetailPage() {
  const params = useParams()
  const id = params?.id as string

  return <ProjectDetail id={id} />
}
