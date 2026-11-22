import {
  allFail, changedIn, check, fileAt, hasShop, listOf, LOST_HISTORY, NO_REPO, NO_SETUP, openShop,
  sinceSetup, stagedFile, START_OVER, status, workFile
} from '../../grading.mjs'

const TIP = 'Add two finds for April'
const FERNS = 'Ferns and Their Keepers'
const closing = (text) => /book fair/i.test(text ?? '')

function open(t, names) {
  if (!hasShop(t)) return { fail: allFail(names, NO_SETUP) }
  const git = openShop(t)
  if (!git) return { fail: allFail(names, NO_REPO) }
  const since = sinceSetup(git, TIP)
  if (!since) return { fail: allFail(names, LOST_HISTORY, status(git)) }
  return { git, ...since }
}

export const checks = {
  async discard(t) {
    const name = "Femi's new look is gone, and was never committed"
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, tip, mine } = s
    const output = status(git) || 'nothing to commit, working tree clean'
    const before = fileAt(git, tip, 'style.css')
    let message = null
    if (mine.some((hash) => fileAt(git, hash, 'style.css') !== before)) {
      message = `Femi's new look went into a commit, so it is in the history now. Wilma never wanted it saved. ${START_OVER}`
    } else if (stagedFile(git, 'style.css') !== before) {
      message = 'The new look is in the staging area now. It should not be staged, and not be in the working folder either.'
    } else if (workFile(t, 'style.css') === null) {
      message = 'style.css is gone from the working folder. The site needs the version from the last commit, and Git can bring that back.'
    } else if (workFile(t, 'style.css') !== before) {
      message = 'style.css in the working folder still differs from the last commit. git diff shows what is left of the new look.'
    }
    return [check(name, message === null, message, output)]
  },

  async unstage(t) {
    const name = 'The closing note is out of the staging area, and still in the file'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, tip, mine } = s
    const output = status(git) || 'nothing to commit, working tree clean'
    let message = null
    if (mine.some((hash) => closing(fileAt(git, hash, 'visit.html')))) {
      message = `The closing note went into a commit. Wilma has not confirmed the dates, so it must stay out of the history for now. ${START_OVER}`
    } else if (stagedFile(git, 'visit.html') !== fileAt(git, tip, 'visit.html')) {
      message = 'visit.html is still in the staging area: git status lists it under changes to be committed.'
    } else if (!closing(workFile(t, 'visit.html'))) {
      message = `The closing note is gone from visit.html in the working folder too. Wilma wants to keep it for later, only out of the next commit. Type the note from the task back in and save, or start the issue over by running \`node setup.mjs\` in the top folder.`
    }
    return [check(name, message === null, message, output)]
  },

  async ferns(t) {
    const name = 'The new find is a commit of its own'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, mine } = s
    const has = (text) => (text ?? '').includes(FERNS)
    const added = [...mine].reverse().find((hash) => has(fileAt(git, hash, 'finds.html')))
    const output = mine.map((hash) => `${git('log', '-1', '--format=%h %s', hash).out.trim()}: ${changedIn(git, hash).join(', ')}`).join('\n') || status(git)
    if (!added) {
      let message
      if (has(stagedFile(git, 'finds.html'))) message = 'The new find is staged, but no commit holds it yet.'
      else if (has(workFile(t, 'finds.html'))) message = 'The new find is in the working folder but no longer staged, and no commit holds it.'
      else message = `The new find is gone from finds.html. ${START_OVER}`
      return [check(name, false, message, output)]
    }
    const others = changedIn(git, added).filter((file) => file !== 'finds.html')
    return [
      check(
        name,
        others.length === 0,
        `The commit with the new find also holds ${listOf(others)}. A commit takes everything in the staging area, so only finds.html should be staged when you make it. ${START_OVER}`,
        output
      )
    ]
  }
}
