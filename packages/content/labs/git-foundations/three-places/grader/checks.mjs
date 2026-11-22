import {
  allFail, changedIn, check, fileAt, hasShop, listOf, LOST_HISTORY, NO_REPO, NO_SETUP, openShop,
  sinceSetup, stagedFile, START_OVER, status, workFile
} from '../../grading.mjs'

const TIP = 'Open at 9:00 on Saturdays'
const NEW_FINDS = ["The Tidecaller's Almanac", 'Notes from a Copper Town']
const RIGHT = '01632 960 418'
const TYPO = '01632 960 481'

function open(t, names) {
  if (!hasShop(t)) return { fail: allFail(names, NO_SETUP) }
  const git = openShop(t)
  if (!git) return { fail: allFail(names, NO_REPO) }
  const since = sinceSetup(git, TIP)
  if (!since) return { fail: allFail(names, LOST_HISTORY, status(git)) }
  return { git, ...since }
}

const hasFinds = (text) => NEW_FINDS.every((title) => (text ?? '').includes(title))
const hasRight = (text) => (text ?? '').includes(RIGHT) && !(text ?? '').includes(TYPO)

/** What a commit holds, as "abc1234 Message: a.html, b.html". */
function describe(git, hash) {
  const subject = git('log', '-1', '--format=%h %s', hash).out.trim()
  return `${subject}: ${changedIn(git, hash).join(', ')}`
}

function notCommitted(t, git, file, done, what) {
  if (done(stagedFile(git, file))) return `${what} staged, but no commit holds that yet.`
  if (done(workFile(t, file))) {
    return `${what} in the working folder, but not staged or committed yet. Git saves a change in two steps.`
  }
  return null
}

export const checks = {
  async finds(t) {
    const name = 'The new finds are a commit of their own'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, mine } = s
    const output = mine.map((hash) => describe(git, hash)).join('\n') || 'no commits since setup'
    const withFinds = [...mine].reverse().find((hash) => hasFinds(fileAt(git, hash, 'finds.html')))
    if (!withFinds) {
      const message =
        notCommitted(t, git, 'finds.html', hasFinds, 'The new finds are') ??
        (workFile(t, 'finds.html') === null
          ? `finds.html is gone from shop. ${START_OVER}`
          : `finds.html no longer holds both of Femi's new books, so there is nothing to commit for them. ${START_OVER}`)
      return [check(name, false, message, output)]
    }
    const others = changedIn(git, withFinds).filter((file) => file !== 'finds.html')
    if (others.length) {
      return [
        check(
          name,
          false,
          `The commit with the new finds also holds ${listOf(others)}. A commit takes everything in the staging area, so only finds.html should be staged when you make it. ${START_OVER}`,
          output
        )
      ]
    }
    const head = fileAt(git, 'HEAD', 'finds.html')
    return [
      check(
        name,
        hasFinds(head),
        'A later commit took one of the new books off finds.html again.',
        output
      )
    ]
  },

  async phone(t) {
    const name = 'The fixed phone number is a commit of its own'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, mine } = s
    const output = mine.map((hash) => describe(git, hash)).join('\n') || 'no commits since setup'
    const fixed = [...mine].reverse().find((hash) => hasRight(fileAt(git, hash, 'visit.html')))
    if (!fixed) {
      const typoCommitted = mine.some((hash) => (fileAt(git, hash, 'visit.html') ?? '').includes(TYPO))
      const working = workFile(t, 'visit.html')
      let message = notCommitted(t, git, 'visit.html', hasRight, 'The fixed number is')
      if (message && typoCommitted) {
        message = `visit.html went into a commit with the number Femi typed, and the fix came after. Your fix is ${hasRight(stagedFile(git, 'visit.html')) ? 'staged' : 'only in the working folder'}, and it needs a commit of its own too.`
      } else if (message && (stagedFile(git, 'visit.html') ?? '').includes(TYPO)) {
        message = 'The staging area still holds visit.html with the wrong number: it was staged before you fixed it. The staging area keeps a file as it was when it was added, so the fix in the working folder is not in it.'
      } else if (!message) {
        message =
          working === null
            ? `visit.html is gone from shop. ${START_OVER}`
            : (working ?? '').includes(TYPO)
              ? `visit.html still has the number Femi typed, with two digits swapped. Wilma's number is in the task. Fix it in the editor and save.`
              : 'The phone line in visit.html does not match Wilma\'s number. Copy the number from the task, with its spaces.'
      }
      return [check(name, false, message, output)]
    }
    const others = changedIn(git, fixed).filter((file) => file !== 'visit.html')
    if (others.length) {
      return [
        check(
          name,
          false,
          `The commit with the fixed number also holds ${listOf(others)}. Only visit.html should be staged when you make it. ${START_OVER}`,
          output
        )
      ]
    }
    return [
      check(
        name,
        hasRight(fileAt(git, 'HEAD', 'visit.html')),
        'A later commit changed the phone number in visit.html again.',
        output
      )
    ]
  },

  async events(t) {
    const name = 'The reading group page is staged, not committed'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git } = s
    const output = status(git)
    const committed = fileAt(git, 'HEAD', 'events.html') !== null
    const staged = stagedFile(git, 'events.html') !== null
    const onDisk = workFile(t, 'events.html') !== null
    let message = null
    if (committed) {
      message = `events.html is already in a commit. Wilma wants to read it before it goes into the history, so it should wait in the staging area. ${START_OVER}`
    } else if (!onDisk && !staged) {
      message = `events.html is gone from shop. ${START_OVER}`
    } else if (!staged) {
      message = 'events.html is not staged yet: git status still lists it as untracked.'
    } else if (!onDisk) {
      message = 'events.html is staged, but the file itself is gone from the working folder. Keep the file in shop.'
    }
    return [check(name, message === null, message, output)]
  }
}
