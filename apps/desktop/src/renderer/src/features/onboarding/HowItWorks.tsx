import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { cn } from '@/lib/utils'
import { StepLayout } from './StepLayout'
import { CheckScene } from './scenes/CheckScene'
import { CodeScene } from './scenes/CodeScene'
import { PatternsScene } from './scenes/PatternsScene'
import { RepoScene } from './scenes/RepoScene'

type Point = 'repo' | 'code' | 'check' | 'more'

const POINTS: { id: Point; title: string; text: string; scene: () => React.JSX.Element | null }[] =
  [
    {
      id: 'repo',
      title: 'A repo is a story',
      text: 'A small company with a problem. Its issues are the work, one at a time.',
      scene: RepoScene
    },
    {
      id: 'code',
      title: 'Write code and run it',
      text: 'A real editor and a real terminal, right beside the lesson.',
      scene: CodeScene
    },
    {
      id: 'check',
      title: 'Press Check',
      text: 'Hidden tests turn each task green, or say in plain words what to look at.',
      scene: CheckScene
    },
    {
      id: 'more',
      title: 'Patterns, roadmaps and activity',
      text: 'Watch algorithms move, follow a roadmap, and see your days of practice.',
      scene: PatternsScene
    }
  ]

/** How long a scene rests before the next one plays, while nobody has picked one. */
const DWELL_MS = 5200

export function HowItWorks({ staged }: { staged: boolean }): React.JSX.Element {
  const reduced = useReducedMotion()
  const [point, setPoint] = useState<Point>('repo')
  const [auto, setAuto] = useState(true)
  const advancing = auto && !reduced
  const index = POINTS.findIndex((p) => p.id === point)

  useEffect(() => {
    if (!advancing || index === POINTS.length - 1) return
    const timer = setTimeout(() => setPoint(POINTS[index + 1].id), DWELL_MS)
    return () => clearTimeout(timer)
  }, [advancing, index])

  const takeOver = (): void => setAuto(false)

  return (
    <StepLayout
      wide
      staged={staged}
      title="How it works"
      lead="You learn by building. Here is what a session looks like."
    >
      <Tabs
        orientation="vertical"
        value={point}
        onValueChange={(value) => setPoint(value as Point)}
        onPointerDown={takeOver}
        onFocusCapture={takeOver}
        onKeyDown={(e) => /^(Arrow|Home|End)/.test(e.key) && takeOver()}
        className="grid grid-cols-[280px_1fr] items-stretch gap-6"
      >
        <TabsList aria-label="What you do" className="h-auto w-full gap-1 bg-transparent p-0">
          {POINTS.map((p, i) => (
            <TabsTrigger
              key={p.id}
              value={p.id}
              className={cn(
                'relative h-auto w-full flex-col items-start gap-0.5 overflow-hidden rounded-md border-0 px-3 py-2 text-left font-normal whitespace-normal',
                'transition-none hover:bg-accent/60 data-[state=active]:bg-accent! data-[state=active]:shadow-none! dark:data-[state=active]:border-transparent'
              )}
            >
              <span className="text-sm font-medium text-foreground">{p.title}</span>
              <span className="text-[13px] leading-5 text-muted-foreground">{p.text}</span>
              {advancing && i === index && index < POINTS.length - 1 && (
                <span
                  key={point}
                  aria-hidden
                  className="ob-dwell absolute inset-x-3 bottom-0.5 h-px origin-left bg-foreground/25"
                  style={{ animationDuration: `${DWELL_MS}ms` }}
                />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {POINTS.map((p) => (
          <TabsContent
            key={p.id}
            value={p.id}
            className="ob-scene relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-lg border border-border p-6"
          >
            <p.scene />
          </TabsContent>
        ))}
      </Tabs>
    </StepLayout>
  )
}
