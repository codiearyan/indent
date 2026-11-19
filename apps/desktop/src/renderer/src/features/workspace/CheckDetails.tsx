import { Check, ChevronRight, X } from 'lucide-react'
import type { CheckResult } from '@shared/types'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export function CheckDetails({ result }: { result: CheckResult }): React.JSX.Element {
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
                {detail.output && (
                  <Collapsible>
                    <CollapsibleTrigger className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <ChevronRight className="size-3 transition-transform group-data-[state=open]:rotate-90" />
                      What your code produced
                    </CollapsibleTrigger>
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
