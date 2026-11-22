import { useEffect, useEffectEvent, useState } from 'react'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  applyOverrides,
  conflictOf,
  formatKeys,
  keysFromEvent,
  refusal,
  sameKeys,
  SHORTCUTS,
  swapKeys,
  withKeys,
  type ShortcutId
} from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/settings'
import { shortcutGroups, type ShortcutRow } from '@/features/shortcuts/list'
import { Group, Row, card } from './controls'

type Editing =
  | { id: ShortcutId; recording: true; message?: string }
  | { id: ShortcutId; recording: false; keys: string; other: ShortcutId }

/**
 * Every shortcut with its keys; a click on the keys records new ones. Settings and the shortcut
 * list both show this, so they always agree.
 */
export function KeyboardSection(): React.JSX.Element {
  const overrides = useSettings((s) => s.shortcuts)
  const setShortcuts = useSettings((s) => s.setShortcuts)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const platform = window.platform
  const shortcuts = applyOverrides(overrides)
  const groups = shortcutGroups(platform, query, shortcuts)
  const recording = editing?.recording ? editing.id : null

  /** Gives `id` these keys, or holds them for Swap when another shortcut has them. */
  const pick = (id: ShortcutId, keys: string): void => {
    const saved = useSettings.getState().shortcuts
    const current = applyOverrides(saved)
    const other = conflictOf(current, id, keys)
    if (!other) {
      setShortcuts(withKeys(saved, id, keys))
      setEditing(null)
    } else if (swapKeys(saved, id, other, keys, platform)) {
      setEditing({ id, recording: false, keys, other })
    } else {
      const message = `${formatKeys(keys, platform)} is used by ${current[other].label}. Pick other keys.`
      setEditing({ id, recording: true, message })
    }
  }

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (!editing) return
    // Escape while Swap is offered drops the offer and keeps the window open.
    if (!recording) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      return setEditing(null)
    }
    event.preventDefault()
    event.stopImmediatePropagation()
    if (event.repeat) return
    if (event.key === 'Escape') return setEditing(null)
    const keys = keysFromEvent(event, platform)
    if (!keys) return
    const refused = refusal(keys, SHORTCUTS[recording].scope, platform)
    if (refused) setEditing({ id: recording, recording: true, message: refused })
    else pick(recording, keys)
  })

  const active = editing !== null
  useEffect(() => {
    if (!active) return
    const listener = (event: KeyboardEvent): void => onKey(event)
    window.addEventListener('keydown', listener, true)
    return () => window.removeEventListener('keydown', listener, true)
  }, [active])

  const clear = (id: ShortcutId): void => {
    setShortcuts(withKeys(useSettings.getState().shortcuts, id, ''))
    setEditing(null)
  }

  const swap = (): void => {
    if (editing?.recording !== false) return
    const next = swapKeys(overrides, editing.id, editing.other, editing.keys, platform)
    if (next) setShortcuts(next)
    setEditing(null)
  }

  const row = ({ id, label, keys }: ShortcutRow): React.JSX.Element => {
    const mine = editing?.id === id ? editing : null
    let hint: React.ReactNode = null
    if (mine?.recording) {
      hint = mine.message ? (
        <span className="text-destructive">{mine.message}</span>
      ) : (
        'Press the new keys, Esc to cancel.'
      )
    } else if (mine) {
      hint = <span className="text-foreground">Also used by {shortcuts[mine.other].label}.</span>
    }

    return (
      <Row
        key={id}
        id={`shortcut-${id}`}
        label={label}
        hint={hint}
        onReset={
          sameKeys(shortcuts[id].keys, SHORTCUTS[id].keys)
            ? undefined
            : () => pick(id, SHORTCUTS[id].keys)
        }
      >
        {mine && !mine.recording ? (
          <div className="flex shrink-0 items-center gap-2">
            <Kbd>{formatKeys(mine.keys, platform)}</Kbd>
            <Button variant="outline" size="xs" onClick={swap}>
              Swap
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            {keys.length > 0 && !mine && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Clear the keys of ${label}`}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => clear(id)}
                  >
                    <XIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear keys</TooltipContent>
              </Tooltip>
            )}
            <Button
              id={`shortcut-${id}`}
              variant="outline"
              size="sm"
              aria-pressed={!!mine}
              className={cn(
                'font-mono text-xs font-normal',
                !mine && keys.length === 0 && 'font-sans text-muted-foreground'
              )}
              onClick={() => setEditing(mine ? null : { id, recording: true })}
              onBlur={() => mine && setEditing(null)}
            >
              {mine ? 'Press keys' : keys.length > 0 ? keys.join(' or ') : 'Set keys'}
            </Button>
          </div>
        )}
      </Row>
    )
  }

  return (
    <>
      <div className="mt-6 flex items-center gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or keys"
          aria-label="Search shortcuts"
        />
        <ResetAll
          disabled={Object.keys(overrides).length === 0}
          onConfirm={() => {
            setShortcuts({})
            setEditing(null)
          }}
        />
      </div>
      {groups.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No shortcut matches.</p>
      ) : (
        groups.map((group) => (
          <Group key={group.title} title={group.title}>
            <div className={card}>{group.rows.map(row)}</div>
          </Group>
        ))
      )}
    </>
  )
}

function Kbd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <kbd className="rounded-sm border border-input px-1.5 py-0.5 font-mono text-xs">{children}</kbd>
  )
}

function ResetAll({
  disabled,
  onConfirm
}: {
  disabled: boolean
  onConfirm(): void
}): React.JSX.Element {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="shrink-0">
          Reset all
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset all shortcuts?</AlertDialogTitle>
          <AlertDialogDescription>
            Every shortcut goes back to its default keys.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Reset all</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
