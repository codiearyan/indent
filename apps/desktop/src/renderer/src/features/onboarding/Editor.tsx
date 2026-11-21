import { Switch } from '@/components/ui/switch'
import { CodeThemeCards } from '@/features/settings/CodeSample'
import { IdeSelect } from '@/features/settings/IdeRow'
import { TextSizePresets } from '@/features/settings/controls'
import { EditorSample, TerminalSample } from '@/features/settings/Typography'
import { useIde } from '@/stores/ides'
import { useSettings } from '@/stores/settings'
import { StepLayout } from './StepLayout'

const cell = 'flex h-12 min-w-0 items-center justify-between gap-4 px-4'

export function Editor({ staged }: { staged: boolean }): React.JSX.Element {
  const typography = useSettings((s) => s.typography)
  const scale = useSettings((s) => s.textScale.editor)
  const vim = useSettings((s) => s.editor.vim)
  const setEditorOption = useSettings((s) => s.setEditorOption)
  const ide = useIde()
  // The samples follow the text size, as the editor and the terminal do.
  const t = { ...typography, monoSize: Math.round(typography.monoSize * scale) }

  return (
    <StepLayout
      className="max-w-[1040px]"
      staged={staged}
      title="Set up your editor"
      lead="This is where you write code. All of it can be changed later in Settings."
    >
      <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start gap-6">
        <CodeThemeCards />
        <div className="flex min-w-0 flex-col gap-2">
          <EditorSample t={t}>
            {vim && <div className="ob-swap vim-status">--NORMAL--</div>}
          </EditorSample>
          <TerminalSample t={t} compact />
        </div>
      </div>

      <div className="mt-3 grid auto-cols-fr grid-flow-col divide-x divide-rule rounded-lg border border-border">
        <div className={cell}>
          <span className="text-sm">Text size</span>
          <div className="w-40 shrink-0">
            <TextSizePresets />
          </div>
        </div>
        <div className={cell}>
          <label htmlFor="setup-vim" className="text-sm">
            Vim mode
          </label>
          <Switch
            id="setup-vim"
            checked={vim}
            onCheckedChange={(on) => setEditorOption('vim', on)}
          />
        </div>
        {ide && (
          <div className={cell}>
            <label htmlFor="setup-ide" className="text-sm">
              Open issues in
            </label>
            <IdeSelect id="setup-ide" />
          </div>
        )}
      </div>
    </StepLayout>
  )
}
