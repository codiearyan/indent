import type { LabMeta } from '@shared/types'
import { cn } from '@/lib/utils'
import { missingTools, useTools } from '@/stores/tools'

/** A quiet line when a repo needs a tool this computer lacks; nothing otherwise. */
export function NeedsTools({
  lab,
  className
}: {
  lab: Pick<LabMeta, 'tools'>
  className?: string
}): React.JSX.Element | null {
  const tools = useTools((s) => s.tools)
  const missing = missingTools(lab, tools)
  if (missing.length === 0) return null
  return (
    <p className={cn('text-[13px] text-muted-foreground', className)}>
      Needs {missing.map((tool) => tool.label).join(' and ')}
    </p>
  )
}
