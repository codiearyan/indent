import { app } from 'electron'
import type { TelemetryEvent, TelemetryProps } from '@shared/types'
import { listen } from '../ipc'

// Events go straight to the analytics service's ingestion API. The app key only allows sending
// events, so it is safe to ship. Nothing is sent while usage stats are off: the renderer gates
// every event.
const APP_KEY = 'A-EU-3530820487'
const EVENT_URL = 'https://eu.aptabase.com/api/v0/event'
const SESSION_IDLE_MS = 60 * 60 * 1000

export interface Session {
  id: string
  lastAt: number
}

/** A new session starts after an hour without events. The id is never stored. */
export function nextSession(session: Session | null, now: number): Session {
  if (session && now - session.lastAt <= SESSION_IDLE_MS) return { ...session, lastAt: now }
  const random = Math.floor(Math.random() * 1e8)
    .toString()
    .padStart(8, '0')
  return { id: `${Math.floor(now / 1000)}${random}`, lastAt: now }
}

let session: Session | null = null

function systemProps(): Record<string, string | boolean> {
  const osName = { darwin: 'macOS', win32: 'Windows' }[process.platform as string] ?? 'Linux'
  return {
    isDebug: !app.isPackaged,
    locale: app.getLocale(),
    osName,
    osVersion: process.getSystemVersion(),
    appVersion: app.getVersion(),
    engineName: 'Chromium',
    engineVersion: process.versions.chrome,
    sdkVersion: `indent@${app.getVersion()}`
  }
}

async function track(eventName: TelemetryEvent, props?: TelemetryProps): Promise<void> {
  session = nextSession(session, Date.now())
  const body = {
    timestamp: new Date().toISOString(),
    sessionId: session.id,
    eventName,
    systemProps: systemProps(),
    props
  }
  try {
    const response = await fetch(EVENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'App-Key': APP_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000)
    })
    if (!response.ok) console.warn(`Usage stats: ${eventName} was refused (${response.status})`)
  } catch {
    // Offline or blocked: the event is dropped, never retried or stored.
  }
}

export function register(): void {
  listen('telemetry', { track: (event, props) => void track(event, props) })
}
