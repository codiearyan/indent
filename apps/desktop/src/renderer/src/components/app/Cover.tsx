import { useState } from 'react'
import { coverUrl } from '@shared/cover'
import type { LabSummary } from '@shared/types'
import { languageName } from '@/lib/languages'
import { cn } from '@/lib/utils'

/** The repo's picture. A repo without one shows its language instead. */
export function Cover({
  lab,
  className
}: {
  lab: LabSummary
  className?: string
}): React.JSX.Element {
  const [missing, setMissing] = useState(false)
  return (
    <div className={cn('flex aspect-[16/9] items-center justify-center bg-muted', className)}>
      {missing ? (
        <span className="font-mono text-[13px] text-muted-foreground">
          {languageName(lab.language)}
        </span>
      ) : (
        <img
          src={coverUrl(lab.id)}
          alt=""
          draggable={false}
          onError={() => setMissing(true)}
          className="size-full object-cover"
        />
      )}
    </div>
  )
}
