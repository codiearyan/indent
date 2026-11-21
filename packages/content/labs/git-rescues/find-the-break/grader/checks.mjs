import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  check, commitOf, currentBranch, dirtyFiles, fileAt, graph, isAncestor, noRepo, openRepo, reference, unfinished
} from '../../grading.mjs'

const FIRST_BAD = 'Tidy the fare calculator'
const LAST_GOOD = 'Name the group discount constants'
const OLD_TIP = 'Add evening sailing'

function recorded(t, git) {
  const file = join(t.workspace, 'repo', 'bisect-result.txt')
  if (!existsSync(file)) return { text: null, hash: null }
  const text = readFileSync(file, 'utf8')
  const token = text.match(/\b[0-9a-f]{7,40}\b/i)?.[0]
  return { text, token, hash: token ? commitOf(git, token) : null }
}

function findMessage(r, ref) {
  if (r.text === null) return 'repo/bisect-result.txt does not exist yet. Create it and write the hash git bisect reports.'
  if (!r.token) return 'repo/bisect-result.txt should contain a commit hash (at least 7 characters).'
  if (!r.hash) return 'The hash in repo/bisect-result.txt is not a commit in this repository, or it is too short to be unique.'
  if (r.hash === ref.hash(LAST_GOOD)) return 'That commit is the last good one. Bisect names the first commit where the check fails.'
  if (isAncestor(ref.git, ref.hash(FIRST_BAD), r.hash)) {
    return 'The check does fail at that commit, but it was already broken earlier. Find the first commit where it fails.'
  }
  return 'The check still passes at that commit. Mark good and bad commits carefully and let bisect name the first bad one.'
}

async function runAtMain(t, git, ref) {
  const dir = join(await t.sandbox(), '.grader-probe')
  mkdirSync(dir, { recursive: true })
  const fares = fileAt(git, 'main', 'fares.mjs')
  if (fares === null) return { check: { code: 1, stdout: 'main has no fares.mjs' }, probe: null }
  writeFileSync(join(dir, 'fares.mjs'), fares)
  writeFileSync(join(dir, 'check.mjs'), fileAt(ref.git, ref.hash(OLD_TIP), 'check.mjs'))
  writeFileSync(join(dir, 'probe.mjs'), readFileSync(t.chapterPath('grader/probe.mjs')))
  const [checkRun, probeRun] = await Promise.all([t.node(dir, ['check.mjs']), t.node(dir, ['probe.mjs'])])
  let probe = null
  try {
    probe = JSON.parse(probeRun.stdout.trim().split('\n').pop())
  } catch {}
  return { check: checkRun, probe, probeOutput: probeRun.stdout + probeRun.stderr }
}

export const checks = {
  async find(t) {
    const names = ['bisect-result.txt holds a commit hash', 'It names the first bad commit']
    const git = openRepo(t)
    if (!git) return noRepo(names)
    const ref = await reference(t)
    const r = recorded(t, git)
    return [
      check(names[0], r.hash !== null, findMessage(r, ref), r.text ?? undefined),
      check(names[1], r.hash !== null && r.hash === ref.hash(FIRST_BAD), findMessage(r, ref), r.text ?? undefined)
    ]
  },

  async fix(t) {
    const names = [
      'The fix is a new commit on top of main',
      'node check.mjs passes on main',
      'Bike tickets still work on main',
      'The bisect is over and you are back on main',
      'The working tree is clean'
    ]
    const git = openRepo(t)
    if (!git) return noRepo(names)
    const ref = await reference(t)
    const oldTip = ref.hash(OLD_TIP)
    const main = commitOf(git, 'refs/heads/main')
    const run = await runAtMain(t, git, ref)
    const bikesOk = Array.isArray(run.probe) && run.probe.every((c) => c.got === c.want)
    const op = unfinished(git)
    const branch = currentBranch(git)
    const dirty = dirtyFiles(git)
    return [
      check(
        names[0],
        main !== oldTip && isAncestor(git, oldTip, main),
        main === oldTip
          ? 'main has no new commit yet. Fix fares.mjs and commit it on main.'
          : 'main no longer contains the original history. Add the fix as a new commit on top instead of rewriting.',
        graph(git, 'main')
      ),
      check(
        names[1],
        run.check.code === 0,
        'The fare check fails on main\'s last commit. Compare the first bad commit with the one before it to see what changed.',
        run.check.stdout
      ),
      check(
        names[2],
        bikesOk,
        'Groups with bikes are priced wrongly on main. Keep the later bike ticket change while you fix the discount.',
        run.probe ? JSON.stringify(run.probe, null, 2) : run.probeOutput
      ),
      check(
        names[3],
        op !== 'a bisect' && branch === 'main',
        op === 'a bisect'
          ? 'A bisect is still running. End it so HEAD returns to where you started.'
          : 'HEAD should be on the main branch.',
        `HEAD: ${branch ?? commitOf(git, 'HEAD')}`
      ),
      check(
        names[4],
        !(op && op !== 'a bisect') && dirty.length === 0,
        op ? `The repository is in the middle of ${op}. Finish it or abort it.` : 'git status shows uncommitted changes. Commit the fix.',
        dirty.join('\n')
      )
    ]
  }
}
