import { useId } from 'react'
import type { AiProviderId } from '@shared/types'
import { PROVIDER_MARKS } from '@shared/providerMarks'
import { cn } from '@/lib/utils'

export function ProviderIcon({
  id,
  className
}: {
  id: AiProviderId
  className?: string
}): React.JSX.Element {
  const gradientId = useId()
  const mark = PROVIDER_MARKS[id]
  const fill = mark.gradient ? `url(#${gradientId})` : (mark.color ?? 'currentColor')
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      fillRule="evenodd"
      aria-hidden
      className={cn('size-4 shrink-0', className)}
    >
      {mark.gradient && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            {mark.gradient.map((stop, i, stops) => (
              <stop key={stop} offset={i / (stops.length - 1)} stopColor={stop} />
            ))}
          </linearGradient>
        </defs>
      )}
      <path d={mark.d} />
    </svg>
  )
}
