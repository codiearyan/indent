import { useCallback, useRef, useState } from 'react'
import {
  Loader2Icon,
  Maximize2Icon,
  Minimize2Icon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  PlayIcon,
  WandSparklesIcon,
  XIcon
} from 'lucide-react'
import { isChapterComplete } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { shortcutLabel, type ShortcutId } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useChapterProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { TOUR } from '@/features/tour/anchors'
import { checkAll, runCommand } from '@/features/workspace/useWorkspaceShortcuts'
import { useRuntime } from '@/stores/runtime'
import { CodeEditor } from './CodeEditor'
import { ConflictDialog } from './ConflictDialog'
import { FileLabel } from './FileTab'
import { FilesPanel } from './FilesPanel'
import { fileChange, missingFiles } from './fileChange'
import type { monaco } from './monaco'

export function EditorPane(): React.JSX.Element {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const status = useWorkspace((s) => s.status)
  const files = useWorkspace((s) => s.files)
  const starter = useWorkspace((s) => s.starter)
  const openPaths = useWorkspace((s) => s.openPaths)
  const activePath = useWorkspace((s) => s.activePath)
  const openFile = useWorkspace((s) => s.openFile)
  const closeFile = useWorkspace((s) => s.closeFile)
  const checking = useWorkspace((s) => s.checking)
  const toolsInstalling = useRuntime((s) => !!s.status?.installing)
  const conflicts = useWorkspace((s) => s.conflicts)
  const [conflictsOpen, setConflictsOpen] = useState(false)
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

  return (
    <div className="flex h-full flex-col bg-editor">
      <div className="flex h-11 shrink-0 items-center gap-1 px-2">
        <IconButton
          label={panels.files ? 'Hide files' : 'Show files'}
          shortcut="toggleFiles"
          onClick={() => togglePanel('files')}
        >
          {panels.files ? <PanelLeftCloseIcon /> : <PanelLeftIcon />}
        </IconButton>
        <div className="mx-1 h-5 w-px shrink-0 bg-border" />
        {status === 'ready' && conflicts.length > 0 ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
            <p className="min-w-0 truncate text-[13px] text-muted-foreground">
              This issue was updated.{' '}
              {conflicts.length === 1
                ? '1 file you changed has a new version.'
                : `${conflicts.length} files you changed have a new version.`}
            </p>
            <Button size="xs" variant="outline" onClick={() => setConflictsOpen(true)}>
              Choose versions
            </Button>
          </div>
        ) : (
          <p className="min-w-0 flex-1 truncate px-1 text-[13px] text-muted-foreground">
            {outdated ? (
              'This issue has changed. Reset issue files, in the menu at the top right, to get its new files.'
            ) : showSummary ? (
              <CheckSummary />
            ) : (
              'Saved as you type. Run checks when you are ready.'
            )}
          </p>
        )}
        <IconButton
          label="Focus mode"
          shortcut="toggleFocusMode"
          onClick={() => togglePanel('zen')}
        >
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
                onClick={runCommand}
              >
                <PlayIcon />
                Run
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Runs <span className="font-mono">{command}</span> in the terminal (
              {shortcutLabel('runCommand')})
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent>Checks every task ({shortcutLabel('check')})</TooltipContent>
        </Tooltip>
      </div>

      <div
        role="tablist"
        data-tour={TOUR.editorTabs}
        className="flex h-9 shrink-0 overflow-x-auto border-t border-border [scrollbar-width:none]"
      >
        {openPaths.map((path) => {
          const file = files.find((f) => f.path === path)
          if (!file) return null
          const active = path === activePath
          const name = path.slice(path.lastIndexOf('/') + 1)
          return (
            <div
              key={path}
              onMouseDown={(event) => event.button === 1 && event.preventDefault()}
              onAuxClick={(event) => event.button === 1 && closeFile(path)}
              className={cn(
                'group flex shrink-0 items-center border-r border-b border-r-rule border-b-border text-muted-foreground hover:bg-accent/40 has-focus-visible:bg-accent/60',
                active && 'border-b-transparent bg-editor hover:bg-editor'
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => openFile(path)}
                className="flex h-full items-center gap-2 pr-1 pl-3 font-mono text-[13px] outline-none"
              >
                <FileLabel path={path} change={fileChange(starter, file)} active={active} />
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Close ${name}`}
                    onClick={() => closeFile(path)}
                    className={cn(
                      'mr-1.5 flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 outline-none group-hover:opacity-100 hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:opacity-100',
                      active && 'opacity-100'
                    )}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Close file ({shortcutLabel('closeFile')})</TooltipContent>
              </Tooltip>
            </div>
          )
        })}
        <div className="min-w-4 flex-1 border-b border-border" />
      </div>

      <div className="flex min-h-0 flex-1">
        {panels.files && status === 'ready' && (
          <div className="flex w-[200px] shrink-0 flex-col border-r border-border">
            <FilesPanel />
          </div>
        )}
        {status === 'ready' ? (
          <div className="relative flex min-w-0 flex-1">
            <CodeEditor
              editorRef={editorRef}
              onEdit={hideSummary}
              onCheck={checkAll}
              onRun={runCommand}
            />
            {!activePath && (
              <p className="absolute inset-0 flex items-center justify-center bg-editor text-sm text-muted-foreground">
                Open a file from the files panel.
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 space-y-3 p-6">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        )}
      </div>
      <ConflictDialog open={conflictsOpen} onOpenChange={setConflictsOpen} />
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
  shortcut,
  onClick,
  children
}: {
  label: string
  shortcut?: ShortcutId
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
      <TooltipContent>
        {label}
        {shortcut && ` (${shortcutLabel(shortcut)})`}
      </TooltipContent>
    </Tooltip>
  )
}
