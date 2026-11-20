import { useEffect } from 'react'
import { Code, Palette, Sparkles, type LucideIcon } from 'lucide-react'
import {
  CODE_THEMES,
  codePalette,
  type CodePalette,
  type CodeThemeId
} from '@indent/design/code-palette'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AiSettings, AiSwitch } from '@/features/ai/AiMenu'
import { useAi } from '@/features/ai/aiStore'
import { viewTransition } from '@/lib/viewTransition'
import {
  TEXT_SCALE_PRESETS,
  useSettings,
  type Appearance,
  type EditorOption
} from '@/stores/settings'
import { LayoutControls, TextSizeControls, segment, segmented } from './controls'
import { useSettingsDialog, type SettingsSection } from './dialogStore'

const SECTIONS: {
  id: SettingsSection
  label: string
  icon: LucideIcon
  view: () => React.JSX.Element
}[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette, view: AppearanceSection },
  { id: 'editor', label: 'Editor', icon: Code, view: EditorSection },
  { id: 'ai', label: 'AI', icon: Sparkles, view: AiSection }
]

/** Every setting in one window. Opens from the sidebar, the View menu, or with Cmd or Ctrl and comma. */
export function SettingsDialog(): React.JSX.Element {
  const { open, section, setOpen, setSection } = useSettingsDialog()

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== ',' || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      useSettingsDialog.getState().show()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        aria-describedby={undefined}
        className="h-[min(620px,calc(100vh-4rem))] grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[840px]"
      >
        <Tabs
          orientation="vertical"
          value={section}
          onValueChange={(value) => setSection(value as SettingsSection)}
          className="min-h-0 gap-0"
        >
          <div className="flex w-48 shrink-0 flex-col border-r border-rule p-3">
            <DialogTitle className="px-2.5 pt-1.5 pb-3 text-sm font-semibold">Settings</DialogTitle>
            <TabsList
              aria-label="Settings sections"
              className="h-auto w-full items-stretch gap-0.5 bg-transparent p-0"
            >
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="h-8 flex-none gap-2.5 border-0 px-2.5 font-normal text-muted-foreground transition-none hover:bg-accent/60 data-[state=active]:bg-accent! data-[state=active]:text-foreground data-[state=active]:shadow-none!"
                >
                  <Icon strokeWidth={1.5} />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {SECTIONS.map(({ id, label, view: View }) => (
            <TabsContent key={id} value={id} className="min-w-0 overflow-y-auto px-8 pt-6 pb-8">
              <h2 className="text-base font-semibold">{label}</h2>
              <View />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function Group({
  title,
  action,
  children
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="mt-6">
      <header className="flex h-6 items-center justify-between">
        <h3 className="text-[13px] font-medium text-muted-foreground">{title}</h3>
        {action}
      </header>
      <div className="mt-2">{children}</div>
    </section>
  )
}

const card = 'divide-y divide-rule rounded-lg border border-border'

function Row({
  id,
  label,
  hint,
  children
}: {
  id?: string
  label: string
  hint?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-h-14 items-center justify-between gap-6 px-4 py-2.5">
      <div>
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
        {hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' }
]

function AppearanceSection(): React.JSX.Element {
  const appearance = useSettings((s) => s.appearance)
  const setAppearance = useSettings((s) => s.setAppearance)
  const theme = useSettings((s) => s.theme)
  const codeTheme = useSettings((s) => s.codeTheme)
  const setCodeTheme = useSettings((s) => s.setCodeTheme)
  const setAllTextScale = useSettings((s) => s.setAllTextScale)

  return (
    <>
      <Group title="Theme">
        <div className={card}>
          <Row label="App theme" hint="System follows the setting of this computer.">
            <ToggleGroup
              type="single"
              size="sm"
              spacing={1}
              aria-label="App theme"
              className={`w-56 shrink-0 ${segmented}`}
              value={appearance}
              onValueChange={(value) => value && setAppearance(value as Appearance)}
            >
              {APPEARANCES.map(({ value, label }) => (
                <ToggleGroupItem key={value} value={value} className={segment}>
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Row>
        </div>
      </Group>

      <Group title="Code theme">
        <RadioGroup
          aria-label="Code theme"
          value={codeTheme}
          onValueChange={(value) => setCodeTheme(value as CodeThemeId)}
          className="grid-cols-2"
        >
          {CODE_THEMES.map(({ id, label, hint }) => (
            <label
              key={id}
              htmlFor={`code-theme-${id}`}
              className="flex cursor-pointer flex-col gap-2.5 rounded-lg border border-border p-3 hover:border-input has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 has-[[data-state=checked]]:border-foreground"
            >
              <span className="flex items-center gap-2">
                <span className="flex-1 text-sm font-medium">{label}</span>
                <RadioGroupItem
                  id={`code-theme-${id}`}
                  value={id}
                  className="focus-visible:ring-0"
                />
              </span>
              <CodeSample palette={codePalette(id, theme)} />
              <span className="text-[13px] text-muted-foreground">{hint}</span>
            </label>
          ))}
        </RadioGroup>
      </Group>

      <Group
        title="Text size"
        action={
          <Button variant="ghost" size="xs" onClick={() => setAllTextScale(TEXT_SCALE_PRESETS.M)}>
            Reset
          </Button>
        }
      >
        <div className="space-y-3 rounded-lg border border-border px-4 py-3.5">
          <TextSizeControls />
        </div>
      </Group>
    </>
  )
}

/** Three lines that use every colour of a code theme. */
function CodeSample({ palette: p }: { palette: CodePalette }): React.JSX.Element {
  const part = (color: string, text: string): React.JSX.Element => (
    <span style={{ color }}>{text}</span>
  )
  return (
    <pre
      aria-hidden
      className="overflow-hidden rounded-md border border-rule bg-editor px-3 py-2 font-mono text-[11px] leading-5"
      style={{ color: p.foreground }}
    >
      <span className="italic" style={{ color: p.comment }}>
        {'// add up the paid orders\n'}
      </span>
      {part(p.keyword, 'const ')}
      {part(p.variable, 'total')}
      {' = '}
      {part(p.function, 'Sum')}
      {'.of('}
      {part(p.variable, 'orders')}
      {', '}
      {part(p.number, '0')}
      {')\n'}
      {part(p.keyword, 'return ')}
      {part(p.string, "'Total: '")}
      {' + '}
      {part(p.variable, 'total')}
    </pre>
  )
}

const EDITOR_OPTIONS: { option: EditorOption; label: string; hint: string }[] = [
  { option: 'wordWrap', label: 'Word wrap', hint: 'Long lines continue on the next line.' },
  { option: 'lineNumbers', label: 'Line numbers', hint: 'Numbers in the left margin.' },
  { option: 'minimap', label: 'Minimap', hint: 'A small overview of the file on the right.' }
]

function EditorSection(): React.JSX.Element {
  const editor = useSettings((s) => s.editor)
  const setEditorOption = useSettings((s) => s.setEditorOption)
  const resetLayout = useSettings((s) => s.resetLayout)

  return (
    <>
      <Group title="Code editor">
        <div className={card}>
          {EDITOR_OPTIONS.map(({ option, label, hint }) => (
            <Row key={option} id={`editor-${option}`} label={label} hint={hint}>
              <Switch
                id={`editor-${option}`}
                checked={editor[option]}
                onCheckedChange={(on) => setEditorOption(option, on)}
              />
            </Row>
          ))}
        </div>
      </Group>

      <Group
        title="Layout of an issue"
        action={
          <Button variant="ghost" size="xs" onClick={resetLayout}>
            Reset
          </Button>
        }
      >
        <div className="space-y-3 rounded-lg border border-border px-4 py-3.5">
          <LayoutControls browser />
        </div>
      </Group>
    </>
  )
}

function AiSection(): React.JSX.Element {
  const enabled = useAi((s) => s.config?.enabled)
  const load = useAi((s) => s.load)

  // Looks for installed CLIs again, so one installed a minute ago shows up.
  useEffect(() => void load(), [load])

  return (
    <div className="mt-6 flex max-w-[440px] flex-col gap-4">
      <AiSwitch />
      {enabled !== false && <AiSettings />}
      <Separator />
      <Button
        variant="link"
        size="sm"
        className="h-auto self-start p-0 text-xs font-normal text-muted-foreground no-underline hover:text-foreground hover:no-underline"
        onClick={() => {
          useSettingsDialog.getState().setOpen(false)
          viewTransition('onboarding-finish', () => useSettings.getState().setOnboarded(false))
        }}
      >
        Run setup again
      </Button>
    </div>
  )
}
