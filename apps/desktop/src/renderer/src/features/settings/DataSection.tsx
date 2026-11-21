import { useState } from 'react'
import { toast } from 'sonner'
import { levelFor } from '@shared/rules'
import type { ProgressImport, ProgressSummary } from '@shared/types'
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
import { Button } from '@/components/ui/button'
import { FolderNote, MoveFolderDialog } from '@/features/workspace/FolderMove'
import { useWorkspaceRoot } from '@/features/workspace/useWorkspaceRoot'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { useProgress } from '@/stores/progress'
import { Group, Row, card } from './controls'

/** Where the learner's progress and code live, and how to take them to another computer. */
export function DataSection(): React.JSX.Element {
  return (
    <>
      <p className="mt-3 text-sm">
        Your progress and your code are saved on this computer, outside the app. Deleting or
        updating Indent keeps both.
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        For another computer, export your progress and copy the folder for your work.
      </p>
      <Group title="Your progress">
        <ProgressBackup />
      </Group>
      <Group title="Your work">
        <WorkspaceFolder />
        <p className="mt-2 text-[13px] text-muted-foreground">
          Your code is a normal folder. It is not part of the export.
        </p>
      </Group>
    </>
  )
}

function ProgressBackup(): React.JSX.Element {
  const [pending, setPending] = useState<ProgressImport | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true)
    try {
      await action()
    } catch (failure) {
      toast.error(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  const exportFile = (): Promise<void> =>
    run(async () => {
      const file = await api.progress.exportFile()
      if (file) toast.success('Your progress is exported.', { description: file })
    })

  const pick = (): Promise<void> => run(async () => setPending(await api.progress.pickImport()))

  const apply = (): Promise<void> =>
    run(async () => {
      setPending(null)
      useProgress.getState().set(await api.progress.applyImport())
      toast.success('Your progress is imported.')
    })

  const rows: [string, ProgressSummary][] = pending
    ? [
        ['On this computer', pending.current],
        [pending.file, pending.incoming]
      ]
    : []

  return (
    <div className={card}>
      <Row
        id="progress-export"
        label="Export progress"
        hint="One file with your points, level, streak and passed tasks."
      >
        <Button
          id="progress-export"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void exportFile()}
        >
          Export
        </Button>
      </Row>
      <Row
        id="progress-import"
        label="Import progress"
        hint="Replaces the progress on this computer with a file you exported."
      >
        <Button
          id="progress-import"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void pick()}
        >
          Import
        </Button>
      </Row>
      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your progress?</AlertDialogTitle>
            <AlertDialogDescription>
              The file becomes your progress on this computer. What is here now is replaced, and a
              copy of it stays in the app&apos;s data folder. Your code is not touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="divide-y divide-rule rounded-lg border border-border text-sm">
            {rows.map(([label, summary]) => (
              <div key={label} className="px-3 py-2.5">
                <dt className="truncate text-[13px] text-muted-foreground">{label}</dt>
                <dd className="tabular-nums">{describe(summary)}</dd>
              </div>
            ))}
          </dl>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void apply()}>Replace my progress</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function describe({ totalPoints, tasksPassed }: ProgressSummary): string {
  const tasks = tasksPassed === 1 ? '1 task passed' : `${tasksPassed} tasks passed`
  return `Level ${levelFor(totalPoints).level}, ${totalPoints} points, ${tasks}`
}

function WorkspaceFolder(): React.JSX.Element {
  const folder = useWorkspaceRoot()
  return (
    <div className={card}>
      <div className="flex min-h-14 items-center justify-between gap-6 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-sm">Folder for your work</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{folder.root}</p>
          <FolderNote folder={folder} className="mt-1" />
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={folder.moving}
          onClick={() => void folder.change()}
        >
          Change
        </Button>
      </div>
      <MoveFolderDialog folder={folder} />
    </div>
  )
}
