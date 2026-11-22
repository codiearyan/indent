import { ChevronDown, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { nextModel, otherProviders } from '@shared/aiModels'
import type { AiSettingsPatch } from '@shared/types'
import { ProviderIcon } from '@/components/app/ProviderIcon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn, errorMessage } from '@/lib/utils'
import { activeProvider, useAi } from './aiStore'

const outline =
  'press border-input bg-transparent font-normal shadow-none dark:bg-transparent dark:hover:bg-accent'

/**
 * The way forward under an AI call that failed: the provider's next model, or another provider
 * that works here. Either one switches, then `onRetry` asks again.
 */
export function AiRecovery({
  onRetry,
  className
}: {
  onRetry(): void
  className?: string
}): React.JSX.Element | null {
  const config = useAi((s) => s.config)
  const update = useAi((s) => s.update)
  const active = activeProvider(config)
  const model = active ? nextModel(active, config?.model ?? null) : null
  const others = otherProviders(config)
  if (!model && others.length === 0) return null

  const switchTo = (patch: AiSettingsPatch): void => {
    update(patch)
      .then(onRetry)
      .catch((error) => toast.error(errorMessage(error)))
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {model && (
        <Button
          variant="outline"
          size="xs"
          className={outline}
          title={model}
          onClick={() => switchTo({ model })}
        >
          <RefreshCw />
          Try another model
        </Button>
      )}
      {others.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="xs" className={outline}>
              Use another provider
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {others.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onSelect={() => switchTo({ provider: p.id, model: null })}
              >
                <ProviderIcon id={p.id} />
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
