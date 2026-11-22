import { APP_NAME, BrandMark } from '@/components/app/Brand'
import { Button } from '@/components/ui/button'
import { useBackupImport } from '@/features/settings/BackupImport'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/settings'
import { WelcomeScene } from './scenes/WelcomeScene'
import picture from './welcome.webp'

export function Welcome({ staged }: { staged: boolean }): React.JSX.Element {
  // A restored backup brings its settings, so the rest of the setup has nothing left to ask.
  const restore = useBackupImport(() => useSettings.getState().setOnboarded(true))
  const stage = (index: number): { className?: string; style?: React.CSSProperties } =>
    staged ? { className: 'ob-stage', style: { '--stage': index } as React.CSSProperties } : {}

  return (
    <div className="mx-auto grid w-full max-w-[1040px] grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center gap-12">
      <div className="flex flex-col">
        <BrandMark className={cn('size-12', staged && 'ob-mark')} />
        <h1
          tabIndex={-1}
          data-step-heading
          aria-label={`${APP_NAME}. Learn to code by fixing real problems.`}
          className={cn(
            'mt-6 text-[40px] leading-[1.08] font-semibold tracking-[-0.03em] text-balance outline-none',
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
        <div
          className={cn('mt-6 text-[13px] text-muted-foreground', stage(3).className)}
          style={stage(3).style}
        >
          <p>Everything stays on this computer. No account needed.</p>
          <p className="mt-1">
            Your progress is never lost. Coming from another computer?{' '}
            <Button
              variant="link"
              className="h-auto p-0 text-[13px] font-normal underline"
              disabled={restore.busy}
              onClick={restore.pick}
            >
              Import a backup
            </Button>
          </p>
          {restore.dialog}
        </div>
      </div>

      <div className="relative pr-4 pb-20">
        <img
          src={picture}
          alt=""
          width={1536}
          height={1024}
          className={cn(
            'aspect-[3/2] w-full rounded-lg border border-border object-cover',
            stage(2).className
          )}
          style={stage(2).style}
        />
        <div
          className={cn('absolute right-0 bottom-0 w-[300px]', stage(5).className)}
          style={stage(5).style}
        >
          <WelcomeScene />
        </div>
      </div>
    </div>
  )
}
