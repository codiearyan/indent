import { useEffect, useRef } from 'react'
import { fontStack } from '@/lib/fonts'
import { monacoShortcut, SHORTCUTS } from '@/lib/shortcuts'
import { useSettings, type Typography } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { bindSuggestShortcut } from '@/features/ai/inlineSuggestions'
import { bindTutorActions } from '@/features/ai/tutorActions'
import { TOUR } from '@/features/tour/anchors'
import { registerEditor } from './editors'
import { monaco, themeName, uriFor } from './monaco'
import { useQuickOpen } from './quickOpenStore'
import { bindShortcuts } from './shortcutBindings'

const fontOptions = (t: Typography, scale: number): monaco.editor.IEditorOptions => ({
  fontFamily: fontStack(t.monoFont, 'mono'),
  fontSize: Math.round(t.monoSize * scale),
  lineHeight: t.lineHeight,
  fontLigatures: t.ligatures
})

interface Props {
  /** The editor group this editor shows. */
  group: number
  onCheck(): void
  onRun(): void
}

export function CodeEditor({ group, onCheck, onRun }: Props): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const viewStates = useRef(new Map<string, monaco.editor.ICodeEditorViewState | null>())
  const files = useWorkspace((s) => s.files)
  const activePath = useWorkspace((s) => s.layout.groups[group]?.active ?? null)
  const theme = useSettings((s) => s.theme)
  const codeTheme = useSettings((s) => s.codeTheme)
  const options = useSettings((s) => s.editor)
  const editorScale = useSettings((s) => s.textScale.editor)
  const typography = useSettings((s) => s.typography)

  useEffect(() => {
    const { theme, codeTheme, textScale, typography } = useSettings.getState()
    const editor = monaco.editor.create(hostRef.current!, {
      model: null,
      theme: themeName(codeTheme, theme),
      ...fontOptions(typography, textScale.editor),
      folding: true,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      overviewRulerBorder: false,
      smoothScrolling: true,
      automaticLayout: true,
      padding: { top: 12 },
      scrollBeyondLastLine: false,
      tabSize: 2,
      inlineSuggest: { enabled: true },
      bracketPairColorization: { enabled: false },
      renderLineHighlight: 'line'
    })
    editorRef.current = editor
    const unregister = registerEditor(group, editor)
    editor.onDidFocusEditorWidget(() => useWorkspace.getState().focusGroup(group))
    bindShortcuts(editor, () => [
      editor.addAction({
        id: 'indent.save',
        label: SHORTCUTS.save.label,
        keybindings: [monacoShortcut('save', monaco)],
        run: () => void useWorkspace.getState().flush()
      }),
      editor.addAction({
        id: 'indent.check',
        label: SHORTCUTS.check.label,
        keybindings: [monacoShortcut('check', monaco)],
        run: onCheck
      }),
      editor.addAction({
        id: 'indent.runCommand',
        label: SHORTCUTS.runCommand.label,
        keybindings: [monacoShortcut('runCommand', monaco)],
        run: () => {
          // Without a command to run, the keys keep the editor's own meaning.
          if (useWorkspace.getState().chapter?.terminal.suggestedCommand) onRun()
          else editor.trigger('keyboard', 'editor.action.insertLineBefore', null)
        }
      }),
      editor.addAction({
        id: 'indent.closeFile',
        label: SHORTCUTS.closeFile.label,
        keybindings: [monacoShortcut('closeFile', monaco)],
        run: () => {
          const { layout, closeFile } = useWorkspace.getState()
          const path = layout.groups[group]?.active
          if (path) closeFile(path, group)
        }
      }),
      editor.addAction({
        id: 'indent.openToSide',
        label: SHORTCUTS.openToSide.label,
        keybindings: [monacoShortcut('openToSide', monaco)],
        run: () => {
          const { layout, openToSide } = useWorkspace.getState()
          const path = layout.groups[group]?.active
          if (path) openToSide(path, group)
        }
      }),
      editor.addAction({
        id: 'indent.quickOpen',
        label: SHORTCUTS.quickOpen.label,
        keybindings: [monacoShortcut('quickOpen', monaco)],
        run: () => useQuickOpen.getState().setOpen(true)
      })
    ])
    bindSuggestShortcut(monaco, editor)
    bindTutorActions(monaco, editor)
    return () => {
      unregister()
      editor.dispose()
      editorRef.current = null
    }
  }, [group, onCheck, onRun])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const next = activePath ? monaco.editor.getModel(uriFor(activePath)) : null
    const current = editor.getModel()
    if (current === next) return
    if (current && !current.isDisposed()) {
      viewStates.current.set(current.uri.toString(), editor.saveViewState())
    }
    editor.setModel(next)
    const saved = next && viewStates.current.get(next.uri.toString())
    if (saved) editor.restoreViewState(saved)
  }, [activePath, files])

  useEffect(() => {
    monaco.editor.setTheme(themeName(codeTheme, theme))
  }, [codeTheme, theme])

  useEffect(() => {
    editorRef.current?.updateOptions({
      wordWrap: options.wordWrap ? 'on' : 'off',
      lineNumbers: options.lineNumbers ? 'on' : 'off',
      minimap: { enabled: options.minimap }
    })
  }, [options])

  useEffect(() => {
    editorRef.current?.updateOptions(fontOptions(typography, editorScale))
    // Monaco caches glyph widths per font; a new font needs them measured again.
    monaco.editor.remeasureFonts()
  }, [typography, editorScale])

  return (
    <div
      ref={hostRef}
      data-tour={group === 0 ? TOUR.editor : undefined}
      className="h-full min-w-0 flex-1"
    />
  )
}
