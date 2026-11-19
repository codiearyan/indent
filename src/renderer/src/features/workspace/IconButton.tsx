import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type Props = React.ComponentProps<typeof Button> & { label: string; pressed?: boolean }

/** Ghost icon button with a tooltip; works as a Popover or Dialog trigger child. */
export function IconButton({ label, pressed, className, ...props }: Props): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          className={cn(pressed && 'bg-accent text-accent-foreground', className)}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
