import { useEffect, useState } from 'react'
import type * as Monaco from 'monaco-editor'
import { useAi } from './aiStore'
import { AskBar } from './AskBar'
import { askAboutSelection, selectionHasFailure, whyFails } from './tutorActions'

const SETTLE_MS = 250
const BAR_HEIGHT = 36
const BAR_WIDTH = 320

interface Spot {
  left: number
  top: number
  failing: boolean
}

/** Where the bar goes for the editor's selection: above its first line, or below when no room. */
function spotFor(editor: Monaco.editor.ICodeEditor): Spot | null {
  const selection = editor.getSelection()
  const model = editor.getModel()
  if (!selection || !model || selection.isEmpty()) return null
  if (!model.getValueInRange(selection).trim()) return null
  const start = editor.getScrolledVisiblePosition(selection.getStartPosition())
  const end = editor.getScrolledVisiblePosition(selection.getEndPosition())
  if (!start || !end) return null
  const { width, height } = editor.getLayoutInfo()
  const above = start.top - BAR_HEIGHT - 4
  const top = above >= 0 ? above : Math.min(end.top + end.height + 4, height - BAR_HEIGHT)
  if (top < 0 || top > height - BAR_HEIGHT) return null
  const left = Math.max(8, Math.min(start.left, width - BAR_WIDTH))
  return { left, top, failing: selectionHasFailure(editor) }
}

/** The ask bar over the code editor, while the tutor is on and code is selected. */
export function SelectionAsk({
  editor
}: {
  editor: Monaco.editor.IStandaloneCodeEditor | null
}): React.JSX.Element | null {
  const tutorOn = useAi((s) => !!s.config?.enabled && !!s.config.provider)
  const [spot, setSpot] = useState<Spot | null>(null)

  useEffect(() => {
    if (!editor || !tutorOn) return
    let timer: ReturnType<typeof setTimeout> | undefined
    // Hidden while the selection moves, shown once it settles, so dragging stays calm.
    const onSelection = (): void => {
      clearTimeout(timer)
      setSpot(null)
      timer = setTimeout(() => setSpot(spotFor(editor)), SETTLE_MS)
    }
    const follow = (): void => setSpot((shown) => shown && spotFor(editor))
    const subscriptions = [
      editor.onDidChangeCursorSelection(onSelection),
      editor.onDidScrollChange(follow),
      editor.onDidLayoutChange(follow),
      editor.onDidChangeModel(() => setSpot(null)),
      editor.onDidChangeModelContent(() => setSpot(null))
    ]
    return () => {
      clearTimeout(timer)
      subscriptions.forEach((s) => s.dispose())
      setSpot(null)
    }
  }, [editor, tutorOn])

  if (!editor || !spot) return null
  return (
    <AskBar
      left={spot.left}
      top={spot.top}
      actions={[
        { label: 'Explain', run: () => askAboutSelection(editor, 'Explain this code.') },
        ...(spot.failing ? [{ label: 'Why does this fail?', run: () => whyFails(editor) }] : [])
      ]}
      onAsk={(question) => askAboutSelection(editor, question)}
      onClose={() => {
        setSpot(null)
        editor.focus()
      }}
    />
  )
}
