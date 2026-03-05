import React, { useEffect, useState, useCallback } from "react"
import { Filter, Check, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { cardFeatureService } from "@/services"
import { isAllowedLanguage, isAllowedTech } from "@/components/utils/techConfigs"

interface FiltersModalProps {
    selectedTech: string
    selectedLanguage: string
    selectedTags: string[]
    onSelectTech: (tech: string) => void
    onSelectLanguage: (language: string) => void
    onSelectTags: (tags: string[]) => void
}

interface FiltersData {
    techs: string[]
    languages: string[]
    tags: string[]
}

export default function FiltersModal({
    selectedTech,
    selectedLanguage,
    selectedTags,
    onSelectTech,
    onSelectLanguage,
    onSelectTags
}: FiltersModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [filtersData, setFiltersData] = useState<FiltersData | null>(null)
    const [search, setSearch] = useState('')

    // Estado pendente — só aplica ao salvar
    const [pendingTech, setPendingTech] = useState(selectedTech)
    const [pendingLanguage, setPendingLanguage] = useState(selectedLanguage)
    const [pendingTags, setPendingTags] = useState<string[]>(selectedTags)

    // Sincroniza estado pendente ao abrir
    useEffect(() => {
        if (open) {
            setPendingTech(selectedTech)
            setPendingLanguage(selectedLanguage)
            setPendingTags(selectedTags)
            setSearch('')
        }
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    const fetchFilters = useCallback(async () => {
        if (filtersData) return
        setLoading(true)
        try {
            const response = await cardFeatureService.getFilters()
            if (response?.success && response.data) {
                setFiltersData(response.data as FiltersData)
            }
        } catch (error) {
            console.error('Erro ao carregar filtros:', error)
        } finally {
            setLoading(false)
        }
    }, [filtersData])

    useEffect(() => {
        if (open && !filtersData) {
            fetchFilters()
        }
    }, [open, filtersData, fetchFilters])

    const activeCount =
        (selectedTech !== 'all' ? 1 : 0) +
        (selectedLanguage ? 1 : 0) +
        selectedTags.length

    const pendingCount =
        (pendingTech !== 'all' ? 1 : 0) +
        (pendingLanguage ? 1 : 0) +
        pendingTags.length

    const handleSave = () => {
        onSelectTech(pendingTech)
        onSelectLanguage(pendingLanguage)
        onSelectTags(pendingTags)
        setOpen(false)
    }

    const handleCancel = () => {
        setOpen(false)
    }

    const handleClearPending = () => {
        setPendingTech('all')
        setPendingLanguage('')
        setPendingTags([])
    }

    const handleTechClick = (tech: string) => {
        setPendingTech(pendingTech === tech ? 'all' : tech)
    }

    const handleLanguageClick = (lang: string) => {
        setPendingLanguage(pendingLanguage === lang ? '' : lang)
    }

    const handleTagClick = (tag: string) => {
        setPendingTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        )
    }

    const q = search.toLowerCase().trim()
    const filteredTechs = filtersData?.techs.filter(t => isAllowedTech(t) && (!q || t.toLowerCase().includes(q))) ?? []
    const filteredLanguages = filtersData?.languages.filter(l => isAllowedLanguage(l) && (!q || l.toLowerCase().includes(q))) ?? []
    const filteredTags = filtersData?.tags.filter(t => !q || t.toLowerCase().includes(q)) ?? []
    const hasResults = filteredTechs.length > 0 || filteredLanguages.length > 0 || filteredTags.length > 0

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={`gap-1.5 text-sm font-medium transition-colors ${activeCount > 0
                            ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                >
                    <Filter className="h-4 w-4" />
                    Filtros
                    {activeCount > 0 && (
                        <Badge
                            variant="secondary"
                            className="ml-0.5 h-5 min-w-[20px] rounded-full bg-blue-600 text-white text-[10px] px-1.5 leading-none"
                        >
                            {activeCount}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>

            <DialogContent className="w-[90vw] max-w-lg flex flex-col max-h-[80vh] p-0 gap-0">
                {/* Header fixo */}
                <DialogHeader className="flex flex-row items-center justify-between px-5 py-4 border-b flex-shrink-0">
                    <DialogTitle className="text-sm font-semibold text-gray-900">Filtros</DialogTitle>
                    {pendingCount > 0 && (
                        <button
                            type="button"
                            onClick={handleClearPending}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
                        >
                            Limpar tudo
                        </button>
                    )}
                </DialogHeader>

                {/* Search bar */}
                <div className="px-5 py-3 border-b flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar filtros..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 text-sm"
                        />
                    </div>
                </div>

                {/* Corpo rolável */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                    ) : filtersData ? (
                        <div className="space-y-5">
                            {filteredTechs.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tecnologia</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {filteredTechs.map((tech) => {
                                            const isActive = pendingTech === tech
                                            return (
                                                <button
                                                    key={tech}
                                                    type="button"
                                                    onClick={() => handleTechClick(tech)}
                                                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${isActive
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                        }`}
                                                >
                                                    {isActive && <Check className="h-3 w-3" />}
                                                    {tech}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {filteredLanguages.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Linguagem</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {filteredLanguages.map((lang) => {
                                            const isActive = pendingLanguage === lang
                                            return (
                                                <button
                                                    key={lang}
                                                    type="button"
                                                    onClick={() => handleLanguageClick(lang)}
                                                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${isActive
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                                            : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                                                        }`}
                                                >
                                                    {isActive && <Check className="h-3 w-3" />}
                                                    {lang}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {filteredTags.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Tags</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {filteredTags.map((tag) => {
                                            const isActive = pendingTags.includes(tag)
                                            return (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => handleTagClick(tag)}
                                                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${isActive
                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                            : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                                                        }`}
                                                >
                                                    {isActive && <Check className="h-3 w-3" />}
                                                    #{tag}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {!hasResults && (
                                <div className="py-4 text-center text-sm text-gray-500">
                                    {q ? 'Nenhum filtro encontrado' : 'Nenhum filtro disponível'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-sm text-gray-500">
                            Erro ao carregar filtros
                        </div>
                    )}
                </div>

                {/* Footer fixo */}
                <DialogFooter className="px-5 py-4 border-t flex-shrink-0 flex flex-row gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                        Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                        {pendingCount > 0 ? `Aplicar (${pendingCount})` : 'Aplicar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
