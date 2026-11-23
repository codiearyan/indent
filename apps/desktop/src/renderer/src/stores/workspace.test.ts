import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Chapter, WorkspaceFile, WorkspaceSnapshot } from '@shared/types'

// Every api method is a mock, made the first time it is read.
const { api, toast } = vi.hoisted(() => {
  const namespaces = new Map<string, Record<string | symbol, unknown>>()
  const api = new Proxy({} as Record<string, Record<string, ReturnType<typeof vi.fn>>>, {
    get: (_, namespace: string) => {
      if (!namespaces.has(namespace)) {
        const methods: Record<string | symbol, unknown> = {}
        namespaces.set(
          namespace,
          new Proxy(methods, { get: (target, method) => (target[method] ??= vi.fn()) })
        )
      }
      return namespaces.get(namespace)
    }
  })
  const toast = Object.assign(vi.fn(), { error: vi.fn() })
  return { api, toast }
})

vi.mock('@/lib/api', () => ({ api }))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/lib/telemetry', () => ({ track: vi.fn() }))
vi.mock('./settings', () => ({ useSettings: { getState: () => ({ setLeftTab: vi.fn() }) } }))

const { useWorkspace } = await import('./workspace')
const { useOpenTabs } = await import('./tabs')
const { useCatalog } = await import('./catalog')

function chapter(id: string, files = ['index.js']): Chapter {
  return {
    id,
    labId: 'shop',
    labTitle: 'Shop',
    number: 1,
    title: id,
    lesson: '',
    files,
    tasks: [{ id: 'a' }, { id: 'b' }],
    terminal: { description: '', suggestedCommand: 'node index.js' }
  } as unknown as Chapter
}

function snapshot(
  files: WorkspaceFile[],
  extra: Partial<WorkspaceSnapshot> = {}
): WorkspaceSnapshot {
  return {
    dir: '/work/shop/one',
    files,
    folders: [],
    starter: Object.fromEntries(files.map((f) => [f.path, f.content])),
    conflicts: [],
    updated: [],
    remembered: true,
    missing: [],
    ...extra
  }
}

const file = (path: string, content: string): WorkspaceFile => ({ path, content })

/** A promise the test settles by hand, to hold a call in flight. */
function later<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

const progress = { chapters: {} }
const initial = useWorkspace.getState()

async function openIssue(id = 'one', files = [file('index.js', 'start')]): Promise<void> {
  api.content.getChapter.mockResolvedValueOnce(
    chapter(
      id,
      files.map((f) => f.path)
    )
  )
  api.workspace.open.mockResolvedValueOnce(snapshot(files))
  await useWorkspace.getState().open('shop', id)
}

const content = (path: string): string | undefined =>
  useWorkspace.getState().files.find((f) => f.path === path)?.content

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  useWorkspace.setState(initial, true)
  useOpenTabs.setState({ byChapter: {}, expandedByChapter: {} })
  useCatalog.setState({ labs: null })
  api.workspace.findElsewhere.mockResolvedValue(null)
  api.workspace.writeFile.mockResolvedValue(undefined)
  api.progress.touch.mockResolvedValue(progress)
})

afterEach(async () => {
  // A test may leave a save waiting; it must not land in the next one.
  await useWorkspace
    .getState()
    .open('shop', 'none')
    .catch(() => {})
  vi.useRealTimers()
})

describe('open', () => {
  it('shows the issue, its files and the tabs it lists', async () => {
    await openIssue('one', [file('index.js', 'start'), file('notes.md', 'n')])
    const state = useWorkspace.getState()
    expect(state.status).toBe('ready')
    expect(state.chapter?.id).toBe('one')
    expect(state.files.map((f) => f.path)).toEqual(['index.js', 'notes.md'])
    expect(state.activePath).toBe('index.js')
  })

  it('restores the tabs remembered for the issue', async () => {
    useOpenTabs.getState().remember('shop/one', { paths: ['notes.md'], active: 'notes.md' })
    await openIssue('one', [file('index.js', 'start'), file('notes.md', 'n')])
    expect(useWorkspace.getState().activePath).toBe('notes.md')
  })

  it('drops an open that was left for another issue', async () => {
    const slow = later<Chapter>()
    api.content.getChapter.mockReturnValueOnce(slow.promise)
    api.workspace.open.mockResolvedValueOnce(snapshot([file('old.js', 'old')]))
    const first = useWorkspace.getState().open('shop', 'one')
    await vi.waitFor(() => expect(api.content.getChapter).toHaveBeenCalledTimes(1))

    await openIssue('two', [file('new.js', 'new')])
    slow.resolve(chapter('one', ['old.js']))
    await first

    expect(useWorkspace.getState().chapter?.id).toBe('two')
    expect(content('new.js')).toBe('new')
    expect(content('old.js')).toBeUndefined()
  })

  it('says why the issue could not open', async () => {
    api.content.getChapter.mockRejectedValueOnce(new Error('No such issue'))
    api.workspace.open.mockResolvedValueOnce(snapshot([]))
    await useWorkspace.getState().open('shop', 'one')
    expect(useWorkspace.getState()).toMatchObject({ status: 'error', error: 'No such issue' })
  })

  it('stops at the earlier work folder that holds the issue', async () => {
    api.workspace.findElsewhere.mockResolvedValueOnce('/old/work')
    await useWorkspace.getState().open('shop', 'one')
    expect(useWorkspace.getState()).toMatchObject({ status: 'elsewhere', elsewhere: '/old/work' })
    expect(api.workspace.open).not.toHaveBeenCalled()
  })

  it('writes what was typed in the issue before leaving it', async () => {
    await openIssue('one')
    useWorkspace.getState().edit('index.js', 'typed')
    await openIssue('two')
    expect(api.workspace.writeFile).toHaveBeenCalledWith('shop', 'one', 'index.js', 'typed')
  })

  it('is not held back by a save that fails', async () => {
    await openIssue('one')
    api.workspace.writeFile.mockRejectedValueOnce(new Error('disk full'))
    useWorkspace.getState().edit('index.js', 'typed')
    await openIssue('two', [file('index.js', 'other')])
    expect(useWorkspace.getState().chapter?.id).toBe('two')
    // The failed path of the first issue is not pending in the second, so a refresh reads disk.
    api.workspace.open.mockResolvedValueOnce(snapshot([file('index.js', 'from disk')]))
    await useWorkspace.getState().refresh()
    expect(content('index.js')).toBe('from disk')
  })
})

