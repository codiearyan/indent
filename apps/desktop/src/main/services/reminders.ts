import { app, BrowserWindow, dialog, Menu, Notification, powerMonitor, Tray } from 'electron'
import { readFileSync } from 'fs'
import { mkdir, rm, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { dirname, join } from 'path'
import {
  calendarEvent,
  practicedOn,
  readReminderSettings,
  reminderTarget,
  reminderText,
  sendsNotifications,
  shouldRemind
} from '@shared/reminders'
import { SNOOZE_MINUTES, currentStreak, localDate } from '@shared/rules'
import type { ReminderConfig, ReminderSettings, ReminderTestResult } from '@shared/types'
import { handle } from '../ipc'
import { contentDir, dataFile } from '../paths'
import { trayIcon } from '../trayIcon'
import { listLabs } from './packs'
import { getProgress } from './progress'

interface Saved extends ReminderSettings {
  /** Local date of the last scheduled reminder. */
  lastSent?: string
  snoozedUntil?: string
}

const TICK_MS = 20_000
const HIDDEN_FLAG = '--hidden'

const file = (): string => dataFile('reminders.json')

let saved: Saved
let showWindow: (route?: string) => void = () => {}
let timer: NodeJS.Timeout | undefined
let ticking = false
let tray: Tray | null = null
// Held so the shown reminder is not collected before its click arrives; one shows at a time.
let shown: Notification | null = null

function load(): Saved {
  try {
    const raw = JSON.parse(readFileSync(file(), 'utf8'))
    return {
      ...readReminderSettings(raw),
      lastSent: typeof raw.lastSent === 'string' ? raw.lastSent : undefined,
      snoozedUntil: typeof raw.snoozedUntil === 'string' ? raw.snoozedUntil : undefined
    }
  } catch {
    return readReminderSettings({})
  }
}

const save = (): Promise<void> => writeFile(file(), JSON.stringify(saved, null, 2))

/** Closing the window leaves the app running in the tray. */
export const keepsRunning = (): boolean => saved.tray

/**
 * Opened at login, the app stays in the background where it can be reached again: the tray, or
 * the Dock on macOS. Anywhere else a hidden app could not be opened, so it shows its window.
 */
export function startsHidden(): boolean {
  if (!saved.openAtLogin || !(saved.tray || process.platform === 'darwin')) return false
  return (
    process.argv.includes(HIDDEN_FLAG) ||
    (process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAtLogin)
  )
}

/** The route of the issue a reminder opens, or Home. */
async function lastIssue(): Promise<{ route: string; title: string; body: string }> {
  const progress = await getProgress()
  const labs = await listLabs(contentDir()).catch(() => [])
  const target = reminderTarget(labs, progress)
  const text = reminderText({
    target,
    minutes: saved.schedule.minutes,
    streak: currentStreak(progress.activity)
  })
  return { ...text, route: target ? `/learn/${target.labId}/${target.chapterId}` : '/' }
}

async function notification(): Promise<Notification> {
  const { title, body, route } = await lastIssue()
  const reminder = new Notification({
    title,
    body,
    actions: [{ type: 'button', text: 'Snooze for an hour' }]
  })
  reminder.on('click', () => showWindow(route))
  reminder.on('action', () => {
    saved.snoozedUntil = new Date(Date.now() + SNOOZE_MINUTES * 60_000).toISOString()
    void save()
  })
  shown?.close()
  shown = reminder
  return reminder
}

/** Runs every few seconds and on wake, so sleep and clock changes never leave a stale timer. */
async function tick(): Promise<void> {
  if (ticking) return
  ticking = true
  try {
    const now = new Date()
    const progress = await getProgress()
    const due = shouldRemind({
      schedule: saved.schedule,
      now,
      practicedToday: practicedOn(progress.activity, now),
      lastSent: saved.lastSent,
      snoozedUntil: saved.snoozedUntil
    })
    if (!due || !Notification.isSupported()) return
    if (due === 'scheduled') saved.lastSent = localDate(now)
    else saved.snoozedUntil = undefined
    await save()
    ;(await notification()).show()
  } catch (error) {
    console.error('Could not send the practice reminder:', error)
  } finally {
    ticking = false
  }
}

function arm(): void {
  clearInterval(timer)
  timer = sendsNotifications(saved.schedule) ? setInterval(() => void tick(), TICK_MS) : undefined
  if (timer) void tick()
}

async function test(): Promise<ReminderTestResult> {
  if (!Notification.isSupported()) return { ok: false, reason: 'unsupported' }
  const reminder = await notification()
  return new Promise((resolve) => {
    // Linux reports no failure, so silence after a few seconds counts as shown.
    const wait = setTimeout(() => resolve({ ok: true }), 5000)
    reminder.once('show', () => {
      clearTimeout(wait)
      resolve({ ok: true })
    })
    reminder.once('failed', (_event, error) => {
      clearTimeout(wait)
      console.warn('The test reminder was not shown:', error)
      resolve({ ok: false, reason: 'blocked' })
    })
    reminder.show()
  })
}

function applyTray(): void {
  if (!saved.tray) {
    tray?.destroy()
    tray = null
    return
  }
  if (tray) return
  tray = new Tray(trayIcon())
  tray.setToolTip('Indent')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Indent', click: () => showWindow() },
      {
        label: 'Continue last issue',
        click: () => void lastIssue().then(({ route }) => showWindow(route))
      },
      { type: 'separator' },
      { label: 'Quit Indent', click: () => app.quit() }
    ])
  )
  if (process.platform === 'win32') tray.on('click', () => showWindow())
}

