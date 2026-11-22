import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { Card, CardPart, Choice } from './cards'
import { CodeBlock } from './CodeBlock'
import { Markdown } from './Markdown'

type LinkHandler = ((href: string) => boolean) | undefined

const LABELS: Record<Card['type'], string> = {
  steps: 'Step by step',
  examples: 'Examples',
  quiz: 'Check yourself',
  compare: 'Compare'
}

/** A teaching card the tutor wrote: drawn from validated data, never from its HTML. */
export function TeachingCard({
  card,
  onLink
}: {
  card: Card
  onLink: LinkHandler
}): React.JSX.Element {
  return (
    <figure className="code-block overflow-hidden rounded-lg border border-border bg-card font-sans">
      <figcaption className="flex h-9 items-center border-b border-rule px-3 text-xs text-muted-foreground">
        {LABELS[card.type]}
      </figcaption>
      {card.type === 'steps' && <Steps title={card.title} steps={card.steps} onLink={onLink} />}
      {card.type === 'examples' && (
        <Examples title={card.title} examples={card.examples} onLink={onLink} />
      )}
      {card.type === 'quiz' && <Quiz card={card} onLink={onLink} />}
      {card.type === 'compare' && <Compare card={card} onLink={onLink} />}
    </figure>
  )
}

/** Shown in a card's place while its block is still streaming, so the reply does not jump. */
export function CardPlaceholder(): React.JSX.Element {
  return (
    <figure className="code-block flex min-h-32 items-center justify-center rounded-lg border border-border bg-card text-[13px] text-muted-foreground">
      Building a card
    </figure>
  )
}

function Body({ part, onLink }: { part: CardPart; onLink: LinkHandler }): React.JSX.Element {
  return (
    <>
      <Markdown compact onLink={onLink}>
        {part.text}
      </Markdown>
      {part.code && <CodeBlock code={part.code} language={part.language} />}
    </>
  )
}

function Steps({
  title,
  steps,
  onLink
}: {
  title: string
  steps: CardPart[]
  onLink: LinkHandler
}): React.JSX.Element {
  const [at, setAt] = useState(0)
  const step = steps[at]
  return (
    <div className="px-4 pt-3 pb-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        <div className="shrink-0 text-xs text-muted-foreground tabular-nums" aria-live="polite">
          Step {at + 1} of {steps.length}
        </div>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn('h-1 flex-1 rounded-full', i <= at ? 'bg-foreground' : 'bg-accent')}
          />
        ))}
      </div>
      <div className="mt-3 text-sm font-medium">{step.title}</div>
      <Body part={step} onLink={onLink} />
      <div className="mt-3 flex justify-between">
        <Button variant="ghost" size="sm" disabled={at === 0} onClick={() => setAt((i) => i - 1)}>
          <ChevronLeft />
          Back
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={at === steps.length - 1}
          onClick={() => setAt((i) => i + 1)}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

function Examples({
  title,
  examples,
  onLink
}: {
  title: string
  examples: CardPart[]
  onLink: LinkHandler
}): React.JSX.Element {
  return (
    <div>
      <div className="px-4 pt-3 pb-1 text-sm font-semibold">{title}</div>
      <div className="divide-y divide-rule">
        {examples.map((example, i) => (
          <div key={i}>
            <Collapsible defaultOpen={i === 0}>
              <CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm hover:bg-accent/50">
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-state) group-data-[state=open]:rotate-90 motion-reduce:transition-none"
                  strokeWidth={1.5}
                  aria-hidden
                />
                {example.title}
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-3 pl-10">
                <Body part={example} onLink={onLink} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        ))}
      </div>
    </div>
  )
}

function Quiz({
  card,
  onLink
}: {
  card: Extract<Card, { type: 'quiz' }>
  onLink: LinkHandler
}): React.JSX.Element {
  const [picked, setPicked] = useState<number | null>(null)
  const choice: Choice | null = picked === null ? null : card.choices[picked]
  return (
    <div className="px-4 pt-3 pb-3">
      <Markdown compact onLink={onLink}>
        {card.question}
      </Markdown>
      {card.code && <CodeBlock code={card.code} language={card.language} />}
      <div className="mt-2 flex flex-col gap-1.5" role="group" aria-label="Choices">
        {card.choices.map((option, i) => {
          const chosen = picked === i
          return (
            <Button
              key={i}
              variant="outline"
              // The chosen answer stays clear; the others fade once one is picked.
              disabled={picked !== null && !chosen}
              aria-pressed={chosen}
              onClick={() => setPicked(i)}
              className={cn(
                'h-auto min-h-10 justify-start gap-2 border-input bg-transparent px-3 py-2 text-left font-normal whitespace-normal shadow-none dark:bg-transparent',
                chosen && 'border-foreground bg-accent dark:bg-accent'
              )}
            >
              <span className="flex-1">{option.text}</span>
              {chosen &&
                (option.correct ? (
                  <Check className="size-4 shrink-0 text-success" aria-label="Right" />
                ) : (
                  <X className="size-4 shrink-0 text-destructive" aria-label="Not quite" />
                ))}
            </Button>
          )
        })}
      </div>
      <div aria-live="polite">
        {choice && (
          <div className="mt-3">
            <div className="text-sm font-medium">{choice.correct ? 'Right.' : 'Not quite.'}</div>
            <Markdown compact onLink={onLink}>
              {choice.why}
            </Markdown>
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setPicked(null)}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Compare({
  card,
  onLink
}: {
  card: Extract<Card, { type: 'compare' }>
  onLink: LinkHandler
}): React.JSX.Element {
  return (
    <div className="@container">
      <div className="px-4 pt-3 pb-1 text-sm font-semibold">{card.title}</div>
      <div className="grid divide-y divide-rule @xl:grid-cols-2 @xl:divide-x @xl:divide-y-0">
        {[card.left, card.right].map((side, i) => (
          <section key={i} className="min-w-0 px-4 pt-2 pb-3">
            <div className="text-sm font-medium">{side.title}</div>
            <Body part={side} onLink={onLink} />
          </section>
        ))}
      </div>
    </div>
  )
}
