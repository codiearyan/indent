import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { applyOverrides } from '@/lib/shortcuts'
import { useSettings } from '@/stores/settings'
import { useShortcutList } from './dialogStore'
import { shortcutGroups } from './list'

/** Every shortcut in one window, grouped by where it works, with a search. */
export function ShortcutList(): React.JSX.Element {
  const { open, setOpen } = useShortcutList()
  const [query, setQuery] = useState('')
  const overrides = useSettings((s) => s.shortcuts)
  const groups = shortcutGroups(window.platform, query, applyOverrides(overrides))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[min(600px,calc(100vh-4rem))] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[560px]"
      >
        <div className="space-y-3 border-b border-rule p-4">
          <DialogTitle className="text-sm font-semibold">Keyboard shortcuts</DialogTitle>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or keys"
            aria-label="Search shortcuts"
          />
        </div>
        <ScrollArea className="min-h-0">
          {groups.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No shortcut matches.</p>
          ) : (
            <div className="px-4 pb-2">
              {groups.map((group) => (
                <section key={group.title}>
                  <h3 className="pt-4 pb-1 text-[13px] font-medium text-muted-foreground">
                    {group.title}
                  </h3>
                  <ul>
                    {group.rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex h-12 items-center justify-between gap-4 border-t border-rule text-sm first:border-t-0"
                      >
                        <span className="min-w-0 truncate">{row.label}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {row.keys.map((keys, i) => (
                            <span key={keys} className="flex items-center gap-1.5">
                              {i > 0 && <span className="text-xs text-muted-foreground">or</span>}
                              <kbd className="rounded-sm border border-input px-1.5 font-mono text-xs">
                                {keys}
                              </kbd>
                            </span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
