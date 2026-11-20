// The `t` object every grader/checks.mjs receives. See run-check.mjs.
import { spawn, fork } from 'node:child_process'
import { cp, copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openPage } from './page.mjs'

const DEFAULT_TIMEOUT = 15000
const MAX_OUTPUT = 4000
const callChild = fileURLToPath(new URL('./call-child.mjs', import.meta.url))

const childEnv = (extra) => ({
  ...process.env,
  NO_COLOR: '1',
  FORCE_COLOR: '0',
  NODE_NO_WARNINGS: '1',
  ...extra
})

const clip = (text) =>
  text.length > MAX_OUTPUT ? `${text.slice(0, MAX_OUTPUT)}\n... (output cut)` : text

function collect(child, timeoutMs) {
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

/** Resolves a dependency's bin the same way learner code does: walking up from `dir`. */
function binFrom(dir, pkg, bin) {
  const require = createRequire(join(dir, 'noop.js'))
  return join(dirname(require.resolve(`${pkg}/package.json`)), bin)
}

export function createContext({ chapter, workspace, sandboxRoot }) {
  const sandboxes = []
  const pages = []

  const t = {
    workspace,
    chapter,

    chapterPath: (rel) => join(chapter, rel),

    /** A fresh copy of the workspace; `overrides` maps a relative path to a source file. */
    async sandbox(overrides = {}) {
      await mkdir(sandboxRoot, { recursive: true })
      const dir = await mkdtemp(join(sandboxRoot, 'check-'))
      sandboxes.push(dir)
      await cp(workspace, dir, {
        recursive: true,
        filter: (src) => !src.split(/[\\/]/).includes('node_modules')
      })
      for (const [rel, source] of Object.entries(overrides)) {
        await mkdir(dirname(join(dir, rel)), { recursive: true })
        await copyFile(source, join(dir, rel))
      }
      return dir
    },

    node(dir, args, { timeoutMs = DEFAULT_TIMEOUT, env } = {}) {
      const child = spawn(process.execPath, args, { cwd: dir, env: childEnv(env) })
      return collect(child, timeoutMs)
    },

    /** Runs one test file; passed is true when vitest exits 0. */
    async vitest(dir, file, { timeoutMs = 30000 } = {}) {
      const bin = binFrom(dir, 'vitest', 'vitest.mjs')
      const r = await t.node(dir, [bin, 'run', file], { timeoutMs })
      return { passed: r.code === 0 && !r.timedOut, output: clip(r.stdout + r.stderr), timedOut: r.timedOut }
    },

    async typecheck(dir, files) {
      const bin = binFrom(dir, 'typescript', 'bin/tsc')
      const r = await t.node(dir, [
        bin,
        '--noEmit',
        '--strict',
        '--target', 'es2022',
        '--module', 'nodenext',
        '--allowImportingTsExtensions',
        '--erasableSyntaxOnly',
        '--skipLibCheck',
        '--types', 'node',
        ...files
      ], { timeoutMs: 30000 })
      return { passed: r.code === 0 && !r.timedOut, output: clip(r.stdout + r.stderr) }
    },

    /** Imports `file` in a child process and calls one export with JSON-able args. */
    call(dir, file, exportName, args = [], { timeoutMs = DEFAULT_TIMEOUT } = {}) {
      const path = isAbsolute(file) ? file : join(dir, file)
      const child = fork(callChild, [path, exportName, JSON.stringify(args)], {
        cwd: dir,
        env: childEnv(),
        silent: true
      })
      let message
      child.on('message', (m) => (message = m))
      return collect(child, timeoutMs).then((r) => ({
        ok: message?.ok === true,
        value: message?.value,
        error: message?.error ?? (r.timedOut ? 'Timed out' : clip(r.stderr) || `Exited with code ${r.code}`),
        stdout: r.stdout,
        timedOut: r.timedOut
      }))
    },

    /**
     * Opens a page of the workspace (or of `dir`) in a headless DOM with its scripts run.
     * See page.mjs for what the returned page can do.
     */
    async page(file = 'index.html', { dir = workspace, ...options } = {}) {
      const page = await openPage(dir, file, options)
      pages.push(page)
      return page
    },

    /**
     * Runs the learner's test file beside the original bug, a correct fix and a plausible wrong fix.
     * A good test fails, passes, fails.
     */
    async judgeTest({ test, target, wrong, wrongLabel }) {
      const [buggy, fixed, wrongRun] = await Promise.all(
        [`starter/${target}`, `solution/${target}`, wrong].map(async (source) =>
          t.vitest(await t.sandbox({ [target]: t.chapterPath(source) }), test)
        )
      )
      return [
        {
          name: `Fails on the original ${target}`,
          passed: !buggy.passed,
          message: buggy.passed
            ? `Your test passed beside the original buggy ${target}. Add an assertion that the bug breaks.`
            : undefined,
          output: buggy.output
        },
        {
          name: `Passes on a correct fix of ${target}`,
          passed: fixed.passed,
          message: fixed.passed
            ? undefined
            : `Your test failed beside a correct fix. Read the output: it may expect something the task does not ask for, or still throw 'Not implemented'.`,
          output: fixed.output
        },
        {
          name: `Fails on ${wrongLabel}`,
          passed: !wrongRun.passed,
          message: wrongRun.passed
            ? `Your test passed beside ${wrongLabel}. Think about which requirement that version misses and assert it.`
            : undefined,
          output: wrongRun.output
        }
      ]
    }
  }

  const cleanup = () => {
    // Closing a page stops its timers, which would otherwise keep the grader alive.
    for (const page of pages) page.close()
    return Promise.all(sandboxes.map((dir) => rm(dir, { recursive: true, force: true })))
  }

  return { t, cleanup }
}
