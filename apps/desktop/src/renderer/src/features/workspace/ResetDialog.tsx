import { toast } from 'sonner'
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
import { useWorkspace } from '@/stores/workspace'

export function ResetDialog(props: {
  open: boolean
  onOpenChange(open: boolean): void
}): React.JSX.Element {
  const reset = useWorkspace((s) => s.reset)

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
    <AlertDialog {...props}>
      <AlertDialogContent className="bg-popover">
        <AlertDialogHeader>
          <AlertDialogTitle>Reset this issue&apos;s files?</AlertDialogTitle>
          <AlertDialogDescription>
            Your edits in this issue are replaced with the starter files. Passed tasks and points
            stay as they are.
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
