import { ALargeSmall } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_PRESETS,
  useSettings,
  type TextZone
} from '@/stores/settings'
import { TOUR } from '@/features/tour/anchors'
import { IconButton } from './IconButton'

const ZONES: { zone: TextZone; label: string }[] = [
  { zone: 'lesson', label: 'Lesson' },
  { zone: 'tasks', label: 'Tasks' },
  { zone: 'editor', label: 'Code editor' },
  { zone: 'terminal', label: 'Terminal' }
]

type Preset = keyof typeof TEXT_SCALE_PRESETS

export function TextSizePopover(): React.JSX.Element {
  const textScale = useSettings((s) => s.textScale)
  const setTextScale = useSettings((s) => s.setTextScale)
  const setAllTextScale = useSettings((s) => s.setAllTextScale)

  const values = Object.values(textScale)
  const preset =
    (Object.keys(TEXT_SCALE_PRESETS) as Preset[]).find((key) =>
      values.every((v) => v === TEXT_SCALE_PRESETS[key])
    ) ?? ''

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton label="Text size" data-tour={TOUR.textSize}>
          <ALargeSmall />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Text size</span>
          <Button variant="ghost" size="xs" onClick={() => setAllTextScale(TEXT_SCALE_PRESETS.M)}>
            Reset
          </Button>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="w-full"
          value={preset}
          onValueChange={(key) => key && setAllTextScale(TEXT_SCALE_PRESETS[key as Preset])}
        >
          {(Object.keys(TEXT_SCALE_PRESETS) as Preset[]).map((key) => (
            <ToggleGroupItem key={key} value={key} className="flex-1" aria-label={`Size ${key}`}>
              {key}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="space-y-3">
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
        </div>
        <p className="border-t pt-3 text-xs text-muted-foreground">Saved on this device</p>
      </PopoverContent>
    </Popover>
  )
}
