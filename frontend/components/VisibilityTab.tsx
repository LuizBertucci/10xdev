import { Badge } from "@/components/ui/badge"
import { Lock, Globe, Link2 } from "lucide-react"
import { Visibility } from "@/types"

interface VisibilityTabProps {
  visibility?: Visibility
  isPrivate?: boolean
  size?: 'default' | 'small'
}

const VisibilityTab = ({ visibility, isPrivate, size = 'default' }: VisibilityTabProps) => {
  const isSmall = size === 'small'
  
  // Configurações de estilo baseadas no tamanho
  const badgeClass = isSmall 
    ? "text-[10px] px-1.5 py-0.5 rounded-md shadow-sm border" 
    : "text-xs rounded-md shadow-sm border"
  
  const iconClass = isSmall ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1"

  // Lógica unificada: visibility prioriza isPrivate (legado)
  const effectiveVisibility = visibility || (isPrivate ? Visibility.PRIVATE : Visibility.PUBLIC)

  if (effectiveVisibility === Visibility.PUBLIC) {
    return (
      <Badge variant="secondary" className={`${badgeClass} border-green-300 bg-green-50 text-green-700`}>
        <Globe className={iconClass} />
        Público
      </Badge>
    )
  }

  if (effectiveVisibility === Visibility.PRIVATE) {
    return (
      <Badge variant="secondary" className={`${badgeClass} border-orange-300 bg-orange-50 text-orange-700`}>
        <Lock className={iconClass} />
        Privado
      </Badge>
    )
  }

  if (effectiveVisibility === Visibility.UNLISTED) {
    return (
      <Badge variant="secondary" className={`${badgeClass} border-blue-300 bg-blue-50 text-blue-700`}>
        <Link2 className={iconClass} />
        Não Listado
      </Badge>
    )
  }

  return null
}

export { VisibilityTab }