describe('edit', () => {
  it('saves once after a pause, with the last text', async () => {
    await openIssue()
    const edit = useWorkspace.getState().edit
    edit('index.js', 'a')
    edit('index.js', 'ab')
    expect(content('index.js')).toBe('ab')
    expect(api.workspace.writeFile).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(400)
    expect(api.workspace.writeFile).toHaveBeenCalledTimes(1)
    expect(api.workspace.writeFile).toHaveBeenCalledWith('shop', 'one', 'index.js', 'ab')
  })

  it('counts each write, so the page knows to reload', async () => {
    await openIssue()
    const before = useWorkspace.getState().revision
    useWorkspace.getState().edit('index.js', 'a')
    await vi.advanceTimersByTimeAsync(400)
    expect(useWorkspace.getState().revision).toBe(before + 1)
  })

  it('writes at once on flush', async () => {
    await openIssue()
    useWorkspace.getState().edit('index.js', 'now')
    await useWorkspace.getState().flush()
    expect(api.workspace.writeFile).toHaveBeenCalledWith('shop', 'one', 'index.js', 'now')
    await vi.advanceTimersByTimeAsync(400)
    expect(api.workspace.writeFile).toHaveBeenCalledTimes(1)
  })

  it('writes a file whose tab closes before the pause ends', async () => {
    await openIssue()
    useWorkspace.getState().edit('index.js', 'closing')
    useWorkspace.getState().closeFile('index.js')
    await vi.waitFor(() =>
      expect(api.workspace.writeFile).toHaveBeenCalledWith('shop', 'one', 'index.js', 'closing')
    )
  })
})

describe('a save that fails', () => {
  it('says so once and keeps the text', async () => {
    await openIssue()
    api.workspace.writeFile.mockRejectedValue(new Error('read-only'))
    useWorkspace.getState().edit('index.js', 'mine')
    await vi.advanceTimersByTimeAsync(400)
    expect(toast.error).toHaveBeenCalledWith(
      'Could not save index.js',
      expect.objectContaining({ id: 'save-failed', description: 'read-only' })
    )
    expect(content('index.js')).toBe('mine')
  })

  it('is not replaced by a refresh, and is tried again by the next flush', async () => {
    await openIssue()
    api.workspace.writeFile.mockRejectedValueOnce(new Error('read-only'))
    useWorkspace.getState().edit('index.js', 'mine')
    await vi.advanceTimersByTimeAsync(400)

    await useWorkspace.getState().refresh()
    expect(api.workspace.open).toHaveBeenCalledTimes(1)
    expect(content('index.js')).toBe('mine')

    await useWorkspace.getState().flush()
    expect(api.workspace.writeFile).toHaveBeenLastCalledWith('shop', 'one', 'index.js', 'mine')
  })

  it('stops a Check from running on text that is not on disk', async () => {
    await openIssue()
    api.workspace.writeFile.mockRejectedValueOnce(new Error('read-only'))
    useWorkspace.getState().edit('index.js', 'mine')
    await expect(useWorkspace.getState().check()).rejects.toThrow('read-only')
    expect(api.checks.run).not.toHaveBeenCalled()
    expect(useWorkspace.getState().checking).toBeNull()
  })
})

