import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AiProviderId, AiProviderInfo, SuggestionMode } from '@shared/types'
import { ProviderIcon } from '@/components/app/ProviderIcon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useSettingsDialog } from '@/features/settings/dialogStore'
import { shortcutLabel } from '@/lib/shortcuts'
import { cn, errorMessage } from '@/lib/utils'
import { activeProvider, useAi } from './aiStore'
import { InstallOpencode } from './InstallOpencode'
import { CopyCommand } from './CopyCommand'
import { removeOwnOpencode, signInCommand, useShowOpencodeSetup } from './opencodeInstall'
import { TestConnection } from './TestConnection'

// Radix Select needs a non-empty value; this one stands for "let the CLI choose".
const CLI_DEFAULT = '__default__'

const suggestionModes = (): { value: SuggestionMode; label: string; hint: string }[] => [
  { value: 'off', label: 'Off', hint: 'No grey text in the editor.' },
  {
    value: 'manual',
    label: 'When I ask',
    hint: `Press ${shortcutLabel('suggest')} for a suggestion. Tab accepts.`
  },
  {
    value: 'auto',
    label: 'As I type',
    hint: `Grey text after a pause in typing. Until a task has a check, press ${shortcutLabel('suggest')}. Tab accepts.`
  }
]

function SettingRow({
  id,
  title,
  hint,
  checked,
  onChange
}: {
  id: string
  title: string
  hint: string
  checked: boolean
  onChange(checked: boolean): void
}): React.JSX.Element {
  const config = useAi((s) => s.config)
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {title}
        </label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} disabled={!config} onCheckedChange={onChange} />
    </div>
  )
}

export function AiSwitch(): React.JSX.Element {
  const { config, update } = useAi()
  const on = config?.enabled ?? false
  return (
    <SettingRow
      id="ai-enabled"
      title={config && !on ? 'AI is off' : 'AI help'}
      hint={
        config && !on
          ? 'No tutor and no suggestions. Turn it on to pick a provider.'
          : 'The tutor and suggestions in the editor.'
      }
      checked={on}
      onChange={(enabled) => void update({ enabled })}
    />
  )
}

