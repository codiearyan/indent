import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { stepOffset } from './guide'
import { TOUR_STEPS } from './steps'
import { TourOverlay } from './TourOverlay'

const HANDED_OVER = {
  offset: stepOffset('workspace'),
  total: stepOffset('workspace') + TOUR_STEPS.length
}

/**
 * Guided tour over the workspace. Opens by itself the first time a chapter is ready, and as the
 * last part of the guide that starts after the setup.
 */
export function Tour(): React.JSX.Element | null {
  const open = useWorkspace((s) => s.tourOpen)
  const ready = useWorkspace((s) => s.status === 'ready')
  const setTourOpen = useWorkspace((s) => s.setTourOpen)
  const tourSeen = useSettings((s) => s.tourSeen)
  const handedOver = useSettings((s) => s.guide === 'workspace')

  useEffect(() => {
    if (ready && (!tourSeen || handedOver)) setTourOpen(true)
  }, [ready, tourSeen, handedOver, setTourOpen])

  useEffect(() => () => setTourOpen(false), [setTourOpen])

  const close = useCallback((): void => {
    setTourOpen(false)
    const settings = useSettings.getState()
    settings.setTourSeen(true)
    if (settings.guide === 'workspace') settings.setGuide(null)
  }, [setTourOpen])

  // Its anchors exist only while an issue is open, not while one loads or failed to open.
  if (!open || !ready) return null

  return createPortal(
    <TourOverlay
      steps={TOUR_STEPS}
      onClose={close}
      counter={handedOver ? HANDED_OVER : undefined}
    />,
    document.body
  )
}
