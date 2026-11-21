import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { useSettings, type Appearance, type Theme } from '@/stores/settings'

const OPTIONS: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

/** The app theme as three cards, each a small drawing of the app in that theme. */
export function ThemeCards(): React.JSX.Element {
  const appearance = useSettings((s) => s.appearance)
  const setAppearance = useSettings((s) => s.setAppearance)

  return (
    <RadioGroup
      aria-label="App theme"
      value={appearance}
      onValueChange={(value) => setAppearance(value as Appearance)}
      className="grid-cols-3"
    >
      {OPTIONS.map(({ value, label }) => (
        <label
          key={value}
          htmlFor={`app-theme-${value}`}
          className="flex cursor-pointer flex-col gap-2.5 rounded-lg border border-border p-2.5 hover:border-input has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 has-[[data-state=checked]]:border-foreground"
        >
          {value === 'system' ? (
            <div className="relative">
              <AppSketch theme="light" />
              <AppSketch theme="dark" className="absolute inset-0 [clip-path:inset(0_0_0_50%)]" />
            </div>
          ) : (
            <AppSketch theme={value} />
          )}
          <span className="flex items-center gap-2 px-0.5">
            <span className="flex-1 text-sm font-medium">{label}</span>
            <RadioGroupItem
              id={`app-theme-${value}`}
              value={value}
              className="focus-visible:ring-0"
            />
          </span>
        </label>
      ))}
    </RadioGroup>
  )
}

/** The frame, the sidebar, the sheet with a card and its build strip, and the main button. */
function AppSketch({ theme, className }: { theme: Theme; className?: string }): React.JSX.Element {
  const bar = 'h-1.5 rounded-full'
  return (
    <div
      aria-hidden
      className={cn(
        theme,
        'flex aspect-[16/10] gap-1 overflow-hidden rounded-md border border-border bg-background p-1',
        className
      )}
    >
      <div className="flex w-1/4 flex-col gap-1 pt-1.5 pl-0.5">
        <span className={cn(bar, 'mb-1 w-3/4 bg-foreground/70')} />
        <span className={cn(bar, 'bg-accent')} />
        <span className={cn(bar, 'w-4/5 bg-muted-foreground/30')} />
        <span className={cn(bar, 'w-3/5 bg-muted-foreground/30')} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 rounded-sm border border-border bg-card p-1.5">
        <span className={cn(bar, 'h-2 w-1/2 bg-foreground/70')} />
        <div className="flex flex-1 flex-col justify-between rounded-sm border border-border p-1.5">
          <span className="space-y-1">
            <span className={cn(bar, 'block w-2/3 bg-muted-foreground/40')} />
            <span className={cn(bar, 'block w-1/2 bg-muted-foreground/25')} />
          </span>
          <span className="flex gap-0.5">
            {[true, true, true, false, false].map((done, i) => (
              <span
                key={i}
                className={cn('h-1 flex-1 rounded-[1px]', done ? 'bg-brand' : 'bg-muted')}
              />
            ))}
          </span>
        </div>
        <span className="h-2.5 w-1/3 self-end rounded-sm bg-primary" />
      </div>
    </div>
  )
}
