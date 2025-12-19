"use client"

import { useState } from "react"

interface YouTubeVideoProps {
  url: string
  mode?: "preview" | "embed"
  className?: string
}

/**
 * Extrai o ID do vídeo do YouTube de diferentes formatos de URL
 * Suporta:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url)

    // Formato: youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes("youtube.com") && urlObj.searchParams.has("v")) {
      return urlObj.searchParams.get("v")
    }

    // Formato: youtu.be/VIDEO_ID
    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1).split("?")[0]
    }

    // Formato: youtube.com/embed/VIDEO_ID
    if (urlObj.hostname.includes("youtube.com") && urlObj.pathname.includes("/embed/")) {
      return urlObj.pathname.split("/embed/")[1]?.split("?")[0]
    }

    // Formato: youtube.com/shorts/VIDEO_ID
    if (urlObj.hostname.includes("youtube.com") && urlObj.pathname.includes("/shorts/")) {
      return urlObj.pathname.split("/shorts/")[1]?.split("?")[0]
    }

    return null
  } catch {
    return null
  }
}

/**
 * Componente para exibir vídeos do YouTube
 * Sempre mostra o iframe embed para evitar problemas de re-renderização
 */
export default function YouTubeVideo({ url, mode = "embed", className = "" }: YouTubeVideoProps) {
  const videoId = extractYouTubeVideoId(url)

  if (!videoId) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg p-8 ${className}`}>
        <p className="text-gray-500 text-sm">URL inválida do YouTube</p>
      </div>
    )
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}`

  // Sempre mostra o iframe - mais estável e sem problemas de estado
  return (
    <div className={`relative w-full ${className}`} style={{ paddingBottom: "56.25%" }}>
      <iframe
        src={embedUrl}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full rounded-lg border-0"
      />
    </div>
  )
}
