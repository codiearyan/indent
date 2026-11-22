import { app, session, shell, BrowserWindow } from 'electron'
import { copyFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import { dirname, join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as content from './services/content'
import * as workspace from './services/workspace'
import * as checks from './services/checks'
import * as progress from './services/progress'
import * as backup from './services/backup'
import * as terminal from './services/terminal'
import * as ai from './services/ai'
import * as preview from './services/preview'
import * as tools from './services/tools'
import * as ide from './services/ide'
import * as github from './services/github'
import * as telemetry from './services/telemetry'
import * as updates from './services/updates'
import * as reminders from './services/reminders'
import { appWindows } from './ipc'
import { perf } from './perf'
import { seedContent } from './library'
import { bundledContentDir, contentDir, usesLibrary } from './paths'
import { PACKS_URL } from '@shared/packs'
import { VIDEO_ORIGIN } from '@shared/video'

// Privileged schemes have to be registered before the app is ready.
preview.registerScheme()

// One copy runs at a time, so an app kept in the tray is opened again instead of started twice.
// Only when packaged: a dev build shares its data folder with the installed app.
const secondCopy = app.isPackaged && !app.requestSingleInstanceLock()
if (secondCopy) app.quit()
app.on('second-instance', () => showWindow())

// A dev build started to be driven and photographed, not looked at: no window, no Dock icon.
const hidden = is.dev && process.env['INDENT_HIDDEN'] === '1'
// Before the app finishes launching, or macOS brings it to the front and takes the keyboard.
if (hidden && process.platform === 'darwin') app.setActivationPolicy('accessory')

function createWindow(route?: string): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#0a0a0b',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!hidden) mainWindow.show()
    perf('window shown', process.uptime() * 1000)
  })
  // A page's window belongs to an issue open in this window.
  mainWindow.on('closed', preview.closeAll)

  // Full screen hides the traffic lights, so the page gives the room it kept for them back.
  const syncFullScreen = (): void => {
    const toggle = `document.documentElement.classList.toggle('window-fullscreen', ${mainWindow.isFullScreen()})`
    mainWindow.webContents.executeJavaScript(toggle).catch(() => {})
  }
  mainWindow.on('enter-full-screen', syncFullScreen)
  mainWindow.on('leave-full-screen', syncFullScreen)
  mainWindow.webContents.on('did-finish-load', syncFullScreen)

  // The page has the full IPC API, so the window must never load anything but the app itself.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (/^https?:/.test(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + (route ? `#${route}` : ''))
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: route })
  }
}

/** Brings the window back, or opens a new one, on `route` when given. */
function showWindow(route?: string): void {
  const window = appWindows()[0]
  if (!window) return createWindow(route)
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
  if (route) {
    window.webContents.executeJavaScript(`location.hash = ${JSON.stringify(route)}`).catch(() => {})
  }
}

/**
 * The packaged page loads from file://, which sends no referrer, and the video player refuses to
 * play without one. Its requests carry the site's address instead.
 */
function allowVideoPlayer(): void {
  const referer = `${new URL(PACKS_URL).origin}/`
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: [`${VIDEO_ORIGIN}/*`] },
    ({ requestHeaders }, callback) => {
      requestHeaders['Referer'] ??= referer
      callback({ requestHeaders })
    }
  )
}

/** Carries a learner's progress and files over from the data folder of the app's earlier name. */
function adoptEarlierData(): void {
  const current = app.getPath('userData')
  const earlier = join(dirname(current), 'labbench')
  if (!existsSync(join(earlier, 'progress.json')) || existsSync(join(current, 'progress.json'))) {
    return
  }
  try {
    mkdirSync(current, { recursive: true })
    copyFileSync(join(earlier, 'progress.json'), join(current, 'progress.json'))
    if (existsSync(join(earlier, 'workspaces')) && !existsSync(join(current, 'workspaces'))) {
      renameSync(join(earlier, 'workspaces'), join(current, 'workspaces'))
    }
  } catch (error) {
    console.warn('Could not carry over earlier data:', error)
  }
}

app.whenReady().then(() => {
  if (secondCopy) return
  adoptEarlierData()
  try {
    if (usesLibrary()) seedContent(bundledContentDir(), contentDir(), app.getVersion())
  } catch (error) {
    console.error('Could not copy the shipped repos into the data folder:', error)
  }
  if (is.dev && !hidden) app.dock?.setIcon(icon)
  electronApp.setAppUserModelId('com.indent.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window, { zoom: true })
  })

  for (const service of [
    content,
    workspace,
    checks,
    progress,
    backup,
    terminal,
    ai,
    preview,
    tools,
    ide,
    github,
    telemetry,
    updates
  ]) {
    service.register()
  }
  reminders.register(showWindow)
  allowVideoPlayer()

  if (!reminders.startsHidden()) createWindow()

  app.on('activate', () => {
    if (appWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !reminders.keepsRunning()) app.quit()
})
