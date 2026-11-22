import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { KeyboardSection } from '@/features/settings/KeyboardSection'
import { useShortcutList } from './dialogStore'

/** Every shortcut in one window, grouped by where it works, with a search and their keys to edit. */
export function ShortcutList(): React.JSX.Element {
  const { open, setOpen } = useShortcutList()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[min(640px,calc(100vh-4rem))] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[600px]"
      >
        <div className="border-b border-rule p-4">
          <DialogTitle className="text-sm font-semibold">Keyboard shortcuts</DialogTitle>
        </div>
        <ScrollArea className="min-h-0">
          <div className="px-4 pb-4 [&>:first-child]:mt-4">
            <KeyboardSection />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