/** Electron has no login items on Linux; the desktop's autostart folder does the same. */
async function linuxAutostart(on: boolean): Promise<void> {
  const config = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  const entry = join(config, 'autostart', 'indent.desktop')
  if (!on) return rm(entry, { force: true })
  const exec = (process.env.APPIMAGE ?? process.execPath).replace(/(["`$\\])/g, '\\$1')
  await mkdir(dirname(entry), { recursive: true })
  await writeFile(
    entry,
    `[Desktop Entry]\nType=Application\nName=Indent\nExec="${exec}" ${HIDDEN_FLAG}\nX-GNOME-Autostart-enabled=true\n`
  )
}

async function applyLogin(): Promise<void> {
  if (process.platform === 'linux') return linuxAutostart(saved.openAtLogin)
  app.setLoginItemSettings({ openAtLogin: saved.openAtLogin, args: [HIDDEN_FLAG] })
}

function config(): ReminderConfig {
  const { schedule, tray, openAtLogin } = saved
  const loginNeedsApproval =
    process.platform === 'darwin' &&
    openAtLogin &&
    app.getLoginItemSettings().status === 'requires-approval'
  return { schedule, tray, openAtLogin, loginNeedsApproval }
}

async function set(patch: Partial<ReminderSettings>): Promise<ReminderConfig> {
  const before = saved
  const next = readReminderSettings({
    ...before,
    ...(patch && typeof patch === 'object' ? patch : {})
  })
  saved = { ...before, ...next }
  await save()
  if (next.tray !== before.tray) applyTray()
  if (next.openAtLogin !== before.openAtLogin) await applyLogin()
  arm()
  return config()
}

async function saveCalendar(): Promise<string | null> {
  if (saved.schedule.days.length === 0) throw new Error('Pick at least one day first.')
  const options: Electron.SaveDialogOptions = {
    title: 'Add to calendar',
    buttonLabel: 'Save',
    defaultPath: join(app.getPath('downloads'), 'indent-practice.ics'),
    filters: [{ name: 'Calendar event', extensions: ['ics'] }]
  }
  const window = BrowserWindow.getFocusedWindow()
  const result = await (window
    ? dialog.showSaveDialog(window, options)
    : dialog.showSaveDialog(options))
  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, calendarEvent(saved.schedule, new Date()))
  return result.filePath
}

/** `show` opens or focuses the window, on `route` when given. */
export function register(show: (route?: string) => void): void {
  showWindow = show
  saved = load()
  handle('reminders', { get: async () => config(), set, test, saveCalendar })
  applyTray()
  arm()
  powerMonitor.on('resume', () => void tick())
  powerMonitor.on('unlock-screen', () => void tick())
}
