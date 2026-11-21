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
  const remembered = useWorkspace((s) => s.remembered)

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
            {remembered
              ? 'Your changes to them are lost. Files you added are kept.'
              : 'Your changes to them are lost, and so are files you added.'}{' '}
            Passed tasks and points stay as they are.
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
