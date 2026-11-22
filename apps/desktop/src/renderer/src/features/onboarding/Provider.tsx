import { useEffect, useState } from 'react'
import type { AiProviderInfo } from '@shared/types'
import { ProviderIcon } from '@/components/app/ProviderIcon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { ModelSelect } from '@/features/ai/AiSettings'
import { InstallOpencode } from '@/features/ai/InstallOpencode'
import { useOpencodeSetup } from '@/features/ai/opencodeInstall'
import { activeProvider, useAi } from '@/features/ai/aiStore'
import { TestConnection } from '@/features/ai/TestConnection'
import { cn, errorMessage } from '@/lib/utils'

type ProviderId = AiProviderInfo['id']

/** The providers that cost nothing to start with, and the words for what is free. */
const FREE: Partial<Record<ProviderId, string>> = { opencode: 'Free models', gemini: 'Free key' }
const freeFirst = (a: AiProviderInfo, b: AiProviderInfo): number =>
  Number(b.id in FREE) - Number(a.id in FREE)

const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey'

/** Every provider with what it needs, the model and a test. Shown from the AI step of the setup. */
export function ProviderPicker(): React.JSX.Element {
  const config = useAi((s) => s.config)
  const load = useAi((s) => s.load)
  const update = useAi((s) => s.update)
  const [loading, setLoading] = useState(true)

  // Looks for installed CLIs again, so one installed a minute ago shows up.
  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  const lookAgain = (): void => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }

  const setupStep = useOpencodeSetup((s) => s.setup.step)
  const clis = config?.providers.filter((p) => p.kind === 'cli') ?? []
  const apis = (config?.providers.filter((p) => p.kind === 'api') ?? []).sort(freeFirst)
  const active = loading ? undefined : activeProvider(config)

  return (
    <>
      <RadioGroup
        aria-label="AI provider"
        value={config?.provider ?? ''}
        onValueChange={(provider) => void update({ provider: provider as ProviderId })}
        className="grid-cols-2 items-start gap-6"
      >
        <ProviderCard
          title="On this computer"
          hint="Coding CLIs you have installed."
          loading={loading}
          rows={4}
        >
          {clis.some((p) => p.available) ? (
            <>
              {clis.map((p, i) => (
                <ProviderRow key={p.id} provider={p} index={i} />
              ))}
              {/* The result of a setup started here stays in view once OpenCode is listed. */}
              {setupStep !== 'idle' && (
                <li className="px-4 py-3">
                  <InstallOpencode />
                </li>
              )}
            </>
          ) : (
            <InstallHelp onCheck={lookAgain} />
          )}
        </ProviderCard>
        <ProviderCard title="Your own key" hint="Stored encrypted." loading={loading} rows={3}>
          {apis.map((p, i) => (
            <ProviderRow key={p.id} provider={p} index={i + clis.length} />
          ))}
        </ProviderCard>
      </RadioGroup>
      <div className="mt-6 flex min-h-16 items-start gap-6">
        {active ? (
          <>
            <div className="flex w-60 shrink-0 flex-col gap-1.5">
              <span className="text-[13px] text-muted-foreground">Model</span>
              <ModelSelect className="h-8" />
            </div>
            <TestConnection
              key={`${active.id}/${config?.model}`}
              className="flex-row items-center gap-3 pt-[26px]"
            />
          </>
        ) : (
          !loading && (
            <p className="text-[13px] text-muted-foreground">
              No provider yet. You can continue and pick one later from the tutor.
            </p>
          )
        )}
      </div>
    </>
  )
}

function ProviderCard({
  title,
  hint,
  loading,
  rows,
  children
}: {
  title: string
  hint: string
  loading: boolean
  rows: number
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="rounded-lg border border-border">
      <header className="flex h-11 items-baseline gap-2 border-b border-rule px-4 pt-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </header>
      <ul aria-busy={loading}>
        {loading
          ? Array.from({ length: rows }, (_, i) => (
              <li
                key={i}
                className="flex h-12 items-center gap-3 border-b border-rule px-4 last:border-b-0"
              >
                <Skeleton className="size-4 rounded-full" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="ml-auto h-3 w-20" />
              </li>
            ))
          : children}
      </ul>
    </section>
  )
}

