import { useState } from 'react'
import type { WorkspaceFile } from '@shared/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/stores/workspace'
import { focusEditorSoon } from './editors'
import { fileChange } from './fileChange'
import { ChangeLetter, FileTypeIcon } from './FileTab'
import { quickOpenList, type PathMatch } from './pathMatch'
import { useQuickOpen } from './quickOpenStore'

const NO_FILES: WorkspaceFile[] = []

/** Opens a file by typing part of its name. */
export function QuickOpen(): React.JSX.Element {
  const { open, setOpen } = useQuickOpen()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  // Closed, it follows nothing, so typing in the editor does not rank every file again.
  const files = useWorkspace((s) => (open ? s.files : NO_FILES))
  const starter = useWorkspace((s) => s.starter)
  const layout = useWorkspace((s) => s.layout)
  const issueFiles = useWorkspace((s) => s.chapter?.files)

  const focusedFirst = [layout.groups[layout.focused], ...layout.groups].flatMap(
    (g) => g?.paths ?? []
  )
  const results = quickOpenList(
    query,
    files.map((f) => f.path),
    focusedFirst,
    issueFiles ?? []
  )
  const current = Math.min(selected, results.length - 1)

  const close = (next: boolean): void => {
    setOpen(next)
    if (!next) {
      setQuery('')
      setSelected(0)
    }
  }

  const choose = (path: string): void => {
    useWorkspace.getState().openFile(path)
    close(false)
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setSelected((current + step + results.length) % Math.max(results.length, 1))
    } else if (event.key === 'Enter' && results[current]) {
      event.preventDefault()
      choose(results[current].path)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          focusEditorSoon()
        }}
        className="top-[15%] max-h-[min(480px,calc(100vh-8rem))] translate-y-0 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[560px]"
      >
        <DialogTitle className="sr-only">Open a file</DialogTitle>
        <div className="border-b border-rule p-2">
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSelected(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Type a file name"
            aria-label="File name"
            role="combobox"
            aria-expanded
            aria-controls="quick-open-list"
            aria-activedescendant={results[current] ? `quick-open-${current}` : undefined}
            className="font-mono"
          />
        </div>
        {results.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No file matches.</p>
        ) : (
          <ul
            id="quick-open-list"
            role="listbox"
            aria-label="Files"
            className="overflow-y-auto p-1"
          >
            {results.map((match, index) => {
              const file = files.find((f) => f.path === match.path)
              return (
                <li
                  key={match.path}
                  id={`quick-open-${index}`}
                  role="option"
                  aria-selected={index === current}
                  ref={(node) => {
                    if (index === current) node?.scrollIntoView({ block: 'nearest' })
                  }}
                  onPointerMove={() => index !== current && setSelected(index)}
                  onClick={() => choose(match.path)}
                  className={cn(
                    'flex h-8 cursor-default items-center gap-2 rounded-md px-2 font-mono text-[13px]',
                    index === current && 'bg-accent'
                  )}
                >
                  <FileTypeIcon path={match.path} />
                  <MatchedPath match={match} />
                  <ChangeLetter change={file ? fileChange(starter, file) : null} />
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** The path muted, with the characters the query matched in ink. */
function MatchedPath({ match }: { match: PathMatch }): React.JSX.Element {
  const hits = new Set(match.indices)
  const slash = match.path.lastIndexOf('/')
  return (
    <span className="min-w-0 truncate text-muted-foreground">
      {[...match.path].map((char, i) => (
        <span
          key={i}
          className={cn(
            hits.has(i)
              ? 'text-foreground'
              : i > slash && !match.indices.length && 'text-foreground/75'
          )}
        >
          {char}
        </span>
      ))}
    </span>
  )
}
