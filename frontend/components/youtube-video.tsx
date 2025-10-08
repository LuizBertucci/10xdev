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
 * Suporta modo preview (thumbnail) e embed (player completo)
 */
export default function YouTubeVideo({ url, mode = "embed", className = "" }: YouTubeVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoId = extractYouTubeVideoId(url)

  if (!videoId) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg p-8 ${className}`}>
        <p className="text-gray-500 text-sm">URL inválida do YouTube</p>
      </div>
    )
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`

  // Modo Preview - mostra thumbnail clicável
  if (mode === "preview" && !isPlaying) {
    return (
      <div
        className={`relative cursor-pointer group overflow-hidden rounded-lg ${className}`}
        onClick={() => setIsPlaying(true)}
      >
        <img
          src={thumbnailUrl}
          alt="YouTube video thumbnail"
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <svg
              className="w-8 h-8 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  // Modo Embed - mostra player do YouTube
  return (
    <div className={`relative w-full ${className}`} style={{ paddingBottom: "56.25%" }}>
      <iframe
        src={isPlaying ? embedUrl : `https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute top-0 left-0 w-full h-full rounded-lg border-0"
      />
    </div>
  )
}
