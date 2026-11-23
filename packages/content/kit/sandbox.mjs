// What checks and tracing share to run learner code: a fresh copy of the workspace, and child
// processes with a timeout and capped output.
import { cp, copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

export const DEFAULT_TIMEOUT = 15000
export const MAX_OUTPUT = 4000

// Learner code may print its environment, and a check's output can reach the tutor, so it gets
// only what programs need to run on this computer, never the tokens the learner's shell holds.
const KEPT =
  /^(PATH|PATHEXT|SYSTEMROOT|SYSTEMDRIVE|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|PROGRAMDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|LANG|LANGUAGE|LC_\w+|TZ|JAVA_HOME|DEVELOPER_DIR|SDKROOT|LAB_MODEL_URL)$/i

/** The small environment learner code runs with; a check adds the settings it hands over. */
export function childEnv(extra) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => KEPT.test(key)))
  // The local model's address and key, never a real key that only happens to share the name.
  const model = process.env.LAB_MODEL_URL
  if (model && process.env.OPENAI_BASE_URL === model) {
    env.OPENAI_BASE_URL = model
    env.OPENAI_API_KEY = process.env.OPENAI_API_KEY
  }
  return { ...env, NO_COLOR: '1', FORCE_COLOR: '0', NODE_NO_WARNINGS: '1', ...extra }
}

export const clip = (text) =>
  text.length > MAX_OUTPUT ? `${text.slice(0, MAX_OUTPUT)}\n... (output cut)` : text

export function collect(child, timeoutMs) {
  let stdout = ''
  let stderr = ''
  let timedOut = false
  child.stdout.on('data', (d) => (stdout += d))
  child.stderr.on('data', (d) => (stderr += d))
  const timer = setTimeout(() => {
    timedOut = true
    child.kill('SIGKILL')
  }, timeoutMs)
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout: clip(stdout), stderr: clip(stderr), timedOut })
    })
  })
}

/**
 * A fresh copy of the workspace under `sandboxRoot`; `overrides` maps a relative path to a source
 * file. The caller deletes it.
 */
export async function makeSandbox(workspace, sandboxRoot, overrides = {}) {
  await mkdir(sandboxRoot, { recursive: true })
  const dir = await mkdtemp(join(sandboxRoot, 'check-'))
  try {
    await cp(workspace, dir, {
      recursive: true,
      // .indent holds the app's copy of the starter, never learner code.
      filter: (src) => {
        const parts = relative(workspace, src).split(/[\\/]/)
        return !parts.includes('node_modules') && parts[0] !== '.indent'
      }
    })
    for (const [rel, source] of Object.entries(overrides)) {
      await mkdir(dirname(join(dir, rel)), { recursive: true })
      await copyFile(source, join(dir, rel))
    }
  } catch (error) {
    await rm(dir, { recursive: true, force: true })
    throw error
  }
  return dir
}
