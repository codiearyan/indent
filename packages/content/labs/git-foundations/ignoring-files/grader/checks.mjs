import {
  allFail, check, commitOf, fileAt, hasShop, listOf, LOST_HISTORY, NO_REPO, NO_SETUP, openShop,
  sinceSetup, stagedFile, START_OVER, status, workFile
} from '../../grading.mjs'

const TIP = 'Put the site online'
const SITE = ['index.html', 'visit.html', 'finds.html', 'style.css', 'events.html']
// The setup's two drafts, and one the checks make up, so a pattern for the folder is what passes.
const DRAFTS = ['drafts/summer-sale.html', 'drafts/ideas.txt', 'drafts/autumn/list.txt']

function open(t, names) {
  if (!hasShop(t)) return { fail: allFail(names, NO_SETUP) }
  const git = openShop(t)
  if (!git) return { fail: allFail(names, NO_REPO) }
  const since = sinceSetup(git, TIP)
  if (!since) return { fail: allFail(names, LOST_HISTORY, status(git)) }
  return { git, ...since }
}

/** Whether a line of shop/.gitignore itself, not another ignore file, makes Git ignore the path. */
function ignored(git, path) {
  if (!git('check-ignore', '-q', '--no-index', path).ok) return false
  const source = git('check-ignore', '-v', '--no-index', path).out.split(':')[0]
  return source === '.gitignore'
}

const patterns = (text) =>
  (text ?? '').split('\n').filter((line) => line.trim() && !line.trim().startsWith('#'))

const shown = (t) => {
  const text = workFile(t, '.gitignore')
  return text === null ? '.gitignore: (not there)' : `.gitignore:\n${text.trimEnd() || '(empty)'}`
}

/** What is wrong with .gitignore as a whole, before any one pattern is judged. */
function fileProblem(t, git) {
  const text = workFile(t, '.gitignore')
  if (text === null) return `There is no .gitignore in shop any more. ${START_OVER}`
  if (!patterns(text).length) {
    return '.gitignore has no patterns in it yet. Write them in the editor, one per line, and save the file.'
  }
  if (ignored(git, '.gitignore')) {
    return 'A pattern in .gitignore matches .gitignore itself, so Git would leave the file of rules out of every commit. It has to be committed like any other file.'
  }
  const site = SITE.filter((file) => ignored(git, file))
  if (site.length) {
    return `The patterns in .gitignore also match ${listOf(site)}, which ${site.length > 1 ? 'belong' : 'belongs'} to the website. A pattern should match only the files Git is meant to leave alone.`
  }
  return null
}

const tracked = (git, path) => stagedFile(git, path) !== null
const trackedUnder = (git, folder) => git('ls-files', folder).out.trim().length > 0

const NAME_HINT =
  'Check each letter of the name against what git status prints. A space at the start or end of a line counts as part of the pattern.'

