import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { REPO_URL } from '@shared/repo'
import { APP_NAME } from '@/components/app/Brand'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { celebrate } from '@/lib/confetti'
import { useSettings } from '@/stores/settings'
import { shouldAskForStar } from './starLogic'

const TOAST_ID = 'star-prompt'
const THANKS_MS = 5000
const AFTER_START_MS = 2500
const AFTER_REPO_MS = 800

let shownThisRun = false

function showStarPrompt(): void {
  shownThisRun = true
  toast.custom(() => <StarToast />, { id: TOAST_ID, duration: Infinity })
}

// shortcut: polls for an open dialog; subscribe to the dialogs if more of them can open over it.
function whenNoDialog(): Promise<void> {
  return new Promise((resolve) => {
    const look = (): void => {
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) setTimeout(look, 500)
      else resolve()
    }
    look()
  })
}

async function maybeAsk(closedRepo: boolean): Promise<void> {
  const { starAsked, launches, setStarAsked } = useSettings.getState()
  if (!shouldAskForStar({ answered: starAsked, shownThisRun, launches, closedRepo })) return
  shownThisRun = true
  // Someone who already starred is never asked.
  if (await api.github.starred().catch(() => null)) return setStarAsked(true)
  await whenNoDialog()
  showStarPrompt()
}

/**
 * Asks once for a star on GitHub, at a natural pause: right after a repo is closed, or shortly
 * after the app opens from its second launch on. Renders nothing itself; the request is a toast.
 */
export function StarPrompt(): null {
  const { pathname } = useLocation()
  const previous = useRef(pathname)

  useEffect(() => {
    const timer = setTimeout(() => void maybeAsk(false), AFTER_START_MS)
    return () => clearTimeout(timer)
  }, [])

  // Leaving an issue (/learn/...) for the rest of the app is closing the repo. The router moves
  // with the History API, so this reads its location rather than listening for hashchange.
  useEffect(() => {
    const closed = previous.current.startsWith('/learn/') && !pathname.startsWith('/learn/')
    previous.current = pathname
    if (!closed) return
    const timer = setTimeout(() => void maybeAsk(true), AFTER_REPO_MS)
    return () => clearTimeout(timer)
  }, [pathname])

  return null
}

/** Development builds only, in Settings, About: show the request now, or forget the answer. */
export function StarPromptDevTools(): React.JSX.Element {
  return (
    <div className="mt-3 flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={showStarPrompt}>
        Show the star prompt
      </Button>
      <Button variant="ghost" size="sm" onClick={() => useSettings.getState().setStarAsked(false)}>
        Forget the answer
      </Button>
    </div>
  )
}

function StarToast(): React.JSX.Element {
  const [state, setState] = useState<'ask' | 'starring' | 'thanks'>('ask')
  const close = (): void => {
    useSettings.getState().setStarAsked(true)
    toast.dismiss(TOAST_ID)
  }

  const star = async (): Promise<void> => {
    setState('starring')
    useSettings.getState().setStarAsked(true)
    if (await api.github.star().catch(() => false)) {
      setState('thanks')
      celebrate(BURST)
      setTimeout(() => toast.dismiss(TOAST_ID), THANKS_MS)
      return
    }
    // No GitHub CLI to star with: the repository's page has the button.
    window.open(REPO_URL, '_blank')
    toast.dismiss(TOAST_ID)
  }

  const thanks = state === 'thanks'
  return (
    <div
      role="status"
      className="flex w-[356px] gap-3 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg"
    >
      <Star
        className="mt-0.5 size-4 shrink-0 fill-brand text-brand"
        strokeWidth={1.5}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {thanks ? 'Thanks for the star!' : `Enjoying ${APP_NAME}?`}
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {thanks
            ? `It really helps ${APP_NAME} grow.`
            : 'Give it a star on GitHub to let us know.'}
        </p>
        {!thanks && (
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="font-normal text-muted-foreground hover:text-foreground"
              onClick={close}
            >
              Dismiss
            </Button>
            <Button size="sm" disabled={state === 'starring'} onClick={() => void star()}>
              {state === 'starring' ? 'Starring' : 'Star on GitHub'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/** One burst from the corner the toast sits in. */
const BURST = {
  particleCount: 140,
  spread: 110,
  angle: 120,
  startVelocity: 42,
  gravity: 1.4,
  ticks: 140,
  origin: { x: 0.92, y: 0.94 }
}
