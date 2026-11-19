import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Pattern, Step } from './types'

export function InputPanel({
  pattern,
  onRun
}: {
  pattern: Pattern
  onRun(steps: Step[]): void
}): React.JSX.Element {
  const [values, setValues] = useState(pattern.presets[0].values)
  const [error, setError] = useState<string | null>(null)

  const run = (next: Record<string, string>): void => {
    try {
      onRun(pattern.build(next))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This input cannot be used.')
    }
  }

  return (
    <form
      className="rounded-lg border border-border"
      onSubmit={(event) => {
        event.preventDefault()
        run(values)
      }}
    >
      <h2 className="flex h-10 items-center border-b border-rule px-4 text-sm font-semibold">
        Try your own input
      </h2>
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-1.5">
          {pattern.presets.map((preset) => {
            const selected = pattern.inputs.every(
              (field) => preset.values[field.name] === values[field.name]
            )
            return (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="xs"
                aria-pressed={selected}
                className={cn(
                  'font-normal shadow-none',
                  selected
                    ? 'bg-accent text-foreground dark:bg-accent'
                    : 'bg-transparent text-muted-foreground dark:bg-transparent'
                )}
                onClick={() => {
                  setValues(preset.values)
                  run(preset.values)
                }}
              >
                {preset.label}
              </Button>
            )
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {pattern.inputs.map((field) => {
            const id = `dsa-input-${field.name}`
            return (
              <div key={field.name} className="min-w-0 space-y-1.5">
                <label htmlFor={id} className="block text-[13px] text-muted-foreground">
                  {field.label}
                </label>
                <Input
                  id={id}
                  value={values[field.name] ?? ''}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                  aria-describedby={field.help ? `${id}-help` : undefined}
                  aria-invalid={error ? true : undefined}
                  className="font-mono text-[13px]"
                  spellCheck={false}
                />
                {field.help && (
                  <p id={`${id}-help`} className="text-xs text-muted-foreground">
                    {field.help}
                  </p>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-start justify-between gap-3">
          <p role="alert" className="min-h-5 text-[13px] text-destructive">
            {error}
          </p>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="bg-transparent shadow-none dark:bg-transparent"
          >
            Run
          </Button>
        </div>
      </div>
    </form>
  )
}
