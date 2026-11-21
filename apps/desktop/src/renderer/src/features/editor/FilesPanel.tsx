import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ChevronRightIcon,
  FilePlusIcon,
  FolderIcon,
  FolderPlusIcon,
  MoreHorizontalIcon
} from 'lucide-react'
import { joinPath, newNameProblem } from '@shared/fileNames'
import { chapterKey } from '@shared/rules'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, errorMessage } from '@/lib/utils'
import { useOpenTabs } from '@/stores/tabs'
import { useWorkspace } from '@/stores/workspace'
import { FileLabel, FileTypeIcon } from './FileTab'
import { fileChange } from './fileChange'
import {
  buildTree,
  foldersAbove,
  isInside,
  nameOf,
  parentOf,
  visibleRows,
  type TreeRow
} from './fileTree'

const INDENT_PX = 12
const indent = (level: number): React.CSSProperties => ({
  paddingLeft: 4 + (level - 1) * INDENT_PX
})

/** A name being typed: a new file or folder in `folder`, or a new name for `path`. */
type Draft =
  | { kind: 'file' | 'folder'; folder: string | null }
  | { kind: 'rename'; path: string; isFolder: boolean }

export function FilesPanel(): React.JSX.Element {
  const files = useWorkspace((s) => s.files)
  const folders = useWorkspace((s) => s.folders)
  const starter = useWorkspace((s) => s.starter)
  const activePath = useWorkspace((s) => s.activePath)
  const openFile = useWorkspace((s) => s.openFile)
  const chapter = useWorkspace((s) => s.chapter)
  const key = chapter ? chapterKey(chapter.labId, chapter.id) : ''
  const remembered = useOpenTabs((s) => s.expandedByChapter[key])
  const rememberExpanded = useOpenTabs((s) => s.rememberExpanded)
  const [focused, setFocused] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
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
  const taken = useMemo(() => [...files.map((f) => f.path), ...folders], [files, folders])

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

  const startNew = (kind: 'file' | 'folder', folder: string | null): void => {
    if (folder && !expanded.has(folder)) setOpen(folder, true)
    setDraft({ kind, folder })
  }

  /** New items from the toolbar go in the folder of the row last focused, or the active file's. */
  const toolbarFolder = (): string | null => {
    const row = rows.find((r) => r.node.path === focused)
    if (row) return row.node.kind === 'folder' ? row.node.path : row.parent
    return activePath ? parentOf(activePath) : null
  }

  const submit = async (name: string): Promise<void> => {
    const store = useWorkspace.getState()
    if (!draft) return
    if (draft.kind === 'rename') {
      const to = joinPath(parentOf(draft.path), name)
      if (to !== draft.path) await store.renamePath(draft.path, to)
      setDraft(null)
      focusPath(to)
      return
    }
    const path = joinPath(draft.folder, name)
    if (draft.kind === 'file') await store.createFile(path)
    else await store.createFolder(path)
    setDraft(null)
    focusPath(path)
  }

  const cancel = (): void => {
    const path = draft?.kind === 'rename' ? draft.path : draft?.folder
    setDraft(null)
    if (path) focusPath(path)
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
      ContextMenu: () => setMenuFor(node.path)
    }
    const name = event.key === 'F10' && event.shiftKey ? 'ContextMenu' : event.key
    const action = keys[name]
    if (!action) return
    event.preventDefault()
    action()
  }

  const nameInput = (level: number): React.JSX.Element | null => {
    if (!draft) return null
    const renaming = draft.kind === 'rename' ? draft.path : undefined
    const folder = draft.kind === 'rename' ? parentOf(draft.path) : draft.folder
    const isFolder = draft.kind === 'rename' ? draft.isFolder : draft.kind === 'folder'
    return (
      <NameInput
        key={renaming ?? `${draft.kind}:${folder ?? ''}`}
        level={level}
        isFolder={isFolder}
        initial={renaming ? nameOf(renaming) : ''}
        label={renaming ? `New name for ${nameOf(renaming)}` : `Name of the new ${draft.kind}`}
        problem={(name) => newNameProblem(name, folder, taken, renaming)}
        onSubmit={submit}
        onCancel={cancel}
      />
    )
  }

  const newDraftAt =
    draft && draft.kind !== 'rename'
      ? draft.folder === null
        ? -1
        : rows.findIndex((r) => r.node.path === draft.folder)
      : null
  const newDraftLevel = newDraftAt === null || newDraftAt === -1 ? 1 : rows[newDraftAt].level + 1

  const deletingFolder = deleting !== null && folders.includes(deleting)
  const deletingCount = deleting ? files.filter((f) => isInside(f.path, deleting)).length : 0

  return (
    <>
      <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-rule pr-1 pl-3">
        <span className="flex-1 text-[13px] text-muted-foreground">Files</span>
        <ToolbarButton label="New file" onClick={() => startNew('file', toolbarFolder())}>
          <FilePlusIcon />
        </ToolbarButton>
        <ToolbarButton label="New folder" onClick={() => startNew('folder', toolbarFolder())}>
          <FolderPlusIcon />
        </ToolbarButton>
      </div>
      <div
        ref={treeRef}
        role="tree"
        aria-label="Files"
        onKeyDown={onKeyDown}
        className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2"
      >
        {newDraftAt === -1 && nameInput(1)}
        {rows.length === 0 && !draft && (
          <p className="px-2 py-1 text-[13px] text-muted-foreground">No files yet.</p>
        )}
        {rows.map((row, index) => {
          const { node, level } = row
          if (draft?.kind === 'rename' && draft.path === node.path) {
            return <div key={node.path}>{nameInput(level)}</div>
          }
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
                onFocus={() => setFocused(node.path)}
                onClick={() => activate(row)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setFocused(node.path)
                  setMenuFor(node.path)
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
                        !(isFolder ? node.changed : changes.get(node.path)) && 'ml-auto'
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
                    {isFolder && (
                      <>
                        <DropdownMenuItem onSelect={() => startNew('file', node.path)}>
                          New file
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => startNew('folder', node.path)}>
                          New folder
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onSelect={() => setDraft({ kind: 'rename', path: node.path, isFolder })}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(node.path)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {newDraftAt === index && nameInput(newDraftLevel)}
            </div>
          )
        })}
      </div>
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="bg-popover">
          <AlertDialogHeader>
            <AlertDialogTitle className="break-all">Delete {deleting}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingFolder && deletingCount > 0 && (
                <>
                  {deletingCount === 1
                    ? 'It holds 1 file, which is deleted too. '
                    : `It holds ${deletingCount} files, which are deleted too. `}
                </>
              )}
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleting) return
                const path = deleting
                useWorkspace
                  .getState()
                  .removePath(path)
                  .then(() => {
                    const parent = parentOf(path)
                    if (parent) focusPath(parent)
                  })
                  .catch((error) =>
                    toast.error(`Could not delete ${path}`, { description: errorMessage(error) })
                  )
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function NameInput({
  level,
  isFolder,
  initial,
  label,
  problem,
  onSubmit,
  onCancel
}: {
  level: number
  isFolder: boolean
  initial: string
  label: string
  problem(name: string): string | null
  onSubmit(name: string): Promise<void>
  onCancel(): void
}): React.JSX.Element {
  const [value, setValue] = useState(initial)
  const [tried, setTried] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const name = value.trim()
  const shown = failed ?? (tried || name ? problem(name) : null)

  const submit = async (): Promise<void> => {
    setTried(true)
    if (problem(name) || saving) return
    setSaving(true)
    try {
      await onSubmit(name)
    } catch (error) {
      setFailed(errorMessage(error))
      setSaving(false)
    }
  }

  return (
    <div role="none" style={indent(level)} onClick={(event) => event.stopPropagation()}>
      <div className="flex h-7 items-center gap-1.5 pr-1">
        <span className="w-3.5 shrink-0" />
        {isFolder ? (
          <FolderIcon strokeWidth={1.5} className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <FileTypeIcon path={name} />
        )}
        <Input
          autoFocus
          aria-label={label}
          aria-invalid={!!shown}
          value={value}
          spellCheck={false}
          onFocus={(event) => {
            const dot = isFolder ? -1 : event.target.value.lastIndexOf('.')
            event.target.setSelectionRange(0, dot > 0 ? dot : event.target.value.length)
          }}
          onChange={(event) => {
            setValue(event.target.value)
            setFailed(null)
          }}
          onBlur={() => !saving && onCancel()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void submit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              onCancel()
            }
          }}
          className="h-6 rounded-sm px-1.5 py-0 font-mono text-[13px] md:text-[13px]"
        />
      </div>
      {shown && (
        <p role="alert" className="pr-1 pb-1 pl-9 text-xs text-destructive">
          {shown}
        </p>
      )}
    </div>
  )
}

function ToolbarButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick(): void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          onClick={onClick}
          className="text-muted-foreground hover:text-foreground [&_svg]:size-3.5 [&_svg]:stroke-[1.5]"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
