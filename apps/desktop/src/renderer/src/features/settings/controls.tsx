import { PanelLeft, PanelRight } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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

/** The size presets and one slider per kind of text. Shared by the View menu and Settings. */
export function TextSizeControls(): React.JSX.Element {
  const textScale = useSettings((s) => s.textScale)
  const setTextScale = useSettings((s) => s.setTextScale)
  const setAllTextScale = useSettings((s) => s.setAllTextScale)
  const values = Object.values(textScale)
  const preset =
    (Object.keys(TEXT_SCALE_PRESETS) as Preset[]).find((key) =>
      values.every((v) => v === TEXT_SCALE_PRESETS[key])
    ) ?? ''

  return (
    <>
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
