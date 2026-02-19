import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface AIInstructionsProps {
  value: string
  onChange?: (value: string) => void
  label?: string
  rows?: number
  id?: string
}

export function AIInstructions({
  value,
  onChange,
  label = "Instruções para a IA",
  rows = 6,
  id = "import-instructions",
}: AIInstructionsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!isEditing) {
      setDraft(value)
    }
  }, [value, isEditing])

  const handleSave = () => {
    if (onChange) {
      onChange(draft)
    }
    setIsEditing(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="block text-sm font-semibold text-blue-700">
          {label}
        </Label>
        {onChange && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button type="button" size="sm" className="h-7 px-2 text-[11px]" onClick={handleSave}>
                  Salvar
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            )}
          </div>
        )}
      </div>
      <Textarea
        id={id}
        value={isEditing ? draft : value}
        readOnly={!isEditing}
        onChange={(event) => setDraft(event.target.value)}
        spellCheck={false}
        rows={rows}
        className="bg-gray-50 border-gray-200 text-xs resize-none overflow-y-auto outline-none focus:outline-none focus-visible:outline-none focus:border-gray-200 focus-visible:border-gray-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:shadow-none focus-visible:shadow-none"
      />
    </div>
  )
}
