import { toast } from 'sonner'
import { DAILY_GOALS, DAYS_PER_FREEZE, MAX_FREEZES, goalFor, walkStreak } from '@shared/rules'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { useProgress } from '@/stores/progress'
import { plural } from '@/features/progress/copy'
import { Group, Row, card, segment, segmented } from './controls'

/** The daily goal that keeps the streak, and the freezes that protect it. */
export function GoalSection(): React.JSX.Element {
  const progress = useProgress((s) => s.progress)
  const goal = progress ? goalFor(progress) : DAILY_GOALS[0]
  const freezes = progress ? walkStreak(progress.activity).freezes : 0

  const choose = async (value: string): Promise<void> => {
    if (!value) return
    try {
      useProgress.getState().set(await api.progress.setDailyGoal(Number(value)))
    } catch (failure) {
      toast.error(errorMessage(failure))
    }
  }

  return (
    <>
      <Group title="Daily goal">
        <div className={card}>
          <Row
            label="Tasks a day"
            hint="A day counts toward your streak when you pass this many tasks. A new goal starts today; past days keep theirs."
          >
            <ToggleGroup
              type="single"
              size="sm"
              spacing={1}
              aria-label="Tasks a day"
              className={`w-36 shrink-0 ${segmented}`}
              value={String(goal)}
              onValueChange={(value) => void choose(value)}
            >
              {DAILY_GOALS.map((option) => (
                <ToggleGroupItem
                  key={option}
                  value={String(option)}
                  className={segment}
                  aria-label={plural(option, 'task')}
                >
                  {option}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Row>
        </div>
      </Group>
      <Group title="Streak freezes">
        <div className={card}>
          <Row
            label="Freezes held"
            hint={`Every ${DAYS_PER_FREEZE} days of a streak earn one, up to ${MAX_FREEZES}. A freeze covers a missed day by itself, so the streak goes on.`}
          >
            <span className="text-2xl leading-8 tabular-nums">{freezes}</span>
          </Row>
        </div>
      </Group>
    </>
  )
}
