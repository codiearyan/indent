import type * as Monaco from 'monaco-editor'
import type { CheckResult, TaskDef, TaskProgress } from '@shared/types'
import { chapterKey } from '@shared/rules'
import { monacoKeys } from '@/lib/shortcuts'
import { useProgress } from '@/stores/progress'
import { useWorkspace } from '@/stores/workspace'
import { bindShortcuts } from '@/features/editor/shortcutBindings'
import { useAi } from './aiStore'
import { checkAttachment, codeAttachment, taskForFile, terminalAttachment } from './attachments'
import { useChat } from './chatStore'

function chapterTasks(): Record<string, TaskProgress> {
  const chapter = useWorkspace.getState().chapter
  if (!chapter) return {}
  return (
    useProgress.getState().progress?.chapters[chapterKey(chapter.labId, chapter.id)]?.tasks ?? {}
  )
}

/** The selection, or the line under the cursor when nothing is selected. */
function selectedCode(
  editor: Monaco.editor.ICodeEditor
): { path: string; code: string; start: number; end: number } | null {
  const model = editor.getModel()
  const selection = editor.getSelection()
  if (!model || !selection) return null
  const path = model.uri.path.slice(1)
  if (selection.isEmpty()) {
    const line = selection.startLineNumber
    const code = model.getLineContent(line)
    return code.trim() ? { path, code, start: line, end: line } : null
  }
  // A selection that ends at column 1 does not include that last line.
  const end =
    selection.endColumn === 1 && selection.endLineNumber > selection.startLineNumber
      ? selection.endLineNumber - 1
      : selection.endLineNumber
  const code = model.getValueInRange(selection)
  return code.trim() ? { path, code, start: selection.startLineNumber, end } : null
}

/** Asks the tutor about the selected code, with the code attached. */
export function askAboutSelection(editor: Monaco.editor.ICodeEditor, question: string): void {
  const picked = selectedCode(editor)
  const chapter = useWorkspace.getState().chapter
  if (!picked || !chapter) return
  const task = taskForFile(chapter.tasks, chapterTasks(), picked.path)
  useChat.getState().ask(question, {
    attachment: codeAttachment(picked.path, picked.code, picked.start, picked.end),
    focus: task ? { task: task.number } : undefined
  })
}

const explain = (editor: Monaco.editor.ICodeEditor): void =>
  askAboutSelection(editor, 'Explain this code.')

/** The failing task of the file the selection is in, when there is one. */
function failingTaskFor(editor: Monaco.editor.ICodeEditor): ReturnType<typeof taskForFile> {
  const picked = selectedCode(editor)
  const chapter = useWorkspace.getState().chapter
  if (!picked || !chapter) return null
  return taskForFile(chapter.tasks, chapterTasks(), picked.path, true)
}

export const selectionHasFailure = (editor: Monaco.editor.ICodeEditor): boolean =>
  !!failingTaskFor(editor)

export function whyFails(editor: Monaco.editor.ICodeEditor): void {
  const picked = selectedCode(editor)
  const task = failingTaskFor(editor)
  if (!picked || !task) return
  const failing = chapterTasks()[task.task.id]?.lastResult?.details.find((d) => !d.passed)
  useChat.getState().ask(`Why does this fail task ${task.number}, "${task.task.title}"?`, {
    attachment: codeAttachment(picked.path, picked.code, picked.start, picked.end),
    focus: { task: task.number, check: failing?.name }
  })
}

/** Asks why a task's last check failed, with its first failing check attached. */
export function askWhyTaskFailed(task: TaskDef, number: number, result: CheckResult): void {
  const [check, ...others] = result.details.filter((d) => !d.passed)
  const more = others.length > 0 ? ` Also failing: ${others.map((d) => d.name).join('; ')}.` : ''
  useChat.getState().ask(`Why did task ${number}, "${task.title}", fail?${more}`, {
    attachment: check && checkAttachment(check),
    focus: { task: number, check: check?.name }
  })
}

/** Asks about output the learner selected in the terminal. */
export function askAboutOutput(output: string, question: string): void {
  if (!output.trim()) return
  useChat.getState().ask(question, { attachment: terminalAttachment(output) })
}

/** Adds "Explain this" and "Why does this fail?" to the editor's menu while the tutor is on. */
export function bindTutorActions(
  monaco: typeof Monaco,
  editor: Monaco.editor.IStandaloneCodeEditor
): void {
  const tutorOn = editor.createContextKey<boolean>('tutorOn', false)
  const hasFailure = editor.createContextKey<boolean>('tutorHasFailure', false)
  const sync = (): void => {
    const { config } = useAi.getState()
    tutorOn.set(!!config?.enabled && !!config.provider)
    hasFailure.set(Object.values(chapterTasks()).some((t) => t.lastResult?.passed === false))
  }
  sync()
  editor.onDidDispose(useAi.subscribe(sync))
  editor.onDidDispose(useProgress.subscribe(sync))
  editor.onDidDispose(
    useWorkspace.subscribe((s, previous) => s.chapter !== previous.chapter && sync())
  )

  bindShortcuts(editor, () => [
    editor.addAction({
      id: 'indent.tutor.explain',
      label: 'Explain this',
      precondition: 'tutorOn',
      keybindings: monacoKeys('explainCode', monaco),
      contextMenuGroupId: 'tutor',
      contextMenuOrder: 1,
      run: explain
    })
  ])
  editor.addAction({
    id: 'indent.tutor.whyFails',
    label: 'Why does this fail?',
    precondition: 'tutorOn && tutorHasFailure',
    contextMenuGroupId: 'tutor',
    contextMenuOrder: 2,
    run: whyFails
  })
}
