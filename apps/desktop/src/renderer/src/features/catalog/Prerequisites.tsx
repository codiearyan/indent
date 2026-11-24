import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { LabSummary } from '@shared/types'

/** What a project assumes, each concept linked to the issue that teaches it; nothing when none. */
export function Prerequisites({
  lab,
  labs
}: {
  lab: LabSummary
  labs: LabSummary[]
}): React.JSX.Element | null {
  const rows = (lab.prerequisites ?? []).flatMap(({ title, lab: labId, chapter: chapterId }) => {
    const target = labs.find((l) => l.id === labId)
    const chapter = target?.chapters.find((c) => c.id === chapterId)
    return target && chapter ? [{ title, target, chapter }] : []
  })
  if (rows.length === 0) return null

  return (
    <section className="overflow-hidden rounded-lg border border-border">
      <div className="px-5 pt-4 pb-3">
        <h2 className="text-sm font-semibold">Before you start</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          This repo assumes you know these. Review them if you like, or start now.
        </p>
      </div>
      <ul>
        {rows.map(({ title, target, chapter }) => (
          <li key={`${target.id}/${chapter.id}`} className="border-t border-rule">
            <Link
              to={`/learn/${target.id}/${chapter.id}`}
              className="flex h-[52px] items-center gap-4 px-5 text-sm transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
            >
              <span className="w-48 shrink-0 truncate">{title}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                {chapter.title}
              </span>
              <span className="shrink-0 text-[13px] text-muted-foreground">
                {target.title}, issue {chapter.number}
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
