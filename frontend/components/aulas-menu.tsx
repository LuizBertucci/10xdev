"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface AulasMenuProps {
  onAddVideo: () => void
}

export default function AulasMenu({ onAddVideo }: AulasMenuProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Vídeos de Treinamento</h2>
        <p className="text-gray-600 mt-1">Organize e acesse seus vídeos do YouTube</p>
      </div>

      <Button
        onClick={onAddVideo}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Vídeo
      </Button>
    </div>
  )
}
