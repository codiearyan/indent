import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { useWorkspace } from '@/stores/workspace'
import { TOUR } from '@/features/tour/anchors'
import { IconButton } from './IconButton'

export function ResetButton(): React.JSX.Element {
  const reset = useWorkspace((s) => s.reset)
  const ready = useWorkspace((s) => s.status === 'ready')

  const confirm = async (): Promise<void> => {
    try {
      await reset()
      toast.success('Starter files are back')
    } catch (error) {
      toast.error('Could not reset the files', {
        description: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <IconButton label="Reset this chapter's files" disabled={!ready} data-tour={TOUR.reset}>
          <RotateCcw />
        </IconButton>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-popover">
        <AlertDialogHeader>
          <AlertDialogTitle>Reset this chapter&apos;s files?</AlertDialogTitle>
          <AlertDialogDescription>
            Your edits in this chapter are replaced with the starter files. Passed tasks, points and
            your mode stay as they are.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => void confirm()}>
            Reset files
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
