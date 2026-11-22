import { useState } from 'react'
import { Columns2Icon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ShortcutKeys } from '@/components/app/ShortcutKeys'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/stores/workspace'
import { TOUR } from '@/features/tour/anchors'
import { CodeEditor } from './CodeEditor'
import { focusEditorSoon } from './editors'
import { FileLabel } from './FileTab'
import { fileChange } from './fileChange'
import { endFileDrag, startFileDrag, useFileDrag, type FileDrag } from './fileDrag'
import type { DropTarget } from './layout'

interface Props {
  group: number
  onCheck(): void
  onRun(): void
}

/** One editor group: its tab strip and the editor showing its active file. */
export function EditorGroup({ group, onCheck, onRun }: Props): React.JSX.Element {
  const files = useWorkspace((s) => s.files)
  const starter = useWorkspace((s) => s.starter)
  const tabs = useWorkspace((s) => s.layout.groups[group])
  const focused = useWorkspace((s) => s.layout.focused === group)
  const split = useWorkspace((s) => s.layout.groups.length > 1)
  const openFile = useWorkspace((s) => s.openFile)
  const closeFile = useWorkspace((s) => s.closeFile)
  const focusGroup = useWorkspace((s) => s.focusGroup)
  const drag = useFileDrag((s) => s.drag)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const paths = tabs?.paths ?? []
  const activePath = tabs?.active ?? null

  const toSide = (path: string): void => {
    useWorkspace.getState().openToSide(path, group)
    focusEditorSoon()
  }

  return (
    <div
      className="relative flex h-full min-w-0 flex-col"
      onPointerDownCapture={() => focusGroup(group)}
    >
      <div className="flex h-9 shrink-0">
        <div
          role="tablist"
          aria-label={split ? (group === 0 ? 'Left editor' : 'Right editor') : undefined}
          data-tour={group === 0 ? TOUR.editorTabs : undefined}
          className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]"
        >
          {paths.map((path) => {
            const file = files.find((f) => f.path === path)
            if (!file) return null
            const active = path === activePath
            const name = path.slice(path.lastIndexOf('/') + 1)
            return (
              <div
                key={path}
                draggable
                onDragStart={(event) => startFileDrag(event, { path, from: group })}
                onDragEnd={endFileDrag}
                onMouseDown={(event) => event.button === 1 && event.preventDefault()}
                onAuxClick={(event) => event.button === 1 && closeFile(path, group)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setMenuFor(path)
                }}
                className={cn(
                  'group relative flex shrink-0 items-center border-r border-b border-r-rule border-b-border text-muted-foreground hover:bg-accent/40 has-focus-visible:bg-accent/60',
                  active && 'border-b-transparent bg-editor hover:bg-editor'
                )}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => openFile(path, group)}
                  className="flex h-full items-center gap-2 pr-1 pl-3 font-mono text-[13px] outline-none"
                >
                  <FileLabel
                    path={path}
                    change={fileChange(starter, file)}
                    active={active && focused}
                  />
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Close ${name}`}
                      onClick={() => closeFile(path, group)}
                      className={cn(
                        'mr-1.5 flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 outline-none group-hover:opacity-100 hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:opacity-100',
                        active && 'opacity-100'
                      )}
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Close file (<ShortcutKeys id="closeFile" />)
                  </TooltipContent>
                </Tooltip>
                <DropdownMenu
                  open={menuFor === path}
                  onOpenChange={(next) => setMenuFor(next ? path : null)}
                >
                  <DropdownMenuTrigger asChild>
                    <span aria-hidden className="absolute bottom-0 left-2" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={() => toSide(path)}>
                      Open to the side
                      <DropdownMenuShortcut>
                        <ShortcutKeys id="openToSide" />
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => closeFile(path, group)}>
                      Close
                      <DropdownMenuShortcut>
                        <ShortcutKeys id="closeFile" />
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
          <div className="min-w-4 flex-1 border-b border-border" />
        </div>
        <div className="flex shrink-0 items-center border-b border-border px-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Open to the side"
                disabled={!activePath}
                onClick={() => activePath && toSide(activePath)}
                className="text-muted-foreground hover:text-foreground [&_svg]:stroke-[1.5]"
              >
                <Columns2Icon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Open to the side (<ShortcutKeys id="openToSide" />)
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1">
        <CodeEditor group={group} onCheck={onCheck} onRun={onRun} />
        {!activePath && (
          <p className="absolute inset-0 flex items-center justify-center bg-editor text-sm text-muted-foreground">
            Open a file from the files panel.
          </p>
        )}
      </div>
      {drag && <DropZone group={group} split={split} drag={drag} />}
    </div>
  )
}

/** Covers the group while a file is dragged, the editor included, and outlines where it lands. */
function DropZone({
  group,
  split,
  drag
}: {
  group: number
  split: boolean
  drag: FileDrag
}): React.JSX.Element {
  const [over, setOver] = useState<DropTarget | null>(null)

  const targetAt = (event: React.DragEvent<HTMLDivElement>): DropTarget => {
    if (split) return group
    const box = event.currentTarget.getBoundingClientRect()
    return event.clientX - box.left > box.width / 2 ? 'side' : group
  }

  return (
    <div
      className="absolute inset-0 z-20"
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setOver(targetAt(event))
      }}
      onDragLeave={() => setOver(null)}
      onDrop={(event) => {
        event.preventDefault()
        endFileDrag()
        useWorkspace.getState().dropFile(drag.path, targetAt(event), drag.from)
        focusEditorSoon()
      }}
    >
      {over !== null && (
        <div
          className={cn(
            'pointer-events-none absolute inset-y-1 rounded-md bg-accent/60 ring-1 ring-border',
            over === 'side' ? 'right-1 left-1/2' : 'inset-x-1'
          )}
        />
      )}
    </div>
  )
}
