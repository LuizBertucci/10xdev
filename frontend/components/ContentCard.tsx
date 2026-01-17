import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Play, Calendar, Tag, FileText, BookOpen, GraduationCap } from "lucide-react"
import { ContentType, type Content } from "@/services/contentService"

interface ContentCardProps {
  content: Content
  onView: (contentId: string) => void
  onEdit?: (content: Content) => void
  onDelete?: (contentId: string) => void
}

const CONTENT_TYPE_CONFIG = {
  [ContentType.VIDEO]: { icon: Play, color: 'text-red-600', bgColor: 'bg-red-100' },
  [ContentType.POST]: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  [ContentType.MANUAL]: { icon: BookOpen, color: 'text-green-600', bgColor: 'bg-green-100' },
  [ContentType.TUTORIAL]: { icon: GraduationCap, color: 'text-purple-600', bgColor: 'bg-purple-100' },
}

export default function ContentCard({
  content,
  onView,
  onEdit,
  onDelete
}: ContentCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const isVideo = content.contentType === ContentType.VIDEO
  const config = CONTENT_TYPE_CONFIG[content.contentType] || CONTENT_TYPE_CONFIG[ContentType.VIDEO]
  const IconComponent = config.icon

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail ou Icon */}
      <div className="relative group cursor-pointer" onClick={() => onView(content.id)}>
        {isVideo && content.thumbnail ? (
          <>
            <img
              src={content.thumbnail}
              alt={content.title}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
              <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </>
        ) : (
          <div className={`w-full h-48 ${config.bgColor} flex items-center justify-center`}>
            <IconComponent className={`h-16 w-16 ${config.color} opacity-50`} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600" onClick={() => onView(content.id)}>
          {content.title}
        </h3>

        {/* Description */}
        {content.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {content.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(content.createdAt)}
          </div>
          {content.category && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {content.category}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(content.id)}
            className="flex-1"
          >
            {isVideo ? <Play className="h-4 w-4 mr-2" /> : <IconComponent className="h-4 w-4 mr-2" />}
            {isVideo ? 'Assistir' : 'Ver'}
          </Button>
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(content)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(content.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
