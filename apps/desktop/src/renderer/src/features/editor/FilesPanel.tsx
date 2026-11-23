import { useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react'
import { chapterKey } from '@shared/rules'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useOpenTabs } from '@/stores/tabs'
import { useWorkspace } from '@/stores/workspace'
import { endFileDrag, startFileDrag } from './fileDrag'
import { FileLabel } from './FileTab'
import { focusEditorSoon } from './editors'
import { fileChange } from './fileChange'
import { buildTree, foldersAbove, visibleRows, type TreeRow } from './fileTree'

const INDENT_PX = 12
const indent = (level: number): React.CSSProperties => ({
  paddingLeft: 4 + (level - 1) * INDENT_PX
})

export function FilesPanel(): React.JSX.Element {
  // Paths and marks only, so typing renders the tree again only when a file's mark changes.
  const paths = useWorkspace(useShallow((s) => s.files.map((f) => f.path)))
  const marks = useWorkspace(useShallow((s) => s.files.map((f) => fileChange(s.starter, f))))
  const folders = useWorkspace((s) => s.folders)
  const activePath = useWorkspace((s) => s.activePath)
  const openFile = useWorkspace((s) => s.openFile)
  const chapter = useWorkspace((s) => s.chapter)
  const key = chapter ? chapterKey(chapter.labId, chapter.id) : ''
  const remembered = useOpenTabs((s) => s.expandedByChapter[key])
  const rememberExpanded = useOpenTabs((s) => s.rememberExpanded)
  const [focused, setFocused] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const treeRef = useRef<HTMLDivElement>(null)

  const expanded = useMemo(
    () => new Set(remembered ?? foldersAbove(chapter?.files ?? [])),
    [remembered, chapter]
  )
  const changes = useMemo(() => new Map(paths.map((path, i) => [path, marks[i]])), [paths, marks])
  const tree = useMemo(
    () =>
      buildTree(
        [...changes.keys()],
        folders,
        [...changes].filter(([, change]) => change).map(([path]) => path)
      ),
    [changes, folders]
  )
  const rows = visibleRows(tree, expanded)
  const current =
    rows.find((r) => r.node.path === focused) ??
    rows.find((r) => r.node.path === activePath) ??
    rows[0]

  const setOpen = (path: string, open: boolean): void => {
    const next = [...expanded].filter((p) => p !== path)
    rememberExpanded(key, open ? [...next, path] : next)
  }

  const focusPath = (path: string): void => {
    setFocused(path)
    requestAnimationFrame(() =>
      treeRef.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`)?.focus()
    )
  }

  const focusRow = (row: TreeRow | undefined): void => {
    if (row) focusPath(row.node.path)
  }

  const activate = (row: TreeRow): void => {
    if (row.node.kind === 'file') openFile(row.node.path)
    else setOpen(row.node.path, !expanded.has(row.node.path))
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    // Keys from the name input and the row menus bubble here too; only the rows move focus.
    if (!current || (event.target as HTMLElement).getAttribute('role') !== 'treeitem') return
    const index = rows.indexOf(current)
    const { node } = current
    const isOpenFolder = node.kind === 'folder' && expanded.has(node.path)
    const keys: Record<string, () => void> = {
      ArrowDown: () => focusRow(rows[index + 1]),
      ArrowUp: () => focusRow(rows[index - 1]),
      Home: () => focusRow(rows[0]),
      End: () => focusRow(rows[rows.length - 1]),
      ArrowRight: () => {
        if (node.kind !== 'folder') return
        if (!isOpenFolder) setOpen(node.path, true)
        else if (rows[index + 1]?.parent === node.path) focusRow(rows[index + 1])
      },
      ArrowLeft: () => {
        if (isOpenFolder) setOpen(node.path, false)
        else focusRow(rows.find((r) => r.node.path === current.parent))
      },
      Enter: () => activate(current),
      ContextMenu: () => node.kind === 'file' && setMenuFor(node.path)
    }
    const name = event.key === 'F10' && event.shiftKey ? 'ContextMenu' : event.key
    const action = keys[name]
    if (!action) return
    event.preventDefault()
    action()
  }

  return (
    <>
      <div className="flex h-9 shrink-0 items-center border-b border-rule px-3">
        <span className="text-[13px] text-muted-foreground">Files</span>
      </div>
      <div
        ref={treeRef}
        role="tree"
        aria-label="Files"
        onKeyDown={onKeyDown}
        className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2"
      >
        {rows.length === 0 && (
          <p className="px-2 py-1 text-[13px] text-muted-foreground">No files yet.</p>
        )}
        {rows.map((row) => {
          const { node, level } = row
          const active = node.path === activePath
          const isFolder = node.kind === 'folder'
          const open = isFolder && expanded.has(node.path)
          return (
            <div key={node.path}>
              <div
                role="treeitem"
                aria-level={level}
                aria-expanded={isFolder ? open : undefined}
                aria-selected={active}
                tabIndex={row === current ? 0 : -1}
                data-path={node.path}
                draggable={!isFolder}
                onDragStart={(event) => startFileDrag(event, { path: node.path })}
                onDragEnd={endFileDrag}
                onFocus={() => setFocused(node.path)}
                onClick={() => activate(row)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setFocused(node.path)
                  if (!isFolder) setMenuFor(node.path)
                }}
                style={indent(level)}
                className={cn(
                  'group flex h-7 cursor-default items-center gap-1.5 rounded-md pr-1 font-mono text-[13px] text-muted-foreground outline-none select-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  active && 'bg-accent text-foreground hover:bg-accent'
                )}
              >
                {node.kind === 'folder' ? (
                  <>
                    <ChevronRightIcon
                      strokeWidth={1.5}
                      className={cn('size-3.5 shrink-0', open && 'rotate-90')}
                    />
                    <span className="min-w-0 truncate text-foreground/75">{node.name}</span>
                    {node.changed && (
                      <span
                        aria-label="Holds changed files"
                        className="ml-auto flex w-3 shrink-0 justify-center"
                      >
                        <span className="size-1.5 rounded-full bg-muted-foreground" />
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="w-3.5 shrink-0" />
                    <FileLabel
                      path={node.name}
                      change={changes.get(node.path) ?? null}
                      active={active}
                    />
                  </>
                )}
                {!isFolder && (
                  <DropdownMenu
                    open={menuFor === node.path}
                    onOpenChange={(next) => setMenuFor(next ? node.path : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`More for ${node.name}`}
                        onClick={(event) => event.stopPropagation()}
                        className={cn(
                          'hidden size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground group-hover:flex hover:bg-accent hover:text-foreground data-[state=open]:flex',
                          !changes.get(node.path) && 'ml-auto'
                        )}
                      >
                        <MoreHorizontalIcon className="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      onClick={(event) => event.stopPropagation()}
                      onCloseAutoFocus={(event) => event.preventDefault()}
                    >
                      <DropdownMenuItem
                        onSelect={() => {
                          useWorkspace.getState().openToSide(node.path)
                          focusEditorSoon()
                        }}
                      >
                        Open to the side
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
