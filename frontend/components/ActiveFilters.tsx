import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export interface ActiveFilter {
  key: string           // identificador único (ex: 'tech', 'language', 'author')
  label: string         // texto exibido no chip (ex: 'React', 'typescript', 'João')
  onRemove: () => void  // callback para remover o filtro
}

interface ActiveFiltersProps {
  filters: ActiveFilter[]
  onClearAll?: () => void
}

export default function ActiveFilters({ filters, onClearAll }: ActiveFiltersProps) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-gray-500 shrink-0">Filtros:</span>
      {filters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          {filter.label}
          <button
            type="button"
            onClick={filter.onRemove}
            aria-label={`Remover filtro ${filter.label}`}
            className="ml-0.5 rounded-full hover:text-blue-900 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {filters.length > 1 && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
        >
          Limpar tudo
        </button>
      )}
    </div>
  )
}
