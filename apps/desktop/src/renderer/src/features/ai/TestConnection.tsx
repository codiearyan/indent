import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { cn, errorMessage } from '@/lib/utils'

type State =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; reply: string }
  | { status: 'error'; message: string }

/** Proves the chosen provider answers. Key it by provider and model so a change starts over. */
export function TestConnection({ className }: { className?: string }): React.JSX.Element {
  const [state, setState] = useState<State>({ status: 'idle' })

  const run = async (): Promise<void> => {
    setState({ status: 'testing' })
    try {
      setState({ status: 'ok', reply: await api.ai.test() })
    } catch (error) {
      setState({ status: 'error', message: errorMessage(error) })
    }
  }

  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        className="press border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
        disabled={state.status === 'testing'}
        onClick={() => void run()}
      >
        {state.status === 'testing' && <Loader2 className="animate-spin" />}
        {state.status === 'testing'
          ? 'Testing'
          : state.status === 'error'
            ? 'Try again'
            : 'Test connection'}
      </Button>
      <p aria-live="polite" className="text-[13px] empty:hidden">
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
    </div>
  )
}