describe('refresh', () => {
  it('takes changes made on disk', async () => {
    await openIssue()
    api.workspace.open.mockResolvedValueOnce(
      snapshot([file('index.js', 'from terminal'), file('out.txt', 'made')])
    )
    await useWorkspace.getState().refresh()
    expect(content('index.js')).toBe('from terminal')
    expect(content('out.txt')).toBe('made')
  })

  it('waits while an edit is not saved yet', async () => {
    await openIssue()
    useWorkspace.getState().edit('index.js', 'typing')
    await useWorkspace.getState().refresh()
    expect(api.workspace.open).toHaveBeenCalledTimes(1)
    expect(content('index.js')).toBe('typing')
  })

  it('drops what it read when an edit came in meanwhile', async () => {
    await openIssue()
    const reading = later<WorkspaceSnapshot>()
    api.workspace.open.mockReturnValueOnce(reading.promise)
    const refresh = useWorkspace.getState().refresh()
    useWorkspace.getState().edit('index.js', 'typed while reading')
    reading.resolve(snapshot([file('index.js', 'old')]))
    await refresh
    expect(content('index.js')).toBe('typed while reading')
  })

  it('drops what it read when another issue opened meanwhile', async () => {
    await openIssue('one')
    const reading = later<WorkspaceSnapshot>()
    api.workspace.open.mockReturnValueOnce(reading.promise)
    const refresh = useWorkspace.getState().refresh()
    await openIssue('two', [file('two.js', 'two')])
    reading.resolve(snapshot([file('one.js', 'one')]))
    await refresh
    expect(useWorkspace.getState().files.map((f) => f.path)).toEqual(['two.js'])
  })

  it('leaves the store alone when nothing on disk changed', async () => {
    await openIssue('one', [file('index.js', 'a'), file('notes.md', 'b')])
    api.workspace.open.mockResolvedValueOnce(
      snapshot([file('index.js', 'a'), file('notes.md', 'b')])
    )
    const listener = vi.fn()
    const off = useWorkspace.subscribe(listener)
    await useWorkspace.getState().refresh()
    off()
    expect(listener).not.toHaveBeenCalled()
  })

  it('keeps the files that did not change as they were', async () => {
    await openIssue('one', [file('index.js', 'a'), file('notes.md', 'b')])
    const [index] = useWorkspace.getState().files
    api.workspace.open.mockResolvedValueOnce(
      snapshot([file('index.js', 'a'), file('notes.md', 'changed')])
    )
    await useWorkspace.getState().refresh()
    expect(useWorkspace.getState().files[0]).toBe(index)
    expect(content('notes.md')).toBe('changed')
  })

  it('closes the tabs of files that are gone', async () => {
    await openIssue('one', [file('index.js', 'a'), file('notes.md', 'b')])
    useWorkspace.getState().openFile('notes.md')
    api.workspace.open.mockResolvedValueOnce(snapshot([file('index.js', 'a')]))
    await useWorkspace.getState().refresh()
    expect(useWorkspace.getState().layout.groups[0].paths).toEqual(['index.js'])
    expect(useWorkspace.getState().activePath).toBe('index.js')
  })
})

describe('check', () => {
  it('saves first, then runs the tasks', async () => {
    await openIssue()
    useWorkspace.getState().edit('index.js', 'answer')
    api.checks.run.mockResolvedValueOnce({
      results: [{ taskId: 'a', passed: true, details: [] }],
      progress
    })
    const results = await useWorkspace.getState().check(['a'])
    expect(api.workspace.writeFile.mock.invocationCallOrder[0]).toBeLessThan(
      api.checks.run.mock.invocationCallOrder[0]
    )
    expect(api.checks.run).toHaveBeenCalledWith('shop', 'one', ['a'])
    expect(results).toHaveLength(1)
    expect(useWorkspace.getState().checking).toBeNull()
  })

  it('reads the files again when the check could not run', async () => {
    await openIssue()
    api.checks.run.mockResolvedValueOnce({ results: [], progress })
    api.workspace.open.mockResolvedValueOnce(snapshot([]))
    await useWorkspace.getState().check()
    expect(api.workspace.open).toHaveBeenCalledTimes(2)
  })

  it('runs one check at a time', async () => {
    await openIssue()
    const running = later<{ results: never[]; progress: typeof progress }>()
    api.checks.run.mockReturnValueOnce(running.promise)
    const first = useWorkspace.getState().check()
    await vi.waitFor(() => expect(useWorkspace.getState().checking).toEqual(['a', 'b']))
    expect(await useWorkspace.getState().check()).toEqual([])
    api.workspace.open.mockResolvedValueOnce(snapshot([]))
    running.resolve({ results: [], progress })
    await first
    expect(api.checks.run).toHaveBeenCalledTimes(1)
  })
})

describe('reset', () => {
  it('drops edits that were not saved and shows the starter', async () => {
    await openIssue()
    useWorkspace.getState().edit('index.js', 'thrown away')
    api.workspace.reset.mockResolvedValueOnce(snapshot([file('index.js', 'start')]))
    await useWorkspace.getState().reset()
    await vi.advanceTimersByTimeAsync(400)
    expect(api.workspace.writeFile).not.toHaveBeenCalled()
    expect(content('index.js')).toBe('start')
  })
})

describe('run', () => {
  it('saves, then asks the terminal to run the command', async () => {
    await openIssue()
    useWorkspace.getState().edit('index.js', 'x')
    const runs = useWorkspace.getState().runs
    await useWorkspace.getState().run()
    expect(api.workspace.writeFile).toHaveBeenCalled()
    expect(useWorkspace.getState().runs).toBe(runs + 1)
  })
})
