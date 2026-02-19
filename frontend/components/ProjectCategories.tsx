import { Tag, GripVertical } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface ProjectCategoriesProps {
  categories: string[]
  counts: Map<string, number | unknown[]>
  selectedCategory: string
  onSelect: (category: string) => void
  allLabel: string
  allValue: string
  allCount: number
  loading?: boolean
  loadingText?: string
  emptyText?: string
  sortable?: boolean
  onOrderChange?: (newOrder: string[]) => void
  className?: string
}

interface CategoryItemProps {
  category: string
  count: number
  isActive: boolean
  onSelect: () => void
}

function CategoryItem({ category, count, isActive, onSelect }: CategoryItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-left transition-all duration-150 ${
        isActive
          ? "bg-blue-50 text-blue-700 shadow-sm"
          : "text-gray-600 hover:bg-blue-50/50"
      }`}
    >
      <span className="flex items-center gap-2 min-w-0 flex-1">
        <Tag className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-blue-500" : "text-gray-400"}`} />
        <span className="truncate capitalize">{category}</span>
      </span>
      <span
        className={`text-xs font-medium tabular-nums flex-shrink-0 ${
          isActive ? "text-blue-600" : "text-gray-400"
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function SortableCategoryItem({ category, count, isActive, onSelect }: CategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-left transition-all duration-150 ${
        isActive
          ? "bg-blue-50 text-blue-700 shadow-sm"
          : "text-gray-600 hover:bg-blue-50/50"
      } ${isDragging ? "cursor-grabbing shadow-md ring-1 ring-blue-300" : "cursor-pointer"}`}
    >
      <span className="flex items-center gap-2 min-w-0 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 -mr-1 hover:bg-blue-100/50 rounded"
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical className={`h-4 w-4 ${isActive ? "text-blue-500" : "text-gray-400"}`} />
        </div>
        <Tag className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-blue-500" : "text-gray-400"}`} />
        <span className="truncate capitalize">{category}</span>
      </span>
      <span
        className={`text-xs font-medium tabular-nums flex-shrink-0 ${
          isActive ? "text-blue-600" : "text-gray-400"
        }`}
      >
        {count}
      </span>
    </button>
  )
}

export function ProjectCategories({
  categories,
  counts,
  selectedCategory,
  onSelect,
  allLabel,
  allValue,
  allCount,
  loading = false,
  loadingText = "Carregando categorias...",
  emptyText = "Sem categorias",
  sortable = false,
  onOrderChange,
  className,
}: ProjectCategoriesProps) {
  const containerClassName = ["border border-blue-200/60 rounded-xl bg-white/80 backdrop-blur-sm p-3 space-y-1.5 shadow-lg overflow-y-auto scrollbar-slim", className].filter(Boolean).join(" ")
  const resolveCount = (value: number | unknown[] | undefined) => {
    if (Array.isArray(value)) return value.length
    if (typeof value === "number") return value
    if (value && typeof (value as { length?: number }).length === "number") {
      return (value as { length: number }).length
    }
    return 0
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (!sortable || !onOrderChange) return
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)
    const oldIndex = categories.indexOf(activeId)
    const newIndex = categories.indexOf(overId)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(categories, oldIndex, newIndex)
      onOrderChange(newOrder)
    }
  }

  return (
    <div className={containerClassName}>
      {loading ? (
        <p className="text-sm text-gray-500">{loadingText}</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyText}</p>
      ) : (
        <>
          <CategoryItem
            category={allLabel}
            count={allCount}
            isActive={selectedCategory === allValue}
            onSelect={() => onSelect(allValue)}
          />
          {sortable ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={categories} strategy={verticalListSortingStrategy}>
                {categories.map((category) => {
                  const count = resolveCount(counts.get(category))
                  const isActive = category === selectedCategory
                  return (
                    <SortableCategoryItem
                      key={category}
                      category={category}
                      count={count}
                      isActive={isActive}
                      onSelect={() => onSelect(category)}
                    />
                  )
                })}
              </SortableContext>
            </DndContext>
          ) : (
            categories.map((category) => {
              const count = resolveCount(counts.get(category))
              const isActive = category === selectedCategory
              return (
                <CategoryItem
                  key={category}
                  category={category}
                  count={count}
                  isActive={isActive}
                  onSelect={() => onSelect(category)}
                />
              )
            })
          )}
        </>
      )}
    </div>
  )
}
