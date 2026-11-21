import { Button } from '@/components/ui/button'
import { getNewVersion } from '@/stores/updates'
import { Progress } from '@/components/ui/progress'
import { useCatalog } from '@/stores/catalog'
import { useWorkspace } from '@/stores/workspace'

/** Fills the sheet while a repo downloads, and says what went wrong when an issue cannot open. */
export function RepoNotice({
  labId,
  chapterId
}: {
  labId: string
  chapterId: string
}): React.JSX.Element {
  const error = useWorkspace((s) => s.error)
  const open = useWorkspace((s) => s.open)
  const download = useCatalog((s) => s.downloads[labId])
  const title = useCatalog((s) => s.labs?.find((lab) => lab.id === labId)?.title)

  if (download?.state === 'running') {
    const percent = Math.round(download.done * 100)
    return (
      <Frame>
        <div role="status" className="space-y-1">
          <p className="text-sm font-semibold">Getting the repo ready</p>
          <p className="text-[13px] text-muted-foreground tabular-nums">
            Downloading {title ?? 'the repo'}, {percent}%
          </p>
        </div>
        <Progress value={percent} aria-label="Download" className="h-1.5" />
      </Frame>
    )
  }

  const tooNew = download?.state === 'failed' && download.reason === 'too-new'
  return (
    <Frame>
      <p role="alert" className="text-sm">
        {error ?? 'This issue could not be opened.'}
      </p>
      {tooNew ? (
        <Button onClick={getNewVersion}>Get the new version</Button>
      ) : (
        <Button onClick={() => void open(labId, chapterId)}>Try again</Button>
      )}
    </Frame>
  )
}

function Frame({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">{children}</div>
    </div>
  )
}