export const checks = {
  async stock(t) {
    const name = "Git ignores the till's stock export"
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git } = s
    let message = fileProblem(t, git)
    if (!message && tracked(git, 'stock.csv')) {
      message =
        'stock.csv is tracked: it went into the staging area or a commit. Git keeps tracking a file it already has, whatever .gitignore says. The third task shows how to make Git forget a file and keep it on disk.'
    } else if (!message && !ignored(git, 'stock.csv')) {
      message = `No line of .gitignore matches stock.csv yet, so git status still lists it. ${NAME_HINT}`
    }
    return [check(name, message === null, message, shown(t))]
  },

  async drafts(t) {
    const name = "Git ignores Femi's drafts folder, whatever is in it"
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git } = s
    let message = fileProblem(t, git)
    const missed = DRAFTS.filter((path) => !ignored(git, path))
    if (!message && trackedUnder(git, 'drafts')) {
      message =
        'Files in drafts are tracked: they went into the staging area or a commit, and Git keeps tracking files it already has. The third task shows how to make Git forget a file and keep it on disk.'
    } else if (!message && missed.length === DRAFTS.length) {
      message = `No line of .gitignore matches the drafts folder yet. ${NAME_HINT}`
    } else if (!message && missed.length) {
      message =
        'Some files in drafts are ignored and some are not. Femi puts all kinds of files in that folder, so the pattern has to take the whole folder, not one kind of file in it.'
    }
    return [check(name, message === null, message, shown(t))]
  },

  async upload(t) {
    const name = 'Git no longer tracks upload.log, which stays on disk'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git } = s
    const output = `${shown(t)}\n\ngit status --short:\n${status(git) || '(nothing to commit)'}`
    let message = fileProblem(t, git)
    if (message) return [check(name, false, message, output)]
    const isIgnored = ignored(git, 'upload.log')
    if (workFile(t, 'upload.log') === null) {
      message =
        "upload.log is gone from shop's folder too, and Femi's upload tool still writes to it. Only Git was meant to forget the file; it stays on disk."
      message += commitOf(git, 'HEAD') && fileAt(git, 'HEAD', 'upload.log') !== null
        ? ' The last commit still has it, so git status shows how to bring it back, as in the last issue.'
        : ` ${START_OVER}`
    } else if (tracked(git, 'upload.log')) {
      message = isIgnored
        ? 'upload.log matches a line of .gitignore, but Git still tracks it, which is why git status still lists it as modified. A pattern only keeps out files Git does not track yet.'
        : 'Git still tracks upload.log, and no line of .gitignore matches it yet.'
    } else if (!isIgnored) {
      message = `Git no longer tracks upload.log, but no line of .gitignore matches it, so git status lists it as untracked now. ${NAME_HINT}`
    }
    return [check(name, message === null, message, output)]
  },

  async commit(t) {
    const name = 'The new .gitignore and the end of upload.log are committed'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, tip, mine } = s
    const output = `git status --short:\n${status(git) || '(nothing to commit)'}`
    const fail = (message) => [check(name, false, message, output)]
    if (!mine.length) return fail('There is no commit since the setup yet.')
    const committed = fileAt(git, 'HEAD', '.gitignore')
    if (committed === null) {
      return fail(
        '.gitignore itself is not in the last commit. It is a file like any other: until it is committed, its patterns live only in this folder, and nobody else who gets the history has them.'
      )
    }
    const firstThree = [
      ['stock.csv', ignored(git, 'stock.csv') && !tracked(git, 'stock.csv')],
      ['the drafts folder', DRAFTS.every((path) => ignored(git, path)) && !trackedUnder(git, 'drafts')],
      ['upload.log', ignored(git, 'upload.log') && !tracked(git, 'upload.log') && workFile(t, 'upload.log') !== null]
    ]
      .filter(([, ok]) => !ok)
      .map(([what]) => what)
    if (fileProblem(t, git) || firstThree.length) {
      return fail(`The first three tasks are not all done yet: look at ${listOf(firstThree) || '.gitignore'} first.`)
    }
    if (committed !== workFile(t, '.gitignore')) {
      return fail('.gitignore in the folder differs from the one in the last commit. Stage it again as it is now, and commit.')
    }
    const kept = ['upload.log', 'stock.csv'].filter((file) => fileAt(git, 'HEAD', file) !== null)
    if (git('ls-tree', '-r', '--name-only', 'HEAD', 'drafts').out.trim()) kept.push('the drafts folder')
    if (kept.length) {
      return fail(`The last commit still holds ${listOf(kept)}. The removal is staged once Git forgets a file, and it goes into the history with the next commit.`)
    }
    const changed = SITE.filter((file) => fileAt(git, 'HEAD', file) !== fileAt(git, tip, file))
    if (changed.length) {
      return fail(`Your commits also changed ${listOf(changed)}. Only .gitignore and upload.log were meant to change. ${START_OVER}`)
    }
    if (status(git)) return fail('Something is still not committed: git status lists it.')
    return [check(name, true, '', output)]
  }
}
