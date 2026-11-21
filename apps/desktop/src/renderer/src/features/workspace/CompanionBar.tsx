import { useState } from 'react'
import { SquareArrowOutUpRight } from 'lucide-react'
import { toast } from 'sonner'
import { chapterKey } from '@shared/rules'
import type { IdeInfo } from '@shared/types'
import { Button } from '@/components/ui/button'
import { cn, errorMessage } from '@/lib/utils'
import { useIde } from '@/stores/ides'
import { useWorkspace } from '@/stores/workspace'

const quiet = 'font-normal text-muted-foreground hover:text-foreground [&_svg]:stroke-[1.5]'

/** Opens the issue's folder in the IDE. A launch that fails says why and changes nothing. */
export function OpenInIdeButton({
  ide,
  variant
}: {
  ide: IdeInfo
  variant: 'ghost' | 'outline'
}): React.JSX.Element {
  const [opening, setOpening] = useState(false)
  const open = async (): Promise<void> => {
    setOpening(true)
    try {
      await useWorkspace.getState().openInIde(ide)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setOpening(false)
    }
  }
  return (
    <Button
      variant={variant}
      size="sm"
      disabled={opening}
      onClick={() => void open()}
      className={cn(variant === 'ghost' && quiet)}
    >
      <SquareArrowOutUpRight />
      {opening ? `Opening ${ide.label}` : `Open in ${ide.label}`}
    </Button>
  )
}

/** Shown while an issue is worked on in an IDE: where the code is, and the way back. */
export function CompanionBar(): React.JSX.Element | null {
  const companion = useWorkspace((s) => s.companion)
  const here = useWorkspace(
    (s) => !!s.chapter && s.ideIssue === chapterKey(s.chapter.labId, s.chapter.id)
  )
  const ide = useIde()
  if (!companion || !ide) return null

  return (
    <div className="mx-2 mb-2 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-border px-4 py-2.5">
      <p className="min-w-0 flex-1 basis-52 text-[13px] text-muted-foreground">
        {here
          ? `This issue is open in ${ide.label}. Checks run on the files it saves.`
          : `This issue is not open in ${ide.label} yet.`}
      </p>
      {!here && <OpenInIdeButton ide={ide} variant="outline" />}
      <Button
        variant="ghost"
        size="sm"
        className={quiet}
        onClick={() => void useWorkspace.getState().leaveCompanion()}
      >
        Back to the editor
      </Button>
    </div>
  )
}
