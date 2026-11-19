import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { APP_NAME, BrandMark } from '@/components/app/Brand'
import { Button } from '@/components/ui/button'
import { useAi } from '@/features/ai/aiStore'
import { viewTransition } from '@/lib/viewTransition'
import { useSettings } from '@/stores/settings'
import { StepStrip } from './StepStrip'
import { AiChoice } from './AiChoice'
import { HelpLevel } from './HelpLevel'
import { Ready } from './Ready'
import { HowItWorks } from './HowItWorks'
import { Provider } from './Provider'
import { Welcome } from './Welcome'
import { nextStep, prevStep, type Choices, type StepId } from './steps'
import './onboarding.css'

const STEPS: Record<StepId, (props: { staged: boolean }) => React.JSX.Element> = {
  welcome: Welcome,
  how: HowItWorks,
  ai: AiChoice,
  provider: Provider,
  help: HelpLevel,
  ready: Ready
}

/** Elements where Enter already means something; everywhere else in the setup it continues. */
const OWNS_ENTER =
  'a, input, textarea, select, [role="combobox"], button:not([role="radio"], [role="tab"])'

/** The first-run setup. Shown instead of the app until it is finished or skipped. */
export function Onboarding(): React.JSX.Element {
  const aiEnabled = useAi((s) => s.config?.enabled ?? true)
  const [step, setStep] = useState<StepId>('welcome')
  const [visited, setVisited] = useState<ReadonlySet<StepId>>(() => new Set())
  const [complete, setComplete] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef<HTMLDivElement>(null)

  const choices: Choices = { ai: aiEnabled }
  const next = nextStep(step, choices)
  const back = prevStep(step, choices)
  const View = STEPS[step]

  const finish = useCallback((): void => {
    // The provider shown as picked is saved even when the person only pressed Continue.
    const { config, update } = useAi.getState()
    if (config?.enabled && config.provider) void update({ provider: config.provider })
    window.location.hash = '#/'
    viewTransition('onboarding-finish', () => useSettings.getState().setOnboarded(true))
  }, [])

  const go = (to: StepId | null): void => {
    if (!to) return finish()
    viewTransition('onboarding-step', () => {
      setVisited((seen) => new Set(seen).add(step))
      setStep(to)
    })
  }

  const advance = useEffectEvent(() => go(next))

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement
      if (event.key !== 'Enter' || event.isComposing || event.repeat) return
      // Radio items cancel Enter themselves (it must not pick an option), so they are let through.
      if (event.defaultPrevented && target.getAttribute('role') !== 'radio') return
      if (target !== document.body && !rootRef.current?.contains(target)) return
      if (target.closest(OWNS_ENTER)) return
      event.preventDefault()
      advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The one quiet celebration: once the last step has settled, its cell fills too.
  useEffect(() => {
    if (step !== 'ready') return
    const timer = setTimeout(() => setComplete(true), 420)
    return () => {
      clearTimeout(timer)
      setComplete(false)
    }
  }, [step])

  useEffect(() => {
    stepRef.current?.scrollTo(0, 0)
    stepRef.current?.querySelector<HTMLElement>('[data-step-heading]')?.focus({
      preventScroll: true
    })
  }, [step])

  return (
    <div ref={rootRef} className="flex h-full flex-col bg-background">
      <header
        className="app-drag flex h-12 shrink-0 items-center justify-between pr-3"
        style={{ paddingLeft: 'calc(var(--titlebar-inset) + 16px)' }}
      >
        <div className="flex items-center gap-2.5 text-[15px] font-semibold">
          <BrandMark className="size-5" />
          {APP_NAME}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="font-normal text-muted-foreground hover:text-foreground"
          onClick={finish}
        >
          Skip setup
        </Button>
      </header>

      <main className="mx-2 mb-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div
          ref={stepRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-12 py-10"
          style={{ viewTransitionName: 'onboarding-step' }}
        >
          <div key={step} className="ob-view my-auto w-full">
            <View staged={!visited.has(step)} />
          </div>
        </div>

        <footer className="grid h-16 shrink-0 grid-cols-[1fr_minmax(0,320px)_1fr] items-center gap-6 border-t border-rule px-4">
          <div>
            {back && (
              <Button
                variant="ghost"
                className="press font-normal text-muted-foreground hover:text-foreground"
                onClick={() => go(back)}
              >
                Back
              </Button>
            )}
          </div>
          <StepStrip step={step} choices={choices} complete={complete} />
          <div className="flex justify-end">
            <Button className="press min-w-32" onClick={() => go(next)}>
              {next ? 'Continue' : 'Start learning'}
            </Button>
          </div>
        </footer>
      </main>
    </div>
  )
}
