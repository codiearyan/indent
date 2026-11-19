import { useEffect } from 'react'
import { APP_NAME, BrandMark } from '@/components/app/Brand'
import { BuildStrip } from '@/components/app/BuildStrip'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import { Skeleton } from '@/components/ui/skeleton'
import { Figures } from '@/features/catalog/Figures'
import { cn } from '@/lib/utils'
import { useCatalog } from '@/stores/catalog'

const PLACEHOLDER_ROWS = 12

export function Welcome({ staged }: { staged: boolean }): React.JSX.Element {
  const labs = useCatalog((s) => s.labs)
  const load = useCatalog((s) => s.load)
  useEffect(() => void load(), [load])

  const stage = (index: number): { className?: string; style?: React.CSSProperties } =>
    staged ? { className: 'ob-stage', style: { '--stage': index } as React.CSSProperties } : {}

  const chapters = labs?.flatMap((lab) => lab.chapters) ?? []
  const count = (value: number): React.ReactNode =>
    labs ? value : <Skeleton className="my-1 h-6 w-10" />

  return (
    <div className="mx-auto grid w-full max-w-[1040px] grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center gap-12">
      <div className="flex flex-col">
        <BrandMark className={cn('size-12', staged && 'ob-mark')} />
        <h1
          tabIndex={-1}
          data-step-heading
          aria-label={`${APP_NAME}. Learn to code by fixing real problems.`}
          className={cn(
            'mt-8 text-[40px] leading-[1.08] font-semibold tracking-[-0.03em] text-balance outline-none',
            stage(1).className
          )}
          style={stage(1).style}
        >
          Learn to code by fixing real problems.
        </h1>
        <p
          className={cn('mt-5 text-base leading-7 text-muted-foreground', stage(2).className)}
          style={stage(2).style}
        >
          Each repo is a small company with a problem, and you are its developer. Read the issue,
          write the code, run it, and press Check.
        </p>
        <div className={cn('mt-8', stage(3).className)} style={stage(3).style}>
          <Figures
            label={`What is in ${APP_NAME}`}
            figures={[
              { label: 'Repos', value: count(labs?.length ?? 0) },
              { label: 'Issues', value: count(chapters.length) },
              { label: 'Tasks', value: count(chapters.reduce((sum, c) => sum + c.taskCount, 0)) }
            ]}
          />
          <p className="mt-4 text-[13px] text-muted-foreground">
            Everything stays on this computer. No account needed.
          </p>
        </div>
      </div>

      <section
        aria-label="The repos"
        className={cn('rounded-lg border border-border', stage(2).className)}
        style={stage(2).style}
      >
        <header className="flex items-baseline justify-between border-b border-rule px-5 py-3.5">
          <h2 className="text-sm font-semibold">Your repos</h2>
          <span className="text-[13px] text-muted-foreground">One cell per task</span>
        </header>
        <ul className="grid grid-cols-2">
          {labs
            ? labs.map((lab, i) => (
                <li
                  key={lab.id}
                  className={cn(
                    'flex min-w-0 items-center gap-3 border-rule px-5 py-3 odd:border-r [&:nth-last-child(n+3)]:border-b',
                    staged && 'motion-enter'
                  )}
                  style={{ '--i': i } as React.CSSProperties}
                >
                  <LanguageIcon language={lab.language} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{lab.title}</div>
                    <BuildStrip lab={lab} chapters={{}} className="mt-2 h-1" />
                  </div>
                </li>
              ))
            : Array.from({ length: PLACEHOLDER_ROWS }, (_, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 border-rule px-5 py-3 odd:border-r [&:nth-last-child(n+3)]:border-b"
                >
                  <Skeleton className="size-6 rounded-md" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-3/5" />
                    <Skeleton className="mt-2 h-1 w-full" />
                  </div>
                </li>
              ))}
        </ul>
      </section>
    </div>
  )
}
