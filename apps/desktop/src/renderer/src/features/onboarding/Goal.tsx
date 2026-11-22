import { useEffect } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LearnFirstToggle } from '@/features/settings/controls'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/stores/catalog'
import { useSettings } from '@/stores/settings'
import { StepLayout } from './StepLayout'

const NOT_SURE = 'not-sure'

export function Goal({ staged }: { staged: boolean }): React.JSX.Element {
  const paths = useCatalog((s) => s.paths)
  const load = useCatalog((s) => s.load)
  const goals = useSettings((s) => s.goals)
  const setGoals = useSettings((s) => s.setGoals)

  useEffect(() => void load(), [load])

  // "Not sure yet" is no goal at all: picking it clears the others, and picking a goal clears it.
  const picked = goals.length > 0 ? goals : [NOT_SURE]
  const pick = (next: string[]): void =>
    setGoals(
      next.includes(NOT_SURE) && goals.length > 0 ? [] : next.filter((id) => id !== NOT_SURE)
    )

  const cards = [
    ...(paths ?? []).map((path) => ({ value: path.id, title: path.title, text: path.tagline })),
    { value: NOT_SURE, title: 'Not sure yet', text: 'Start with the basics and look around.' }
  ]

  return (
    <StepLayout
      wide
      staged={staged}
      title="What do you want to get better at"
      lead="Pick one or more. Home puts the repos that fit first, and you can change this any time."
    >
      <ToggleGroup
        type="multiple"
        aria-label="Goals"
        spacing={3}
        value={picked}
        onValueChange={pick}
        className="grid w-full grid-cols-3 items-stretch"
      >
        {cards.map(({ value, title, text }, i) => {
          const on = picked.includes(value)
          return (
            <ToggleGroupItem
              key={value}
              value={value}
              className={cn(
                'ob-choice h-auto w-auto flex-col items-stretch justify-start gap-3 rounded-lg border border-border p-5 text-left font-normal whitespace-normal',
                'hover:border-input hover:bg-transparent hover:text-foreground data-[state=on]:border-foreground data-[state=on]:bg-accent/40',
                staged && 'motion-enter'
              )}
              style={{ '--i': i + 3 } as React.CSSProperties}
            >
              <span className="flex items-center gap-2.5">
                <span className="flex-1 text-sm font-semibold">{title}</span>
                <span
                  className={cn(
                    'ob-status flex size-4 shrink-0 items-center justify-center rounded-sm border',
                    on ? 'border-foreground bg-foreground text-background' : 'border-input'
                  )}
                  data-done={on}
                >
                  <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden>
                    <path
                      d="M3.5 8.5l3 3 6-7"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      className="ob-tick"
                    />
                  </svg>
                </span>
              </span>
              <span className="text-[13px] leading-5 text-muted-foreground">{text}</span>
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
      <div className="mt-3 flex h-12 items-center justify-between gap-4 rounded-lg border border-border px-4">
        <label htmlFor="setup-learn-first" className="text-sm">
          When you want to learn more, show first
        </label>
        <LearnFirstToggle id="setup-learn-first" />
      </div>
    </StepLayout>
  )
}
