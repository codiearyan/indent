import { describe, expect, it } from 'vitest'
import { CONSOLE_MARKER, checkRequest, cookieName, parseConsoleLine } from './previewLogic'

const port = 51234
const token = 'a'.repeat(32)
const host = `127.0.0.1:${port}`
const cookie = `${cookieName(port)}=${token}`

describe('checkRequest', () => {
  it('lets the first request in with the token and hands it over as a cookie', () => {
    const gate = checkRequest(
      { method: 'GET', host, url: `/index.html?token=${token}` },
      port,
      token
    )
    expect(gate).toMatchObject({ ok: true, path: 'index.html' })
    expect(gate.ok && gate.setCookie).toContain('HttpOnly; SameSite=Strict')
  })

  it('lets the page fetch its files with the cookie, absolute paths included', () => {
    expect(
      checkRequest({ method: 'GET', host, url: '/data/menu.json', cookie }, port, token)
    ).toEqual({ ok: true, path: 'data/menu.json' })
    expect(
      checkRequest({ method: 'HEAD', host, url: '/', cookie: `x=1; ${cookie}` }, port, token)
    ).toEqual({ ok: true, path: 'index.html' })
  })

  it('refuses a missing or wrong token, and the cookie of another port', () => {
    expect(checkRequest({ method: 'GET', host, url: '/' }, port, token).ok).toBe(false)
    expect(checkRequest({ method: 'GET', host, url: '/?token=nope' }, port, token).ok).toBe(false)
    const other = `${cookieName(port + 1)}=${token}`
    expect(checkRequest({ method: 'GET', host, url: '/', cookie: other }, port, token).ok).toBe(
      false
    )
  })

  it('refuses another host, so a rebound DNS name cannot read the page', () => {
    for (const bad of ['localhost:51234', 'evil.test:51234', '127.0.0.1:1', undefined]) {
      expect(checkRequest({ method: 'GET', host: bad, url: '/', cookie }, port, token).ok).toBe(
        false
      )
    }
  })

  it('serves reads only', () => {
    const gate = checkRequest({ method: 'POST', host, url: '/', cookie }, port, token)
    expect(gate).toMatchObject({ ok: false, status: 405 })
  })

  it('leaves escapes for the workspace check and refuses a broken path', () => {
    expect(
      checkRequest({ method: 'GET', host, url: '/..%2f..%2fsecret', cookie }, port, token)
    ).toEqual({ ok: true, path: '../../secret' })
    expect(checkRequest({ method: 'GET', host, url: '/%E0%A4%A', cookie }, port, token).ok).toBe(
      false
    )
  })
})

describe('parseConsoleLine', () => {
  it('reads the lines the page logged for the panel', () => {
    const line = parseConsoleLine(`${CONSOLE_MARKER}{"level":"error","text":"boom"}`)
    expect(line).toEqual({ source: 'indent-preview', level: 'error', text: 'boom' })
  })

  it('ignores every other message and broken ones', () => {
    expect(parseConsoleLine('hello')).toBeNull()
    expect(parseConsoleLine(`${CONSOLE_MARKER}{oops`)).toBeNull()
  })

  it('keeps the level to the ones the panel shows and caps the text', () => {
    const line = parseConsoleLine(
      `${CONSOLE_MARKER}${JSON.stringify({ level: 'x', text: 'y'.repeat(20_000) })}`
    )
    expect(line?.level).toBe('log')
    expect(line?.text).toHaveLength(10_000)
  })
})
