import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
      className="space-y-4 border-t border-border pt-5"
      onSubmit={(event) => {
        event.preventDefault()
        run(values)
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Try your own input</h2>
        <div className="flex flex-wrap gap-1.5">
          {pattern.presets.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="xs"
              className="font-normal"
              onClick={() => {
                setValues(preset.values)
                run(preset.values)
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {pattern.inputs.map((field) => {
          const id = `dsa-input-${field.name}`
          return (
            <div key={field.name} className="min-w-0 space-y-1.5">
              <label htmlFor={id} className="text-[13px] text-muted-foreground">
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
        <Button type="submit" variant="secondary" size="sm">
          Run
        </Button>
      </div>
    </form>
  )
}
