import { useEffect, useEffectEvent, useState } from 'react'
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
import {
  applyOverrides,
  conflictOf,
  formatKeys,
  keysFromEvent,
  refusal,
  SHORTCUTS,
  swapKeys,
  withKeys,
  type ShortcutId
} from '@/lib/shortcuts'
import { useSettings } from '@/stores/settings'
import { shortcutGroups, type ShortcutRow } from '@/features/shortcuts/list'
import { Group, Row, card } from './controls'

type Editing =
  | { id: ShortcutId; recording: true; message?: string }
  | { id: ShortcutId; recording: false; keys: string; other: ShortcutId }

/** Every shortcut with its keys; a click on the keys records new ones. */
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
    if (!recording) return
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

  useEffect(() => {
    if (!recording) return
    const listener = (event: KeyboardEvent): void => onKey(event)
    window.addEventListener('keydown', listener, true)
    return () => window.removeEventListener('keydown', listener, true)
  }, [recording])

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
        onReset={overrides[id] ? () => pick(id, SHORTCUTS[id].keys) : undefined}
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
          <Button
            id={`shortcut-${id}`}
            variant="outline"
            size="sm"
            aria-pressed={!!mine}
            className="shrink-0 font-mono text-xs font-normal"
            onClick={() => setEditing(mine ? null : { id, recording: true })}
            onBlur={() => mine && setEditing(null)}
          >
            {mine ? 'Press keys' : keys.join(' or ')}
          </Button>
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
