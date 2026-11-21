import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { labProgress } from '@/features/catalog/labStatus'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import type { CompletionState } from './CompletionPage'

// Long enough to see the last task turn green before the view changes.
const PAUSE_MS = 1200

/** Opens the completion view when a check finishes the repo, never when a finished one is opened. */
export function useOpenWhenFinished(labId: string): boolean {
  const navigate = useNavigate()
  const lab = useCatalog((s) => s.labs?.find((l) => l.id === labId))
  const chapters = useProgress((s) => s.progress?.chapters)
  const finished = lab && chapters ? labProgress(lab, chapters).status === 'completed' : undefined
  const before = useRef<{ labId: string; finished: boolean } | null>(null)

  useEffect(() => {
    if (finished === undefined) return
    const was = before.current?.labId === labId ? before.current.finished : undefined
    before.current = { labId, finished }
    if (was !== false || !finished) return
    const state: CompletionState = { celebrate: true }
    const timer = setTimeout(() => navigate(`/labs/${labId}/done`, { state }), PAUSE_MS)
    return () => clearTimeout(timer)
  }, [finished, labId, navigate])

  return !!finished
}
