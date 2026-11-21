import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DAY_NAMES, WEEK, WEEKDAYS, WEEKEND, describeSchedule } from '@shared/reminders'
import type {
  PracticeSchedule,
  ReminderConfig,
  ReminderMethod,
  ReminderTestResult,
  Weekday
} from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { useReminders } from '@/stores/reminders'
import { Group, Row, card, segment, segmented } from './controls'

const QUICK_PICKS: { label: string; days: Weekday[] }[] = [
  { label: 'Every day', days: WEEK },
  { label: 'Weekdays', days: WEEKDAYS },
  { label: 'Weekends', days: WEEKEND }
]

const LENGTHS = [15, 20, 30, 45, 60]

// Written like the rest of the copy, which a native time field would not do on a 12 hour system.
const TIMES = Array.from({ length: 96 }, (_, i) =>
  [Math.floor(i / 4), (i % 4) * 15].map((n) => String(n).padStart(2, '0')).join(':')
)

const METHODS: { method: ReminderMethod; label: string }[] = [
  { method: 'app', label: 'Notification' },
  { method: 'calendar', label: 'Calendar' },
  { method: 'both', label: 'Both' }
]

const isMac = window.platform === 'darwin'
const trayName = isMac ? 'menu bar' : 'tray'

/** Where to allow notifications for the app, per system. */
const ALLOW_NOTIFICATIONS: Record<string, string> = {
  darwin: 'Open System Settings, then Notifications, and allow Indent.',
  win32: 'Open Settings, then System, then Notifications, and allow Indent.',
  linux: 'Check that your desktop allows notifications for Indent.'
}

/** When to practice, how to be reminded, and what keeps the app around to remind. */
export function PracticeSection(): React.JSX.Element {
  const config = useReminders((s) => s.config)
  const load = useReminders((s) => s.load)

  useEffect(() => void load(), [load])

  if (!config) return <p className="mt-3 text-sm text-muted-foreground">Loading.</p>
  return (
    <>
      <p className="mt-3 text-sm">
        Pick the days you want to practice. At that time Indent reminds you where you left off.
      </p>
      <Schedule schedule={config.schedule} />
      <KeepRunning config={config} />
    </>
  )
}

