// What the issue graders share. They read <workspace>/shop with plain git and change nothing.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { devNull } from 'node:os'
import { join } from 'node:path'

export const START_OVER = 'To start the issue over, run `node setup.mjs` in the top folder.'

// The learner's own settings (name, editor, colours, language) must not change what a check sees,
// and a folder above the workspace that happens to be a repository must never be found.
function neutralEnv(ceiling) {
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: devNull,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CEILING_DIRECTORIES: ceiling,
    GIT_PAGER: 'cat',
    PAGER: 'cat',
    GIT_TERMINAL_PROMPT: '0',
    GIT_OPTIONAL_LOCKS: '0',
    LC_ALL: 'C'
  }
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY']) {
    delete env[key]
  }
  return env
}

export function gitIn(dir, ceiling) {
  const env = neutralEnv(ceiling)
  return (...args) => {
    const r = spawnSync('git', ['-C', dir, ...args], { env, encoding: 'utf8', timeout: 15000 })
    return { ok: r.status === 0, out: r.stdout ?? '', err: r.stderr ?? '' }
  }
}

export const shopDir = (t) => join(t.workspace, 'shop')
export const hasShop = (t) => existsSync(shopDir(t))
export const hasRepo = (t) => existsSync(join(shopDir(t), '.git'))
export const strayRepo = (t) => existsSync(join(t.workspace, '.git'))

/** A git function for shop/, or null when shop/ is not a repository yet. */
export function openShop(t) {
  return hasRepo(t) ? gitIn(shopDir(t), t.workspace) : null
}

export const check = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

/** The same failing detail for every check of a task. */
export const allFail = (names, message, output = '') =>
  names.map((name) => check(name, false, message, output))

export const NO_SETUP =
  'There is no shop folder yet. Run `node setup.mjs` in the terminal, in the top folder, then try again.'

export const NO_REPO = `shop is not a repository, so there is no history to read. ${START_OVER}`

const unix = (text) => text.replace(/\r\n/g, '\n')

export function commitOf(git, rev) {
  const r = git('rev-parse', '--verify', '--quiet', `${rev}^{commit}`)
  return r.ok ? r.out.trim() : null
}

/** A file as a commit has it, with Windows line ends made plain, or null when it is not there. */
export function fileAt(git, rev, path) {
  const r = git('show', `${rev}:${path}`)
  return r.ok ? unix(r.out) : null
}

/** A file as the staging area has it, or null when it is not staged or tracked. */
export const stagedFile = (git, path) => fileAt(git, '', path)

/** A file as it is in the working folder, or null when it is not there. */
export function workFile(t, path) {
  try {
    return unix(readFileSync(join(shopDir(t), path), 'utf8'))
  } catch {
    return null
  }
}

/** Commits from newest to oldest, following first parents from `rev`, stopping before `stop`. */
export function commits(git, rev = 'HEAD', stop) {
  const range = stop ? [rev, `^${stop}`] : [rev]
  const r = git('rev-list', '--first-parent', ...range)
  return r.ok ? r.out.split('\n').filter(Boolean) : []
}

export const parentOf = (git, hash) => commitOf(git, `${hash}^`)

/** The files a commit changed, compared with its parent; every file for a first commit. */
export function changedIn(git, hash) {
  const r = git('diff-tree', '--root', '--no-commit-id', '--name-only', '-r', hash)
  return r.out.split('\n').filter(Boolean)
}

export const subjectOf = (git, hash) => git('log', '-1', '--format=%s', hash).out.trim()

/** The whole message as it was written, without the trailing new lines. */
export const messageOf = (git, hash) => unix(git('log', '-1', '--format=%B', hash).out).trimEnd()

/** The newest commit on HEAD's line whose subject is exactly `subject`. */
export function findBySubject(git, subject) {
  return commits(git).find((hash) => subjectOf(git, hash) === subject) ?? null
}

export const graph = (git, n = 12) =>
  git('log', '--oneline', '--graph', '--decorate', '-n', String(n), '--all').out.trim()

export const status = (git) => git('status', '--short', '--untracked-files=all').out.trimEnd()

export const lines = (text) => (text ?? '').split('\n').map((line) => line.trim())

/** The name of a merge, revert, cherry-pick or rebase left half done, or null. */
export function unfinished(git) {
  const gitDir = git('rev-parse', '--absolute-git-dir').out.trim()
  const markers = {
    MERGE_HEAD: 'a merge',
    REVERT_HEAD: 'a revert',
    CHERRY_PICK_HEAD: 'a cherry-pick',
    'rebase-merge': 'a rebase',
    'rebase-apply': 'a rebase'
  }
  const found = Object.keys(markers).find((name) => existsSync(join(gitDir, name)))
  return found ? markers[found] : null
}

/** "a.html", "a.html and b.html", "a.html, b.html and c.html" */
export function listOf(names) {
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * The issue's untouched starting point: setup.mjs run again in a fresh sandbox. Returns a git
 * function for that shop (or null when setup made no repository) and a reader for its files.
 */
export async function reference(t) {
  const dir = await t.sandbox({ 'setup.mjs': t.chapterPath('starter/setup.mjs') })
  const run = await t.node(dir, ['setup.mjs'], { timeoutMs: 30000 })
  if (run.code !== 0) throw new Error(`setup.mjs failed in the grader: ${run.stderr || run.stdout}`)
  const shop = join(dir, 'shop')
  return {
    git: existsSync(join(shop, '.git')) ? gitIn(shop, dir) : null,
    file: (path) => {
      try {
        return unix(readFileSync(join(shop, path), 'utf8'))
      } catch {
        return null
      }
    }
  }
}

export const isAncestor = (git, a, b) => Boolean(a && b) && git('merge-base', '--is-ancestor', a, b).ok

/**
 * The setup's last commit (found by its subject) and the commits made on top of it, newest
 * first. Null when HEAD's history no longer holds that commit.
 */
export function sinceSetup(git, subject) {
  const head = commitOf(git, 'HEAD')
  const tip = git('log', '--all', '--format=%H', '--fixed-strings', `--grep=${subject}`).out
    .split('\n')
    .filter(Boolean)
    .find((hash) => subjectOf(git, hash) === subject)
  if (!head || !tip || !isAncestor(git, tip, head)) return null
  return { tip, mine: commits(git, 'HEAD', tip) }
}

export const LOST_HISTORY = `The history of shop no longer holds the commits setup made. ${START_OVER}`
