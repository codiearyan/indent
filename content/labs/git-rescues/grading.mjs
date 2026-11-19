// Read-only helpers the issue graders share. They inspect <workspace>/repo with plain git.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { devNull } from 'node:os'
import { join } from 'node:path'

const NO_REPO =
  'There is no repository at repo/ yet. Run `node setup.mjs` in the terminal first, then try again.'

// The learner's global config must not change what the grader sees.
function neutralEnv() {
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: devNull,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_PAGER: 'cat',
    PAGER: 'cat',
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0',
    LC_ALL: 'C'
  }
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY']) delete env[key]
  return env
}

export function gitIn(dir) {
  return (...args) => {
    const r = spawnSync('git', ['-C', dir, ...args], { env: neutralEnv(), encoding: 'utf8' })
    return { ok: r.status === 0, out: r.stdout ?? '', err: r.stderr ?? '' }
  }
}

/** A git function for the learner's repo, or null when setup has not run. */
export function openRepo(t) {
  const dir = join(t.workspace, 'repo')
  return existsSync(join(dir, '.git')) ? gitIn(dir) : null
}

export const noRepo = (names) => names.map((name) => ({ name, passed: false, message: NO_REPO }))

/** Builds the untouched scenario from the issue's own setup.mjs and maps commit subjects to hashes. */
export async function reference(t) {
  const dir = await t.sandbox({ 'setup.mjs': t.chapterPath('starter/setup.mjs') })
  const run = await t.node(dir, ['setup.mjs'], { timeoutMs: 30000 })
  if (run.code !== 0) throw new Error(`setup.mjs failed in the grader: ${run.stderr || run.stdout}`)
  const git = gitIn(join(dir, 'repo'))
  const bySubject = new Map()
  for (const line of git('log', '--all', '--reflog', '--format=%H%x09%s').out.split('\n')) {
    const [hash, subject] = line.split('\t')
    if (hash && !bySubject.has(subject)) bySubject.set(subject, hash)
  }
  return { git, hash: (subject) => bySubject.get(subject) }
}

export function commitOf(git, rev) {
  const r = git('rev-parse', '--verify', '--quiet', `${rev}^{commit}`)
  return r.ok ? r.out.trim() : null
}

export const isAncestor = (git, a, b) => Boolean(a && b) && git('merge-base', '--is-ancestor', a, b).ok

export function fileAt(git, rev, path) {
  const r = git('show', `${rev}:${path}`)
  return r.ok ? r.out : null
}

export function dirtyFiles(git, ignore = []) {
  return git('status', '--porcelain', '--untracked-files=all')
    .out.split('\n')
    .filter((line) => line.trim() && !line.endsWith('.DS_Store'))
    .filter((line) => !ignore.some((name) => line.slice(3) === name))
}

/** The name of a merge, revert, cherry-pick, rebase or bisect left half done, or null. */
export function unfinished(git) {
  const gitDir = git('rev-parse', '--absolute-git-dir').out.trim()
  const markers = {
    MERGE_HEAD: 'a merge',
    REVERT_HEAD: 'a revert',
    CHERRY_PICK_HEAD: 'a cherry-pick',
    'rebase-merge': 'a rebase',
    'rebase-apply': 'a rebase',
    BISECT_LOG: 'a bisect'
  }
  const found = Object.keys(markers).find((name) => existsSync(join(gitDir, name)))
  return found ? markers[found] : null
}

export const currentBranch = (git) => {
  const r = git('symbolic-ref', '--quiet', '--short', 'HEAD')
  return r.ok ? r.out.trim() : null
}

export const graph = (git, ...revs) =>
  git('log', '--oneline', '--graph', '--decorate', '-n', '20', ...(revs.length ? revs : ['--all'])).out

export const check = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