function ProviderRow({
  provider,
  index
}: {
  provider: AiProviderInfo
  index: number
}): React.JSX.Element {
  const id = `provider-${provider.id}`
  const keyed = provider.kind === 'api'
  return (
    <li
      className="motion-enter border-b border-rule px-4 last:border-b-0"
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className="flex min-h-12 items-center gap-3">
        <RadioGroupItem id={id} value={provider.id} disabled={!provider.available} />
        <label
          htmlFor={id}
          className={cn(
            'flex shrink-0 items-center gap-2.5 text-sm',
            provider.available ? 'cursor-pointer' : 'text-muted-foreground'
          )}
        >
          <ProviderIcon id={provider.id} />
          {provider.label}
          {FREE[provider.id] && (
            <Badge variant="outline" className="rounded-sm font-normal text-muted-foreground">
              {FREE[provider.id]}
            </Badge>
          )}
        </label>
        {keyed ? (
          <KeyField provider={provider} />
        ) : (
          !provider.available && (
            <span className="ml-auto text-xs text-muted-foreground">Not installed</span>
          )
        )}
      </div>
      {provider.id === 'gemini' && !provider.available && (
        <p className="pb-3 pl-7 text-xs leading-5 text-muted-foreground">
          No card needed. Sign in with Google, create a key and paste it here.{' '}
          <a
            href={GEMINI_KEY_URL}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap text-foreground underline underline-offset-2"
          >
            Get a free key
          </a>
        </p>
      )}
    </li>
  )
}

/** Stands in for the list when no coding CLI is installed: the command that sets one up. */
function InstallHelp({ onCheck }: { onCheck(): void }): React.JSX.Element {
  return (
    <li className="motion-enter flex flex-col gap-2.5 px-4 py-3.5">
      <p className="flex gap-2.5 text-[13px] leading-5 text-muted-foreground">
        <ProviderIcon id="opencode" className="mt-0.5 text-foreground" />
        <span>
          None found yet. <span className="text-foreground">OpenCode</span> is open source and comes
          with free models. Install it here with one click, or with one command in a terminal.
        </span>
      </p>
      <InstallOpencode />
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="press border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
          onClick={onCheck}
        >
          Check again
        </Button>
        <span className="text-xs text-muted-foreground">
          Claude Code, Codex and Gemini CLI work too.
        </span>
      </div>
    </li>
  )
}

/** Paste and save a key; once saved it shows masked with a way to remove it. */
function KeyField({ provider }: { provider: AiProviderInfo }): React.JSX.Element {
  const setKey = useAi((s) => s.setKey)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async (value: string | null): Promise<void> => {
    setSaving(true)
    setError(null)
    try {
      await setKey(provider.id, value)
      setDraft('')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (provider.available) {
    return (
      <span className="ml-auto flex min-w-0 items-center gap-2">
        <span className="truncate font-mono text-xs text-muted-foreground">{provider.detail}</span>
        <Button
          variant="ghost"
          size="xs"
          className="press font-normal text-muted-foreground hover:text-foreground"
          disabled={saving}
          onClick={() => void save(null)}
        >
          Remove
        </Button>
      </span>
    )
  }

  return (
    <form
      className="ml-auto flex min-w-0 flex-1 flex-col items-end gap-1 py-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (draft.trim()) void save(draft)
      }}
    >
      <span className="flex w-full max-w-60 gap-1.5">
        <Input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste an API key"
          aria-label={`${provider.label} API key`}
          aria-invalid={!!error}
          autoComplete="off"
          spellCheck={false}
          className="h-7 min-w-0 font-mono text-xs shadow-none md:text-xs"
        />
        <Button
          type="submit"
          variant="outline"
          size="xs"
          className="press h-7 border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
          disabled={!draft.trim() || saving}
        >
          {saving ? 'Saving' : 'Save'}
        </Button>
      </span>
      {error && (
        <span role="alert" className="motion-enter text-xs text-destructive">
          {error}
        </span>
      )}
    </form>
  )
}
