"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { X, ExternalLink } from "lucide-react"

type ImportJob = {
  id: string
  project_id: string
  status: "running" | "done" | "error"
  step: string
  progress: number
  message: string | null
  error: string | null
  files_processed: number
  cards_created: number
  ai_requested: boolean
  ai_used: boolean
  ai_cards_created: number
}

type ActiveImportRef = {
  jobId: string
  projectId: string
  projectName?: string
  createdAt?: string
}

const LS_KEY = "activeImportJob"

function safeParse(json: string | null): ActiveImportRef | null {
  if (!json) return null
  try {
    return JSON.parse(json) as ActiveImportRef
  } catch {
    return null
  }
}

function clearActiveImport(setActive: (v: ActiveImportRef | null) => void, setJob: (v: ImportJob | null) => void) {
  setActive(null)
  setJob(null)
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    // ignore
  }
}

function defaultMessage(step: string): string {
  const map: Record<string, string> = {
    starting: "Iniciando importação…",
    downloading_zip: "Baixando o repositório…",
    extracting_files: "Extraindo arquivos…",
    analyzing_repo: "Analisando o projeto…",
    generating_cards: "Organizando cards…",
    creating_cards: "Criando cards…",
    linking_cards: "Associando cards ao projeto…",
    done: "Importação concluída.",
    error: "Erro na importação."
  }
  return map[step] || "Processando…"
}

function ProgressRing({ value }: { value: number }) {
  const size = 44
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const dash = (pct / 100) * c
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#2563EB"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

export default function ImportProgressWidget(props: {
  /**
   * Quando o usuário está na tela do projeto com o mesmo jobId, evitamos duplicar o widget.
   */
  hideIfJobId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlJobId = searchParams?.get("jobId") || null
  const urlProjectId = searchParams?.get("id") || null

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  const [active, setActive] = useState<ActiveImportRef | null>(null)
  const [job, setJob] = useState<ImportJob | null>(null)
  const lastStatusRef = useRef<string | null>(null)

  // Captura jobId vindo da URL e persiste (para continuar após sair do projeto).
  useEffect(() => {
    if (!urlJobId || !urlProjectId) return
    const next: ActiveImportRef = {
      jobId: urlJobId,
      projectId: urlProjectId,
      createdAt: new Date().toISOString()
    }
    setActive(next)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }, [urlJobId, urlProjectId])

  // Restaura job ativo do localStorage.
  useEffect(() => {
    try {
      const saved = safeParse(localStorage.getItem(LS_KEY))
      if (saved?.jobId && saved?.projectId) setActive(saved)
    } catch {
      // ignore
    }
  }, [])

  // Realtime do job (continua mesmo fora do ProjectDetail).
  useEffect(() => {
    if (!supabase || !active?.jobId) return

    let mounted = true

    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from("import_jobs")
        .select("*")
        .eq("id", active.jobId)
        .maybeSingle()

      // Se o job não existe mais (ex.: projeto deletado -> cascade), limpamos o widget.
      if (mounted && !error && !data) {
        clearActiveImport(setActive, setJob)
        return
      }

      if (mounted && data) setJob(data as ImportJob)
    }

    fetchInitial()

    const channel = supabase
      .channel(`import_job_global:${active.jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "import_jobs", filter: `id=eq.${active.jobId}` },
        (payload) => {
          const eventType = (payload as any).eventType as string | undefined
          if (eventType === "DELETE") {
            clearActiveImport(setActive, setJob)
            return
          }

          const row: any = (payload as any).new || null
          if (!row) return
          setJob(row as ImportJob)

          const status = row.status as string | undefined
          if (status && status !== lastStatusRef.current) {
            lastStatusRef.current = status
            if (status === "done") {
              // Mantém o widget visível para o usuário ver 100% e poder abrir o projeto.
              // Não limpa automaticamente — o usuário pode fechar.
            }
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [supabase, active?.jobId])

  const ui = useMemo(() => {
    if (!active?.jobId) return null
    // Não mostrar widget se ainda não carregamos o job (evita “importação fantasma”).
    if (!job) return null
    // Só exibir enquanto estiver realmente importando.
    if (job.status !== "running") return null
    const progress = Math.max(0, Math.min(100, Number(job?.progress ?? 0)))
    const step = job?.step || "starting"
    const status = job?.status || "running"
    const message = job?.message || defaultMessage(step)
    return { progress, step, status, message }
  }, [active?.jobId, job])

  const shouldHide = props.hideIfJobId && active?.jobId && props.hideIfJobId === active.jobId
  if (!ui || shouldHide) return null

  const handleOpenProject = () => {
    if (!active?.projectId || !active?.jobId) return
    const params = new URLSearchParams()
    params.set("tab", "projects")
    params.set("id", active.projectId)
    params.set("jobId", active.jobId)
    router.push(`/?${params.toString()}`)
  }

  const handleClose = () => {
    clearActiveImport(setActive, setJob)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border bg-white shadow-lg">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <ProgressRing value={ui.progress} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  Importação em andamento
                </p>
                <p className="text-xs text-gray-600 mt-0.5 truncate">{ui.message}</p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700">{ui.progress}%</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleOpenProject}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </Button>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
              <span>Arquivos: {job?.files_processed ?? 0}</span>
              <span>Cards: {job?.cards_created ?? 0}</span>
              {job?.ai_requested ? (
                <span>IA: {job?.ai_used ? "usada" : "pendente/indisponível"}</span>
              ) : (
                <span>IA: desativada</span>
              )}
            </div>

            {ui.status === "error" && (
              <p className="mt-2 text-xs text-red-600">
                {job?.error || "Erro na importação."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


