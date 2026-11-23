import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { Terminal, type ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { ChevronDown, ChevronUp, Maximize2, Minimize2, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import type { Chapter } from '@shared/types'
import { ShortcutSuffix } from '@/components/app/ShortcutKeys'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { codeChrome } from '@indent/design/code-palette'
import { fontStack } from '@/lib/fonts'
import { isAppShortcut, type ShortcutId } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useSettings, type Theme } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { TOUR } from '@/features/tour/anchors'
import { useAi } from '@/features/ai/aiStore'
import { AskBar } from '@/features/ai/AskBar'
import { askAboutOutput } from '@/features/ai/tutorActions'
import { usePane } from '@/features/workspace/activePane'

const REFRESH_QUIET_MS = 500
// Fitting reflows every line, so dragging a panel fits a few times a second, not every frame.
const FIT_EVERY_MS = 50
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
  const typography = useSettings((s) => s.typography)
  const togglePanel = useSettings((s) => s.togglePanel)
  const setPanel = useSettings((s) => s.setPanel)

  // An open panel means the learner wants a shell, so it starts without a click.
  const startNow = open && !!chapter
  const [status, setStatus] = useState<Status>(startNow ? 'connected' : 'idle')
  const [session, setSession] = useState(startNow ? 1 : 0)
  const [exitCode, setExitCode] = useState(0)
  const [maximized, setMaximized] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const pane = usePane('terminal')
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<{ term: Terminal; fit: FitAddon; id: string | null } | null>(null)
  /** Text selected in the terminal, and where the mouse let go, for the ask bar. */
  const [picked, setPicked] = useState<{ text: string; left: number; top: number } | null>(null)
  const tutorOn = useAi((s) => !!s.config?.enabled && !!s.config.provider)
  const pendingCommand = useRef<string | null>(null)

  const connect = (command?: string): void => {
    pendingCommand.current = command ?? null
    setPanel('terminal', true)
    setStatus('connected')
    setSession((n) => n + 1)
  }

  const startOnOpen = useEffectEvent(() => {
    if (status === 'idle' && chapter) connect()
  })
  useEffect(
    () =>
      useSettings.subscribe((state, previous) => {
        if (state.panels.terminal && !previous.panels.terminal) startOnOpen()
      }),
    []
  )

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
    const { theme, textScale, typography } = useSettings.getState()
    const term = new Terminal({
      fontFamily: fontStack(typography.monoFont, 'mono'),
      fontSize: Math.round(typography.monoSize * textScale.terminal),
      cursorStyle: typography.cursor,
      theme: xtermTheme(theme),
      cursorBlink: true
    })
    // The app's shortcuts pass through to the window instead of reaching the shell.
    term.attachCustomKeyEventHandler((event) => event.type !== 'keydown' || !isAppShortcut(event))
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
      clearTimeout(fitTimer)
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
    let fitTimer: ReturnType<typeof setTimeout> | undefined
    const observer = new ResizeObserver(() => {
      fitTimer ??= setTimeout(() => {
        fitTimer = undefined
        if (container.clientHeight > 0) fit.fit()
      }, FIT_EVERY_MS)
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

    // The bar shows where the pointer let go of a selection; a click elsewhere clears it.
    let pointer = { left: 0, top: 0 }
    let downY = 0
    const onPointerDown = (event: PointerEvent): void => {
      downY = event.clientY - container.getBoundingClientRect().top
    }
    const onPointerUp = (event: PointerEvent): void => {
      const box = container.getBoundingClientRect()
      const x = event.clientX - box.left
      // Above the first selected line, or below the last one near the top; never past the edge.
      const first = Math.min(downY, event.clientY - box.top)
      const last = Math.max(downY, event.clientY - box.top)
      pointer = {
        left: Math.max(4, Math.min(x, box.width - 340)),
        top: Math.max(4, Math.min(first < 56 ? last + 16 : first - 48, box.height - 44))
      }
      setTimeout(() => {
        const text = term.hasSelection() ? term.getSelection() : ''
        setPicked(text.trim() ? { text, ...pointer } : null)
      })
    }
    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointerup', onPointerUp)
    const selection = term.onSelectionChange(() => {
      if (!term.hasSelection()) setPicked(null)
    })

    return () => {
      disposed = true
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointerup', onPointerUp)
      selection.dispose()
      setPicked(null)
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
    current.term.options.fontFamily = fontStack(typography.monoFont, 'mono')
    current.term.options.fontSize = Math.round(typography.monoSize * scale)
    current.term.options.cursorStyle = typography.cursor
    if (containerRef.current?.clientHeight) current.fit.fit()
  }, [theme, scale, typography])

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
      {...pane}
      ref={rootRef}
      style={overlay}
      className={cn('pane flex h-full flex-col bg-editor', maximized && 'border-t border-border')}
    >
      {/* The whole bar opens and closes the terminal. The arrow is the button the keyboard uses. */}
      <div
        data-tour={TOUR.terminal}
        className="flex h-[41px] shrink-0 cursor-pointer items-center gap-2 border-b border-border px-2 text-sm select-none"
        onClick={(event) => {
          if (!(event.target as HTMLElement).closest('button')) toggleOpen()
        }}
      >
        <IconButton
          label={open ? 'Collapse terminal' : 'Expand terminal'}
          shortcut="toggleTerminal"
          onClick={toggleOpen}
        >
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
        {status === 'idle' ? null : (
          <div className="flex h-full flex-col">
            {/* The fit add-on sizes the terminal from its parent, padding included, so the padding sits outside it. */}
            <div className="min-h-0 flex-1 py-1 pl-3">
              <div className="relative h-full">
                <div ref={containerRef} className="h-full overflow-hidden" />
                {tutorOn && picked && (
                  <AskBar
                    left={picked.left}
                    top={picked.top}
                    actions={[
                      {
                        label: 'Explain this output',
                        run: () => askAboutOutput(picked.text, 'What does this output mean?')
                      }
                    ]}
                    onAsk={(question) => askAboutOutput(picked.text, question)}
                    onClose={() => {
                      setPicked(null)
                      termRef.current?.term.clearSelection()
                      termRef.current?.term.focus()
                    }}
                  />
                )}
              </div>
            </div>
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
  shortcut,
  onClick,
  children
}: {
  label: string
  shortcut?: ShortcutId
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
          data-shortcut={shortcut}
          onClick={onClick}
          className="text-muted-foreground hover:text-foreground [&_svg]:stroke-[1.5]"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <ShortcutSuffix id={shortcut} />}
      </TooltipContent>
    </Tooltip>
  )
}
