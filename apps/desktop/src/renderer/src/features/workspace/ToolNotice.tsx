import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/stores/catalog'
import { missingTools, refreshTools, useTools } from '@/stores/tools'

const outline = 'border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent'
const MAC_GIT = 'xcode-select --install'

/**
 * Above the tasks: a tool this repo needs that the computer lacks, and how to get it here. Node is
 * left to the repo tools notice, which covers every repo.
 */
export function ToolNotice({ labId }: { labId: string }): React.JSX.Element | null {
  const lab = useCatalog((s) => s.labs?.find((l) => l.id === labId))
  const tools = useTools((s) => s.tools)
  const [checking, setChecking] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => void useCatalog.getState().load(), [])

  const git = lab && missingTools(lab, tools).find((tool) => tool.id === 'git')
  if (!git) return null

  const checkAgain = (): void => {
    setChecking(true)
    void refreshTools()
      .catch(() => {})
      .finally(() => setChecking(false))
  }
  const copy = (): void => {
    void navigator.clipboard.writeText(MAC_GIT).then(() => setCopied(true))
  }
  const mac = window.platform === 'darwin'

  return (
    <div role="alert" className="mt-4 space-y-3 rounded-lg border border-border px-4 py-3">
      <p className="text-sm">
        This repo needs Git.{' '}
        {mac
          ? "On a Mac it comes with Apple's developer tools. Run this in a terminal to get them:"
          : 'Install it, then check again.'}
      </p>
      {mac && (
        <div className="flex items-center gap-2 rounded-md bg-muted py-1.5 pr-1.5 pl-3">
          <code className="flex-1 font-mono text-xs">{MAC_GIT}</code>
          <Button variant="ghost" size="xs" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2">
        {!mac && (
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
