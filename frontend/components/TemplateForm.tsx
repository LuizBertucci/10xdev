import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { templateService, type ProjectTemplate } from "@/services"
import { toast } from "sonner"

interface TemplateFormValues {
  name: string
  description: string
  file: File | null
}

interface TemplateFormProps {
  open: boolean
  mode: "create" | "edit"
  template?: ProjectTemplate | null
  isAdmin?: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function TemplateForm({ open, mode, template, isAdmin = true, onOpenChange, onSaved }: TemplateFormProps) {
  const [form, setForm] = useState<TemplateFormValues>({
    name: "",
    description: "",
    file: null
  })
  const [saving, setSaving] = useState(false)
  const supabase = useMemo(() => { try { return createClient() } catch { return null } }, [])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && template) {
      setForm({
        name: template.name || "",
        description: template.description || "",
        file: null
      })
      return
    }

    setForm({
      name: "",
      description: "",
      file: null
    })
  }, [open, mode, template])

  const updateField = (field: keyof TemplateFormValues, value: string | File | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem salvar templates")
      return
    }
    if (!form.name.trim()) {
      toast.error("Nome do template é obrigatório")
      return
    }
    if (mode === "create" && !form.file) {
      toast.error("Selecione o arquivo ZIP do template")
      return
    }
    if (!supabase) {
      toast.error("Supabase não disponível para upload")
      return
    }

    try {
      setSaving(true)

      let zipPath = template?.zipPath
      let zipUrl = template?.zipUrl

      if (form.file) {
        const safeName = form.file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
        const filePath = `templates/${Date.now()}-${safeName}`
        const { error: uploadError } = await supabase
          .storage
          .from("project-templates")
          .upload(filePath, form.file, {
            upsert: false,
            contentType: form.file.type || "application/zip"
          })

        if (uploadError) {
          throw new Error(uploadError.message || "Erro ao enviar o arquivo")
        }

        const publicUrl = supabase.storage.from("project-templates").getPublicUrl(filePath).data.publicUrl
        zipPath = filePath
        zipUrl = publicUrl
      }

      if (mode === "create") {
        const response = await templateService.createTemplate({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          zipPath: zipPath || "",
          zipUrl: zipUrl
        })
        if (!response?.success) {
          throw new Error(response?.error || "Erro ao criar template")
        }
      } else if (template?.id) {
        const response = await templateService.updateTemplate(template.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          ...(zipPath ? { zipPath } : {}),
          ...(zipUrl ? { zipUrl } : {})
        })
        if (!response?.success) {
          throw new Error(response?.error || "Erro ao atualizar template")
        }
      }

      toast.success(mode === "edit" ? "Template atualizado com sucesso!" : "Template criado com sucesso!")
      onSaved()
      onOpenChange(false)
      setForm({
        name: "",
        description: "",
        file: null
      })
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar template")
    } finally {
      setSaving(false)
    }
  }

  const title = mode === "edit" ? "Editar Template" : "Novo Template"
  const ctaLabel = mode === "edit" ? "Salvar" : "Criar Template"
  const fileName = form.file?.name || "Nenhum arquivo selecionado"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Atualize os dados do template e, se quiser, troque o ZIP."
              : "Cadastre um template zipado para uso na criação de projetos."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div>
            <Label htmlFor="template-name">Nome *</Label>
            <Input id="template-name" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="mt-1.5 h-11 focus-visible:ring-0 focus-visible:ring-offset-0" />
          </div>
          <div>
            <Label htmlFor="template-description">Descrição</Label>
            <Textarea id="template-description" value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={4} className="mt-1.5 resize-none focus-visible:ring-0 focus-visible:ring-offset-0" spellCheck={false} />
          </div>
          <div>
            <Label htmlFor="template-file">Arquivo ZIP {mode === "create" ? "*" : "(opcional)"}</Label>
            <div className="mt-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100"
              >
                <span className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                  Escolher arquivo
                </span>
                <span className="text-gray-400">•</span>
                <span className="truncate">{fileName}</span>
              </button>
              <Input
                ref={fileInputRef}
                id="template-file"
                type="file"
                accept=".zip"
                onChange={(e) => updateField("file", e.target.files?.[0] || null)}
                className="sr-only"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {mode === "edit"
                ? "Envie um ZIP apenas se quiser substituir o atual."
                : "Envie o template compactado (.zip)."}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-6 mt-2 bg-white">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-11 px-6">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim() || (mode === "create" && !form.file)} className="h-11 px-6">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Plus className="h-4 w-4 mr-2" />{ctaLabel}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
