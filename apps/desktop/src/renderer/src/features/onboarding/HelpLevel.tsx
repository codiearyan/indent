import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { RadioGroup } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { useAi } from '@/features/ai/aiStore'
import { SUGGEST_SHORTCUT } from '@/features/ai/inlineSuggestions'
import { ChoiceCard } from './ChoiceCard'
import { StepLayout } from './StepLayout'
import { Typed, MS_PER_CHAR } from './scenes/Typed'
import { helpLevelFor, suggestionsFor, type HelpLevel as Level } from './steps'

const LEVELS: { value: Level; title: string; text: string }[] = [
  {
    value: 'tutor',
    title: 'Only when I ask',
    text: 'The tutor answers when you ask it. The editor stays quiet.'
  },
  {
    value: 'manual',
    title: 'Suggestions when I ask',
    text: `Press ${SUGGEST_SHORTCUT} in the editor for a grey suggestion. Tab accepts it.`
  },
  {
    value: 'auto',
    title: 'Suggestions as I type',
    text: 'A grey suggestion appears when you pause. Tab accepts it.'
  }
]

export function HelpLevel({ staged }: { staged: boolean }): React.JSX.Element {
  const config = useAi((s) => s.config)
  const update = useAi((s) => s.update)
  const level = helpLevelFor(config?.suggestions ?? 'off')
  // Picking a card plays its demo again, so the choice shows what it does.
  const [plays, setPlays] = useState<Record<Level, number>>({ tutor: 0, manual: 0, auto: 0 })

  const choose = (value: Level): void => {
    setPlays((p) => ({ ...p, [value]: p[value] + 1 }))
    void update({ suggestions: suggestionsFor(value) })
  }

  return (
    <StepLayout
      wide
      staged={staged}
      title="How much help"
      lead="The tutor is there at every level. This picks what the editor does while you type."
    >
      <RadioGroup
        aria-label="How much help"
        value={level}
        onValueChange={(value) => choose(value as Level)}
        className="grid-cols-3 gap-4"
      >
        {LEVELS.map(({ value, title, text }) => (
          <ChoiceCard key={value} value={value} title={title}>
            <Demo key={plays[value]} level={value} />
            <p className="text-[13px] leading-5 text-muted-foreground">{text}</p>
          </ChoiceCard>
        ))}
      </RadioGroup>

      <div className="mt-6 flex items-start justify-between gap-6 rounded-lg border border-border px-5 py-4">
        <div>
          <label htmlFor="onboarding-nudge" className="text-sm font-medium">
            Offer the tutor when a check fails
          </label>
          <p className="text-[13px] text-muted-foreground">
            One quiet button under the task that failed, with the question already asked.
          </p>
        </div>
        <Switch
          id="onboarding-nudge"
          checked={config?.nudge ?? true}
          disabled={!config}
          onCheckedChange={(nudge) => void update({ nudge })}
        />
      </div>
    </StepLayout>
  )
}

const LINE = 'const count = orders.'
const GHOST = 'length'
const TYPED_MS = 300 + LINE.length * MS_PER_CHAR

/** A few characters of the editor doing exactly what the level means. */
function Demo({ level }: { level: Level }): React.JSX.Element {
  if (level === 'tutor') {
    return (
      <div className="ob-scene flex h-[88px] flex-col justify-center gap-2 rounded-md border border-rule px-3 text-xs">
        <p
          className="ob-appear self-end rounded-md bg-muted px-2 py-1"
          style={{ animationDelay: '300ms' }}
        >
          Why does task 2 fail?
        </p>
        <p
          className="ob-appear flex items-center gap-1.5 text-muted-foreground"
          style={{ animationDelay: '1100ms' }}
        >
          <MessageCircle className="size-3.5 shrink-0" strokeWidth={1.5} />
          Look at what reduce starts from.
        </p>
      </div>
    )
  }

  const key = level === 'manual' ? SUGGEST_SHORTCUT : 'Tab'
  const ghostAt = level === 'manual' ? TYPED_MS + 700 : TYPED_MS + 900
  const keyAt = level === 'manual' ? TYPED_MS + 400 : ghostAt + 900

  return (
    <div className="ob-scene flex h-[88px] flex-col justify-between rounded-md border border-rule px-3 py-2.5 overflow-hidden font-mono text-[11px] leading-5">
      <p className="whitespace-nowrap">
        <Typed text={LINE} at={300} />
        <span
          className={level === 'auto' ? 'ob-ghost ob-accept' : 'ob-ghost'}
          style={
            {
              animationDelay: `${ghostAt}ms${level === 'auto' ? `, ${keyAt + 120}ms` : ''}`
            } as React.CSSProperties
          }
        >
          {GHOST}
        </span>
      </p>
      <span
        className="ob-key self-end rounded-sm border border-input px-1.5 text-muted-foreground"
        style={{ animationDelay: `${keyAt - 300}ms, ${keyAt}ms` }}
      >
        {key}
      </span>
    </div>
  )
}
