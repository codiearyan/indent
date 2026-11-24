import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { EditorPane } from '@/features/editor/EditorPane'
import { TerminalPane } from '@/features/terminal/TerminalPane'
import { BrowserPane } from '@/features/browser/BrowserPane'
import { ChatPanel } from '@/features/ai/ChatPanel'
import { useOpenWhenFinished } from '@/features/completion/useOpenWhenFinished'
import { Tour } from '@/features/tour/Tour'
import { ToolNotice } from './ToolNotice'
import { MissingFilesNotice } from './MissingFilesNotice'
import { TopBar } from './TopBar'
import { CompanionBar } from './CompanionBar'
import { LeftPanel } from './LeftPanel'
import { MomentCard } from '@/features/progress/MomentCard'
import { useCatalog } from '@/stores/catalog'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { RepoNotice } from './RepoNotice'
import { FocusTasks } from './FocusTasks'
import { useWorkspaceShortcuts } from './useWorkspaceShortcuts'
import { useActivePaneTracking, type PaneId } from './activePane'
import { useSideLayout } from './useSideLayout'
import { BROWSER_MIN, CHAT_MIN, CODE_MIN, DEFAULT_PANEL_SIZES, LESSON_MIN } from './panelLayout'

/** Height of the terminal's header bar, which stays visible while the terminal is collapsed. */
export const TERMINAL_HEADER_PX = 41

const separator =
  'bg-border transition-colors hover:bg-foreground/30 data-[separator=active]:bg-foreground/40'

