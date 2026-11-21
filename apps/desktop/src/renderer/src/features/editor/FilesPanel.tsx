import { useMemo, useRef, useState } from 'react'
import { ChevronRightIcon } from 'lucide-react'
import { chapterKey } from '@shared/rules'
import { cn } from '@/lib/utils'
import { useOpenTabs } from '@/stores/tabs'
import { useWorkspace } from '@/stores/workspace'
import { FileLabel } from './FileTab'
import { fileChange } from './fileChange'
import { buildTree, foldersAbove, visibleRows, type TreeRow } from './fileTree'

const INDENT_PX = 12

export function FilesPanel(): React.JSX.Element {
  const files = useWorkspace((s) => s.files)
  const starter = useWorkspace((s) => s.starter)
  const activePath = useWorkspace((s) => s.activePath)
  const openFile = useWorkspace((s) => s.openFile)
  const chapter = useWorkspace((s) => s.chapter)
  const key = chapter ? chapterKey(chapter.labId, chapter.id) : ''
  const remembered = useOpenTabs((s) => s.expandedByChapter[key])
  const rememberExpanded = useOpenTabs((s) => s.rememberExpanded)
  const [focused, setFocused] = useState<string | null>(null)
  const treeRef = useRef<HTMLDivElement>(null)

  const expanded = useMemo(
    () => new Set(remembered ?? foldersAbove(chapter?.files ?? [])),
    [remembered, chapter]
  )
  const changes = useMemo(
    () => new Map(files.map((f) => [f.path, fileChange(starter, f)])),
    [files, starter]
  )
  const tree = useMemo(
    () =>
      buildTree(
        [...changes.keys()],
        [],
        [...changes].filter(([, change]) => change).map(([path]) => path)
      ),
    [changes]
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

  const focusRow = (row: TreeRow | undefined): void => {
    if (!row) return
    setFocused(row.node.path)
    treeRef.current
      ?.querySelector<HTMLElement>(`[data-path="${CSS.escape(row.node.path)}"]`)
      ?.focus()
  }

  const activate = (row: TreeRow): void => {
    if (row.node.kind === 'file') openFile(row.node.path)
    else setOpen(row.node.path, !expanded.has(row.node.path))
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (!current) return
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
        if (isOpenFolder)
          focusRow(rows[index + 1]?.parent === node.path ? rows[index + 1] : undefined)
        else setOpen(node.path, true)
      },
      ArrowLeft: () => {
        if (isOpenFolder) setOpen(node.path, false)
        else focusRow(rows.find((r) => r.node.path === current.parent))
      },
      Enter: () => activate(current)
    }
    const action = keys[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  return (
    <div
      ref={treeRef}
      role="tree"
      aria-label="Files"
      onKeyDown={onKeyDown}
      className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2"
    >
      {rows.map((row) => {
        const { node, level } = row
        const active = node.path === activePath
        const open = node.kind === 'folder' && expanded.has(node.path)
        return (
          <div
            key={node.path}
            role="treeitem"
            aria-level={level}
            aria-expanded={node.kind === 'folder' ? open : undefined}
            aria-selected={active}
            tabIndex={row === current ? 0 : -1}
            data-path={node.path}
            onFocus={() => setFocused(node.path)}
            onClick={() => activate(row)}
            style={{ paddingLeft: 4 + (level - 1) * INDENT_PX }}
            className={cn(
              'flex h-7 cursor-default items-center gap-1.5 rounded-md pr-2 font-mono text-[13px] text-muted-foreground outline-none select-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
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
          </div>
        )
      })}
    </div>
  )
}
