import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { useCatalog } from '@/stores/catalog'
import { missingTools, refreshTools, useTools } from '@/stores/tools'

const outline = 'border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent'

/**
 * Above the tasks: a tool this repo needs that the computer lacks, and how to get it here. Node is
 * left to the repo tools notice, which covers every repo.
 */
export function ToolNotice({ labId }: { labId: string }): React.JSX.Element | null {
  const lab = useCatalog((s) => s.labs?.find((l) => l.id === labId))
  const tools = useTools((s) => s.tools)
  const [checking, setChecking] = useState(false)
  const [installerOpen, setInstallerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => void useCatalog.getState().load(), [])

  const git = lab && missingTools(lab, tools).find((tool) => tool.id === 'git')
  if (!git) return null

  const checkAgain = (): void => {
    setChecking(true)
    void refreshTools()
      .catch(() => {})
      .finally(() => setChecking(false))
  }
  const install = (): void => {
    setError(null)
    api.tools.installGit().then(
      () => setInstallerOpen(true),
      (failure) => setError(errorMessage(failure))
    )
  }
  const mac = window.platform === 'darwin'

  return (
    <div role="alert" className="mt-4 space-y-3 rounded-lg border border-border px-4 py-3">
      <p className="text-sm">
        This repo needs Git.{' '}
        {!mac
          ? 'Install it, then check again.'
          : installerOpen
            ? "Finish Apple's installer that just opened, then check again."
            : "On a Mac it comes with Apple's developer tools."}
      </p>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        {mac ? (
          !installerOpen && (
            <Button variant="outline" size="sm" className={outline} onClick={install}>
              Install
            </Button>
          )
        ) : (
          <Button variant="outline" size="sm" className={outline} asChild>
            <a href="https://git-scm.com/downloads" target="_blank" rel="noreferrer">
              Get Git
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className={outline}
          disabled={checking}
          onClick={checkAgain}
        >
          {checking ? 'Checking...' : 'Check again'}
        </Button>
      </div>
    </div>
  )
}
