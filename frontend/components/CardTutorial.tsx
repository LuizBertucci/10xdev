"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Clock } from "lucide-react"
import type { Content } from "@/types/content"

interface CardTutorialProps {
  tutorial: Content
  onClick: (tutorial: Content) => void
  className?: string
}

export default function CardTutorial({ tutorial, onClick, className }: CardTutorialProps) {
  // Thumbnail do YouTube ou placeholder
  const thumbnailUrl = tutorial.thumbnail || 
    (tutorial.videoId ? `https://img.youtube.com/vi/${tutorial.videoId}/hqdefault.jpg` : '/placeholder.svg')

  return (
    <Card 
      className={`group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${className || ''}`}
      onClick={() => onClick(tutorial)}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        <img
          src={thumbnailUrl}
          alt={tutorial.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/placeholder.svg'
          }}
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-300">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg">
            <Play className="w-6 h-6 text-red-600 ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Category Badge */}
        {tutorial.category && (
          <div className="absolute top-2 left-2">
            <Badge 
              variant="secondary" 
              className="bg-white/90 text-gray-700 text-xs font-medium shadow-sm"
            >
              {tutorial.category}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
          {tutorial.title}
        </h3>

        {/* Description */}
        {tutorial.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {tutorial.description}
          </p>
        )}

        {/* Tags */}
        {tutorial.tags && tutorial.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tutorial.tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs px-2 py-0 text-gray-500 border-gray-200"
              >
                {tag}
              </Badge>
            ))}
            {tutorial.tags.length > 3 && (
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0 text-gray-400 border-gray-200"
              >
                +{tutorial.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer with date */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">
            {new Date(tutorial.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
