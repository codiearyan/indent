import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { WorkspaceRoot } from './useWorkspaceRoot'

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
      Your work moves to the folder you pick. It must be empty.
    </p>
  )
}

/** Shows where the work goes and what happens, and moves it once confirmed. */
export function MoveFolderDialog({ folder }: { folder: WorkspaceRoot }): React.JSX.Element {
  const { pending, moving } = folder
  return (
    <AlertDialog open={!!pending} onOpenChange={(open) => !open && !moving && folder.cancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move your work?</AlertDialogTitle>
          <AlertDialogDescription>
            {pending?.inside
              ? 'That folder has files in it, so your work goes in a new folder inside it.'
              : 'Your work moves to the folder you picked.'}{' '}
            Open terminals restart. Your progress is kept.
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
        <AlertDialogFooter>
          <AlertDialogCancel disabled={moving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={moving}
            onClick={(event) => {
              // Stays open while the files move, so the person sees it finish.
              event.preventDefault()
              void folder.confirm()
            }}
          >
            {moving ? 'Moving...' : 'Move my work'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
