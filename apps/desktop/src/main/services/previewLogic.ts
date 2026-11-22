import { timingSafeEqual } from 'crypto'
import type { PreviewMessage } from '@shared/preview'
import { PREVIEW_MESSAGE } from '@shared/preview'

/** A page in its own window has no parent to post to, so it logs its lines with this prefix. */
export const CONSOLE_MARKER = '__indent_console__'

/** The page in the system browser listens here for saves. */
export const RELOAD_PATH = '__indent/reload'

const MAX_TEXT = 10_000

/** A line the page's window logged for the Browser panel, or null for any other message. */
export function parseConsoleLine(message: string): PreviewMessage | null {
  if (!message.startsWith(CONSOLE_MARKER)) return null
  try {
    const { level, text } = JSON.parse(message.slice(CONSOLE_MARKER.length))
    return {
      source: PREVIEW_MESSAGE,
      level: level === 'error' || level === 'warn' ? level : 'log',
      text: String(text).slice(0, MAX_TEXT)
    }
  } catch {
    return null
  }
}

export interface GateRequest {
  method?: string
  host?: string
  url?: string
  cookie?: string
}

export type Gate =
  { ok: true; path: string; setCookie?: string } | { ok: false; status: number; message: string }

/** Cookies are shared by every port of a host, so the name carries the port. */
export const cookieName = (port: number): string => `indent_${port}`

function sameToken(given: string | undefined, token: string): boolean {
  if (!given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) return value.join('=')
  }
  return undefined
}

/**
 * Decides whether the local server answers a request. Any program on the computer and any site the
 * learner has open can reach 127.0.0.1, so only reads of the open issue with its token pass, and
 * only on the exact host (a rebound DNS name carries another Host).
 */
export function checkRequest(request: GateRequest, port: number, token: string): Gate {
  if (request.host !== `127.0.0.1:${port}`) {
    return { ok: false, status: 403, message: 'Not found' }
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return { ok: false, status: 405, message: 'Only reading is allowed' }
  }
  let url: URL
  let path: string
  try {
    url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)
    path = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
  } catch {
    return { ok: false, status: 400, message: 'Not found' }
  }
  const name = cookieName(port)
  const given = url.searchParams.get('token') ?? undefined
  if (sameToken(given, token)) {
    // The page's scripts, styles and files carry the token as a cookie the page itself cannot read.
    return { ok: true, path, setCookie: `${name}=${token}; Path=/; HttpOnly; SameSite=Strict` }
  }
  if (sameToken(readCookie(request.cookie, name), token)) return { ok: true, path }
  return {
    ok: false,
    status: 403,
    message: 'This page is no longer open. Open it again from its issue in the app.'
  }
}
