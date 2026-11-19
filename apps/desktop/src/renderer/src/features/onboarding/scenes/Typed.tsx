import { cn } from '@/lib/utils'

export const MS_PER_CHAR = 22

/** Typing is a reveal in whole characters; `at` is when this piece starts, in ms. */
export function Typed({
  text,
  at,
  className
}: {
  text: string
  at: number
  className?: string
}): React.JSX.Element {
  return (
    <span
      className={cn('ob-type', className)}
      style={
        {
          '--chars': text.length,
          '--steps': text.length + 1,
          animationDuration: `${text.length * MS_PER_CHAR}ms`,
          animationDelay: `${at}ms`
        } as React.CSSProperties
      }
    >
      {text}
    </span>
  )
}
