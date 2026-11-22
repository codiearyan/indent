import {
  allFail, check, commits, currentBranch, DETACHED, fileAt, graph, hasMarkers, hasShop, isAncestor,
  LOST_HISTORY, mergeHead, NO_REPO, NO_SETUP, openShop, setupCommit, START_OVER, status, tipOf,
  workFile
} from '../../grading.mjs'

const MAIN = 'Add The Orchard Ledger to the finds'
const WINDOW = 'Mention the window display on the home page'
const JUNE = 'Add A Lamp on Gull Island to the finds'
const BOOKS = { wilma: 'The Orchard Ledger', femi: 'A Lamp on Gull Island' }

function open(t, names) {
  if (!hasShop(t)) return { fail: allFail(names, NO_SETUP) }
  const git = openShop(t)
  if (!git) return { fail: allFail(names, NO_REPO) }
  const [start, window, june] = [MAIN, WINDOW, JUNE].map((subject) => setupCommit(git, subject))
  const main = tipOf(git, 'main')
  if (!start || !window || !june || !main || !isAncestor(git, start, main)) {
    return { fail: allFail(names, LOST_HISTORY, graph(git)) }
  }
  const pending = mergeHead(git)
  const output = `${status(git) ? `git status --short:\n${status(git)}\n\n` : ''}${graph(git)}`
  return { git, start, window, june, main, pending, on: currentBranch(git), output }
}

const STILL_OPEN =
  'The merge of window-display is still going: git status says you are still merging. Wilma has not said yes to that branch, so the merge has to be called off, not finished.'

const lines = (text) => (text ?? '').split('\n').map((line) => line.trim())

/** What is wrong with a version of finds.html that should hold both new books, or null. */
function findsProblem(git, start, june, text) {
  if (text === null) return `finds.html is gone from shop. ${START_OVER}`
  if (hasMarkers(text)) {
    return 'finds.html still has conflict markers in it: the lines that start with <<<<<<<, ======= or >>>>>>>. All three kinds have to go, and only the shop\'s own lines stay.'
  }
  const rows = lines(text)
  const list = rows.slice(rows.indexOf('<ul>') + 1, rows.indexOf('</ul>'))
  const onList = Object.values(BOOKS).filter((book) => list.some((row) => row.includes(book)))
  if (onList.length < 2) {
    return onList.length
      ? `Only ${onList[0]} is on the list of finds. Wilma and Femi each added a book, and both go on the shop's list.`
      : 'Neither new book is on the list of finds. Wilma and Femi each added one, and both go on the shop\'s list.'
  }
  const kept = new Set(rows)
  const lost = [...lines(fileAt(git, start, 'finds.html')), ...lines(fileAt(git, june, 'finds.html'))]
    .filter((line) => line && !kept.has(line))
  if (lost.length) {
    return 'Both new books are there, but another line of finds.html changed or went missing. Every other line stays as both sides had it.'
  }
  return null
}

export const checks = {
  async calloff(t) {
    const name = 'The merge of window-display is called off'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, window, main, pending, output } = s
    const fail = (message) => [check(name, false, message, output)]
    if (isAncestor(git, window, main)) {
      return fail(`window-display was merged into main, and Wilma has not said yes to it. ${START_OVER}`)
    }
    if (pending && isAncestor(git, window, pending)) return fail(STILL_OPEN)
    const home = workFile(t, 'index.html')
    if (hasMarkers(home) || home !== fileAt(git, main, 'index.html')) {
      return fail(
        'No merge is open any more, but index.html in the working folder is not as main has it: it still holds part of the conflict. git status shows it, and how to throw that change away.'
      )
    }
    return [check(name, true, '', output)]
  },

  async books(t) {
    const name = 'finds.html keeps both new books, with no conflict markers'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, start, window, june, main, pending, on, output } = s
    const fail = (message) => [check(name, false, message, output)]
    let text
    if (pending && isAncestor(git, june, pending)) text = workFile(t, 'finds.html')
    else if (isAncestor(git, june, main)) text = fileAt(git, main, 'finds.html')
    else if (pending && isAncestor(git, window, pending)) {
      return fail('The merge of window-display is still open, and Git starts no new merge while one is. Call it off first: that is the first task.')
    } else if (on === 'june-finds') {
      return fail('You are on june-finds. A merge brings the other branch into the one you are on, so main is where it has to run.')
    } else if (!on) return fail(DETACHED)
    else return fail('june-finds is not merged into main yet, so finds.html has no conflict to settle.')
    const problem = findsProblem(git, start, june, text)
    const done = pending ? '' : ' The merge is already finished, so fix finds.html in the editor and commit it.'
    return [check(name, problem === null, problem && `${problem}${done}`, output)]
  },

  async finish(t) {
    const name = 'The merge of june-finds is finished with a merge commit on main'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, start, june, main, pending, on, output } = s
    const fail = (message) => [check(name, false, message, output)]
    if (pending && isAncestor(git, june, pending)) {
      const unmerged = git('ls-files', '--unmerged').out.trim()
      return fail(
        unmerged
          ? 'The merge is still open, and finds.html is not marked as settled: git status lists it under Unmerged paths. Git needs the settled file in the staging area before it can make the merge commit.'
          : 'The conflict is settled and staged, but the merge is not finished: git status says All conflicts fixed but you are still merging. The merge commit is still to be made.'
      )
    }
    const merge = commits(git, main).find((hash) => {
      const [first, ...others] = git('rev-list', '--parents', '-n', '1', hash).out.trim().split(' ').slice(1)
      return isAncestor(git, start, first) && others.some((p) => isAncestor(git, june, p))
    })
    if (!merge) {
      if (on === 'june-finds' && isAncestor(git, start, tipOf(git, 'june-finds'))) {
        return fail('june-finds has main\'s commits now, but main does not have Femi\'s book. A merge brings the other branch into the one you are on.')
      }
      if (isAncestor(git, june, main)) return fail('Femi\'s book is on main, but no merge commit joins the two lines.')
      return fail('main has no merge commit for june-finds yet.')
    }
    if (hasMarkers(fileAt(git, main, 'finds.html'))) {
      return fail(
        'The merge commit holds finds.html with conflict markers still in it: Git commits a file as it is once it is staged. Take them out in the editor and commit the fixed file.'
      )
    }
    if (!on) return fail(DETACHED)
    return [check(name, true, '', output)]
  }
}
