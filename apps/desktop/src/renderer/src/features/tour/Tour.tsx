import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { TourOverlay } from './TourOverlay'

/** Guided tour over the workspace. Opens by itself the first time a chapter is ready. */
export function Tour(): React.JSX.Element | null {
  const open = useWorkspace((s) => s.tourOpen)
  const ready = useWorkspace((s) => s.status === 'ready')
  const setTourOpen = useWorkspace((s) => s.setTourOpen)
  const tourSeen = useSettings((s) => s.tourSeen)

  useEffect(() => {
    if (ready && !tourSeen) setTourOpen(true)
  }, [ready, tourSeen, setTourOpen])

  useEffect(() => () => setTourOpen(false), [setTourOpen])

  const close = useCallback((): void => {
    setTourOpen(false)
    useSettings.getState().setTourSeen(true)
  }, [setTourOpen])

  // Its anchors exist only while an issue is open, not while one loads or failed to open.
  if (!open || !ready) return null

  return createPortal(<TourOverlay onClose={close} />, document.body)
}
