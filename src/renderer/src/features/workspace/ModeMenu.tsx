import { useState } from 'react'
import { Check, ChevronDown, Flame, Leaf } from 'lucide-react'
import { toast } from 'sonner'
import type { Mode } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useChapterProgress } from '@/stores/progress'
import { useWorkspace } from '@/stores/workspace'
import { TOUR } from '@/features/tour/anchors'
import { EarnDialog } from './EarnDialog'

export function ModeMenu({
  labId,
  chapterId
}: {
  labId: string
  chapterId: string
}): React.JSX.Element {
  const progress = useChapterProgress(labId, chapterId)
  const setMode = useWorkspace((s) => s.setMode)
  const [earnOpen, setEarnOpen] = useState(false)
  const mode = progress?.mode ?? 'hard'

  const choose = (next: Mode): void => {
    if (next === mode) return
    setMode(next).catch((error: Error) =>
      toast.error('Could not change the mode', { description: error.message })
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={!progress}
            data-tour={TOUR.mode}
            className="font-normal text-muted-foreground hover:text-foreground data-[state=open]:bg-accent [&_svg]:stroke-[1.5]"
          >
            {mode === 'hard' ? <Flame className="text-warning" /> : <Leaf />}
            {mode === 'hard' ? 'Hard' : 'Easy'}
            <ChevronDown className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 rounded-lg">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Easy mode lets you open solutions after a check, for half the points. You can switch
            back until you open one.
          </DropdownMenuLabel>
          <DropdownMenuItem disabled={progress?.easyLocked} onSelect={() => choose('hard')}>
            <Flame className="text-warning" />
            <div className="min-w-0 flex-1">
              <div>Hard mode: full points</div>
              {progress?.easyLocked && (
                <div className="text-xs text-muted-foreground">
                  Locked: you opened a solution in this chapter
                </div>
              )}
            </div>
            {mode === 'hard' && <Check className="text-foreground" />}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => choose('easy')}>
            <Leaf />
            <span className="flex-1">Easy mode: solutions, half points</span>
            {mode === 'easy' && <Check className="text-foreground" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setEarnOpen(true)}>What do I earn?</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EarnDialog open={earnOpen} onOpenChange={setEarnOpen} />
    </>
  )
}
