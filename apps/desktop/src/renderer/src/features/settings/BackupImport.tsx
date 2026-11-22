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
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { useProgress } from '@/stores/progress'
import { withBackupSettings } from '@/stores/portableSettings'
import { useSettings } from '@/stores/settings'

interface BackupImport {
  pick(): void
  busy: boolean
  dialog: React.JSX.Element
}

/**
 * Picks a backup, shows it next to what is on this computer, and restores it. The window reloads
 * afterwards, so open editors and terminals start from the restored files, not their old copies.
 */
export function useBackupImport(onRestored?: () => void): BackupImport {
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

  const pick = (): void => void run(async () => setPending(await api.backup.pickImport()))

  const apply = (): Promise<void> =>
    run(async () => {
      setPending(null)
      const { progress, app } = await api.backup.applyImport()
      useProgress.getState().set(progress)
      if (app) {
        const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        useSettings.setState(withBackupSettings(useSettings.getState(), app, system))
      }
      onRestored?.()
      window.location.hash = '#/'
      window.location.reload()
    })

  const rows: [string, ProgressSummary][] = pending
    ? [
        ['On this computer', pending.current],
        [pending.file, pending.incoming]
      ]
    : []

  const dialog = (
    <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
          <AlertDialogDescription>
            {pending && contents(pending)} What it replaces is kept aside on disk, never deleted.
            Indent reloads to open it.
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
          <AlertDialogAction onClick={() => void apply()}>Restore</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { pick, busy, dialog }
}

function contents({ issues, hasSettings }: ProgressImport): string {
  const parts = ['your progress']
  if (issues) parts.push(issues === 1 ? 'the code of 1 issue' : `the code of ${issues} issues`)
  if (hasSettings) parts.push('your settings')
  const list =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
  return `It replaces ${list} on this computer.`
}

function describe({ totalPoints, tasksPassed }: ProgressSummary): string {
  const tasks = tasksPassed === 1 ? '1 task passed' : `${tasksPassed} tasks passed`
  return `Level ${levelFor(totalPoints).level}, ${totalPoints} points, ${tasks}`
}
