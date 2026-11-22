import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { getNewVersion } from '@/stores/updates'
import { Progress } from '@/components/ui/progress'
import { useCatalog } from '@/stores/catalog'
import { useWorkspace } from '@/stores/workspace'

/**
 * Fills the sheet while a repo downloads, when the issue's work is in an earlier folder, and says
 * what went wrong when an issue cannot open.
 */
export function RepoNotice({
  labId,
  chapterId
}: {
  labId: string
  chapterId: string
}): React.JSX.Element {
  const error = useWorkspace((s) => s.error)
  const elsewhere = useWorkspace((s) => (s.status === 'elsewhere' ? s.elsewhere : null))
  const open = useWorkspace((s) => s.open)
  const download = useCatalog((s) => s.downloads[labId])
  const title = useCatalog((s) => s.labs?.find((lab) => lab.id === labId)?.title)

  if (elsewhere) return <Elsewhere labId={labId} chapterId={chapterId} dir={elsewhere} />

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

/** The work stayed in the old folder when the folder changed; never open a fresh copy over it unasked. */
function Elsewhere({
  labId,
  chapterId,
  dir
}: {
  labId: string
  chapterId: string
  dir: string
}): React.JSX.Element {
  const open = useWorkspace((s) => s.open)
  const [busy, setBusy] = useState(false)

  const bringBack = async (): Promise<void> => {
    setBusy(true)
    try {
      await api.workspace.bringBack(labId, chapterId)
      await open(labId, chapterId)
    } catch (failure) {
      toast.error(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Frame>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Your work on this repo is in another folder</p>
        <p className="text-[13px] text-muted-foreground">
          It stayed in <span className="font-mono text-xs break-all">{dir}</span> when you changed
          the folder for your work. Bring it here to carry on where you left off.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void open(labId, chapterId, { here: true })}
        >
          Start fresh here
        </Button>
        <Button disabled={busy} onClick={() => void bringBack()}>
          {busy ? 'Bringing it here...' : 'Bring it here'}
        </Button>
      </div>
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
