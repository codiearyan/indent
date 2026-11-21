import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { Terminal, type ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  RotateCw,
  SquareTerminal
} from 'lucide-react'
import { toast } from 'sonner'
import type { Chapter } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { codeChrome } from '@indent/design/code-palette'
import { cn } from '@/lib/utils'
import { useSettings, type Theme } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { TOUR } from '@/features/tour/anchors'

const REFRESH_QUIET_MS = 500
// The terminal drops input that arrives with Ctrl+C, so the command waits for the shell.
const AFTER_INTERRUPT_MS = 150

type Status = 'idle' | 'connected' | 'exited'

function xtermTheme(theme: Theme): ITheme {
  const p = codeChrome[theme]
  const { black, red, green, yellow, blue, magenta, cyan, white } = p.ansi
  return {
    background: p.background,
    foreground: p.foreground,
    cursor: p.cursor,
    cursorAccent: p.background,
    selectionBackground: p.selection,
    ...p.ansi,
    brightBlack: black,
    brightRed: red,
    brightGreen: green,
    brightYellow: yellow,
    brightBlue: blue,
    brightMagenta: magenta,
    brightCyan: cyan,
    brightWhite: white
  }
}

export function TerminalPane(): React.JSX.Element {
  const chapter = useWorkspace((s) => s.chapter)
  // Remounting per chapter kills the old shell and returns to the empty state.
  return <TerminalSession key={chapter ? `${chapter.labId}/${chapter.id}` : ''} chapter={chapter} />
}

