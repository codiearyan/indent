import { useEffect, useState } from 'react'
import { Wrench } from 'lucide-react'
import type { ToolStatus } from '@shared/types'
import { ToolInstallButton } from '@/components/app/ToolInstallButton'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/telemetry'
import { useCatalog } from '@/stores/catalog'
import { missingTools, refreshTools, useTools, type ToolInstall } from '@/stores/tools'

const outline = 'border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent'

function hint(tool: ToolStatus, install: ToolInstall | undefined): string {
  if (install?.state === 'failed') return install.message
  if (install?.state === 'waiting')
    return "Finish Apple's installer that just opened, then check again."
  if (tool.id === 'node') {
    return tool.version
      ? `This computer has ${tool.version}; the repos need 22.18 or newer. The app can get one for itself.`
      : 'It runs your code and the checks. The app can get it for you.'
  }
  // Too old: the note says which version is here and which one the repos need.
  if (tool.version) return tool.note
  if (!tool.installable) return 'Install it, then check again.'
  // Apple's tools hold no Java; the app downloads one itself.
  return window.platform === 'darwin' && tool.id !== 'java'
    ? "On a Mac it comes with Apple's developer tools."
    : 'The app can install it for you.'
}

const reported = new Set<string>()

/** Usage stats hear about each missing tool once a session, not on every render. */
function reportMissing(tool: ToolStatus, labId: string): void {
  if (reported.has(tool.id)) return
  reported.add(tool.id)
  const major = tool.version?.match(/^v?(\d+)/)?.[1]
  track('tool_missing', {
    tool: tool.id,
    repo: labId,
    reason: tool.version ? 'too-old' : 'missing',
    ...(major ? { major: Number(major) } : {})
  })
}

/** A banner across the top of the issue for each tool this repo needs that the computer lacks. */
export function ToolNotice({ labId }: { labId: string }): React.JSX.Element | null {
  const lab = useCatalog((s) => s.labs?.find((l) => l.id === labId))
  const tools = useTools((s) => s.tools)
  const installs = useTools((s) => s.installs)
  const [checking, setChecking] = useState(false)

  useEffect(() => void useCatalog.getState().load(), [])

  const missing = lab ? missingTools(lab, tools) : []
  useEffect(() => {
    for (const tool of missing) reportMissing(tool, labId)
  })
  if (missing.length === 0) return null

  const checkAgain = (): void => {
    setChecking(true)
    void refreshTools()
      .catch(() => {})
      .finally(() => setChecking(false))
  }

  return (
    <div className="mx-2 mb-2 space-y-2">
      {missing.map((tool) => {
        const install = installs[tool.id]
        return (
          <div
            key={tool.id}
            role="alert"
            className="flex min-h-12 items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2"
          >
            <Wrench className="size-4 shrink-0 text-destructive" strokeWidth={1.5} aria-hidden />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-medium">This repo needs {tool.label}.</span>{' '}
              <span
                className={
                  install?.state === 'failed' ? 'text-destructive' : 'text-muted-foreground'
                }
              >
                {hint(tool, install)}
              </span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <ToolInstallButton tool={tool} />
              {install?.state !== 'running' && (
                <Button
                  variant="outline"
                  size="sm"
                  className={outline}
                  disabled={checking}
                  onClick={checkAgain}
                >
                  {checking ? 'Checking...' : 'Check again'}
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
