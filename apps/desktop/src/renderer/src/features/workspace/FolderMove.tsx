import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { formatBytes, timeLeft } from './moveProgress'
import { repoTitle, type WorkspaceRoot } from './useWorkspaceRoot'

/** What a new folder must be, or why the last pick failed. Sits under the folder's path. */
export function FolderNote({
  folder,
  className
}: {
  folder: WorkspaceRoot
  className?: string
}): React.JSX.Element {
  return folder.error ? (
    <p role="alert" className={cn('text-[13px] text-destructive', className)}>
      {folder.error}
    </p>
  ) : (
    <p className={cn('text-[13px] text-muted-foreground', className)}>
      Pick an empty folder. You choose which repos move to it.
    </p>
  )
}

/** Shows where the work goes, lets the person pick which repos move, and moves them. */
export function MoveFolderDialog({ folder }: { folder: WorkspaceRoot }): React.JSX.Element {
  const { pending, moving, progress, selected, setSelected } = folder
  const repos = pending?.repos ?? []
  const chosen = repos.filter((repo) => selected.includes(repo.labId))
  const issues = chosen.reduce((sum, repo) => sum + repo.issues, 0)
  const toggle = (labId: string, on: boolean): void =>
    setSelected(on ? [...selected, labId] : selected.filter((id) => id !== labId))

  return (
    <AlertDialog open={!!pending} onOpenChange={(open) => !open && !moving && folder.cancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change the folder for your work?</AlertDialogTitle>
          <AlertDialogDescription>
            {pending?.inside
              ? 'That folder has files in it, so your work goes in a new folder inside it.'
              : 'Your work goes in the folder you picked.'}{' '}
            {repos.length > 0 &&
              'Repos you do not move stay where they are and come back when you open one of their issues.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="divide-y divide-rule rounded-lg border border-border text-sm">
          {[
            ['From', pending?.from],
            ['To', pending?.to]
          ].map(([label, path]) => (
            <div key={label} className="flex items-center gap-4 px-3 py-2.5">
              <dt className="w-10 shrink-0 text-[13px] text-muted-foreground">{label}</dt>
              <dd className="min-w-0 font-mono text-xs break-all">{path}</dd>
            </div>
          ))}
        </dl>
        {repos.length > 0 && (
          <section aria-label="Repos to move" className="rounded-lg border border-border">
            <header className="flex h-10 items-center justify-between border-b border-rule px-3">
              <h3 className="text-[13px] font-medium text-muted-foreground">Repos to move</h3>
              <Button
                variant="link"
                size="sm"
                disabled={moving}
                className="h-auto p-0 text-[13px] font-normal text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setSelected(chosen.length === repos.length ? [] : repos.map((r) => r.labId))
                }
              >
                {chosen.length === repos.length ? 'Select none' : 'Select all'}
              </Button>
            </header>
            <ul className="max-h-56 divide-y divide-rule overflow-y-auto">
              {repos.map((repo) => (
                <li key={repo.labId}>
                  <label className="flex min-h-12 cursor-pointer items-center gap-4 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{repoTitle(repo.labId)}</span>
                      <span className="text-xs text-muted-foreground">
                        {repo.issues === 1 ? '1 issue' : `${repo.issues} issues`}
                      </span>
                    </span>
                    <Switch
                      checked={selected.includes(repo.labId)}
                      disabled={moving}
                      onCheckedChange={(on) => toggle(repo.labId, on)}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}
        {moving && progress ? (
          <MoveStatus progress={progress} />
        ) : (
          repos.length > 0 && (
            <p className="text-[13px] text-muted-foreground">
              {chosen.length === 0
                ? 'Nothing moves.'
                : `${chosen.length === 1 ? '1 repo' : `${chosen.length} repos`} with ${issues === 1 ? '1 issue' : `${issues} issues`} move, and open terminals restart.`}{' '}
              This may take some time, depending on your repos.
            </p>
          )
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={moving}>Cancel</AlertDialogCancel>
          {repos.length > 0 ? (
            <>
              <Button
                variant="outline"
                disabled={moving}
                onClick={() => void folder.confirm(false)}
              >
                Use this folder
              </Button>
              <Button
                disabled={moving || chosen.length === 0}
                onClick={() => void folder.confirm(true)}
              >
                {moving ? 'Moving...' : 'Move selected repos'}
              </Button>
            </>
          ) : (
            <Button disabled={moving} onClick={() => void folder.confirm(false)}>
              Use this folder
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function MoveStatus({
  progress
}: {
  progress: NonNullable<WorkspaceRoot['progress']>
}): React.JSX.Element {
  const { labId, done, total, measuring, bytes, totalBytes, elapsedMs } = progress
  const copying = totalBytes > 0
  const step = measuring
    ? 'Measuring your work'
    : labId
      ? `Moving ${repoTitle(labId)}, ${done + 1} of ${total}`
      : 'Moving the repo tools'
  const value = measuring ? 0 : copying ? (bytes / totalBytes) * 100 : (done / total) * 100
  return (
    <div role="status" className="space-y-2">
      <div className="flex items-baseline justify-between gap-4 text-[13px]">
        <p className="min-w-0 truncate">{step}</p>
        {copying && (
          <p className="shrink-0 text-muted-foreground tabular-nums">
            {formatBytes(bytes)} of {formatBytes(totalBytes)}
          </p>
        )}
      </div>
      <Progress
        aria-label="Moving your work"
        value={value}
        className={cn('h-1.5', measuring && 'motion-safe:animate-pulse')}
      />
      {copying && (
        <p className="text-[13px] text-muted-foreground tabular-nums">
          {timeLeft(bytes, totalBytes, elapsedMs) ?? 'Working out the time left'}
        </p>
      )}
    </div>
  )
}