function TerminalSession({ chapter }: { chapter: Chapter | null }): React.JSX.Element {
  const open = useSettings((s) => s.panels.terminal)
  const theme = useSettings((s) => s.theme)
  const scale = useSettings((s) => s.textScale.terminal)
  const togglePanel = useSettings((s) => s.togglePanel)
  const setPanel = useSettings((s) => s.setPanel)

  const [status, setStatus] = useState<Status>('idle')
  const [session, setSession] = useState(0)
  const [exitCode, setExitCode] = useState(0)
  const [maximized, setMaximized] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<{ term: Terminal; fit: FitAddon; id: string | null } | null>(null)
  const pendingCommand = useRef<string | null>(null)

  const connect = (command?: string): void => {
    pendingCommand.current = command ?? null
    setPanel('terminal', true)
    setStatus('connected')
    setSession((n) => n + 1)
  }

  const typeCommand = (command: string): void => {
    const id = termRef.current?.id
    if (id) {
      api.terminal.write(id, command)
      termRef.current?.term.focus()
    } else connect(command)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!session || !chapter || !container) return
    const { theme, textScale } = useSettings.getState()
    const term = new Terminal({
      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
      fontSize: 13 * textScale.terminal,
      theme: xtermTheme(theme),
      cursorBlink: true
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(container)
    if (container.clientHeight > 0) fit.fit()
    const current: { term: Terminal; fit: FitAddon; id: string | null } = { term, fit, id: null }
    termRef.current = current

    let disposed = false
    let awaitingRefresh = false
    let refreshTimer: ReturnType<typeof setTimeout> | undefined

    const offData = api.terminal.onData((id, data) => {
      if (id !== current.id) return
      term.write(data)
      if (!awaitingRefresh) return
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        awaitingRefresh = false
        void useWorkspace.getState().refresh()
      }, REFRESH_QUIET_MS)
    })
    const offExit = api.terminal.onExit((id, code) => {
      if (id !== current.id) return
      current.id = null
      setExitCode(code)
      setStatus('exited')
    })
    const input = term.onData((data) => {
      if (!current.id) return
      if (data.includes('\r')) awaitingRefresh = true
      api.terminal.write(current.id, data)
    })
    const resize = term.onResize(({ cols, rows }) => {
      if (current.id) api.terminal.resize(current.id, cols, rows)
    })
    const observer = new ResizeObserver(() => {
      if (container.clientHeight > 0) fit.fit()
    })
    observer.observe(container)

    api.terminal
      .create({ labId: chapter.labId, chapterId: chapter.id, cols: term.cols, rows: term.rows })
      .then((id) => {
        if (disposed) return api.terminal.kill(id)
        current.id = id
        // The panel may have expanded while the shell was starting.
        api.terminal.resize(id, term.cols, term.rows)
        if (pendingCommand.current?.includes('\r')) awaitingRefresh = true
        if (pendingCommand.current) api.terminal.write(id, pendingCommand.current)
        pendingCommand.current = null
        term.focus()
      })
      .catch((error: unknown) => {
        if (disposed) return
        toast.error('Could not start the terminal', {
          description: error instanceof Error ? error.message : String(error)
        })
        setStatus('idle')
      })

    return () => {
      disposed = true
      clearTimeout(refreshTimer)
      offData()
      offExit()
      input.dispose()
      resize.dispose()
      observer.disconnect()
      if (current.id) api.terminal.kill(current.id)
      term.dispose()
      termRef.current = null
    }
  }, [session, chapter])

  useEffect(() => {
    const current = termRef.current
    if (!current) return
    current.term.options.theme = xtermTheme(theme)
    current.term.options.fontSize = 13 * scale
    if (containerRef.current?.clientHeight) current.fit.fit()
  }, [theme, scale])

  // Maximized: a fixed overlay over the editor column, tracking its size.
  const [overlay, setOverlay] = useState<React.CSSProperties | undefined>()
  useLayoutEffect(() => {
    const column = rootRef.current?.parentElement?.closest('[data-group]')
    if (!maximized || !column) return setOverlay(undefined)
    const place = (): void => {
      const { top, left, width, height } = column.getBoundingClientRect()
      setOverlay({ position: 'fixed', top, left, width, height, zIndex: 40 })
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(column)
    window.addEventListener('resize', place)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', place)
    }
  }, [maximized])

  const toggleOpen = (): void => {
    if (open) setMaximized(false)
    togglePanel('terminal')
  }

  const toggleMaximized = (): void => {
    if (!maximized) setPanel('terminal', true)
    setMaximized(!maximized)
  }

  const suggested = chapter?.terminal.suggestedCommand

  const runSuggested = useEffectEvent(() => {
    if (!suggested) return
    setPanel('terminal', true)
    const current = termRef.current
    if (!current?.id) return connect(`${suggested}\r`)
    // Ctrl+C clears a half-typed line or stops the last run. Both go in as typed input, so the
    // shell runs the command and the files refresh afterwards.
    current.term.input('\x03', false)
    setTimeout(() => current.term.input(`${suggested}\r`, false), AFTER_INTERRUPT_MS)
  })

  useEffect(
    () =>
      useWorkspace.subscribe((state, previous) => {
        if (state.runs !== previous.runs) runSuggested()
      }),
    []
  )
  const suggestion = suggested && (
    <button
      type="button"
      onClick={() => typeCommand(suggested)}
      className="max-w-64 truncate rounded-sm border border-border px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:border-input hover:text-foreground"
    >
      Try: {suggested}
    </button>
  )

  return (
    <div
      ref={rootRef}
      style={overlay}
      className={cn('flex h-full flex-col bg-editor', maximized && 'border-t border-border')}
    >
      <div
        data-tour={TOUR.terminal}
        className="flex h-[41px] shrink-0 items-center gap-2 border-b border-border px-2 text-sm"
      >
        <IconButton label={open ? 'Collapse terminal' : 'Expand terminal'} onClick={toggleOpen}>
          {open ? <ChevronDown /> : <ChevronUp />}
        </IconButton>
        <span className="shrink-0 font-medium">Terminal</span>
        {chapter && (
          <span className="min-w-0 truncate text-[13px] text-muted-foreground">
            {chapter.terminal.description}
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {status === 'connected' && suggestion}
          {status === 'connected' && (
            <Button
              variant="ghost"
              size="xs"
              className="font-normal text-muted-foreground hover:text-foreground"
              onClick={() => setSession((n) => n + 1)}
            >
              <RotateCw />
              Restart
            </Button>
          )}
          <IconButton
            label={maximized ? 'Restore terminal' : 'Maximize terminal'}
            onClick={toggleMaximized}
          >
            {maximized ? <Minimize2 /> : <Maximize2 />}
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {status === 'idle' ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 overflow-auto p-6 text-center">
            <SquareTerminal className="size-5 text-muted-foreground" strokeWidth={1.5} />
            <Button
              variant="outline"
              size="sm"
              className="border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
              onClick={() => connect()}
              disabled={!chapter}
            >
              Open terminal
            </Button>
            <p className="max-w-sm text-[13px] text-muted-foreground">
              Checks do not need the terminal. Open it to run and explore.
            </p>
            {suggestion}
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden py-1 pl-3" />
            {status === 'exited' && (
              <div className="flex shrink-0 items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                <span>Shell exited with code {exitCode}.</span>
                <Button variant="outline" size="xs" onClick={() => connect()}>
                  Reconnect
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
          className="text-muted-foreground hover:text-foreground [&_svg]:stroke-[1.5]"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
