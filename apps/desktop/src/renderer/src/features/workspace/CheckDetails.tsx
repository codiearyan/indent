import { Check, ChevronRight, FileCode, Sparkles, X } from 'lucide-react'
import type { CheckDetail, CheckResult } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { openAtLine } from '@/features/editor/editors'
import { useWorkspace } from '@/stores/workspace'
import { findLocation } from './checkLocation'

/** `onAsk` is given only while the tutor is on; it adds "Ask the tutor" to each failed check. */
export function CheckDetails({
  result,
  onAsk
}: {
  result: CheckResult
  onAsk?(detail: CheckDetail): void
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      {result.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {result.error}
        </p>
      )}
      {result.details.length > 0 && (
        <ul className="divide-y divide-rule rounded-lg border border-border">
          {result.details.map((detail, i) => (
            <li key={i} className="flex gap-2.5 px-3 py-2.5 text-sm">
              {detail.passed ? (
                <Check
                  className="mt-0.5 size-4 shrink-0 text-success"
                  strokeWidth={2}
                  aria-label="Passed"
                />
              ) : (
                <X
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  strokeWidth={2}
                  aria-label="Failed"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p>{detail.name}</p>
                {detail.message && (
                  <p className="text-[13px] text-muted-foreground">{detail.message}</p>
                )}
                {(detail.output || (onAsk && !detail.passed)) && (
                  <Collapsible>
                    <div className="flex items-center gap-3">
                      {detail.output && (
                        <CollapsibleTrigger className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <ChevronRight className="size-3 transition-transform group-data-[state=open]:rotate-90" />
                          What your code produced
                        </CollapsibleTrigger>
                      )}
                      {!detail.passed && detail.output && <OpenAtLine output={detail.output} />}
                      {onAsk && !detail.passed && (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="-ml-1.5 font-normal text-muted-foreground hover:text-foreground"
                          onClick={() => onAsk(detail)}
                        >
                          <Sparkles />
                          Ask the tutor
                        </Button>
                      )}
                    </div>
                    <CollapsibleContent>
                      <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-muted p-2.5 font-mono text-xs whitespace-pre-wrap">
                        {detail.output}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function OpenAtLine({ output }: { output: string }): React.JSX.Element | null {
  // A string, so typing re-renders this only when the place it points at changes.
  const key = useWorkspace((s) => {
    if (s.companion) return ''
    const at = findLocation(
      output,
      s.files.map((f) => f.path),
      s.dir
    )
    return at ? JSON.stringify(at) : ''
  })
  if (!key) return null
  const { path, line, column } = JSON.parse(key) as { path: string; line: number; column?: number }
  return (
    <Button
      variant="ghost"
      size="xs"
      className="-ml-1.5 font-normal text-muted-foreground hover:text-foreground"
      aria-label={`Open ${path} at line ${line}`}
      onClick={() => openAtLine(path, line, column)}
    >
      <FileCode />
      Open at line {line}
    </Button>
  )
}
