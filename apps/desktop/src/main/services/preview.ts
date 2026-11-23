import { BrowserWindow, net, protocol, shell } from 'electron'
import { randomBytes } from 'crypto'
import { readFile, stat } from 'fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { createRequire } from 'module'
import type { AddressInfo } from 'net'
import { join, relative, sep } from 'path'
import { Readable } from 'stream'
import type { ReadableStream } from 'stream/web'
import { pathToFileURL } from 'url'
import {
  PREVIEW_MESSAGE,
  PREVIEW_SCHEME,
  previewTarget,
  previewUrl,
  type PreviewMessage,
  type PreviewWindowEvent
} from '@shared/preview'
import { EVENTS } from '@shared/types'
import { emit, handle, listen, markPageWindow, whenReady } from '../ipc'
import { contentDir, safeId, workspaceDir, workspacesRoot } from '../paths'
import { ensureRuntime } from './checks'
import { getChapter } from './packs'
import { CONSOLE_MARKER, RELOAD_PATH, checkRequest, parseConsoleLine } from './previewLogic'
import { isAppPath, resolveInside } from './workspaceFiles'

interface Esbuild {
  build(options: Record<string, unknown>): Promise<{
    outputFiles: { text: string }[]
    metafile: { inputs: Record<string, unknown> }
  }>
}

interface BuildFailure {
  errors?: { text: string; location?: { file: string; line: number } | null }[]
}

// Runs inside the previewed page. In the panel it passes console output, uncaught errors and the
// title to the Browser panel; in its own window it logs them for the main process to forward; in
// the system browser it only reloads the page after a save.
const BRIDGE = `<script>(() => {
  if (location.protocol === 'http:') {
    new EventSource('/${RELOAD_PATH}').onmessage = () => location.reload()
    return
  }
  const debug = console.debug
  const post = parent === window
    ? (data) => data.level && debug.call(console, '${CONSOLE_MARKER}' + JSON.stringify(data))
    : (data) => parent.postMessage({ source: '${PREVIEW_MESSAGE}', ...data }, '*')
  const format = (value) => {
    if (value instanceof Error) return value.stack || value.message
    if (typeof value !== 'object' || value === null) return String(value)
    try { return JSON.stringify(value) } catch { return String(value) }
  }
  const send = (level, args) => post({ level, text: args.map(format).join(' ') })
  for (const level of ['log', 'info', 'warn', 'error']) {
    const original = console[level]
    console[level] = (...args) => { send(level, args); original.apply(console, args) }
  }
  addEventListener('error', (event) => {
    const address = event.target !== window && (event.target.src || event.target.href)
    send('error', [address ? 'Could not load ' + address : event.error ?? event.message])
  }, true)
  addEventListener('unhandledrejection', (event) => send('error', [event.reason]))
  addEventListener('DOMContentLoaded', () => post({ title: document.title }))
})()</script>`

function withBridge(html: string): string {
  const head = /<head(\s[^>]*)?>/i
  return head.test(html)
    ? html.replace(head, (tag) => tag + BRIDGE)
    : html.replace(/^(\s*<!doctype[^>]*>)?/i, (doctype) => doctype + BRIDGE)
}

// Without this the page keeps running the scripts and styles it loaded before an edit.
const respond = (body: BodyInit | null, type: string): Response =>
  new Response(body, { headers: { 'content-type': type, 'cache-control': 'no-store' } })

const script = (code: string): Response => respond(code, 'text/javascript; charset=utf-8')

const report = (message: string): Response => script(`console.error(${JSON.stringify(message)})`)

/** Workspace files each issue's page has asked for, by `labId/chapterId`, bundled imports included. */
const used = new Map<string, Set<string>>()

function markUsed(labId: string, chapterId: string, paths: string[]): void {
  const key = `${labId}/${chapterId}`
  const set = used.get(key) ?? new Set()
  for (const path of paths) set.add(path)
  used.set(key, set)
}

/** A workspace file as the editor names it, or null for one outside the workspace. */
function workspacePath(dir: string, file: string): string | null {
  const path = relative(dir, file)
  return !path || path.startsWith('..') ? null : path.split(sep).join('/')
}

/** A bundle is built again only when one of the files that went into it changed on disk. */
const bundles = new Map<string, { code: string; inputs: Map<string, number> }>()

const modified = (file: string): Promise<number> =>
  stat(file).then(
    (info) => info.mtimeMs,
    () => -1
  )

async function fresh(file: string): Promise<string | null> {
  const kept = bundles.get(file)
  if (!kept) return null
  const now = await Promise.all([...kept.inputs.keys()].map(modified))
  return [...kept.inputs.values()].every((time, i) => time === now[i]) ? kept.code : null
}

