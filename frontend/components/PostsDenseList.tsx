"use client"

import { FileText, ExternalLink, Link2, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import type { Content } from "@/services/contentService"

function formatDateMedium(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface PostsDenseListProps {
  contents: Content[]
  isAdmin: boolean
  onCopyLink: (fileUrl: string) => Promise<void>
  onEdit?: (content: Content) => void
  onDelete?: (id: string) => void
}

export default function PostsDenseList({ contents, isAdmin, onCopyLink, onEdit, onDelete }: PostsDenseListProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {contents.map((content, idx) => {
        const hasPdf = Boolean(content.fileUrl)
        const sizeLabel = formatFileSize(content.fileSize)
        const tags = content.tags || []
        const visibleTags = tags.slice(0, 2)
        const hiddenCount = Math.max(0, tags.length - visibleTags.length)

        return (
          <div key={content.id} className="group">
            <div className="flex items-start gap-3 px-3 sm:px-4 py-3 hover:bg-gray-50 transition-colors">
              {/* Indicador PDF */}
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-9 w-9 rounded-md bg-red-50 border border-red-200 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
              </div>

              {/* Conteúdo */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50">PDF</Badge>
                      {hasPdf ? (
                        <a
                          href={content.fileUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-gray-900 truncate hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                          title={content.title}
                        >
                          {content.title}
                        </a>
                      ) : (
                        <span className="font-semibold text-gray-900 truncate" title={content.title}>
                          {content.title}
                        </span>
                      )}
                    </div>

                    {content.description && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{content.description}</p>
                    )}

                    {/* Metadados */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
                      {content.category && (
                        <Badge variant="outline" className="text-xs text-gray-700">
                          {content.category}
                        </Badge>
                      )}

                      {visibleTags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                      {hiddenCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          +{hiddenCount}
                        </Badge>
                      )}

                      <span className="text-gray-400">•</span>
                      <span>Atualizado {formatDateMedium(content.updatedAt)}</span>
                      {sizeLabel && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span>{sizeLabel}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ações (desktop) */}
                  <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={!hasPdf}
                      asChild={hasPdf}
                    >
                      {hasPdf ? (
                        <a href={content.fileUrl!} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir PDF
                        </a>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir PDF
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => content.fileUrl && onCopyLink(content.fileUrl)}
                      disabled={!hasPdf}
                      title="Copiar link"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>

                    {isAdmin && onEdit && (
                      <Button size="sm" variant="outline" onClick={() => onEdit(content)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isAdmin && onDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(content.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Ações (mobile) */}
                  <div className="sm:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!hasPdf} asChild={hasPdf}>
                          {hasPdf ? (
                            <a href={content.fileUrl!} target="_blank" rel="noopener noreferrer">
                              Abrir PDF
                            </a>
                          ) : (
                            <span>Abrir PDF</span>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!hasPdf} onClick={() => content.fileUrl && onCopyLink(content.fileUrl)}>
                          Copiar link
                        </DropdownMenuItem>
                        {isAdmin && onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(content)}>Editar</DropdownMenuItem>
                        )}
                        {isAdmin && onDelete && (
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(content.id)}>
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>

            {idx < contents.length - 1 && <Separator />}
          </div>
        )
      })}
    </div>
  )
}

