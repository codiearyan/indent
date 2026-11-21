import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { labProgress } from '@/features/catalog/labStatus'
import { goalLabIds } from '@/features/catalog/recommend'
import { useCatalog } from '@/stores/catalog'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { TourOverlay } from './TourOverlay'
import {
  homeSteps,
  repoSteps,
  routeOf,
  shownStage,
  stageOn,
  stepOffset,
  suggestedRepo
} from './guide'
import { TOUR_STEPS } from './steps'

const TOTAL = stepOffset('workspace') + TOUR_STEPS.length

/** The steps on Home and the repo page that lead from the setup into the first issue. */
export function GuideTour(): React.JSX.Element | null {
  const stage = useSettings((s) => s.guide)
  const setGuide = useSettings((s) => s.setGuide)
  const goal = useSettings((s) => s.goal)
  const experience = useSettings((s) => s.experience)
  const labs = useCatalog((s) => s.labs)
  const paths = useCatalog((s) => s.paths)
  const progress = useProgress((s) => s.progress)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // After Back from the repo page, Home picks up at its last step.
  const [fromBack, setFromBack] = useState(false)
  const route = routeOf(pathname)
  const shown = shownStage(stage, route)

  // Only on arriving somewhere: a guide started again from inside an issue stays on Home's steps.
  useEffect(() => {
    const { guide } = useSettings.getState()
    const next = stageOn(guide, route)
    if (next !== guide) setGuide(next)
  }, [route, setGuide])

  const suggested = useMemo(
    () =>
      labs && paths && progress
        ? suggestedRepo(labs, paths, goal, experience, progress)
        : undefined,
    [labs, paths, progress, goal, experience]
  )
  const lab = shown === 'repo' ? labs?.find((l) => pathname === `/labs/${l.id}`) : undefined

  const steps = useMemo(() => {
    if (!labs || !paths || !progress) return null
    if (shown === 'home') {
      return homeSteps({
        goal: !!suggested && goalLabIds(paths, goal).includes(suggested.id),
        started: !!suggested && labProgress(suggested, progress.chapters).status === 'in-progress'
      })
    }
    if (shown === 'repo' && lab) return repoSteps(lab, progress.chapters)
    return null
  }, [shown, lab, suggested, labs, paths, progress, goal])

  if (!shown || !steps || !progress) return null

  const done = (): void => {
    if (shown === 'home') {
      if (!suggested) return setGuide(null)
      setFromBack(false)
      setGuide('repo')
      navigate(`/labs/${suggested.id}`)
      return
    }
    const chapterId = lab && labProgress(lab, progress.chapters).nextChapterId
    if (!lab || !chapterId || lab.availability === 'app-update') return setGuide(null)
    setGuide('workspace')
    navigate(`/learn/${lab.id}/${chapterId}`)
  }

  const back = (): void => {
    setFromBack(true)
    setGuide('home')
    navigate('/')
  }

  return createPortal(
    <TourOverlay
      key={shown}
      steps={steps}
      startAt={shown === 'home' && fromBack ? steps.length - 1 : 0}
      counter={{ offset: stepOffset(shown), total: TOTAL }}
      onClose={() => setGuide(null)}
      onDone={done}
      onBack={shown === 'repo' ? back : undefined}
    />,
    document.body
  )
}
