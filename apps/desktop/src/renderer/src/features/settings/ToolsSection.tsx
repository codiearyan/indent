import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import type { ToolStatus } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { Group, card } from './controls'

/** What the repos need on this computer, and a download for the part the app can fetch itself. */
export function ToolsSection(): React.JSX.Element {
  const [tools, setTools] = useState<ToolStatus[] | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const show = (e: unknown): void => setError(errorMessage(e))

  useEffect(() => {
    void api.tools.status().then(setTools, show)
  }, [])

  const download = async (): Promise<void> => {
    setDownloading(true)
    setError(null)
    try {
      setTools(await api.tools.installNode())
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
        <Button
          variant="ghost"
          size="xs"
          disabled={downloading}
          onClick={() => void api.tools.status().then(setTools, show)}
        >
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
