import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { APP_NAME, BrandMark } from '@/components/app/Brand'
import { Button } from '@/components/ui/button'
import { useAi } from '@/features/ai/aiStore'
import { viewTransition } from '@/lib/viewTransition'
import { useSettings } from '@/stores/settings'
import { StepLayout } from './StepLayout'
import { StepStrip } from './StepStrip'
import { AiChoice } from './AiChoice'
import { HelpLevel } from './HelpLevel'
import { HowItWorks } from './HowItWorks'
import { Provider } from './Provider'
import { Welcome } from './Welcome'
import { nextStep, prevStep, type Choices, type StepId } from './steps'
import './onboarding.css'

export interface StepProps {
  /** First visit: play the staged entrance. Going back shows the step as it was. */
  staged: boolean
  choices: Choices
}

const PLACEHOLDER_TITLES: Record<StepId, string> = {
  welcome: APP_NAME,
  how: 'How it works',
  ai: 'AI, on or off',
  provider: 'Connect a provider',
  help: 'How much help',
  ready: 'Ready'
}

function StepView({ step, ...props }: StepProps & { step: StepId }): React.JSX.Element {
  if (step === 'welcome') return <Welcome staged={props.staged} />
  if (step === 'how') return <HowItWorks staged={props.staged} />
  if (step === 'ai') return <AiChoice staged={props.staged} />
  if (step === 'provider') return <Provider staged={props.staged} />
  if (step === 'help') return <HelpLevel staged={props.staged} />
  return <StepLayout title={PLACEHOLDER_TITLES[step]} staged={props.staged} />
}

/** Elements where Enter already means something; everywhere else in the setup it continues. */
const OWNS_ENTER = 'a, input, textarea, select, [role="combobox"], button:not([role="radio"])'

/** The first-run setup. Shown instead of the app until it is finished or skipped. */
export function Onboarding(): React.JSX.Element {
  const aiEnabled = useAi((s) => s.config?.enabled ?? true)
  const [step, setStep] = useState<StepId>('welcome')
  const [visited, setVisited] = useState<ReadonlySet<StepId>>(() => new Set())
  const [complete] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef<HTMLDivElement>(null)

  const choices: Choices = { ai: aiEnabled }
  const next = nextStep(step, choices)
  const back = prevStep(step, choices)

  const finish = useCallback((): void => {
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
      if (event.key !== 'Enter' || event.isComposing) return
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

  useEffect(() => {
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
          <div key={step} className="my-auto w-full">
            <StepView step={step} staged={!visited.has(step)} choices={choices} />
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
