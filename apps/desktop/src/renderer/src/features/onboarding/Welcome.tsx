import { APP_NAME, BrandMark } from '@/components/app/Brand'
import { cn } from '@/lib/utils'

export function Welcome({ staged }: { staged: boolean }): React.JSX.Element {
  const stage = (index: number): { className?: string; style?: React.CSSProperties } =>
    staged ? { className: 'ob-stage', style: { '--stage': index } as React.CSSProperties } : {}

  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center text-center">
      <BrandMark className={cn('size-14', staged && 'ob-mark')} />
      <h1
        tabIndex={-1}
        data-step-heading
        className={cn('mt-6 text-[22px] leading-7 font-semibold outline-none', stage(1).className)}
        style={stage(1).style}
      >
        {APP_NAME}
      </h1>
      <p
        className={cn('mt-3 text-sm leading-6 text-muted-foreground', stage(2).className)}
        style={stage(2).style}
      >
        Learn to code by doing. Each repo is a small company with a problem, and you are its
        developer: read the issue, write the code, run it, and press Check.
      </p>
      <p
        className={cn('mt-6 text-[13px] text-muted-foreground', stage(3).className)}
        style={stage(3).style}
      >
        Everything stays on this computer. No account needed.
      </p>
    </div>
  )
}