function Schedule({ schedule }: { schedule: PracticeSchedule }): React.JSX.Element {
  const update = (change: Partial<PracticeSchedule>): void =>
    void useReminders.getState().set({ schedule: { ...schedule, ...change } })
  const summary = describeSchedule(schedule)
  const notifies = schedule.method !== 'calendar'
  const calendar = schedule.method !== 'app'

  return (
    <Group
      title="Schedule"
      action={
        <div className="flex gap-1">
          {QUICK_PICKS.map(({ label, days }) => (
            <Button
              key={label}
              variant="ghost"
              size="xs"
              className="font-normal text-muted-foreground hover:text-foreground"
              onClick={() => update({ days })}
            >
              {label}
            </Button>
          ))}
        </div>
      }
    >
      <div className={card}>
        <Row label="Days">
          <ToggleGroup
            type="multiple"
            size="sm"
            spacing={1}
            aria-label="Practice days"
            className={`w-80 ${segmented}`}
            value={schedule.days.map(String)}
            onValueChange={(days) => update({ days: days.map(Number) as Weekday[] })}
          >
            {WEEK.map((day) => (
              <ToggleGroupItem
                key={day}
                value={String(day)}
                aria-label={DAY_NAMES[day]}
                className={segment}
              >
                {DAY_NAMES[day].slice(0, 3)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Row>
        <Row id="practice-time" label="Time">
          <Select value={schedule.time} onValueChange={(time) => update({ time })}>
            <SelectTrigger id="practice-time" className="w-32 tabular-nums">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {(TIMES.includes(schedule.time) ? TIMES : [schedule.time, ...TIMES]).map((time) => (
                <SelectItem key={time} value={time} className="tabular-nums">
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row
          id="practice-length"
          label="Length"
          hint="Optional. Used in the reminder and the calendar event."
        >
          <Select
            value={String(schedule.minutes ?? 'none')}
            onValueChange={(value) => update({ minutes: value === 'none' ? null : Number(value) })}
          >
            <SelectTrigger id="practice-length" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No length</SelectItem>
              {LENGTHS.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {minutes} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Remind me with" hint="A calendar reminder comes even when Indent is closed.">
          <ToggleGroup
            type="single"
            size="sm"
            spacing={1}
            aria-label="Remind me with"
            className={`w-72 ${segmented}`}
            value={schedule.method}
            onValueChange={(method) => method && update({ method: method as ReminderMethod })}
          >
            {METHODS.map(({ method, label }) => (
              <ToggleGroupItem key={method} value={method} className={segment}>
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Row>
      </div>
      <p className="mt-3 text-sm" aria-live="polite">
        {summary ?? <span className="text-muted-foreground">No days picked, so no reminders.</span>}
      </p>
      {summary && <Actions notifies={notifies} calendar={calendar} />}
    </Group>
  )
}

/** Try the reminder now, and save the calendar event. */
function Actions({
  notifies,
  calendar
}: {
  notifies: boolean
  calendar: boolean
}): React.JSX.Element {
  const [result, setResult] = useState<ReminderTestResult | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true)
    try {
      await action()
    } catch (failure) {
      toast.error(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  const test = (): Promise<void> => run(async () => setResult(await api.reminders.test()))

  const save = (): Promise<void> =>
    run(async () => {
      const file = await api.reminders.saveCalendar()
      if (file) {
        toast.success('Saved. Open the file to add it to your calendar.', { description: file })
      }
    })

  return (
    <>
      <div className="mt-3 flex gap-2">
        {notifies && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void test()}>
            Send a test reminder
          </Button>
        )}
        {calendar && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void save()}>
            Add to calendar
          </Button>
        )}
      </div>
      {result && notifies && (
        <p className="mt-2 text-[13px] text-muted-foreground" role="status">
          {result.ok
            ? 'Sent. Clicking it opens your last issue.'
            : result.reason === 'unsupported'
              ? 'This system cannot show notifications. Use the calendar instead.'
              : `Indent could not show it. ${ALLOW_NOTIFICATIONS[window.platform] ?? ALLOW_NOTIFICATIONS.linux}`}
        </p>
      )}
    </>
  )
}

function KeepRunning({ config }: { config: ReminderConfig }): React.JSX.Element {
  const set = useReminders((s) => s.set)
  const loginHint =
    config.tray || isMac
      ? 'Indent starts in the background when you log in, so you never have to open it for a reminder.'
      : `Indent opens when you log in. With the ${trayName} on, it starts in the background.`

  return (
    <Group title="When the window is closed">
      <p className="mb-3 text-[13px] text-muted-foreground">
        A notification can only come while Indent is running.
      </p>
      <div className={card}>
        <Row
          id="reminders-tray"
          label={`Keep running in the ${trayName}`}
          hint={
            window.platform === 'linux'
              ? 'Closing the window leaves Indent running, with an icon in the tray where your desktop has one.'
              : `Closing the window leaves Indent in the ${trayName}, ready to remind you. Quit it from there.`
          }
        >
          <Switch
            id="reminders-tray"
            checked={config.tray}
            onCheckedChange={(tray) => void set({ tray })}
          />
        </Row>
        <Row
          id="reminders-login"
          label="Open at login"
          hint={
            config.loginNeedsApproval
              ? 'Allow Indent in System Settings, then General, then Login Items.'
              : loginHint
          }
        >
          <Switch
            id="reminders-login"
            checked={config.openAtLogin}
            onCheckedChange={(openAtLogin) => void set({ openAtLogin })}
          />
        </Row>
      </div>
    </Group>
  )
}
