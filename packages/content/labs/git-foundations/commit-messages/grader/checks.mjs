import {
  allFail, changedIn, check, fileAt, hasShop, listOf, LOST_HISTORY, messageOf, NO_REPO, NO_SETUP,
  openShop, parentOf, sinceSetup, stagedFile, START_OVER, status, subjectOf, workFile
} from '../../grading.mjs'

const BASE = 'Add the reading group page'
const FEMI = 'changes'
const VAGUE = new Set(
  'change changes changed update updates updated fix fixes fixed stuff wip edit edits misc tweak tweaks more again done ok test commit save saved work'.split(' ')
)
const MAX_SUBJECT = 72

function open(t, names) {
  if (!hasShop(t)) return { fail: allFail(names, NO_SETUP) }
  const git = openShop(t)
  if (!git) return { fail: allFail(names, NO_REPO) }
  const since = sinceSetup(git, BASE)
  if (!since) return { fail: allFail(names, LOST_HISTORY, status(git)) }
  return { git, ...since }
}

const words = (text) => text.split(/\s+/).filter(Boolean)

/** What is wrong with a first line, in plain words, or null when it does its job. */
function subjectProblem(subject, topic, about) {
  if (subject.length > MAX_SUBJECT) {
    return `The first line is ${subject.length} characters long. Keep it to ${MAX_SUBJECT} at most, and put the rest in the body.`
  }
  const plain = words(subject.toLowerCase().replace(/[^a-z0-9 ]/g, ' '))
  if (plain.length < 2 || plain.every((word) => VAGUE.has(word) || /\.html?$|^html$/.test(word))) {
    return `"${subject}" does not say what changed. Someone reading the history should know without opening the commit.`
  }
  if (!topic.test(subject)) return `"${subject}" does not say what changed: ${about}.`
  return null
}

/** The commit that first has the new postage, oldest first, among the commits since setup. */
function postageCommit(git, mine) {
  const raised = (text) => /postage[^\n]*3\.20/i.test(text ?? '')
  return [...mine].reverse().find((hash) => raised(fileAt(git, hash, 'finds.html'))) ?? null
}

/** The new postage was swept into Femi's reworded commit instead of a commit of its own. */
function sweptIn(git, mine, hash) {
  if (hash !== mine.at(-1) || !changedIn(git, hash).includes('visit.html')) return null
  return `The new postage went into Femi's reworded commit, because finds.html was staged when its message was changed. The postage needs a commit of its own. ${START_OVER}`
}

function noPostage(t, git) {
  const raised = (text) => /postage[^\n]*3\.20/i.test(text ?? '')
  if (raised(stagedFile(git, 'finds.html'))) return 'The new postage is staged, but no commit holds it yet.'
  if (raised(workFile(t, 'finds.html'))) {
    return 'finds.html has the new postage in the working folder, but it is not staged or committed yet.'
  }
  if (workFile(t, 'finds.html') === null) return `finds.html is gone from shop. ${START_OVER}`
  return 'finds.html still charges the old postage. Change the postage line in the editor and save first.'
}

export const checks = {
  async reword(t) {
    const name = "Femi's last commit says what it did"
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, mine } = s
    const output = git('log', '--oneline', '-n', '4').out.trim()
    if (mine.some((hash) => subjectOf(git, hash) === FEMI)) {
      const last = mine[0] && subjectOf(git, mine[0]) === FEMI
      return [
        check(
          name,
          false,
          last
            ? `The commit that says "${FEMI}" is still in the history with that message.`
            : `The commit that says "${FEMI}" is still in the history, and newer commits sit on top of it, so it is no longer the last commit and its message cannot be changed the way the lesson shows. A new commit with a better message does not replace it. ${START_OVER}`,
          output
        )
      ]
    }
    const reworded = mine.at(-1)
    const late = (text) => /late opening on thursdays/i.test(text ?? '')
    if (!reworded || !late(fileAt(git, reworded, 'visit.html')) || late(fileAt(git, parentOf(git, reworded), 'visit.html'))) {
      return [check(name, false, `Femi's change, the Thursday late opening, is no longer the commit after "${BASE}". ${START_OVER}`, output)]
    }
    const extra = changedIn(git, reworded).filter((file) => file !== 'visit.html')
    if (extra.length) {
      return [
        check(
          name,
          false,
          `The reworded commit now also holds ${listOf(extra)}. Changing the last commit also takes in whatever is staged at the time, so nothing else should be staged when you reword it. ${START_OVER}`,
          output
        )
      ]
    }
    const problem = subjectProblem(subjectOf(git, reworded), /thursday|late/i, 'look at the line the commit added to visit.html')
    return [check(name, problem === null, problem, output)]
  },

  async subject(t) {
    const name = 'The postage commit has a first line that says what changed'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, mine } = s
    const hash = postageCommit(git, mine)
    if (!hash) return [check(name, false, noPostage(t, git), status(git))]
    const message = messageOf(git, hash)
    const swept = sweptIn(git, mine, hash)
    if (swept) return [check(name, false, swept, message)]
    const problem = subjectProblem(message.split('\n')[0].trim(), /postage|delivery|shipping|p&p/i, 'it never mentions the postage')
    return [check(name, problem === null, problem, message)]
  },

  async body(t) {
    const name = 'The postage commit has a body that says why'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, mine } = s
    const hash = postageCommit(git, mine)
    if (!hash) return [check(name, false, noPostage(t, git), status(git))]
    const message = messageOf(git, hash)
    const swept = sweptIn(git, mine, hash)
    if (swept) return [check(name, false, swept, message)]
    const [first, second, ...rest] = message.split('\n')
    let problem = null
    if (second === undefined) {
      problem = 'The commit message is one line, so it has no body. The body goes after the first line, with an empty line between them.'
    } else if (second.trim() !== '') {
      problem = 'There is no empty line after the first line, so Git reads both lines as one long first line. Leave an empty line before the body.'
    } else {
      const body = rest.join(' ').trim()
      if (words(body).length < 6) problem = 'The body is too short to explain anything. Say in a sentence why the postage changed.'
      else if (body.toLowerCase() === first.trim().toLowerCase()) problem = 'The body repeats the first line. The first line says what changed; the body says why.'
      else if (!/courier/i.test(body)) problem = 'The body does not give Wilma\'s reason for the change. Read her request again: who put their price up?'
    }
    return [check(name, problem === null, problem, message)]
  }
}
