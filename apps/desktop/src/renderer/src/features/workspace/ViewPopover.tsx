import { useState } from 'react'
import { RotateCcw, Settings, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { LayoutControls, TextSizeControls } from '@/features/settings/controls'
import { useSettingsDialog } from '@/features/settings/dialogStore'
import { TOUR } from '@/features/tour/anchors'
import { cn } from '@/lib/utils'
import { TEXT_SCALE_PRESETS, useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { IconButton } from './IconButton'
import { ResetDialog } from './ResetDialog'

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
  const hasPage = useWorkspace((s) => Boolean(s.chapter?.preview))

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
            <TextSizeControls />
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
            <LayoutControls browser={hasPage} />
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
                useSettingsDialog.getState().show()
              }}
            >
              <Settings />
              All settings
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
              Reset issue files
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} />
    </>
  )
}
