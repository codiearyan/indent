import { RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

/** A large option in a RadioGroup: the whole card picks it, arrow keys move between cards. */
export function ChoiceCard({
  value,
  title,
  icon,
  children,
  className
}: {
  value: string
  title: string
  icon?: React.ReactNode
  children?: React.ReactNode
  className?: string
}): React.JSX.Element {
  const id = `choice-${value}`
  return (
    <label
      htmlFor={id}
      className={cn(
        'ob-choice flex cursor-pointer flex-col gap-3 rounded-lg border border-border p-5 hover:border-input',
        'has-[[data-state=checked]]:border-foreground has-[[data-state=checked]]:bg-accent/40',
        'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
        className
      )}
    >
      <span className="flex items-center gap-2.5">
        {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
        <span className="flex-1 text-sm font-semibold">{title}</span>
        <RadioGroupItem id={id} value={value} className="focus-visible:ring-0" />
      </span>
      {children}
    </label>
  )
}