/** JSX and TypeScript cannot run as written, so an entry file is served as one bundled module. */
async function bundle(
  labId: string,
  chapterId: string,
  dir: string,
  file: string
): Promise<Response> {
  const kept = await fresh(file)
  if (kept) return script(kept)
  const status = await ensureRuntime()
  if (!status.ready) return report(status.error ?? 'The runtime dependencies are not installed.')
  try {
    // The bundler is one of the lab dependencies, so it resolves the same packages learner code does.
    const esbuild = createRequire(join(workspacesRoot(), 'noop.js'))('esbuild') as Esbuild
    const result = await esbuild.build({
      entryPoints: [file],
      // Errors then name files the way the editor's tabs do.
      absWorkingDir: dir,
      bundle: true,
      format: 'esm',
      write: false,
      jsx: 'automatic',
      sourcemap: 'inline',
      logLevel: 'silent',
      metafile: true,
      define: { 'process.env.NODE_ENV': '"development"' }
    })
    const inputs = Object.keys(result.metafile.inputs).map((input) => join(dir, input))
    const times = await Promise.all(inputs.map(modified))
    const code = result.outputFiles[0].text
    bundles.set(file, { code, inputs: new Map(inputs.map((input, i) => [input, times[i]])) })
    markUsed(
      labId,
      chapterId,
      inputs.map((input) => workspacePath(dir, input)).filter((path) => path !== null)
    )
    return script(code)
  } catch (error) {
    const errors = (error as BuildFailure).errors
    const lines = errors?.map((e) =>
      e.location ? `${e.location.file}:${e.location.line} ${e.text}` : e.text
    )
    return report(lines?.join('\n') || String(error))
  }
}

export function registerScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: PREVIEW_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
  ])
}

