import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  FileIcon,
  Loader2Icon,
  Maximize2Icon,
  Minimize2Icon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  WandSparklesIcon
} from 'lucide-react'
import { isChapterComplete } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useChapterProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { TOUR } from '@/features/tour/anchors'
import { CodeEditor } from './CodeEditor'
import type { monaco } from './monaco'

function checkAll(): void {
  useWorkspace
    .getState()
    .check()
    .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
}

export function EditorPane(): React.JSX.Element {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const status = useWorkspace((s) => s.status)
  const error = useWorkspace((s) => s.error)
  const files = useWorkspace((s) => s.files)
  const activePath = useWorkspace((s) => s.activePath)
  const setActive = useWorkspace((s) => s.setActive)
  const checking = useWorkspace((s) => s.checking)
  const panels = useSettings((s) => s.panels)
  const togglePanel = useSettings((s) => s.togglePanel)

  const [showSummary, setShowSummary] = useState(false)
  const [prevChecking, setPrevChecking] = useState(checking)
  if (checking !== prevChecking) {
    setPrevChecking(checking)
    if (prevChecking && !checking) setShowSummary(true)
  }
  const chapterId = useWorkspace((s) => s.chapter?.id)
  const chapter = useWorkspace((s) => s.chapter)
  const chapterProgress = useChapterProgress(chapter?.labId ?? '', chapter?.id ?? '')
  // Once every task has passed, the next-chapter button is the screen's one filled action.
  const finished = isChapterComplete(chapterProgress, chapter?.tasks.map((t) => t.id) ?? [])
  const [prevChapterId, setPrevChapterId] = useState(chapterId)
  if (chapterId !== prevChapterId) {
    setPrevChapterId(chapterId)
    setShowSummary(false)
  }
  const hideSummary = useCallback(() => setShowSummary(false), [])

  return (
    <div className="flex h-full flex-col bg-editor">
      <div className="flex h-11 shrink-0 items-center gap-1 px-2">
        <IconButton
          label={panels.files ? 'Hide files' : 'Show files'}
          onClick={() => togglePanel('files')}
        >
          {panels.files ? <PanelLeftCloseIcon /> : <PanelLeftIcon />}
        </IconButton>
        <div className="mx-1 h-5 w-px shrink-0 bg-border" />
        <div
          role="tablist"
          data-tour={TOUR.editorTabs}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]"
        >
          {files.map((file) => (
            <Button
              key={file.path}
              role="tab"
              aria-selected={file.path === activePath}
              variant="ghost"
              size="sm"
              onClick={() => setActive(file.path)}
              className={cn(
                'h-7 px-2.5 font-mono text-[13px] font-normal text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                file.path === activePath && 'bg-accent text-foreground hover:bg-accent'
              )}
            >
              {file.path}
            </Button>
          ))}
        </div>
        <IconButton label="Focus mode" onClick={() => togglePanel('zen')}>
          {panels.zen ? <Minimize2Icon /> : <Maximize2Icon />}
        </IconButton>
        <IconButton
          label="Format file"
          onClick={() => void editorRef.current?.getAction('editor.action.formatDocument')?.run()}
        >
          <WandSparklesIcon />
        </IconButton>
        <Button
          size="sm"
          variant={finished ? 'outline' : 'default'}
          className="ml-1"
          data-tour={TOUR.checkAll}
          disabled={checking !== null || status !== 'ready'}
          onClick={checkAll}
        >
          {checking && <Loader2Icon className="animate-spin" />}
          {checking ? 'Checking...' : 'Check all tasks'}
        </Button>
      </div>

      <div className="shrink-0 border-b border-border px-4 pb-2.5 text-[13px] text-muted-foreground">
        {showSummary ? (
          <CheckSummary />
        ) : (
          'Your work saves as you type. Press Check all tasks when ready, or check one task at a time.'
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {panels.files && status === 'ready' && (
          <div className="w-[200px] shrink-0 space-y-0.5 overflow-y-auto border-r border-border p-2">
            {files.map((file) => (
              <Button
                key={file.path}
                variant="ghost"
                size="sm"
                onClick={() => setActive(file.path)}
                className={cn(
                  'h-7 w-full justify-start px-2 font-mono text-[13px] font-normal text-muted-foreground hover:bg-accent/60 hover:text-foreground [&_svg]:stroke-[1.5]',
                  file.path === activePath && 'bg-accent text-foreground hover:bg-accent'
                )}
              >
                <FileIcon />
                <span className="truncate">{file.path}</span>
              </Button>
            ))}
          </div>
        )}
        {status === 'ready' ? (
          <CodeEditor editorRef={editorRef} onEdit={hideSummary} onCheck={checkAll} />
        ) : status === 'error' ? (
          <p className="p-6 text-sm text-muted-foreground">
            Could not open the files. <span className="text-destructive">{error}</span>
          </p>
        ) : (
          <div className="flex-1 space-y-3 p-6">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        )}
      </div>
    </div>
  )
}

function CheckSummary(): React.JSX.Element | null {
  const chapter = useWorkspace((s) => s.chapter)
  const progress = useChapterProgress(chapter?.labId ?? '', chapter?.id ?? '')
  if (!chapter) return null
  const total = chapter.tasks.length
  const passed = chapter.tasks.filter((t) => progress?.tasks[t.id]?.lastResult?.passed).length
  return (
    <span className={passed === total ? 'text-success' : 'text-destructive'}>
      {passed} of {total} {total === 1 ? 'task passes' : 'tasks pass'}
    </span>
  )
}

function IconButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick(): void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
          className="text-muted-foreground hover:text-foreground [&_svg]:stroke-[1.5]"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
