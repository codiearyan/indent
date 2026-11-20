import { FileIcon } from 'lucide-react'
import { LanguageIcon } from '@/components/app/LanguageIcon'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { FileChange } from './fileChange'

const LANGUAGES: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'react',
  ts: 'typescript',
  tsx: 'react',
  html: 'html',
  sql: 'sql',
  sh: 'shell',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java'
}

export function FileTypeIcon({ path }: { path: string }): React.JSX.Element {
  const language = LANGUAGES[path.split('.').pop()?.toLowerCase() ?? '']
  if (!language) return <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
  return <LanguageIcon language={language} className="size-3.5" />
}

const CHANGES = {
  modified: { letter: 'M', label: 'Changed from the starter', tone: 'text-warning' },
  new: { letter: 'U', label: 'New file, not in the starter', tone: 'text-success' }
}

/** The file name in ink with its folder dimmed before it, and a git-style letter when it changed. */
export function FileLabel({
  path,
  change,
  active
}: {
  path: string
  change: FileChange
  active: boolean
}): React.JSX.Element {
  const slash = path.lastIndexOf('/')
  return (
    <>
      <FileTypeIcon path={path} />
      <span className="min-w-0 truncate">
        {slash !== -1 && <span className="text-muted-foreground">{path.slice(0, slash + 1)}</span>}
        <span className={active ? 'text-foreground' : 'text-foreground/75'}>
          {path.slice(slash + 1)}
        </span>
      </span>
      {change && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              aria-label={CHANGES[change].label}
              className={cn(
                'ml-auto w-3 shrink-0 text-center font-mono text-xs font-medium',
                CHANGES[change].tone
              )}
            >
              {CHANGES[change].letter}
            </span>
          </TooltipTrigger>
          <TooltipContent>{CHANGES[change].label}</TooltipContent>
        </Tooltip>
      )}
    </>
  )
}
