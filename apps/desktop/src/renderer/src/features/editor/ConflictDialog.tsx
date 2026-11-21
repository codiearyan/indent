import { useState } from 'react'
import { toast } from 'sonner'
import type { ConflictChoice } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { errorMessage } from '@/lib/utils'
import { useWorkspace } from '@/stores/workspace'

export function ConflictDialog(props: {
  open: boolean
  onOpenChange(open: boolean): void
}): React.JSX.Element {
  const conflicts = useWorkspace((s) => s.conflicts)
  const resolveConflict = useWorkspace((s) => s.resolveConflict)
  const [busy, setBusy] = useState<string | null>(null)

  const choose = async (path: string, choice: ConflictChoice): Promise<void> => {
    setBusy(path)
    try {
      await resolveConflict(path, choice)
      if (useWorkspace.getState().conflicts.length === 0) props.onOpenChange(false)
    } catch (error) {
      toast.error('Could not update the file', { description: errorMessage(error) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a version</DialogTitle>
          <DialogDescription>
            This issue was updated, and you changed these files too. Use new version replaces your
            changes to that file.
          </DialogDescription>
        </DialogHeader>
        <ul className="rounded-lg border border-border">
          {conflicts.map((path) => (
            <li
              key={path}
              className="flex min-h-12 items-center gap-2 border-t border-rule px-3 py-2 first:border-t-0"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{path}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy !== null}
                onClick={() => void choose(path, 'mine')}
              >
                Keep mine
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void choose(path, 'new')}
              >
                Use new version
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
