"use client"

import { useState, useEffect } from "react"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { contentService } from "@/services"
import type { Content, CreateContentData, UpdateContentData } from "@/types/content"
import { TutorialContentType } from "@/types/content"
import { toast } from "sonner"

interface TutorialFormProps {
  isOpen: boolean
  onClose: () => void
  mode: "create" | "edit"
  tutorial?: Content | null
  onSuccess?: (tutorial: Content) => void
}

export default function TutorialForm({ isOpen, onClose, mode, tutorial, onSuccess }: TutorialFormProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    youtubeUrl: "",
    category: "",
    tags: ""
  })
  const [saving, setSaving] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (isOpen && mode === "edit" && tutorial) {
      setForm({
        title: tutorial.title || "",
        description: tutorial.description || "",
        youtubeUrl: tutorial.youtubeUrl || "",
        category: tutorial.category || "",
        tags: tutorial.tags?.join(", ") || ""
      })
    } else if (isOpen && mode === "create") {
      setForm({
        title: "",
        description: "",
        youtubeUrl: "",
        category: "",
        tags: ""
      })
    }
  }, [isOpen, mode, tutorial])

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Título é obrigatório")
      return
    }

    if (mode === "create" && !form.youtubeUrl.trim()) {
      toast.error("URL do YouTube é obrigatória")
      return
    }

    setSaving(true)
    try {
      const tagsArray = form.tags
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0)

      if (mode === "create") {
        const data: CreateContentData = {
          title: form.title,
          description: form.description || undefined,
          youtubeUrl: form.youtubeUrl,
          category: form.category || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          contentType: TutorialContentType.VIDEO
        }

        const res = await contentService.create(data)
        if (res?.success && res.data) {
          toast.success("Tutorial criado com sucesso!")
          onSuccess?.(res.data)
          onClose()
        } else {
          toast.error(res?.error || "Erro ao criar tutorial")
        }
      } else if (mode === "edit" && tutorial) {
        const data: UpdateContentData = {
          title: form.title,
          description: form.description || undefined,
          youtubeUrl: form.youtubeUrl || undefined,
          category: form.category || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined
        }

        const res = await contentService.update(tutorial.id, data)
        if (res?.success && res.data) {
          toast.success("Tutorial atualizado com sucesso!")
          onSuccess?.(res.data)
          onClose()
        } else {
          toast.error(res?.error || "Erro ao atualizar tutorial")
        }
      }
    } catch (_e) {
      toast.error(mode === "create" ? "Erro ao criar tutorial" : "Erro ao atualizar tutorial")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !saving && !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo Tutorial" : "Editar Tutorial"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Adicione um novo tutorial de vídeo" 
              : "Atualize as informações do tutorial"
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tutorial-title">Título *</Label>
            <Input
              id="tutorial-title"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Título do tutorial"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tutorial-description">Descrição</Label>
            <Textarea
              id="tutorial-description"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição do tutorial"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tutorial-youtube">
              URL do YouTube {mode === "create" && "*"}
            </Label>
            <Input
              id="tutorial-youtube"
              value={form.youtubeUrl}
              onChange={(e) => setForm(prev => ({ ...prev, youtubeUrl: e.target.value }))}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tutorial-category">Categoria</Label>
            <Input
              id="tutorial-category"
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
              placeholder="Ex: React, Node.js, DevOps"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tutorial-tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tutorial-tags"
              value={form.tags}
              onChange={(e) => setForm(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.title.trim() || (mode === "create" && !form.youtubeUrl.trim())}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {mode === "create" ? "Criar" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
