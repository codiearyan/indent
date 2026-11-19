import { BookOpen, Sparkles } from 'lucide-react'
import { RadioGroup } from '@/components/ui/radio-group'
import { useAi } from '@/features/ai/aiStore'
import { ChoiceCard } from './ChoiceCard'
import { StepLayout } from './StepLayout'

export function AiChoice({ staged }: { staged: boolean }): React.JSX.Element {
  const enabled = useAi((s) => s.config?.enabled ?? true)
  const update = useAi((s) => s.update)

  return (
    <StepLayout
      staged={staged}
      title="Learn with AI, or without"
      lead="You can change this any time from the AI menu."
    >
      <RadioGroup
        aria-label="AI help"
        value={enabled ? 'on' : 'off'}
        onValueChange={(value) => void update({ enabled: value === 'on' })}
        className="grid-cols-2 gap-4"
      >
        <ChoiceCard value="on" title="With AI help" icon={<Sparkles strokeWidth={1.5} />}>
          <p className="text-[13px] leading-5 text-muted-foreground">
            A tutor that explains and asks the right questions, but never hands over the answer.
            Grey suggestions in the editor if you want them.
          </p>
          <p className="mt-auto text-xs text-muted-foreground">
            Your questions and code go to the provider you pick.
          </p>
        </ChoiceCard>
        <ChoiceCard value="off" title="Without AI" icon={<BookOpen strokeWidth={1.5} />}>
          <p className="text-[13px] leading-5 text-muted-foreground">
            Lessons, tasks, hints and checks. You work every answer out on your own.
          </p>
          <p className="mt-auto text-xs text-muted-foreground">Nothing leaves this computer.</p>
        </ChoiceCard>
      </RadioGroup>
    </StepLayout>
  )
}
