import { Loader2, X } from 'lucide-react'
import type { ToolStatus } from '@shared/types'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { cancelInstall, installTool, useTools } from '@/stores/tools'

const outline =
  'shrink-0 border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent'

/** The action that gets a missing tool: install it here, follow its progress, or restart the app. */
export function ToolInstallButton({
  tool,
  explain = false
}: {
  tool: ToolStatus
  /** Says in place what a waiting install needs, where nothing else on screen does. */
  explain?: boolean
}): React.JSX.Element | null {
  const install = useTools((s) => s.installs[tool.id])

  if (install?.state === 'running') {
    return (
      <span className="flex shrink-0 items-center gap-2">
        <span
          role="status"
          className="flex items-center gap-2 text-[13px] text-muted-foreground tabular-nums"
        >
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          {install.done === null
            ? `Installing ${tool.label}`
            : `Downloading ${Math.round(install.done * 100)}%`}
        </span>
        {install.done !== null && (
          <Button variant="ghost" size="sm" onClick={cancelInstall}>
            <X />
            Cancel
          </Button>
        )}
      </span>
    )
  }
  if (install?.state === 'restart') {
    return (
      <Button
        variant="outline"
        size="sm"
        className={outline}
        onClick={() => void api.tools.relaunch()}
      >
        Restart Indent
      </Button>
    )
  }
  if (install?.state === 'waiting') {
    return explain ? (
      <span className="shrink-0 text-[13px] text-muted-foreground">Finish the installer</span>
    ) : null
  }
  if (!tool.installable && !tool.url) return null

  const verb = tool.id === 'node' ? 'Download' : 'Install'
  return tool.installable ? (
    <Button
      variant="outline"
      size="sm"
      className={outline}
      onClick={() => void installTool(tool.id)}
    >
      {install?.state === 'failed'
        ? 'Try again'
        : tool.version
          ? `${verb} a newer ${tool.label}`
          : `${verb} ${tool.label}`}
    </Button>
  ) : (
    <Button variant="outline" size="sm" className={outline} asChild>
      <a href={tool.url} target="_blank" rel="noreferrer">
        Get {tool.label}
      </a>
    </Button>
  )
}
