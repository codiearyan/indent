import { CODE_THEMES, codePalette, type CodeThemeId } from '@indent/design/code-palette'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CodeSample } from '@/features/settings/CodeSample'
import { card, Row, segment, segmented, TextSizePresets } from '@/features/settings/controls'
import { useSettings } from '@/stores/settings'
import { StepLayout } from './StepLayout'

export function Editor({ staged }: { staged: boolean }): React.JSX.Element {
  const theme = useSettings((s) => s.theme)
  const codeTheme = useSettings((s) => s.codeTheme)
  const setCodeTheme = useSettings((s) => s.setCodeTheme)
  const scale = useSettings((s) => s.textScale.editor)
  const vim = useSettings((s) => s.editor.vim)
  const setEditorOption = useSettings((s) => s.setEditorOption)

  return (
    <StepLayout
      wide
      staged={staged}
      title="Set up your editor"
      lead="This is where you write code. All of it can be changed later in Settings."
    >
      <div className="grid grid-cols-2 items-start gap-6">
        <div className={card}>
          <Row label="Code theme">
            <ToggleGroup
              type="single"
              size="sm"
              spacing={1}
              aria-label="Code theme"
              className={`w-64 shrink-0 ${segmented}`}
              value={codeTheme}
              onValueChange={(id) => id && setCodeTheme(id as CodeThemeId)}
            >
              {CODE_THEMES.map(({ id, label }) => (
                <ToggleGroupItem key={id} value={id} className={segment}>
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Row>
          <Row label="Text size">
            <div className="w-40 shrink-0">
              <TextSizePresets />
            </div>
          </Row>
          <Row id="setup-vim" label="Vim mode" hint="Normal, Insert and Visual mode in the editor.">
            <Switch
              id="setup-vim"
              checked={vim}
              onCheckedChange={(on) => setEditorOption('vim', on)}
            />
          </Row>
        </div>

        <div aria-hidden className="overflow-hidden rounded-lg border border-border bg-editor">
          <div className="flex h-9 items-center border-b border-rule px-3 font-mono text-xs">
            <span className="rounded-sm bg-accent px-2 py-0.5">report.js</span>
          </div>
          <CodeSample
            palette={codePalette(codeTheme, theme)}
            className="rounded-none border-0 px-4 py-4 leading-[1.7]"
            style={{ fontSize: Math.round(13 * scale) }}
          />
          {vim && <div className="ob-swap vim-status">--NORMAL--</div>}
        </div>
      </div>
    </StepLayout>
  )
}
