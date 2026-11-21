import { Loader2 } from 'lucide-react'
import { RELEASES_URL } from '@shared/repo'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  cancelUpdate,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  updateLater,
  useUpdates
} from '@/stores/updates'

const outline = 'border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent'
const megabytes = (bytes: number): string => `${Math.round(bytes / 1e6)} MB`

/**
 * The app's update, in each of its states, with the action that fits. The sidebar shows it compact
 * with Later; Settings shows it whole with Check for updates.
 */
export function UpdateCard({ compact = false }: { compact?: boolean }): React.JSX.Element | null {
  const status = useUpdates((s) => s.status)
  const text = compact ? 'text-[13px]' : 'text-sm'

  if (status.state === 'idle' || status.state === 'current' || status.state === 'checking') {
    if (compact) return null
    return (
      <div className="flex items-center justify-between gap-6">
        <p className="text-[13px] text-muted-foreground">
          {status.state === 'checking'
            ? 'Checking...'
            : status.state === 'current'
              ? `Indent ${status.version} is up to date.`
              : 'Not checked yet.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className={outline}
          disabled={status.state === 'checking'}
          onClick={checkForUpdates}
        >
          {status.state === 'checking' && <Loader2 className="animate-spin" />}
          Check for updates
        </Button>
      </div>
    )
  }

  if (status.state === 'available') {
    return (
      <div className="space-y-3">
        <p className={cn(text, 'font-medium')}>Indent {status.version} is available.</p>
        {!compact && status.notes.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
            {status.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className={outline} onClick={downloadUpdate}>
            Download update
          </Button>
          {compact && (
            <Button variant="ghost" size="sm" onClick={() => updateLater(status.version)}>
              Later
            </Button>
          )}
          {!compact && (
            <span className="text-[13px] text-muted-foreground tabular-nums">
              {megabytes(status.size)}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (status.state === 'downloading') {
    const percent = Math.round(status.done * 100)
    return (
      <div className="space-y-2" role="status">
        <p className={cn(text, 'font-medium')}>Downloading Indent {status.version}</p>
        <Progress value={percent} aria-label="Update download" className="h-1.5" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {percent}% of {megabytes(status.size)}
          </span>
          <Button variant="ghost" size="sm" onClick={cancelUpdate}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (status.state === 'ready') {
    return (
      <div className="space-y-2">
        <p className={cn(text, 'font-medium')}>Restart to update to {status.version}.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void installUpdate()}>
            Restart now
          </Button>
          <Button variant="ghost" size="sm" onClick={() => updateLater(status.version)}>
            Next time you open Indent
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2" role="alert">
      <p className={cn(text, 'text-destructive')}>{status.message}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className={outline}
          onClick={status.version ? downloadUpdate : checkForUpdates}
        >
          Try again
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href={RELEASES_URL} target="_blank" rel="noreferrer">
            Download from the website
          </a>
        </Button>
      </div>
    </div>
  )
}
