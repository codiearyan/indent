import { net, protocol } from 'electron'
import { readFile } from 'fs/promises'
import { createRequire } from 'module'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { PREVIEW_MESSAGE, PREVIEW_SCHEME, previewTarget } from '@shared/preview'
import { workspaceDir, workspacesRoot } from '../paths'
import { ensureRuntime } from './checks'
import { isAppPath, resolveInside } from './workspaceFiles'

interface Esbuild {
  build(options: Record<string, unknown>): Promise<{ outputFiles: { text: string }[] }>
}

interface BuildFailure {
  errors?: { text: string; location?: { file: string; line: number } | null }[]
}

// Runs inside the previewed page: passes console output and uncaught errors to the Browser panel.
const BRIDGE = `<script>(() => {
  const format = (value) => {
    if (value instanceof Error) return value.stack || value.message
    if (typeof value !== 'object' || value === null) return String(value)
    try { return JSON.stringify(value) } catch { return String(value) }
  }
  const send = (level, args) =>
    parent.postMessage({ source: '${PREVIEW_MESSAGE}', level, text: args.map(format).join(' ') }, '*')
  for (const level of ['log', 'info', 'warn', 'error']) {
    const original = console[level]
    console[level] = (...args) => { send(level, args); original.apply(console, args) }
  }
  addEventListener('error', (event) => {
    const address = event.target !== window && (event.target.src || event.target.href)
    send('error', [address ? 'Could not load ' + address : event.error ?? event.message])
  }, true)
  addEventListener('unhandledrejection', (event) => send('error', [event.reason]))
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

/** JSX and TypeScript cannot run as written, so an entry file is served as one bundled module. */
async function bundle(dir: string, file: string): Promise<Response> {
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
      define: { 'process.env.NODE_ENV': '"development"' }
    })
    return script(result.outputFiles[0].text)
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

export function register(): void {
  protocol.handle(PREVIEW_SCHEME, async (request) => {
    try {
      const { labId, chapterId, path } = previewTarget(request.url)
      const dir = workspaceDir(labId, chapterId)
      const file = resolveInside(dir, path)
      if (isAppPath(dir, file)) return new Response('Not found', { status: 404 })
      if (/\.(jsx|tsx|ts)$/.test(file)) return await bundle(dir, file)
      if (file.endsWith('.html')) {
        return respond(withBridge(await readFile(file, 'utf8')), 'text/html; charset=utf-8')
      }
      const found = await net.fetch(pathToFileURL(file).toString())
      return respond(found.body, found.headers.get('content-type') ?? 'application/octet-stream')
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
