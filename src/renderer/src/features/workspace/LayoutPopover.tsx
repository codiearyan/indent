import { PanelLeft, PanelRight, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useSettings, type PanelKey } from '@/stores/settings'
import { IconButton } from './IconButton'

const SWITCHES: { key: PanelKey; label: string }[] = [
  { key: 'files', label: 'File list' },
  { key: 'terminal', label: 'Terminal' },
  { key: 'chat', label: 'Chat' },
  { key: 'zen', label: 'Focus mode' }
]

export function LayoutPopover(): React.JSX.Element {
  const panels = useSettings((s) => s.panels)
  const setPanel = useSettings((s) => s.setPanel)
  const lessonSide = useSettings((s) => s.lessonSide)
  const setLessonSide = useSettings((s) => s.setLessonSide)
  const resetLayout = useSettings((s) => s.resetLayout)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton label="Layout">
          <SlidersHorizontal />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-4">
        <div className="space-y-2">
          <span className="text-sm font-medium">Lesson side</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            className="w-full"
            value={lessonSide}
            onValueChange={(side) => side && setLessonSide(side as 'left' | 'right')}
          >
            <ToggleGroupItem value="left" className="flex-1">
              <PanelLeft />
              Left
            </ToggleGroupItem>
            <ToggleGroupItem value="right" className="flex-1">
              <PanelRight />
              Right
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-3">
          {SWITCHES.map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between text-sm">
              {label}
              <Switch checked={panels[key]} onCheckedChange={(on) => setPanel(key, on)} />
            </label>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={resetLayout}>
          Reset layout
        </Button>
      </PopoverContent>
    </Popover>
  )
}
