import { useEffect, useRef, useState } from 'react'
import { RotateCw } from 'lucide-react'
import type { Chapter } from '@shared/types'
import {
  PREVIEW_MESSAGE,
  previewUrl,
  type PreviewMessage,
  type PreviewTitle
} from '@shared/preview'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/features/workspace/IconButton'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/stores/workspace'

const MAX_LINES = 200

/** The learner's page, served from the workspace on disk and reloaded after every save. */
export function BrowserPane(): React.JSX.Element | null {
  const chapter = useWorkspace((s) => s.chapter)
  const revision = useWorkspace((s) => s.revision)
  const [reloads, setReloads] = useState(0)
  const [consoleOpen, setConsoleOpen] = useState<boolean | null>(null)
  if (!chapter?.preview) return null
  return (
    // A new key loads the page again and starts its console empty.
    <Page
      key={`${chapter.labId}/${chapter.id}/${revision}/${reloads}`}
      chapter={chapter}
      page={chapter.preview}
      consoleOpen={consoleOpen}
      onConsoleOpen={setConsoleOpen}
      onReload={() => setReloads((n) => n + 1)}
    />
  )
}

interface PageProps {
  chapter: Chapter
  page: string
  /** null until the learner chooses: the console then opens by itself on the first error. */
  consoleOpen: boolean | null
  onConsoleOpen(open: boolean): void
  onReload(): void
}

function Page({
  chapter,
  page,
  consoleOpen,
  onConsoleOpen,
  onReload
}: PageProps): React.JSX.Element {
  const frame = useRef<HTMLIFrameElement>(null)
  const [lines, setLines] = useState<PreviewMessage[]>([])
  const [title, setTitle] = useState('')

  useEffect(() => {
    const onMessage = (
      event: MessageEvent<Partial<PreviewMessage & PreviewTitle> | null>
    ): void => {
      const data = event.data
      if (event.source !== frame.current?.contentWindow || data?.source !== PREVIEW_MESSAGE) return
      if (typeof data.title === 'string') return setTitle(data.title.slice(0, 200))
      const line: PreviewMessage = {
        source: PREVIEW_MESSAGE,
        level: data.level === 'error' || data.level === 'warn' ? data.level : 'log',
        text: String(data.text)
      }
      setLines((before) => [...before, line].slice(-MAX_LINES))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const errors = lines.filter((line) => line.level === 'error').length
  const open = consoleOpen ?? errors > 0

  return (
    <div className="flex h-full flex-col bg-editor">
      <div className="flex h-[41px] shrink-0 items-center gap-2 border-b border-border px-3 text-sm">
        <span className="shrink-0 font-medium">Browser</span>
        {title && <span className="min-w-0 truncate text-[13px]">{title}</span>}
        <span
          className={cn(
            'font-mono text-[13px] text-muted-foreground',
            // The title gives way first, so the file name stays whole beside it.
            title ? 'shrink-0' : 'min-w-0 truncate'
          )}
        >
          {page}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            aria-pressed={open}
            onClick={() => onConsoleOpen(!open)}
            className={cn(
              'font-normal text-muted-foreground hover:text-foreground',
              open && 'bg-accent text-foreground'
            )}
          >
            Console
            {lines.length > 0 && (
              <span className={cn('tabular-nums', errors > 0 && 'text-destructive')}>
                {errors || lines.length}
              </span>
            )}
          </Button>
          <IconButton label="Reload page" onClick={onReload}>
            <RotateCw />
          </IconButton>
        </div>
      </div>

      <iframe
        ref={frame}
        title={`${chapter.title} page`}
        src={previewUrl(chapter.labId, chapter.id, page)}
        // The page is the learner's own code: it gets scripts and forms, never the app around it.
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        className="min-h-0 w-full flex-1 border-0 bg-page"
      />

      {open && (
        <div
          role="log"
          aria-label="Console"
          className="h-40 shrink-0 overflow-y-auto border-t border-border px-3 py-2 font-mono text-xs leading-5"
        >
          {lines.length === 0 ? (
            <p className="font-sans text-[13px] text-muted-foreground">
              Nothing logged yet. Output from console.log and errors on the page show up here.
            </p>
          ) : (
            lines.map((line, index) => (
              <div
                key={index}
                className={cn(
                  'border-b border-rule py-0.5 break-words whitespace-pre-wrap last:border-b-0',
                  line.level === 'error' ? 'text-destructive' : 'text-foreground'
                )}
              >
                {line.level === 'warn' && <span className="text-muted-foreground">warning </span>}
                {line.text}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
