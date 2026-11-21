import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2Icon,
  Maximize2Icon,
  Minimize2Icon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  PlayIcon,
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
import { useRuntime } from '@/stores/runtime'
import { CodeEditor } from './CodeEditor'
import { FileLabel } from './FileTab'
import { fileChange, missingFiles } from './fileChange'
import type { monaco } from './monaco'

const RUN_SHORTCUT = window.platform === 'darwin' ? '⌘↵' : 'Ctrl+Enter'

function run(): void {
  useWorkspace
    .getState()
    .run()
    .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
}

function checkAll(): void {
  useWorkspace
    .getState()
    .check()
    .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
}

export function EditorPane(): React.JSX.Element {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const status = useWorkspace((s) => s.status)
  const files = useWorkspace((s) => s.files)
  const starter = useWorkspace((s) => s.starter)
  const activePath = useWorkspace((s) => s.activePath)
  const setActive = useWorkspace((s) => s.setActive)
  const checking = useWorkspace((s) => s.checking)
  const toolsInstalling = useRuntime((s) => !!s.status?.installing)
  const panels = useSettings((s) => s.panels)
  const togglePanel = useSettings((s) => s.togglePanel)

  const [showSummary, setShowSummary] = useState(false)
  const [prevChecking, setPrevChecking] = useState(checking)
  if (checking !== prevChecking) {
    setPrevChecking(checking)
    // A check that waited on tools that never got ready has no results to sum up.
    if (prevChecking && !checking && useRuntime.getState().status?.ready !== false) {
      setShowSummary(true)
    }
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
  const outdated = status === 'ready' && missingFiles(chapter?.files ?? [], files).length > 0
  const command = chapter?.terminal.suggestedCommand

  useEffect(() => {
    if (!command) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey) || event.shiftKey) return
      const target = event.target as HTMLElement
      // Other text fields keep their own Enter; the code editor's input is a textarea too.
      if (target.closest('input, textarea') && !target.closest('.monaco-editor')) return
      event.preventDefault()
      event.stopPropagation()
      run()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [command])

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
        <p className="min-w-0 flex-1 truncate px-1 text-[13px] text-muted-foreground">
          {outdated ? (
            'This issue has changed. Reset issue files, in the menu at the top right, to get its new files.'
          ) : showSummary ? (
            <CheckSummary />
          ) : (
            'Saved as you type. Run checks when you are ready.'
          )}
        </p>
        <IconButton label="Focus mode" onClick={() => togglePanel('zen')}>
          {panels.zen ? <Minimize2Icon /> : <Maximize2Icon />}
        </IconButton>
        <IconButton
          label="Format file"
          onClick={() => void editorRef.current?.getAction('editor.action.formatDocument')?.run()}
        >
          <WandSparklesIcon />
        </IconButton>
        {command && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="ml-1"
                disabled={status !== 'ready'}
                onClick={run}
              >
                <PlayIcon />
                Run
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Runs <span className="font-mono">{command}</span> in the terminal ({RUN_SHORTCUT})
            </TooltipContent>
          </Tooltip>
        )}
        <Button
          size="sm"
          variant={finished ? 'outline' : 'default'}
          className="ml-1"
          data-tour={TOUR.checkAll}
          disabled={checking !== null || status !== 'ready'}
          onClick={checkAll}
        >
          {checking && <Loader2Icon className="animate-spin" />}
          {checking ? (toolsInstalling ? 'Getting ready...' : 'Running...') : 'Run checks'}
        </Button>
      </div>

      <div
        role="tablist"
        data-tour={TOUR.editorTabs}
        className="flex h-9 shrink-0 overflow-x-auto border-t border-border [scrollbar-width:none]"
      >
        {files.map((file) => {
          const active = file.path === activePath
          return (
            <button
              key={file.path}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActive(file.path)}
              className={cn(
                'flex shrink-0 items-center gap-2 border-r border-b border-r-rule border-b-border px-3 font-mono text-[13px] text-muted-foreground outline-none hover:bg-accent/40 focus-visible:bg-accent/60',
                active && 'border-b-transparent bg-editor hover:bg-editor'
              )}
            >
              <FileLabel path={file.path} change={fileChange(starter, file)} active={active} />
            </button>
          )
        })}
        <div className="min-w-4 flex-1 border-b border-border" />
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
                  'h-7 w-full justify-start gap-2 px-2 font-mono text-[13px] font-normal text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  file.path === activePath && 'bg-accent text-foreground hover:bg-accent'
                )}
              >
                <FileLabel
                  path={file.path}
                  change={fileChange(starter, file)}
                  active={file.path === activePath}
                />
              </Button>
            ))}
          </div>
        )}
        {status === 'ready' ? (
          <CodeEditor editorRef={editorRef} onEdit={hideSummary} onCheck={checkAll} />
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