export function AiSettings(): React.JSX.Element {
  const { config, update } = useAi()
  const active = activeProvider(config)
  const clis = config?.providers.filter((p) => p.kind === 'cli') ?? []
  const apis = config?.providers.filter((p) => p.kind === 'api') ?? []
  const mode = config?.suggestions ?? 'off'
  const showSetup = useShowOpencodeSetup(!!config?.providers.some((p) => p.available))

  return (
    <>
      <Separator />

      <div className="flex flex-col gap-2">
        <span id="ai-suggestions" className="text-sm font-medium">
          Inline suggestions
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-labelledby="ai-suggestions"
          value={mode}
          disabled={!config}
          onValueChange={(value) => value && void update({ suggestions: value as SuggestionMode })}
          className="w-full"
        >
          {suggestionModes().map(({ value, label }) => (
            <ToggleGroupItem key={value} value={value} className="flex-1 text-xs font-normal">
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-xs text-muted-foreground">
          {suggestionModes().find((m) => m.value === mode)?.hint}
        </p>
      </div>

      <SettingRow
        id="ai-nudge"
        title="Offer the tutor when a check fails"
        hint="One quiet button under the task that failed."
        checked={config?.nudge ?? false}
        onChange={(nudge) => void update({ nudge })}
      />

      <Separator />

      {config && showSetup && <InstallOpencode />}

      <div role="radiogroup" aria-label="AI provider" className="flex flex-col gap-3">
        <ProviderGroup title="On this computer" providers={clis} />
        <ProviderGroup title="Your own key" providers={apis} />
      </div>

      {active && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Model</span>
          <ModelSelect />
        </div>
      )}

      {active && <TestConnection key={`${active.id}/${config?.model}`} />}

      <p className="text-xs text-muted-foreground">
        Your questions and code are sent to the provider you choose.
      </p>
    </>
  )
}

/** The model of the active provider; CLIs also offer their own default. */
export function ModelSelect({ className }: { className?: string }): React.JSX.Element | null {
  const { config, update } = useAi()
  const active = activeProvider(config)
  if (!active) return null
  return (
    <Select
      value={config?.model ?? CLI_DEFAULT}
      onValueChange={(model) => void update({ model: model === CLI_DEFAULT ? null : model })}
    >
      <SelectTrigger
        size="sm"
        aria-label="Model"
        className={cn('w-full font-mono text-xs', className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {active.kind === 'cli' && (
          <SelectItem value={CLI_DEFAULT}>Default of {active.label}</SelectItem>
        )}
        {active.models.map((model) => (
          <SelectItem key={model} value={model} className="font-mono text-xs">
            {model}
          </SelectItem>
        ))}
        {config?.model && !active.models.includes(config.model) && (
          <SelectItem value={config.model} className="font-mono text-xs">
            {config.model}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}

/** The tutor's switch: the AI in use and its model, changed in one click without leaving the chat. */
export function ProviderPicker(): React.JSX.Element {
  const { config, update, load } = useAi()
  const active = activeProvider(config)
  const available = config?.providers.filter((p) => p.available) ?? []
  const models =
    active && config?.model && !active.models.includes(config.model)
      ? [...active.models, config.model]
      : (active?.models ?? [])

  return (
    // Opening looks for installed CLIs again, so one installed a minute ago shows up.
    <DropdownMenu onOpenChange={(open) => open && void load()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="-ml-2 max-w-full min-w-0 justify-start gap-1.5 font-normal text-muted-foreground hover:text-foreground"
        >
          {active && <ProviderIcon id={active.id} className="size-3.5" />}
          <span className="truncate">{active ? active.label : 'Pick an AI'}</span>
          {active && config?.model && (
            <span className="truncate font-mono text-muted-foreground">{config.model}</span>
          )}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        {available.length > 0 && (
          <DropdownMenuRadioGroup
            value={config?.provider ?? ''}
            onValueChange={(id) => void update({ provider: id as AiProviderId, model: null })}
          >
            {available.map((p) => (
              <DropdownMenuRadioItem key={p.id} value={p.id}>
                <ProviderIcon id={p.id} />
                {p.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
        {active && (active.kind === 'cli' || models.length > 0) && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>
              Model
              <span className="ml-auto truncate font-mono text-xs text-muted-foreground">
                {config?.model ?? 'Default'}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={config?.model ?? CLI_DEFAULT}
                onValueChange={(model) =>
                  void update({ model: model === CLI_DEFAULT ? null : model })
                }
              >
                {active.kind === 'cli' && (
                  <DropdownMenuRadioItem value={CLI_DEFAULT}>
                    Default of {active.label}
                  </DropdownMenuRadioItem>
                )}
                {models.map((model) => (
                  <DropdownMenuRadioItem key={model} value={model} className="font-mono text-xs">
                    {model}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {available.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem inset onSelect={() => useSettingsDialog.getState().show('ai')}>
          AI settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ProviderGroup({
  title,
  providers
}: {
  title: string
  providers: AiProviderInfo[]
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{title}</span>
      {providers.map((p) => (
        <ProviderRow key={p.id} provider={p} />
      ))}
    </div>
  )
}

function ProviderRow({ provider }: { provider: AiProviderInfo }): React.JSX.Element {
  const selected = useAi((s) => s.config?.provider === provider.id)
  const { update, setKey } = useAi()
  const [key, setKeyDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const needsKey = provider.kind === 'api' && !provider.available

  const saveKey = async (value: string | null): Promise<void> => {
    setError(null)
    try {
      await setKey(provider.id, value)
      setKeyDraft('')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          disabled={!provider.available}
          onClick={() => void update({ provider: provider.id })}
          className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none"
        >
          <span
            className={cn(
              'flex size-3.5 shrink-0 items-center justify-center rounded-full border border-input',
              selected && 'border-foreground',
              !provider.available && 'opacity-50'
            )}
          >
            {selected && <span className="size-1.5 rounded-full bg-foreground" />}
          </span>
          <span className={cn('text-sm', !provider.available && 'text-muted-foreground')}>
            {provider.label}
          </span>
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-right text-xs text-muted-foreground',
              !provider.managed && 'font-mono'
            )}
          >
            {provider.managed ? 'App copy' : provider.detail}
          </span>
        </button>
        {provider.kind === 'api' && provider.available && (
          <Button variant="ghost" size="xs" onClick={() => void saveKey(null)}>
            Remove
          </Button>
        )}
        {provider.managed && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setError(null)
              removeOwnOpencode().catch((e: unknown) => setError(errorMessage(e)))
            }}
          >
            Remove
          </Button>
        )}
      </div>
      {needsKey && (
        <form
          className="flex gap-1.5 pl-8"
          onSubmit={(e) => {
            e.preventDefault()
            if (key.trim()) void saveKey(key)
          }}
        >
          <Input
            type="password"
            value={key}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder={`${provider.label} API key`}
            aria-label={`${provider.label} API key`}
            autoComplete="off"
            className="h-7 font-mono text-xs"
          />
          <Button type="submit" variant="outline" size="xs" className="h-7" disabled={!key.trim()}>
            Save
          </Button>
        </form>
      )}
      {provider.managed && provider.bin && selected && (
        <div className="flex flex-col gap-1 pl-8">
          <span className="text-xs text-muted-foreground">
            To sign in for a paid plan or your own key, run in a terminal:
          </span>
          <CopyCommand name="sign-in" text={signInCommand(provider.bin)} />
        </div>
      )}
      {error && <p className="pl-8 text-xs text-destructive">{error}</p>}
    </div>
  )
}
