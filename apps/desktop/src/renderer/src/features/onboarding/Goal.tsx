import { useEffect } from 'react'
import { RadioGroup } from '@/components/ui/radio-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { segment, segmented } from '@/features/settings/controls'
import { useCatalog } from '@/stores/catalog'
import { useSettings, type Experience } from '@/stores/settings'
import { ChoiceCard } from './ChoiceCard'
import { StepLayout } from './StepLayout'

const NOT_SURE = 'not-sure'

const EXPERIENCE: { value: Experience; label: string }[] = [
  { value: 'new', label: 'New to it' },
  { value: 'some', label: 'Some' },
  { value: 'experienced', label: 'A lot' }
]

export function Goal({ staged }: { staged: boolean }): React.JSX.Element {
  const paths = useCatalog((s) => s.paths)
  const load = useCatalog((s) => s.load)
  const goal = useSettings((s) => s.goal)
  const experience = useSettings((s) => s.experience)
  const setGoal = useSettings((s) => s.setGoal)
  const setExperience = useSettings((s) => s.setExperience)

  useEffect(() => void load(), [load])

  return (
    <StepLayout
      wide
      staged={staged}
      title="What do you want to get better at"
      lead="Home suggests your next repo from this. You can pick another roadmap any time."
    >
      <RadioGroup
        aria-label="Goal"
        value={goal ?? NOT_SURE}
        onValueChange={(value) => setGoal(value === NOT_SURE ? null : value)}
        className="grid-cols-3 gap-3"
      >
        {paths?.map((path) => (
          <ChoiceCard key={path.id} value={path.id} title={path.title}>
            <p className="text-[13px] leading-5 text-muted-foreground">{path.tagline}</p>
          </ChoiceCard>
        ))}
        <ChoiceCard value={NOT_SURE} title="Not sure yet">
          <p className="text-[13px] leading-5 text-muted-foreground">
            Start with the basics and look around.
          </p>
        </ChoiceCard>
      </RadioGroup>

      <div className="mt-6 flex items-center justify-between gap-6">
        <p className="text-sm">How much code have you written?</p>
        <ToggleGroup
          type="single"
          size="sm"
          spacing={1}
          aria-label="How much code have you written"
          className={`w-72 shrink-0 ${segmented}`}
          value={experience ?? ''}
          onValueChange={(value) => value && setExperience(value as Experience)}
        >
          {EXPERIENCE.map(({ value, label }) => (
            <ToggleGroupItem key={value} value={value} className={segment}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </StepLayout>
  )
}
