import { useEffect } from 'react'
import { CalendarClock } from 'lucide-react'
import { practicedOn, sessionLine } from '@shared/reminders'
import type { ProgressState } from '@shared/types'
import { useSettingsDialog } from '@/features/settings/dialogStore'
import { useReminders } from '@/stores/reminders'

/** One quiet line on Home: the next practice session, or an offer to plan one. Opens Settings. */
export function NextSession({
  activity
}: {
  activity: ProgressState['activity']
}): React.JSX.Element | null {
  const config = useReminders((s) => s.config)
  const load = useReminders((s) => s.load)

  useEffect(() => void load(), [load])

  if (!config) return null
  const now = new Date()
  const line = sessionLine(config.schedule, now, practicedOn(activity, now))
  return (
    <button
      type="button"
      className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      onClick={() => useSettingsDialog.getState().show('practice')}
    >
      <CalendarClock className="size-3.5" strokeWidth={1.5} aria-hidden />
      {line ?? 'Plan when to practice'}
    </button>
  )
}
