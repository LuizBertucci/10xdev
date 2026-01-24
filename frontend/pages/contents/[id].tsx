"use client"

import { useRouter } from "next/router"
import ContentDetailView from "@/components/ContentDetailView"

export default function ContentDetailPage() {
  const router = useRouter()
  const { id } = router.query

  if (!router.isReady) {
    return null
  }

  const resolvedId = typeof id === "string" ? id : undefined

  return (
    <ContentDetailView
      id={resolvedId}
      onBack={() => router.push("/?tab=contents")}
      onGoHome={() => router.push("/")}
    />
  )
}
