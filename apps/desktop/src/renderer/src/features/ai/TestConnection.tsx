import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AiRecovery } from './AiRecovery'
import { runConnectionTest, useConnectionTest } from './connectionTest'

/** Proves the chosen provider answers; a failure offers another model or provider. */
export function TestConnection({ className }: { className?: string }): React.JSX.Element {
  const state = useConnectionTest()
  const run = runConnectionTest

  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        className="press border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
        disabled={state.status === 'testing'}
        onClick={() => void run()}
      >
        {state.status === 'testing' && (
          <Loader2 className="animate-spin motion-reduce:animate-none" />
        )}
        {state.status === 'testing'
          ? 'Testing'
          : state.status === 'error'
            ? 'Try again'
            : 'Test connection'}
      </Button>
      <p aria-live="polite" className="text-[13px]">
        {state.status === 'ok' && (
          <span className="motion-enter flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
            <span>
              <span className="text-foreground">Connected.</span>{' '}
              <span className="text-muted-foreground">It said: {state.reply}</span>
            </span>
          </span>
        )}
        {state.status === 'error' && (
          <span className="motion-enter block text-destructive">{state.message}</span>
        )}
      </p>
      {state.status === 'error' && <AiRecovery onRetry={() => void run()} />}
    </div>
  )
}
