import { useState } from 'react'
import { FileWarning } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/utils'
import { useWorkspace } from '@/stores/workspace'

const outline = 'border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent'
const SHOWN = 3

/** A banner across the top of the issue while starter files are gone from the workspace. */
export function MissingFilesNotice(): React.JSX.Element | null {
  const missing = useWorkspace((s) => s.missing)
  const restoreMissing = useWorkspace((s) => s.restoreMissing)
  const [restoring, setRestoring] = useState(false)
  if (missing.length === 0) return null

  const restore = (): void => {
    setRestoring(true)
    restoreMissing()
      .catch((error) =>
        toast.error('Could not restore the files', { description: errorMessage(error) })
      )
      .finally(() => setRestoring(false))
  }

  const more = missing.length - SHOWN
  return (
    <div
      role="alert"
      className="mx-2 mb-2 flex min-h-12 items-center gap-3 rounded-lg bg-destructive/10 px-4 py-2"
    >
      <FileWarning className="size-4 shrink-0 text-destructive" strokeWidth={1.5} aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-destructive">
        <span className="font-medium">Some files this issue needs are missing: </span>
        {missing.slice(0, SHOWN).map((path, i) => (
          <span key={path}>
            {i > 0 && ', '}
            <span className="font-mono text-[13px]">{path}</span>
          </span>
        ))}
        {more > 0 && ` and ${more} more`}. Checks wait until they are back.
      </p>
      <Button
        variant="outline"
        size="sm"
        className={`shrink-0 ${outline}`}
        disabled={restoring}
        onClick={restore}
      >
        {restoring ? 'Restoring...' : 'Restore missing files'}
      </Button>
    </div>
  )
}
