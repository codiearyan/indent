import { PanelLeft, PanelRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_PRESETS,
  useSettings,
  type PanelKey,
  type TextZone
} from '@/stores/settings'

const ZONES: { zone: TextZone; label: string }[] = [
  { zone: 'lesson', label: 'Lesson' },
  { zone: 'tasks', label: 'Tasks' },
  { zone: 'editor', label: 'Code editor' },
  { zone: 'terminal', label: 'Terminal' }
]

const PANELS: { key: PanelKey; label: string }[] = [
  { key: 'files', label: 'File list' },
  { key: 'terminal', label: 'Terminal' },
  { key: 'zen', label: 'Focus mode' }
]

type Preset = keyof typeof TEXT_SCALE_PRESETS

/** One option of a segmented control: a ToggleGroup with `segmented` on it. */
export const segment =
  'h-7 flex-1 rounded-sm font-normal text-muted-foreground data-[state=on]:font-medium data-[state=on]:text-foreground'
export const segmented = 'rounded-md border border-input p-0.5'

/** The size presets: one size for every kind of text. */
export function TextSizePresets(): React.JSX.Element {
  const textScale = useSettings((s) => s.textScale)
  const setAllTextScale = useSettings((s) => s.setAllTextScale)
  const values = Object.values(textScale)
  const preset =
    (Object.keys(TEXT_SCALE_PRESETS) as Preset[]).find((key) =>
      values.every((v) => v === TEXT_SCALE_PRESETS[key])
    ) ?? ''

  return (
    <ToggleGroup
      type="single"
      size="sm"
      spacing={1}
      className={`w-full ${segmented}`}
      value={preset}
      onValueChange={(key) => key && setAllTextScale(TEXT_SCALE_PRESETS[key as Preset])}
    >
      {(Object.keys(TEXT_SCALE_PRESETS) as Preset[]).map((key) => (
        <ToggleGroupItem key={key} value={key} className={segment} aria-label={`Size ${key}`}>
          {key}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** The size presets and one slider per kind of text. Shared by the View menu and Settings. */
export function TextSizeControls(): React.JSX.Element {
  const textScale = useSettings((s) => s.textScale)
  const setTextScale = useSettings((s) => s.setTextScale)

  return (
    <>
      <TextSizePresets />
      {ZONES.map(({ zone, label }) => (
        <div key={zone} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm">
          <span>{label}</span>
          <Slider
            aria-label={`${label} text size`}
            min={TEXT_SCALE_MIN}
            max={TEXT_SCALE_MAX}
            step={0.05}
            value={[textScale[zone]]}
            onValueChange={([value]) => setTextScale(zone, value)}
          />
          <span className="text-right text-xs text-muted-foreground tabular-nums">
            {Math.round(textScale[zone] * 100)}%
          </span>
        </div>
      ))}
    </>
  )
}

/** Where the lesson sits and which panels show. `browser` adds the Browser panel's switch. */
export function LayoutControls({ browser }: { browser: boolean }): React.JSX.Element {
  const panels = useSettings((s) => s.panels)
  const setPanel = useSettings((s) => s.setPanel)
  const lessonSide = useSettings((s) => s.lessonSide)
  const setLessonSide = useSettings((s) => s.setLessonSide)
  const switches = browser ? [...PANELS, { key: 'browser' as const, label: 'Browser' }] : PANELS

  return (
    <>
      <div className="flex items-center justify-between gap-3 text-sm">
        Lesson side
        <ToggleGroup
          type="single"
          size="sm"
          spacing={1}
          className={`w-40 ${segmented}`}
          value={lessonSide}
          onValueChange={(side) => side && setLessonSide(side as 'left' | 'right')}
        >
          <ToggleGroupItem value="left" className={segment}>
            <PanelLeft />
            Left
          </ToggleGroupItem>
          <ToggleGroupItem value="right" className={segment}>
            <PanelRight />
            Right
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {switches.map(({ key, label }) => (
        <label key={key} className="flex items-center justify-between text-sm">
          {label}
          <Switch checked={panels[key]} onCheckedChange={(on) => setPanel(key, on)} />
        </label>
      ))}
    </>
  )
}

/** A titled block of one settings section. */
export function Group({
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

export const card = 'divide-y divide-rule rounded-lg border border-border'

/** `onReset` shows a reset button next to the label; pass it only while the value differs. */
export function Row({
  id,
  label,
  hint,
  onReset,
  children
}: {
  id?: string
  label: string
  hint?: React.ReactNode
  onReset?: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-h-14 items-center justify-between gap-6 px-4 py-2.5">
      <div>
        <div className="flex h-6 items-center gap-1">
          <label htmlFor={id} className="text-sm">
            {label}
          </label>
          {onReset && <ResetButton onClick={onReset} />}
        </div>
        {hint && <div className="text-[13px] text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function ResetButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Reset to default"
          className="text-muted-foreground hover:text-foreground"
          onClick={onClick}
        >
          <RotateCcw />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Reset to default</TooltipContent>
    </Tooltip>
  )
}