export function WorkspacePage(): React.JSX.Element {
  const { labId, chapterId } = useParams()
  const open = useWorkspace((s) => s.open)
  const refresh = useWorkspace((s) => s.refresh)
  const panels = useSettings((s) => s.panels)
  const lessonSide = useSettings((s) => s.lessonSide)
  const setPanel = useSettings((s) => s.setPanel)
  const terminalRef = usePanelRef()
  const browserRef = usePanelRef()
  const companion = useWorkspace((s) => s.companion)
  const browser = useWorkspace((s) => Boolean(s.chapter?.preview)) && panels.browser
  const browserExpanded = useWorkspace((s) => s.browserExpanded) && browser
  const status = useWorkspace((s) => s.status)
  const chapter = useWorkspace((s) => s.chapter)
  const downloading = useCatalog((s) => !!labId && s.downloads[labId]?.state === 'running')
  // The sheet shows the repo's download, work left in an earlier folder, or why the issue could
  // not open.
  const notice =
    status === 'error' || status === 'elsewhere' || (status === 'loading' && downloading)
  const side = useSideLayout(!notice && !companion, browser)
  const lessonShown = side.plan.lesson > 0
  useWorkspaceShortcuts()
  useActivePaneTracking()
  // Here and not in the tasks list, which focus mode hides.
  useOpenWhenFinished(labId)

  useEffect(() => {
    if (labId && chapterId) void open(labId, chapterId)
  }, [labId, chapterId, open])

  // Leaving the issues gives the window its size back, closes the page's window and lets the repo
  // update.
  useEffect(
    () => () => {
      void useWorkspace.getState().leaveCompanion()
      api.preview.close()
      api.content.leave()
    },
    []
  )

  useEffect(() => {
    if (!browser) useWorkspace.getState().setBrowserExpanded(false)
  }, [browser])

  // Files may have changed on disk through the terminal.
  useEffect(() => {
    const onFocus = (): void => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  // The terminal panel stays mounted so its shell survives collapsing.
  useEffect(() => {
    const panel = terminalRef.current
    if (!panel) return
    if (panels.terminal && panel.isCollapsed()) {
      panel.expand()
      panel.resize(useSettings.getState().panelSizes.terminal ?? '40%')
    }
    if (!panels.terminal && !panel.isCollapsed()) panel.collapse()
  }, [panels.terminal, terminalRef])

  const lesson = (
    <Panel
      id="lesson"
      collapsible
      collapsedSize={0}
      minSize={LESSON_MIN}
      defaultSize={DEFAULT_PANEL_SIZES.lesson}
      groupResizeBehavior="preserve-pixel-size"
      style={{ overflow: 'hidden' }}
    >
      {(lessonShown || side.sliding) && (
        <Pane
          id="lesson"
          style={side.sliding ? { minWidth: side.plan.lesson || undefined } : undefined}
        >
          <LeftPanel />
        </Pane>
      )}
    </Panel>
  )
  const lessonSeparator = (
    <Separator className={cn('w-px', separator, !lessonShown && 'bg-transparent')} />
  )

  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar />
      <MomentCard />
      {labId && <ToolNotice labId={labId} />}
      <MissingFilesNotice />
      <CompanionBar />
      {/* `relative`: the expanded Browser panel covers this sheet, not the window and its top bar. */}
      <div className="relative mx-2 mb-2 min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
        {notice && labId && chapterId ? (
          <RepoNotice labId={labId} chapterId={chapterId} />
        ) : companion ? (
          <Group orientation="vertical">
            <Panel id="lesson" minSize="30%">
              <Pane id="lesson">
                <LeftPanel />
              </Pane>
            </Panel>
            {panels.chat && <Separator className={`h-px ${separator}`} />}
            {panels.chat && (
              <Panel id="chat" defaultSize="40%" minSize="25%">
                <Pane id="tutor">
                  <ChatPanel />
                </Pane>
              </Panel>
            )}
          </Group>
        ) : (
          <Group
            orientation="horizontal"
            groupRef={side.groupRef}
            elementRef={side.elementRef}
            onLayoutChanged={side.onLayoutChanged}
          >
            {lessonSide === 'left' && lesson}
            {lessonSide === 'left' && lessonSeparator}
            <Panel id="work" minSize={CODE_MIN + (browser ? BROWSER_MIN + 1 : 0)}>
              <Group
                orientation="horizontal"
                onLayoutChanged={(_, meta) => {
                  const panel = browserRef.current
                  if (meta.isUserInteraction && panel) {
                    useSettings.getState().setPanelSizes({ browser: panel.getSize().inPixels })
                  }
                }}
              >
                <Panel id="code" minSize={CODE_MIN}>
                  <Group
                    orientation="vertical"
                    onLayoutChanged={(_, meta) => {
                      const panel = terminalRef.current
                      if (meta.isUserInteraction && panel && !panel.isCollapsed()) {
                        useSettings.getState().setPanelSizes({ terminal: panel.getSize().inPixels })
                      }
                    }}
                  >
                    <Panel id="editor" minSize={240}>
                      {/* The task card sits in the editor's bottom corner on the lesson's side, so it
                          stays above the terminal at any height. */}
                      <div className="relative h-full">
                        <EditorPane />
                        {!lessonShown && chapter && status === 'ready' && (
                          <div
                            className={cn(
                              'absolute bottom-3 z-10 flex max-h-[calc(100%-1.5rem)] flex-col',
                              lessonSide === 'left' ? 'left-3' : 'right-3'
                            )}
                          >
                            <FocusTasks chapter={chapter} />
                          </div>
                        )}
                      </div>
                    </Panel>
                    <Separator className={`h-px ${separator}`} />
                    <Panel
                      id="terminal"
                      panelRef={terminalRef}
                      collapsible
                      groupResizeBehavior="preserve-pixel-size"
                      collapsedSize={TERMINAL_HEADER_PX}
                      minSize={160}
                      defaultSize={
                        panels.terminal
                          ? (useSettings.getState().panelSizes.terminal ?? '40%')
                          : TERMINAL_HEADER_PX
                      }
                      onResize={() => {
                        const collapsed = terminalRef.current?.isCollapsed() ?? false
                        if (collapsed === useSettings.getState().panels.terminal) {
                          setPanel('terminal', !collapsed)
                        }
                      }}
                    >
                      <Pane id="terminal">
                        <TerminalPane />
                      </Pane>
                    </Panel>
                  </Group>
                </Panel>
                {browser && <Separator className={`w-px ${separator}`} />}
                {browser && (
                  <Panel
                    id="browser"
                    panelRef={browserRef}
                    defaultSize={useSettings.getState().panelSizes.browser ?? '45%'}
                    minSize={BROWSER_MIN}
                    groupResizeBehavior="preserve-pixel-size"
                  >
                    {/* Expanded, the pane covers the sheet but stays in place, so the page keeps running. */}
                    <Pane
                      id="browser"
                      className={browserExpanded ? 'absolute inset-0 z-10 bg-card' : undefined}
                    >
                      <BrowserPane />
                    </Pane>
                  </Panel>
                )}
              </Group>
            </Panel>
            {lessonSide === 'right' && lessonSeparator}
            {lessonSide === 'right' && lesson}
            <Separator
              className={cn('w-px', separator, side.plan.chat === 0 && 'bg-transparent')}
            />
            <Panel
              id="chat"
              collapsible
              collapsedSize={0}
              minSize={CHAT_MIN}
              defaultSize={DEFAULT_PANEL_SIZES.chat}
              groupResizeBehavior="preserve-pixel-size"
              style={{ overflow: 'hidden' }}
            >
              {(side.plan.chat > 0 || side.sliding) && (
                <Pane
                  id="tutor"
                  style={side.sliding ? { minWidth: side.plan.chat || undefined } : undefined}
                >
                  <ChatPanel />
                </Pane>
              )}
            </Panel>
          </Group>
        )}
      </div>
      <Tour />
    </div>
  )
}

/** Focus here takes the active mark off the editor; only the editors and the terminal draw it. */
function Pane({
  id,
  className,
  style,
  children
}: {
  id: PaneId
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div data-pane={id} className={cn('h-full', className)} style={style}>
      {children}
    </div>
  )
}
