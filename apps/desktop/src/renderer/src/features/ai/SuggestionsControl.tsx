import { SparklesIcon } from 'lucide-react'
import type { SuggestionMode } from '@shared/types'
import { ShortcutKeys } from '@/components/app/ShortcutKeys'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useChapterProgress } from '@/stores/progress'
import { useWorkspace } from '@/stores/workspace'
import { useAi } from './aiStore'
import { useCursorTask } from './inlineSuggestions'
import { waitsForRequest } from './suggestionTask'

const MODES: { value: SuggestionMode; label: string; hint: React.ReactNode }[] = [
  { value: 'off', label: 'Off', hint: 'No grey text in the editor.' },
  {
    value: 'manual',
    label: 'When I ask',
    hint: (
      <>
        Press <ShortcutKeys id="suggest" /> for a suggestion.
      </>
    )
  },
  {
    value: 'auto',
    label: 'As I type',
    hint: (
      <>
        After a pause. Until a task has a check, press <ShortcutKeys id="suggest" />.
      </>
    )
  }
]

/** The suggestion mode in the editor bar, and a menu to change it. Hidden while AI is off. */
export function SuggestionsControl(): React.JSX.Element | null {
  const config = useAi((s) => s.config)
  const update = useAi((s) => s.update)
  const chapter = useWorkspace((s) => s.chapter)
  const progress = useChapterProgress(chapter?.labId ?? '', chapter?.id ?? '')
  const taskId = useCursorTask((s) => s.taskId)
  if (!config?.enabled) return null

  const mode = config.suggestions
  const task = chapter?.tasks.find((t) => t.id === taskId)
  const waiting = mode === 'auto' && waitsForRequest(config, task, progress)
  const keys = <ShortcutKeys id="suggest" />
  const label =
    mode === 'off' ? (
      'Suggestions off'
    ) : mode === 'manual' || waiting ? (
      <>Suggestions on {keys}</>
    ) : (
      'Suggestions as you type'
    )

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 px-2 text-[13px] font-normal text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground [&_svg]:stroke-[1.5]"
            >
              <SparklesIcon />
              {label}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {waiting ? (
            <>This task has no check yet, so suggestions wait for {keys}</>
          ) : (
            'Change inline suggestions'
          )}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Inline suggestions. Tab accepts.
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => void update({ suggestions: value as SuggestionMode })}
        >
          {MODES.map(({ value, label, hint }) => (
            <DropdownMenuRadioItem key={value} value={value} className="items-start">
              <span className="flex flex-col gap-0.5">
                <span>{label}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
