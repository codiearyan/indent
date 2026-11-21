import { Link } from 'react-router-dom'
import type { LabSummary, ProgressState } from '@shared/types'
import { labProgress } from '@/features/catalog/labStatus'
import { Panel } from './CompletionPage'
import { ImproveList } from './ImproveList'
import { RepoStars } from './RepoStars'
import { ideasToImprove, repoReport } from './report'

/** On the page of a finished repo: its stars and what to look at again, kept for later. */
export function RepoReview({
  lab,
  chapters
}: {
  lab: LabSummary
  chapters: ProgressState['chapters']
}): React.JSX.Element | null {
  if (labProgress(lab, chapters).status !== 'completed') return null
  const report = repoReport(lab, chapters)
  return (
    <div className="@container">
      <div className="grid gap-6 @3xl:grid-cols-12">
        <section
          aria-label="Your stars"
          className="flex flex-col justify-between gap-4 rounded-lg border border-border px-5 py-4 @3xl:col-span-5"
        >
          <RepoStars run={report.run} stars={report.stars} size="sm" />
          <Link
            to={`/labs/${lab.id}/done`}
            className="self-start text-[13px] text-muted-foreground underline decoration-input underline-offset-2 hover:text-foreground hover:decoration-foreground"
          >
            See how the repo went
          </Link>
        </section>
        <Panel title="What to look at again" className="@3xl:col-span-7">
          <ImproveList lab={lab} ideas={ideasToImprove(lab, chapters)} />
        </Panel>
      </div>
    </div>
  )
}
