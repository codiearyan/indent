import { useState } from 'react'
import { CircleHelp, PanelLeft, PanelRight, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TOUR } from '@/features/tour/anchors'
import { cn } from '@/lib/utils'
import {
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_PRESETS,
  useSettings,
  type PanelKey,
  type TextZone
} from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { IconButton } from './IconButton'
import { ResetDialog } from './ResetDialog'

const ZONES: { zone: TextZone; label: string }[] = [
  { zone: 'lesson', label: 'Lesson' },
  { zone: 'tasks', label: 'Tasks' },
  { zone: 'editor', label: 'Code editor' },
  { zone: 'terminal', label: 'Terminal' }
]

const SWITCHES: { key: PanelKey; label: string }[] = [
  { key: 'files', label: 'File list' },
  { key: 'terminal', label: 'Terminal' },
  { key: 'zen', label: 'Focus mode' }
]

type Preset = keyof typeof TEXT_SCALE_PRESETS

const segment =
  'h-7 flex-1 rounded-sm font-normal text-muted-foreground data-[state=on]:font-medium data-[state=on]:text-foreground'
const section = 'space-y-3 border-t border-rule px-4 py-3 first:border-t-0'
const row =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:stroke-[1.5]'

function SectionTitle(props: {
  children: React.ReactNode
  action?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex h-6 items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{props.children}</span>
      {props.action}
    </div>
  )
}

export function ViewPopover(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const settings = useSettings()
  const ready = useWorkspace((s) => s.status === 'ready')
  const setTourOpen = useWorkspace((s) => s.setTourOpen)

  const values = Object.values(settings.textScale)
  const preset =
    (Object.keys(TEXT_SCALE_PRESETS) as Preset[]).find((key) =>
      values.every((v) => v === TEXT_SCALE_PRESETS[key])
    ) ?? ''

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <IconButton label="View" pressed={open} data-tour={TOUR.view}>
            <SlidersHorizontal />
          </IconButton>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 rounded-lg p-0">
          <div className={section}>
            <SectionTitle
              action={
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => settings.setAllTextScale(TEXT_SCALE_PRESETS.M)}
                >
                  Reset
                </Button>
              }
            >
              Text size
            </SectionTitle>
            <ToggleGroup
              type="single"
              size="sm"
              spacing={1}
              className="w-full rounded-md border border-input p-0.5"
              value={preset}
              onValueChange={(key) =>
                key && settings.setAllTextScale(TEXT_SCALE_PRESETS[key as Preset])
              }
            >
              {(Object.keys(TEXT_SCALE_PRESETS) as Preset[]).map((key) => (
                <ToggleGroupItem
                  key={key}
                  value={key}
                  className={segment}
                  aria-label={`Size ${key}`}
                >
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
                  value={[settings.textScale[zone]]}
                  onValueChange={([value]) => settings.setTextScale(zone, value)}
                />
                <span className="text-right text-xs text-muted-foreground tabular-nums">
                  {Math.round(settings.textScale[zone] * 100)}%
                </span>
              </div>
            ))}
          </div>

          <div className={section}>
            <SectionTitle
              action={
                <Button variant="ghost" size="xs" onClick={settings.resetLayout}>
                  Reset
                </Button>
              }
            >
              Layout
            </SectionTitle>
            <div className="flex items-center justify-between gap-3 text-sm">
              Lesson side
              <ToggleGroup
                type="single"
                size="sm"
                spacing={1}
                className="w-40 rounded-md border border-input p-0.5"
                value={settings.lessonSide}
                onValueChange={(side) => side && settings.setLessonSide(side as 'left' | 'right')}
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
            {SWITCHES.map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between text-sm">
                {label}
                <Switch
                  checked={settings.panels[key]}
                  onCheckedChange={(on) => settings.setPanel(key, on)}
                />
              </label>
            ))}
          </div>

          <div className={section}>
            <label className="flex items-center justify-between text-sm">
              Dark theme
              <Switch checked={settings.theme === 'dark'} onCheckedChange={settings.toggleTheme} />
            </label>
          </div>

          <div className="space-y-0.5 border-t border-rule p-2">
            <button
              type="button"
              className={row}
              onClick={() => {
                setOpen(false)
                setTourOpen(true)
              }}
            >
              <CircleHelp />
              Take the tour
            </button>
            <button
              type="button"
              disabled={!ready}
              className={cn(row, 'text-destructive')}
              onClick={() => {
                setOpen(false)
                setResetOpen(true)
              }}
            >
              <RotateCcw />
              Reset chapter files
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} />
    </>
  )
}
