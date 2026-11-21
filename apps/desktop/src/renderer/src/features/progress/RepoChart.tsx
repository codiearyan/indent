import type { LabSummary, ProgressState } from '@shared/types'
import { Bars } from './Bars'
import { plural } from './copy'
import { repoDays, shortDate } from './series'

// More days than this and only the latest are drawn, so bars keep their width.
const MAX_DAYS = 30

/** Tasks passed in one repo on each day it was worked on. */
export function RepoChart({
  lab,
  chapters
}: {
  lab: LabSummary
  chapters: ProgressState['chapters']
}): React.JSX.Element {
  const days = repoDays(lab, chapters).slice(-MAX_DAYS)
  const every = Math.ceil(days.length / 8)
  return (
    <section className="rounded-lg border border-border">
      <header className="flex h-11 items-center justify-between border-b border-rule px-5">
        <h2 className="text-sm font-semibold">Tasks passed by day</h2>
        {days.length > 0 && (
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {plural(days.length, 'day')} worked on
          </span>
        )}
      </header>
      {days.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          The days you pass tasks in this repo show up here.
        </p>
      ) : (
        <Bars
          className="h-40 px-5 pt-2 pb-4"
          bars={days.map((day, i) => ({
            key: day.date,
            value: day.tasks,
            label: (days.length - 1 - i) % every === 0 ? shortDate(day.date) : '',
            detail: `${shortDate(day.date)}: ${plural(day.tasks, 'task')} passed`
          }))}
        />
      )}
    </section>
  )
}
