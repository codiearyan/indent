import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { EditorPane } from '@/features/editor/EditorPane'
import { TerminalPane } from '@/features/terminal/TerminalPane'
import { ChatPanel } from '@/features/ai/ChatPanel'
import { Tour } from '@/features/tour/Tour'
import { TopBar } from './TopBar'
import { LeftPanel } from './LeftPanel'

/** Height of the terminal's header bar, which stays visible while the terminal is collapsed. */
export const TERMINAL_HEADER_PX = 41

const separator = 'bg-border transition-colors hover:bg-brand data-[separator=active]:bg-brand'

export function WorkspacePage(): React.JSX.Element {
  const { labId, chapterId } = useParams()
  const open = useWorkspace((s) => s.open)
  const refresh = useWorkspace((s) => s.refresh)
  const panels = useSettings((s) => s.panels)
  const lessonSide = useSettings((s) => s.lessonSide)
  const setPanel = useSettings((s) => s.setPanel)
  const terminalRef = usePanelRef()

  useEffect(() => {
    if (labId && chapterId) void open(labId, chapterId)
  }, [labId, chapterId, open])

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
      <LeftPanel />
    </Panel>
  )

  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar />
      <Group orientation="horizontal" className="min-h-0 flex-1 border-t">
        {lessonSide === 'left' && lesson}
        {lessonSide === 'left' && lesson && <Separator className={`w-px ${separator}`} />}
        <Panel id="work" minSize="30%">
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
              <TerminalPane />
            </Panel>
          </Group>
        </Panel>
        {lessonSide === 'right' && lesson && <Separator className={`w-px ${separator}`} />}
        {lessonSide === 'right' && lesson}
        {panels.chat && !panels.zen && <Separator className={`w-px ${separator}`} />}
        {panels.chat && !panels.zen && (
          <Panel id="chat" defaultSize="26%" minSize="20%">
            <ChatPanel />
          </Panel>
        )}
      </Group>
      <Tour />
    </div>
  )
}
