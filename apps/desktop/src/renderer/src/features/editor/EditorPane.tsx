import { useCallback, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import {
  FoldVerticalIcon,
  Loader2Icon,
  Maximize2Icon,
  Minimize2Icon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  PlayIcon,
  SparklesIcon,
  UnfoldVerticalIcon,
  WandSparklesIcon
} from 'lucide-react'
import { isChapterComplete } from '@shared/rules'
import { ShortcutKeys } from '@/components/app/ShortcutKeys'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ShortcutId } from '@/lib/shortcuts'
import { useChapterProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { useAi } from '@/features/ai/aiStore'
import { SuggestionsControl } from '@/features/ai/SuggestionsControl'
import { askWhyTaskFailed } from '@/features/ai/tutorActions'
import { TOUR } from '@/features/tour/anchors'
import { checkAll, runCommand } from '@/features/workspace/useWorkspaceShortcuts'
import { useRuntime } from '@/stores/runtime'
import { foldKey, toggleCommentFolds, useCommentFolds } from './commentFolds'
import { ConflictDialog } from './ConflictDialog'
import { EditorGroup } from './EditorGroup'
import { focusedEditor } from './editors'
import { FilesPanel } from './FilesPanel'
import { useModels } from './models'
import { QuickOpen } from './QuickOpen'

export function EditorPane(): React.JSX.Element {
  const status = useWorkspace((s) => s.status)
  const files = useWorkspace((s) => s.files)
  const split = useWorkspace((s) => s.layout.groups.length > 1)
  const splitAt = useWorkspace((s) => s.layout.split)
  const checking = useWorkspace((s) => s.checking)
  const toolsInstalling = useRuntime((s) => !!s.status?.installing)
  const toolsBroken = useRuntime((s) => !!s.status?.error)
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
  useModels(files, hideSummary)
  const command = chapter?.terminal.suggestedCommand
  const focusedGroup = useWorkspace((s) => s.layout.focused)
  const activePath = useWorkspace((s) => s.layout.groups[s.layout.focused]?.active ?? null)
  const commentsFolded = useCommentFolds(
    (s) => !!activePath && !!s.folded[foldKey(focusedGroup, activePath)]
  )

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
            {showSummary ? <CheckSummary /> : 'Saved as you type. Run checks when you are ready.'}
          </p>
        )}
        <SuggestionsControl />
        <IconButton
          label="Focus mode"
          shortcut="toggleFocusMode"
          onClick={() => togglePanel('zen')}
        >
          {panels.zen ? <Minimize2Icon /> : <Maximize2Icon />}
        </IconButton>
        <IconButton
          label="Format file"
          onClick={() => void focusedEditor()?.getAction('editor.action.formatDocument')?.run()}
        >
          <WandSparklesIcon />
        </IconButton>
        <IconButton
          label={commentsFolded ? 'Show comments' : 'Collapse comments'}
          shortcut="foldComments"
          onClick={() => {
            const editor = focusedEditor()
            if (editor && activePath) toggleCommentFolds(editor, focusedGroup, activePath)
          }}
        >
          {commentsFolded ? <UnfoldVerticalIcon /> : <FoldVerticalIcon />}
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
              <ShortcutKeys id="runCommand" />)
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
              disabled={checking !== null || status !== 'ready' || toolsBroken}
              onClick={checkAll}
            >
              {checking && <Loader2Icon className="animate-spin" />}
              {checking ? (toolsInstalling ? 'Getting ready...' : 'Running...') : 'Run checks'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Checks every task (<ShortcutKeys id="check" />)
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex min-h-0 flex-1 border-t border-border">
        {panels.files && status === 'ready' && (
          <div className="flex w-[200px] shrink-0 flex-col border-r border-border">
            <FilesPanel />
          </div>
        )}
        {status === 'ready' ? (
          <div className="min-w-0 flex-1">
            <Group
              orientation="horizontal"
              onLayoutChanged={(layout) => {
                if (layout.right !== undefined) useWorkspace.getState().setSplit(layout.left)
              }}
            >
              <Panel id="left" minSize="20%">
                <EditorGroup group={0} onCheck={checkAll} onRun={runCommand} />
              </Panel>
              {split && (
                <Separator className="w-px bg-border transition-colors hover:bg-foreground/30 focus-visible:bg-foreground/40 data-[separator=active]:bg-foreground/40" />
              )}
              {split && (
                <Panel id="right" minSize="20%" defaultSize={`${100 - splitAt}%`}>
                  <EditorGroup group={1} onCheck={checkAll} onRun={runCommand} />
                </Panel>
              )}
            </Group>
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
      <QuickOpen />
    </div>
  )
}

function CheckSummary(): React.JSX.Element | null {
  const chapter = useWorkspace((s) => s.chapter)
  const progress = useChapterProgress(chapter?.labId ?? '', chapter?.id ?? '')
  const tutorOn = useAi((s) => !!s.config?.enabled && !!s.config.provider)
  if (!chapter) return null
  const total = chapter.tasks.length
  const passed = chapter.tasks.filter((t) => progress?.tasks[t.id]?.lastResult?.passed).length
  const failing = chapter.tasks.findIndex(
    (t) => progress?.tasks[t.id]?.lastResult?.passed === false
  )
  const result = failing >= 0 ? progress?.tasks[chapter.tasks[failing].id]?.lastResult : undefined
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className={passed === total ? 'text-success' : 'text-destructive'}>
        {passed} of {total} {total === 1 ? 'task passes' : 'tasks pass'}
      </span>
      {tutorOn && result && (
        <Button
          variant="ghost"
          size="xs"
          className="font-normal text-muted-foreground hover:text-foreground"
          onClick={() => askWhyTaskFailed(chapter.tasks[failing], failing + 1, result)}
        >
          <SparklesIcon />
          Ask the tutor
        </Button>
      )}
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
        {shortcut && (
          <>
            {' '}
            (<ShortcutKeys id={shortcut} />)
          </>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
