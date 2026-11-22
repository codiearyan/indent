import { useEffect, useRef, useState } from 'react'
import { SendHorizontal, Square, X } from 'lucide-react'
import type { AiAttachment } from '@shared/types'
import { ShortcutKeys, ShortcutSuffix } from '@/components/app/ShortcutKeys'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSettingsDialog } from '@/features/settings/dialogStore'
import { Markdown } from '@/features/workspace/Markdown'
import { playLinkedVideo } from '@/features/workspace/video'
import { isShortcut } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { activeProvider, useAi } from './aiStore'
import { focusLine } from './attachments'
import { toggleTutor } from './toggleTutor'
import { InstallOpencode } from './InstallOpencode'
import { useOpencodeSetup } from './opencodeInstall'
import { MESSAGE_BUDGET, useChat } from './chatStore'

export function ChatPanel(): React.JSX.Element {
  const config = useAi((s) => s.config)
  const provider = activeProvider(config)
  const { messages, busy, error, remaining, focus, send, stop } = useChat()
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  const budgeted = provider?.kind === 'api'
  const outOfMessages = budgeted && remaining <= 0
  const canSend = !!provider && !busy && !outOfMessages && !!draft.trim()

  useEffect(() => {
    const list = listRef.current
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight
  }, [messages, error])

  const submit = (): void => {
    if (!canSend) return
    stickToBottom.current = true
    void send(draft)
    setDraft('')
  }

  return (
    <aside className="flex h-full min-w-0 flex-col bg-card">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border pr-2 pl-4">
        <h2 className="flex-1 text-sm font-medium">Tutor</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close tutor"
              data-shortcut="openTutor"
              className="text-muted-foreground hover:text-foreground [&_svg]:stroke-[1.5]"
              onClick={toggleTutor}
            >
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Close tutor
            <ShortcutSuffix id="openTutor" />
          </TooltipContent>
        </Tooltip>
      </header>
      {focus && (
        <p className="shrink-0 truncate border-b border-rule px-4 py-2 text-[13px] text-muted-foreground">
          {focusLine(focus)}
        </p>
      )}

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
        }}
      >
        {messages.length === 0 ? (
          <EmptyState hasProvider={!!provider} loading={!config} />
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message, i) =>
              message.role === 'user' ? (
                <div key={i} className="ml-8 flex min-w-0 flex-col items-end gap-1.5">
                  {message.attachment && <Attachment attachment={message.attachment} />}
                  <div className="rounded-lg bg-muted px-3 py-2 text-sm leading-6 whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="text-sm">
                  <Markdown
                    compact
                    streaming={busy && i === messages.length - 1}
                    onLink={playLinkedVideo}
                  >
                    {message.content}
                  </Markdown>
                  {busy && i === messages.length - 1 && (
                    <span
                      aria-label="Writing"
                      className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-foreground align-text-bottom"
                    />
                  )}
                </div>
              )
            )}
          </div>
        )}
        {error && (
          <div className="mt-4 flex flex-col items-start gap-1.5 text-[13px]">
            <p role="alert" className="text-destructive">
              {error}
            </p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-[13px] font-normal text-muted-foreground no-underline hover:text-foreground hover:no-underline"
              onClick={() => useSettingsDialog.getState().show('ai')}
            >
              Open AI settings
            </Button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            id="tutor-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (isShortcut(e, 'sendMessage') && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="Ask about this issue"
            aria-label="Ask about this issue"
            disabled={!provider || outOfMessages}
            className="max-h-40 min-h-16 resize-none border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent dark:bg-transparent"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              {busy ? (
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Stop"
                  className="border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
                  onClick={stop}
                >
                  <Square />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Send"
                  className="border-input bg-transparent shadow-none dark:bg-transparent dark:hover:bg-accent"
                  disabled={!canSend}
                  onClick={submit}
                >
                  <SendHorizontal />
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent>{busy ? 'Stop' : 'Send'}</TooltipContent>
          </Tooltip>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {provider ? `Using ${provider.label}` : 'No AI provider yet'}
          {budgeted && `, ${remaining} of ${MESSAGE_BUDGET} messages left this session`}
        </p>
      </div>
    </aside>
  )
}

function Attachment({ attachment }: { attachment: AiAttachment }): React.JSX.Element {
  return (
    <figure className="w-full min-w-0 border-l-2 border-input pl-3">
      <figcaption className="truncate text-xs text-muted-foreground">{attachment.label}</figcaption>
      <pre
        className={cn(
          'mt-1 max-h-32 overflow-auto text-xs leading-5 whitespace-pre-wrap text-muted-foreground',
          attachment.kind === 'hint' ? 'font-sans' : 'font-mono'
        )}
      >
        {attachment.text}
      </pre>
    </figure>
  )
}

function EmptyState({
  hasProvider,
  loading
}: {
  hasProvider: boolean
  loading: boolean
}): React.JSX.Element | null {
  const openMenu = useAi((s) => s.openMenu)
  const setupStep = useOpencodeSetup((s) => s.setup.step)
  if (loading) return null
  // A setup started here stays in view until OpenCode has answered.
  if (!hasProvider || (setupStep !== 'idle' && setupStep !== 'ready')) {
    return (
      <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
        <p>
          The tutor needs an AI provider. If Claude Code, Codex, OpenCode or Gemini CLI is installed
          and signed in on this computer, it is picked up on its own. You can also add your own API
          key, or install OpenCode here with its free models.
        </p>
        <InstallOpencode />
        <Button variant="outline" size="sm" onClick={openMenu}>
          Set up AI
        </Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 text-sm text-muted-foreground">
      <p>
        Ask about this issue: why a task fails, what a line does, or where to start. The tutor
        guides you to the answer rather than writing it for you.
      </p>
      <p>It sees the lesson, the tasks, the file you have open and your latest check.</p>
      <p>
        To ask about some code, select it and pick Explain this from the right-click menu, or press{' '}
        <kbd className="font-mono text-xs">
          <ShortcutKeys id="explainCode" />
        </kbd>
        .
      </p>
    </div>
  )
}
