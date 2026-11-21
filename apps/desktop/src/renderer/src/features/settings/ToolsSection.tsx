import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import type { LabModelStatus, ToolStatus } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { retryRuntime, useRuntime } from '@/stores/runtime'
import { Group, card } from './controls'

/** What the repos need on this computer, and a download for the part the app can fetch itself. */
export function ToolsSection(): React.JSX.Element {
  const [tools, setTools] = useState<ToolStatus[] | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [model, setModel] = useState<LabModelStatus | null>(null)
  const [restarting, setRestarting] = useState(false)
  const runtime = useRuntime((s) => s.status)

  const show = (e: unknown): void => setError(errorMessage(e))

  // The model's status comes second: reading tools can restart it once Node is found.
  const refresh = (): void => {
    void api.tools
      .status()
      .then(setTools)
      .then(() => api.tools.labModel())
      .then(setModel, show)
  }
  useEffect(refresh, [])

  const restart = async (): Promise<void> => {
    setRestarting(true)
    try {
      setModel(await api.tools.restartLabModel())
    } catch (e) {
      show(e)
    } finally {
      setRestarting(false)
    }
  }

  const download = async (): Promise<void> => {
    setDownloading(true)
    setError(null)
    try {
      setTools(await api.tools.installNode())
      setModel(await api.tools.labModel())
    } catch (e) {
      show(e)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Group
      title="What your repos need"
      action={
        <Button variant="ghost" size="xs" disabled={downloading} onClick={refresh}>
          Check again
        </Button>
      }
    >
      <ul className={card} aria-busy={!tools}>
        {tools
          ? tools.map((tool) => (
              <li
                key={tool.id}
                className="flex min-h-14 items-center justify-between gap-6 px-4 py-2.5"
              >
                <div>
                  <div className="text-sm">{tool.label}</div>
                  <p className="text-[13px] text-muted-foreground">{tool.note}</p>
                </div>
                {tool.ok ? (
                  <span className="flex shrink-0 items-center gap-2 font-mono text-xs text-muted-foreground">
                    <Check className="size-4 text-success" strokeWidth={2} aria-label="Ready" />
                    {tool.version}
                  </span>
                ) : tool.installable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="press shrink-0 border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
                    disabled={downloading}
                    onClick={() => void download()}
                  >
                    {downloading && <Loader2 className="animate-spin motion-reduce:animate-none" />}
                    {downloading ? 'Downloading' : `Download ${tool.label}`}
                  </Button>
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">Not found</span>
                )}
              </li>
            ))
          : [0, 1].map((i) => (
              <li key={i} className="flex h-14 items-center justify-between px-4">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-16" />
              </li>
            ))}
        {runtime && (
          <li className="flex min-h-14 items-center justify-between gap-6 px-4 py-2.5">
            <div>
              <div className="text-sm">Repo tools</div>
              <p className="text-[13px] text-muted-foreground">
                What the checks and your code use, such as vitest and typescript. Installed once
                into your work folder.
                {!runtime.ready && !runtime.installing && runtime.error && ` ${runtime.error}`}
              </p>
            </div>
            {runtime.ready ? (
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <Check className="size-4 text-success" strokeWidth={2} aria-hidden />
                Ready
              </span>
            ) : runtime.installing ? (
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                Installing
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="press shrink-0 border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
                disabled={!runtime.node}
                onClick={retryRuntime}
              >
                {runtime.error ? 'Try again' : 'Install'}
              </Button>
            )}
          </li>
        )}
        {model && (
          <li className="flex min-h-14 items-center justify-between gap-6 px-4 py-2.5">
            <div>
              <div className="text-sm">Local model</div>
              <p className="text-[13px] text-muted-foreground">
                Answers code that calls an AI model, on this computer.
                {model.state === 'failed' && ` It is not running: ${model.reason}`}
              </p>
            </div>
            {model.state === 'running' ? (
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <Check className="size-4 text-success" strokeWidth={2} aria-hidden />
                Running
              </span>
            ) : model.state === 'starting' || restarting ? (
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                Starting
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="press shrink-0 border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
                disabled={model.nodeMissing}
                onClick={() => void restart()}
              >
                Restart
              </Button>
            )}
          </li>
        )}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-destructive">
          {error}
        </p>
      )}
      <p className="mt-3 text-[13px] leading-5 text-muted-foreground">
        A download comes from nodejs.org, is checked against its published checksum, and goes into
        this app&apos;s own folder. Nothing else on this computer changes.
      </p>
    </Group>
  )
}
