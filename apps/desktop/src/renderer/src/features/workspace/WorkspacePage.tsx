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
  const chat = panels.chat && !panels.zen
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
      // A first expand has no earlier size to return to and lands on the minimum.
      if (panel.getSize().asPercentage < 25) panel.resize('40%')
    }
    if (!panels.terminal && !panel.isCollapsed()) panel.collapse()
  }, [panels.terminal, terminalRef])

  const lesson = !panels.zen && (
    <Panel id="lesson" defaultSize="38%" minSize="24%">
      <Pane id="lesson">
        <LeftPanel />
      </Pane>
    </Panel>
  )

  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar />
      <MomentCard />
      {labId && <ToolNotice labId={labId} />}
      <MissingFilesNotice />
      <CompanionBar />
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
          <Group orientation="horizontal">
            {lessonSide === 'left' && lesson}
            {lessonSide === 'left' && lesson && <Separator className={`w-px ${separator}`} />}
            <Panel id="work" minSize="30%">
              <Group orientation="horizontal">
                <Panel id="code" minSize="30%">
                  <Group orientation="vertical">
                    <Panel id="editor" minSize="20%">
                      <EditorPane />
                    </Panel>
                    <Separator className={`h-px ${separator}`} />
                    <Panel
                      id="terminal"
                      panelRef={terminalRef}
                      collapsible
                      collapsedSize={TERMINAL_HEADER_PX}
                      minSize={160}
                      defaultSize={panels.terminal ? '40%' : TERMINAL_HEADER_PX}
                      onResize={(size) => {
                        const collapsed = size.inPixels <= TERMINAL_HEADER_PX + 1
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
                  <Panel id="browser" defaultSize="45%" minSize="20%">
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
            {lessonSide === 'right' && lesson && <Separator className={`w-px ${separator}`} />}
            {lessonSide === 'right' && lesson}
            {chat && <Separator className={`w-px ${separator}`} />}
            {chat && (
              <Panel id="chat" defaultSize="26%" minSize="20%">
                <Pane id="tutor">
                  <ChatPanel />
                </Pane>
              </Panel>
            )}
          </Group>
        )}
        {panels.zen && !companion && !notice && chapter && status === 'ready' && (
          // In the lesson's corner, just above the terminal's header so its toggle stays free.
          <div
            className={cn('absolute z-10', lessonSide === 'left' ? 'left-3' : 'right-3')}
            style={{ bottom: TERMINAL_HEADER_PX + 12 }}
          >
            <FocusTasks chapter={chapter} />
          </div>
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
  children
}: {
  id: PaneId
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div data-pane={id} className={cn('h-full', className)}>
      {children}
    </div>
  )
}
