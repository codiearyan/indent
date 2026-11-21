import { ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ToolInstallButton } from '@/components/app/ToolInstallButton'
import { retryRuntime, useRuntime } from '@/stores/runtime'
import { useTools } from '@/stores/tools'

const outline = 'border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent'

/** Above the tasks: Node missing, the repo tools installing, or why they could not be. Checks wait for it. */
export function RuntimeNotice(): React.JSX.Element | null {
  const status = useRuntime((s) => s.status)
  const node = useTools((s) => s.tools?.find((tool) => tool.id === 'node'))
  if (!status || status.ready) return null

  if (status.installing) {
    return (
      <div
        role="status"
        className="mt-4 flex items-center gap-3 rounded-lg border border-border px-4 py-3"
      >
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
        <p className="text-[13px] text-muted-foreground">
          Getting the repo tools ready
          {status.progress !== undefined && (
            <span className="tabular-nums">, {Math.round(status.progress * 100)}%</span>
          )}
          . This happens once, about a minute.
        </p>
      </div>
    )
  }

  if (!status.error) return null
  // Without details it is Node itself that is missing or too old: its fix goes where Check is pressed.
  if (!status.details) {
    return (
      <div
        role="alert"
        className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border px-4 py-3"
      >
        <p className="min-w-0 flex-1 text-sm">{status.error}</p>
        {node && !node.ok && <ToolInstallButton tool={node} />}
      </div>
    )
  }
  return (
    <div role="alert" className="mt-4 space-y-3 rounded-lg border border-border px-4 py-3">
      <p className="text-sm">{status.error}</p>
      {status.retry !== false && (
        <Button variant="outline" size="sm" className={outline} onClick={retryRuntime}>
          Try again
        </Button>
      )}
      {status.details && (
        <Collapsible>
          <CollapsibleTrigger className="group flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
            <ChevronRight className="size-3.5 transition-transform duration-(--motion-state) group-data-[state=open]:rotate-90" />
            Show details
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
              {status.details}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
