import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FolderNote, MoveFolderDialog } from '@/features/workspace/FolderMove'
import { useWorkspaceRoot } from '@/features/workspace/useWorkspaceRoot'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { portableSettings } from '@/stores/portableSettings'
import { useSettings } from '@/stores/settings'
import { useBackupImport } from './BackupImport'
import { Group, Row, card } from './controls'

/** Where the learner's progress and code live, and how to take them to another computer. */
export function DataSection(): React.JSX.Element {
  return (
    <>
      <p className="mt-3 text-sm">
        Your progress is never lost. It is saved on this computer, outside the app, so updating or
        reinstalling Indent keeps it, and so does your code.
      </p>
      <Group title="Backup">
        <Backup />
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] text-muted-foreground">
          <li>On this computer, export a backup and copy the file to the new one.</li>
          <li>On the new computer, install Indent and import the backup.</li>
        </ol>
      </Group>
      <Group title="Your work">
        <WorkspaceFolder />
        <p className="mt-2 text-[13px] text-muted-foreground">
          Your code is a normal folder. You can open it in any editor.
        </p>
      </Group>
    </>
  )
}

function Backup(): React.JSX.Element {
  const [exporting, setExporting] = useState(false)
  const restore = useBackupImport()

  const exportFile = async (): Promise<void> => {
    setExporting(true)
    try {
      const file = await api.backup.exportFile(portableSettings(useSettings.getState()))
      if (file) toast.success('Your backup is saved.', { description: file })
    } catch (failure) {
      toast.error(errorMessage(failure))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={card}>
      <Row
        id="backup-export"
        label="Export backup"
        hint="One file with your progress, your code and your settings. API keys stay here."
      >
        <Button
          id="backup-export"
          variant="outline"
          size="sm"
          disabled={exporting || restore.busy}
          onClick={() => void exportFile()}
        >
          Export
        </Button>
      </Row>
      <Row
        id="backup-import"
        label="Import backup"
        hint="Restores a backup or a progress file. What it replaces is kept aside."
      >
        <Button
          id="backup-import"
          variant="outline"
          size="sm"
          disabled={exporting || restore.busy}
          onClick={restore.pick}
        >
          Import
        </Button>
      </Row>
      {restore.dialog}
    </div>
  )
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
