import { ShortcutSuffix } from '@/components/app/ShortcutKeys'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ShortcutId } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'

type Props = React.ComponentProps<typeof Button> & {
  label: string
  pressed?: boolean
  shortcut?: ShortcutId
}

/** Ghost icon button with a tooltip; works as a Popover or Dialog trigger child. */
export function IconButton({
  label,
  pressed,
  shortcut,
  className,
  ...props
}: Props): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          data-shortcut={shortcut}
          className={cn(
            'text-muted-foreground hover:text-foreground [&_svg]:stroke-[1.5]',
            pressed && 'bg-accent text-foreground',
            className
          )}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <ShortcutSuffix id={shortcut} />}
      </TooltipContent>
    </Tooltip>
  )
}
