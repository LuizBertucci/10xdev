import { Badge } from "@/components/ui/badge"
import { Lock, Globe, Link2 } from "lucide-react"
import { Visibility } from "@/types"
import { forwardRef } from "react"

interface VisibilityTabProps extends React.HTMLAttributes<HTMLDivElement> {
  visibility?: Visibility
  isPrivate?: boolean
  size?: 'default' | 'small'
  isClickable?: boolean
}

const VisibilityTab = forwardRef<HTMLDivElement, VisibilityTabProps>(
  ({ visibility, isPrivate, size = 'default', isClickable = false, className, ...props }, ref) => {
    const isSmall = size === 'small'
    
    // Configurações de estilo baseadas no tamanho
    const badgeClass = `${isSmall 
      ? "text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border" 
      : "text-xs rounded-md shadow-sm border"} ${isClickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} ${className || ""}`
    
    const iconClass = isSmall ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"

    // Lógica unificada: visibility prioriza isPrivate (legado)
    const effectiveVisibility = visibility || (isPrivate ? Visibility.PRIVATE : Visibility.PUBLIC)

    const renderBadge = (content: React.ReactNode, variantClass: string) => (
      <div ref={ref} {...props} className="inline-block">
        <Badge variant="secondary" className={`${badgeClass} ${variantClass}`}>
          {content}
        </Badge>
      </div>
    )

    if (effectiveVisibility === Visibility.PUBLIC) {
      return renderBadge(
        <>
          <Globe className={iconClass} />
          Público
        </>,
        "border-green-300 bg-green-50 text-green-700"
      )
    }

    if (effectiveVisibility === Visibility.PRIVATE) {
      return renderBadge(
        <>
          <Lock className={iconClass} />
          Privado
        </>,
        "border-orange-300 bg-orange-50 text-orange-700"
      )
    }

    if (effectiveVisibility === Visibility.UNLISTED) {
      return renderBadge(
        <>
          <Link2 className={iconClass} />
          Não Listado
        </>,
        "border-blue-300 bg-blue-50 text-blue-700"
      )
    }

    return null
  }
)

VisibilityTab.displayName = "VisibilityTab"

export { VisibilityTab }

