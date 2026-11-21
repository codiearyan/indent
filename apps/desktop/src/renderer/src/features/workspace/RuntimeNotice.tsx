import { ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useSettingsDialog } from '@/features/settings/dialogStore'
import { retryRuntime, useRuntime } from '@/stores/runtime'

const outline = 'border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent'

/** Above the tasks: the repo tools installing, or why they could not be. Checks wait for it. */
export function RuntimeNotice(): React.JSX.Element | null {
  const status = useRuntime((s) => s.status)
  if (!status || status.ready) return null

  if (status.installing) {
    return (
      <div
        role="status"
        className="mt-4 flex items-center gap-3 rounded-lg border border-border px-4 py-3"
      >
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
        <p className="text-[13px] text-muted-foreground">
          Getting the repo tools ready. This happens once, about a minute.
        </p>
      </div>
    )
  }

  if (!status.error) return null
  // Node itself is missing or too old: the fix is in Settings, Tools.
  const nodeProblem = !status.details
  return (
    <div role="alert" className="mt-4 space-y-3 rounded-lg border border-border px-4 py-3">
      <p className="text-sm">{status.error}</p>
      <div className="flex items-center gap-2">
        {nodeProblem ? (
          <Button
            variant="outline"
            size="sm"
            className={outline}
            onClick={() => useSettingsDialog.getState().show('tools')}
          >
            Open Settings, Tools
          </Button>
        ) : (
          <Button variant="outline" size="sm" className={outline} onClick={retryRuntime}>
            Try again
          </Button>
        )}
      </div>
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
