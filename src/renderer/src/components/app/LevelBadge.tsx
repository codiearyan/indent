import { Trophy } from 'lucide-react'
import { levelFor } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { useProgress } from '@/stores/progress'

/** Trophy with the learner's level; opens the points needed for the next one. */
export function LevelBadge(props: React.ComponentProps<typeof Button>): React.JSX.Element {
  const totalPoints = useProgress((s) => s.progress?.totalPoints ?? 0)
  const { level, into, span } = levelFor(totalPoints)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Level ${level}`} {...props}>
          <Trophy />
          <span className="tabular-nums">Lv {level}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Level {level}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{totalPoints} points</span>
        </div>
        <Progress value={(into / span) * 100} className="h-1.5" />
        <p className="text-xs text-muted-foreground">
          {span - into} more points to level {level + 1}. Hard mode pays full points, easy mode
          half.
        </p>
      </PopoverContent>
    </Popover>
  )
}
