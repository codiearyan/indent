import {
  allFail, check, commitOf, fileAt, findBySubject, hasShop, LOST_HISTORY, NO_REPO, NO_SETUP,
  openShop, sinceSetup, stagedFile, START_OVER, status, subjectOf, workFile
} from '../../grading.mjs'

const TIP = 'Link the reading group from the home page'
const CULPRIT = 'Tidy up the visit page'
const SUNDAY = '<li>Sunday: 11:00 to 16:00</li>'
const APRIL = ['The Marrowby Sisters', 'A Kettle for Grandmother Ash']
const AMEND = `While that commit is your last one, you can put the book back, stage finds.html and amend the commit. ${START_OVER.replace('To start', 'Or, to start')}`

function open(t, names) {
  if (!hasShop(t)) return { fail: allFail(names, NO_SETUP) }
  const git = openShop(t)
  if (!git) return { fail: allFail(names, NO_REPO) }
  const since = sinceSetup(git, TIP)
  if (!since) return { fail: allFail(names, LOST_HISTORY, status(git)) }
  return { git, ...since }
}

const trimmed = (text) => (text ?? '').split('\n').map((line) => line.trim())

/** The Sunday line exactly as it was, inside the list of hours. */
function sundayBack(text) {
  const rows = trimmed(text)
  const at = rows.indexOf(SUNDAY)
  return at > rows.indexOf('<ul>') && rows.indexOf('<ul>') !== -1 && at < rows.indexOf('</ul>')
}

const books = (text) => trimmed(text).filter((line) => line.startsWith('<li>') && line.includes('£'))
const log = (git) => git('log', '--oneline', '-n', '5').out.trim()

export const checks = {
  async sunday(t) {
    const name = 'The Sunday hours are back on the visit page'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, tip } = s
    const head = fileAt(git, 'HEAD', 'visit.html')
    if (!sundayBack(head)) {
      const working = workFile(t, 'visit.html')
      let message
      if (sundayBack(stagedFile(git, 'visit.html'))) message = 'The Sunday line is staged, but no commit holds it yet.'
      else if (sundayBack(working)) message = 'The Sunday line is back in the working folder, but not staged or committed yet.'
      else if (working === null) message = `visit.html is gone from shop. ${START_OVER}`
      else if (/sunday/i.test(working) || /sunday/i.test(head ?? '')) {
        message = 'There is a Sunday line, but not exactly as it was, or not inside the list of hours. The commit that removed it shows the old line, character for character: copy it from there.'
      } else message = 'visit.html has no Sunday hours yet. Find the commit that removed them; it shows the line that went.'
      return [check(name, false, message, log(git))]
    }
    const lost = trimmed(fileAt(git, tip, 'visit.html')).filter((line) => line && !trimmed(head).includes(line))
    return [
      check(
        name,
        lost.length === 0,
        'The Sunday line is back, but another line of visit.html changed or went missing on the way. Only the Sunday line was meant to come back.',
        log(git)
      )
    ]
  },

  async name(t) {
    const name = 'A commit message names the commit that removed the Sunday hours'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, mine } = s
    const culprit = findBySubject(git, CULPRIT)
    if (!culprit) return [check(name, false, LOST_HISTORY, log(git))]
    if (!mine.length) {
      return [check(name, false, 'There is no commit since Femi\'s last one yet. The message of your new commit is where the hash goes.', log(git))]
    }
    const named = mine.flatMap((hash) => git('log', '-1', '--format=%B', hash).out.match(/\b[0-9a-f]{7,40}\b/gi) ?? [])
    const output = mine.map((hash) => git('log', '-1', '--format=%h %s', hash).out.trim()).join('\n')
    if (named.some((token) => commitOf(git, token) === culprit)) return [check(name, true, '', output)]
    const others = [...new Set(named.map((token) => commitOf(git, token)).filter(Boolean))]
    let message
    if (others.length) {
      message = `Your message names "${subjectOf(git, others[0])}", which did not take the Sunday hours off. Look at what each commit did to visit.html.`
    } else if (named.length) {
      message = `No commit in shop has a hash that starts with ${named[0]}. Copy the short hash exactly as git log prints it.`
    } else {
      message = 'None of your new commit messages names a commit by its hash. Copy the short hash from git log into the message.'
    }
    return [check(name, false, message, output)]
  },

  async review(t) {
    const name = "Femi's April finds are committed, and nothing else on the list changed"
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, tip, mine } = s
    const hasApril = (text) => APRIL.every((title) => (text ?? '').includes(title))
    const added = [...mine].reverse().find((hash) => hasApril(fileAt(git, hash, 'finds.html')))
    if (!added) {
      let message
      if (hasApril(stagedFile(git, 'finds.html'))) message = 'The April finds are staged, but no commit holds them yet.'
      else if (hasApril(workFile(t, 'finds.html'))) message = 'The April finds are in the working folder, but not staged or committed yet.'
      else if (workFile(t, 'finds.html') === null) message = `finds.html is gone from shop. ${START_OVER}`
      else message = `finds.html no longer has both of Femi's April books, so there is nothing to commit for them. ${START_OVER}`
      return [check(name, false, message, log(git))]
    }
    const before = books(fileAt(git, tip, 'finds.html'))
    const after = books(fileAt(git, added, 'finds.html'))
    const gone = before.filter((line) => !after.includes(line))
    return [
      check(
        name,
        gone.length === 0,
        gone.length > 1
          ? `The commit with the April finds also takes books off the list. Nothing was sold this week, so every book stays. Look at what git diff marks with a minus before you commit. ${AMEND}`
          : `The commit with the April finds also takes a book off the list, or changes one. Nothing was sold this week, so every book stays. Look at what git diff marks with a minus before you commit. ${AMEND}`,
        log(git)
      )
    ]
  }
}
