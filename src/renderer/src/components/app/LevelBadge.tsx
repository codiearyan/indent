import { Trophy } from 'lucide-react'
import { levelFor } from '@shared/rules'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useProgress } from '@/stores/progress'

/** Trophy with the learner's level; opens the points needed for the next one. */
export function LevelBadge(props: React.ComponentProps<typeof Button>): React.JSX.Element {
  const totalPoints = useProgress((s) => s.progress?.totalPoints ?? 0)
  const { level, into, span } = levelFor(totalPoints)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Level ${level}`}
          className="font-normal text-muted-foreground hover:text-foreground [&_svg]:stroke-[1.5]"
          {...props}
        >
          <Trophy />
          <span className="tabular-nums">Lv {level}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3 rounded-lg">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Level {level}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{totalPoints} points</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-accent">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${(into / span) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {span - into} more points to level {level + 1}. Hard mode pays full points, easy mode
          half.
        </p>
      </PopoverContent>
    </Popover>
  )
}
