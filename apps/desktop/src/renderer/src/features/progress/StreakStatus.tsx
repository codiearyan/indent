import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { currentStreak, goalFor, localDate, walkStreak } from '@shared/rules'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useProgress } from '@/stores/progress'
import { freezeLine, todayLine } from './copy'

/** The streak and today's tasks toward the goal, quiet in the workspace top bar. */
export function StreakStatus(): React.JSX.Element | null {
  const progress = useProgress((s) => s.progress)
  if (!progress) return null
  const passed = progress.activity[localDate()]?.tasksPassed ?? 0
  const goal = goalFor(progress)
  const streak = currentStreak(progress.activity)
  const met = passed >= goal
  const line = todayLine(passed, goal, streak)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/year"
          aria-label={`${line} Open Activity.`}
          className={cn(
            'mr-1 flex h-8 shrink-0 items-center gap-2.5 rounded-md px-2 text-[13px] text-muted-foreground tabular-nums outline-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
            met && 'text-foreground'
          )}
        >
          <span className="max-lg:hidden">
            {streak > 0 ? `${streak} day streak` : 'No streak yet'}
          </span>
          <span aria-hidden className="h-3.5 w-px bg-rule max-lg:hidden" />
          <span aria-hidden className="flex gap-[3px]">
            {Array.from({ length: goal }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-3 w-1.5 rounded-[2px] transition-colors duration-(--motion-state)',
                  i < passed ? 'bg-foreground' : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </span>
          {met ? (
            <span className="flex items-center gap-1">
              Goal met
              <Check className="size-3.5" strokeWidth={2} />
            </span>
          ) : (
            <span>
              {passed} of {goal} today
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <p>{line}</p>
        <p className="mt-1 opacity-70">{freezeLine(walkStreak(progress.activity).freezes)}</p>
      </TooltipContent>
    </Tooltip>
  )
}
