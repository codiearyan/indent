import { useState } from 'react'
import { Copy, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { WorkspaceFile } from '@shared/types'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useWorkspace } from '@/stores/workspace'

/** Easy mode only. The first solution opened in a chapter locks it to easy mode, so ask first. */
export function SolutionButton({
  taskId,
  easyLocked
}: {
  taskId: string
  easyLocked: boolean
}): React.JSX.Element {
  const openSolution = useWorkspace((s) => s.openSolution)
  const [confirming, setConfirming] = useState(false)
  const [solution, setSolution] = useState<WorkspaceFile | null>(null)

  const open = async (): Promise<void> => {
    try {
      setSolution(await openSolution(taskId))
    } catch (error) {
      toast.error('Could not open the solution', {
        description: error instanceof Error ? error.message : String(error)
      })
    }
  }

  const copy = async (): Promise<void> => {
    if (!solution) return
    await navigator.clipboard.writeText(solution.content)
    toast.success('Solution copied')
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="font-normal text-muted-foreground hover:text-foreground"
        onClick={() => (easyLocked ? void open() : setConfirming(true))}
      >
        <Eye />
        Show solution
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle>Open the solution?</AlertDialogTitle>
            <AlertDialogDescription>
              Once you open a solution, this chapter stays in easy mode and its tasks pay half
              points. You can still try every task yourself first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={() => void open()}>Open solution</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={solution !== null} onOpenChange={(isOpen) => !isOpen && setSolution(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col bg-popover sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Solution</DialogTitle>
            <DialogDescription className="font-mono">{solution?.path}</DialogDescription>
          </DialogHeader>
          <pre className="min-h-0 flex-1 overflow-auto rounded-lg border bg-editor p-4 font-mono text-[0.8125rem] leading-6">
            {solution?.content}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => void copy()}>
              <Copy />
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