/** One answer for every view of a page: the panel, its own window and the system browser. */
async function serve(labId: string, chapterId: string, path: string): Promise<Response> {
  try {
    const dir = workspaceDir(labId, chapterId)
    const file = resolveInside(dir, path)
    if (isAppPath(dir, file)) return new Response('Not found', { status: 404 })
    // Even a file that is not there yet: once it is saved, the page can load it.
    markUsed(labId, chapterId, [workspacePath(dir, file) ?? path])
    if (/\.(jsx|tsx|ts)$/.test(file)) return await bundle(labId, chapterId, dir, file)
    if (file.endsWith('.html')) {
      return respond(withBridge(await readFile(file, 'utf8')), 'text/html; charset=utf-8')
    }
    const found = await net.fetch(pathToFileURL(file).toString())
    return respond(found.body, found.headers.get('content-type') ?? 'application/octet-stream')
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

async function previewPage(
  labId: string,
  chapterId: string
): Promise<{ page: string; title: string }> {
  const chapter = await getChapter(contentDir(), safeId(labId), safeId(chapterId))
  if (!chapter.preview) throw new Error('This issue has no page to show.')
  return { page: chapter.preview, title: chapter.title }
}

const MAX_LINES = 200
const windows = new Map<string, BrowserWindow>()
/** Counts closeAll() calls, so an open still reading from disk knows its issue was left. */
let closes = 0

const send = (event: PreviewWindowEvent): void => emit(EVENTS.previewWindow, event)

const openOutside = (url: string): void => {
  if (/^https?:/.test(url)) void shell.openExternal(url)
}

/** The page is the learner's code: the window gets no preload, no window.api and no Node. */
async function openWindow(labId: string, chapterId: string): Promise<void> {
  const started = closes
  const { page, title } = await previewPage(labId, chapterId)
  if (started !== closes) return
  const key = `${labId}/${chapterId}`
  const open = windows.get(key)
  if (open) {
    if (open.isMinimized()) open.restore()
    return open.focus()
  }
  for (const other of windows.values()) other.close()
  const address = previewUrl(labId, chapterId, page)
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 300,
    title,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  markPageWindow(window)
  // A page's beforeunload handler must not keep its window open after the learner left the issue.
  window.webContents.on('will-prevent-unload', (event) => event.preventDefault())
  windows.set(key, window)

  const ownPage = (url: string): boolean => {
    try {
      const target = new URL(url)
      return target.protocol === `${PREVIEW_SCHEME}:` && target.host === new URL(address).host
    } catch {
      return false
    }
  }
  window.webContents.on('will-navigate', (event, url) => {
    if (ownPage(url)) return
    event.preventDefault()
    openOutside(url)
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    openOutside(url)
    return { action: 'deny' }
  })
  // Without a <title> the page would show its address; the issue's title stays instead.
  window.on('page-title-updated', (event, _title, explicitSet) => {
    if (!explicitSet) event.preventDefault()
  })

  // A page that logs in a loop would flood the app, so lines go over in batches.
  let lines: PreviewMessage[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = (): void => {
    timer = undefined
    if (lines.length) send({ labId, chapterId, type: 'console', lines })
    lines = []
  }
  window.webContents.on('console-message', ({ message }) => {
    const line = parseConsoleLine(message)
    if (!line) return
    lines.push(line)
    if (lines.length > MAX_LINES) lines.shift()
    timer ??= setTimeout(flush, 100)
  })

  window.on('closed', () => {
    clearTimeout(timer)
    flush()
    if (windows.get(key) === window) windows.delete(key)
    send({ labId, chapterId, type: 'closed' })
  })
  window.loadURL(address).catch(() => {})
}

interface PageServer {
  http: Server
  port: number
  token: string
  /** Pages in the browser waiting for the next save. */
  clients: Set<ServerResponse>
}

let serving: { labId: string; chapterId: string; server: Promise<PageServer> } | null = null

async function answer(
  server: PageServer,
  labId: string,
  chapterId: string,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const { method, url, headers } = request
  const gate = checkRequest(
    { method, url, host: headers.host, cookie: headers.cookie },
    server.port,
    server.token
  )
  if (!gate.ok) {
    response.writeHead(gate.status, { 'content-type': 'text/plain; charset=utf-8' })
    return void response.end(gate.message)
  }
  if (gate.path === RELOAD_PATH) {
    response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' })
    response.write(':\n\n')
    server.clients.add(response)
    request.on('close', () => server.clients.delete(response))
    return
  }
  const found = await serve(labId, chapterId, gate.path)
  const sent: Record<string, string> = Object.fromEntries(found.headers)
  if (gate.setCookie) sent['set-cookie'] = gate.setCookie
  response.writeHead(found.status, sent)
  if (method === 'HEAD' || !found.body) return void response.end()
  Readable.fromWeb(found.body as ReadableStream)
    .on('error', () => response.destroy())
    .pipe(response)
}

function startServer(labId: string, chapterId: string): Promise<PageServer> {
  return new Promise((resolve, reject) => {
    const server: PageServer = {
      http: createServer(),
      port: 0,
      token: randomBytes(24).toString('base64url'),
      clients: new Set()
    }
    server.http.on('request', (request, response) => {
      answer(server, labId, chapterId, request, response).catch(() => response.destroy())
    })
    server.http.once('error', reject)
    server.http.listen(0, '127.0.0.1', () => {
      server.port = (server.http.address() as AddressInfo).port
      resolve(server)
    })
  })
}

function stopServer(): void {
  const stopping = serving?.server
  serving = null
  stopping
    ?.then(({ http, clients }) => {
      for (const client of clients) client.end()
      http.closeAllConnections()
      http.close()
    })
    .catch(() => {})
}

/** One issue is served at a time, each on its own port with its own token. */
async function openInBrowser(labId: string, chapterId: string): Promise<void> {
  const started = closes
  const { page } = await previewPage(labId, chapterId)
  if (started !== closes) return
  if (serving?.labId !== labId || serving.chapterId !== chapterId) {
    stopServer()
    const server = startServer(labId, chapterId)
    serving = { labId, chapterId, server }
    server.catch(() => {
      if (serving?.server === server) serving = null
    })
  }
  const { port, token } = await serving.server
  if (started !== closes) return
  const path = page.split('/').map(encodeURIComponent).join('/')
  await shell.openExternal(`http://127.0.0.1:${port}/${path}?token=${token}`)
}

function reload(labId: string, chapterId: string): void {
  windows.get(`${labId}/${chapterId}`)?.webContents.reload()
  if (serving?.labId !== labId || serving.chapterId !== chapterId) return
  serving.server
    .then(({ clients }) => {
      for (const client of clients) client.write('data: reload\n\n')
    })
    .catch(() => {})
}

/** The learner left the issue, reset it, or the app is closing. */
export function closeAll(): void {
  closes++
  used.clear()
  bundles.clear()
  for (const window of windows.values()) window.close()
  stopServer()
}

export function register(): void {
  protocol.handle(PREVIEW_SCHEME, async (request) => {
    await whenReady()
    try {
      const { labId, chapterId, path } = previewTarget(request.url)
      return await serve(labId, chapterId, path)
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
  handle('preview', {
    openWindow,
    openInBrowser,
    uses: async (labId, chapterId, paths) => {
      const set = used.get(`${labId}/${chapterId}`)
      return Array.isArray(paths) && paths.some((path) => set?.has(String(path)))
    }
  })
  listen('preview', {
    reload: (labId, chapterId) => reload(String(labId), String(chapterId)),
    close: closeAll
  })
}
