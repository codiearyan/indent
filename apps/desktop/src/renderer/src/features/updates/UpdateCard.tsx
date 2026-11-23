import { Loader2 } from 'lucide-react'
import { RELEASES_URL, REPO_URL } from '@shared/repo'
import type { UpdateRelease } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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

/** `23 Nov 2026`, or nothing when the release gave no date. */
function day(date: string): string {
  const time = Date.parse(date)
  if (Number.isNaN(time)) return ''
  return new Date(time).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const changesUrl = (version: string): string => `${REPO_URL}/releases/tag/v${version}`

/** Settings: the day a release came out, a few lines of notes and the way to the whole list. */
function ReleaseNotes({ release }: { release: UpdateRelease }): React.JSX.Element {
  const when = day(release.date)
  return (
    <div className="space-y-2 text-[13px] text-muted-foreground">
      {when && <p>Released {when}</p>}
      {release.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {release.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      <a
        href={changesUrl(release.version)}
        target="_blank"
        rel="noreferrer"
        className="inline-block hover:text-foreground"
      >
        See all changes
      </a>
    </div>
  )
}

/** The sidebar has no room for the notes: there they are the tooltip of the card's main button. */
function WithNotes({
  release,
  children
}: {
  release: UpdateRelease
  children: React.ReactNode
}): React.JSX.Element {
  const when = day(release.date)
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="start"
        sideOffset={8}
        className="max-w-64 space-y-1.5 px-3 py-2.5 text-pretty"
      >
        <p className="font-medium">
          Indent {release.version}
          {when && <span className="font-normal opacity-70"> · {when}</span>}
        </p>
        {release.notes.length > 0 && (
          <ul className="list-disc space-y-1 pl-4">
            {release.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        <a
          href={changesUrl(release.version)}
          target="_blank"
          rel="noreferrer"
          className="inline-block underline underline-offset-2 opacity-70 hover:opacity-100"
        >
          See all changes
        </a>
      </TooltipContent>
    </Tooltip>
  )
}

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
        <div className="space-y-1">
          <p className={cn(text, 'font-medium')}>Indent {status.version} is available.</p>
          {!compact && <ReleaseNotes release={status} />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WithNotes release={status}>
            <Button variant="outline" size="sm" className={outline} onClick={downloadUpdate}>
              Download update
            </Button>
          </WithNotes>
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
        <div className="space-y-1">
          <p className={cn(text, 'font-medium')}>Restart to update to {status.version}.</p>
          {!compact && <ReleaseNotes release={status} />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WithNotes release={status}>
            <Button size="sm" onClick={() => void installUpdate()}>
              Restart now
            </Button>
          </WithNotes>
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
