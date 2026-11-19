import logo from '@indent/design/logo.png'
import { cn } from '@/lib/utils'

export const APP_NAME = 'Indent'

/** The product's mark: a sandbox with a block held inside it. */
export function BrandMark({ className }: { className?: string }): React.JSX.Element {
  return <img src={logo} alt="" aria-hidden className={cn('size-6', className)} />
}
