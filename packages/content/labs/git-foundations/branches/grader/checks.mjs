import {
  allFail, branchNames, check, currentBranch, DETACHED, fileAt, graph, hasShop, isAncestor, listOf,
  LOST_HISTORY, NO_REPO, NO_SETUP, openShop, setupCommit, stagedFile, START_OVER, tipOf, workFile
} from '../../grading.mjs'

const TIP = 'Add Ferns and Their Keepers to the finds'
const BRANCH = 'summer-sale'
const hasSale = (text) => /summer sale/i.test(text ?? '')
const meeting = (text) => (text ?? '').split('\n').find((line) => /first thursday/i.test(line)) ?? ''
const movedToSeven = (text) => /\b19[:.]00\b/.test(meeting(text)) && !/18[:.]30/.test(meeting(text))

function open(t, names) {
  if (!hasShop(t)) return { fail: allFail(names, NO_SETUP) }
  const git = openShop(t)
  if (!git) return { fail: allFail(names, NO_REPO) }
  const tip = setupCommit(git, TIP)
  const main = tipOf(git, 'main')
  if (!tip || !main || !isAncestor(git, tip, main)) return { fail: allFail(names, LOST_HISTORY, graph(git)) }
  return { git, tip, main, sale: tipOf(git, BRANCH), on: currentBranch(git), output: graph(git) }
}

/** Why summer-sale is missing, with the branches there are. */
function noBranch(git) {
  const names = branchNames(git)
  const near = names.find((name) => name !== BRANCH && name.toLowerCase().replace(/[^a-z]/g, '') === 'summersale')
  if (near) {
    return `There is a branch called ${near}, but none called ${BRANCH}. A branch name has to match exactly: small letters, joined by a hyphen. The lesson shows how to rename a branch.`
  }
  return `There is no branch called ${BRANCH} yet. The branches in shop: ${listOf(names)}.`
}

/** The newest commit on summer-sale, not on main, whose home page announces the sale. */
function saleCommit(git, sale, main) {
  const own = git('rev-list', sale, `^${main}`).out.split('\n').filter(Boolean)
  return own.find((hash) => hasSale(fileAt(git, hash, 'index.html'))) ?? null
}

export const checks = {
  async branch(t) {
    const name = 'summer-sale starts from main, and you switched to it'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, tip, main, sale, on, output } = s
    let message = null
    if (!sale) message = noBranch(git)
    else if (!isAncestor(git, tip, sale)) {
      message = `${BRANCH} does not start from the last commit of main, so it is missing part of the site. ${START_OVER}`
    } else if (on !== BRANCH && !git('rev-list', sale, `^${main}`).out.trim()) {
      message = on
        ? `${BRANCH} is there, but you are still on ${on}: the first line of git status says which branch you are on. Making a branch does not move you onto it.`
        : DETACHED
    }
    return [check(name, message === null, message, output)]
  },

  async sale(t) {
    const name = 'The sale is a commit on summer-sale, and not on main'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, main, sale, output } = s
    const fail = (message) => [check(name, false, message, output)]
    if (hasSale(fileAt(git, main, 'index.html'))) {
      return fail(
        `The sale line is in a commit on main. It was committed while git status said On branch main, so main moved on and ${BRANCH} did not. Wilma does not want the sale on the site before July. ${START_OVER}`
      )
    }
    if (!sale) return fail(noBranch(git))
    if (!saleCommit(git, sale, main)) {
      if (hasSale(stagedFile(git, 'index.html'))) return fail('The sale line is staged, but no commit holds it yet.')
      if (hasSale(workFile(t, 'index.html'))) {
        return fail('The sale line is in index.html in the working folder, but not in a commit yet. A branch only keeps what is committed on it.')
      }
      return fail(`index.html has no summer sale line yet on ${BRANCH}. Type the line from the task into the home page and save it.`)
    }
    if (!hasSale(fileAt(git, sale, 'index.html'))) {
      return fail(`The last commit on ${BRANCH} took the sale line out of index.html again.`)
    }
    const start = git('merge-base', main, sale).out.trim()
    const others = git('diff', '--name-only', start, sale).out.split('\n').filter((file) => file && file !== 'index.html')
    if (others.length) {
      return fail(`${BRANCH} also changes ${listOf(others)}. The sale only needs the line on the home page. Put ${others.length > 1 ? 'them' : 'it'} back as on main and commit that on ${BRANCH}, or start over: run \`node setup.mjs\` in the top folder.`)
    }
    return [check(name, true, '', output)]
  },

  async back(t) {
    const name = 'You are back on main, and the sale is not in its files'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, main, sale, on, output } = s
    let message = null
    if (!sale || !saleCommit(git, sale, main)) {
      message = `${BRANCH} has no commit with the sale yet, so there is nothing for main to leave out. Do the second task first.`
    } else if (!on) message = DETACHED
    else if (on !== 'main') message = `You are still on ${on}: the first line of git status says which branch you are on.`
    else if (hasSale(workFile(t, 'index.html'))) {
      message = `index.html in the working folder still announces the sale while you are on main. The sale is committed on ${BRANCH}, so this copy of the line is a change of its own on main. git status shows it, and how to throw it away.`
    }
    return [check(name, message === null, message, output)]
  },

  async evening(t) {
    const name = 'The new reading group time is a commit on main'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, tip, main, output } = s
    const fail = (message) => [check(name, false, message, output)]
    const onMain = git('rev-list', main, `^${tip}`).out.split('\n').filter(Boolean)
    const moved = onMain.find((hash) => movedToSeven(fileAt(git, hash, 'events.html')))
    if (!moved) {
      const branchHas = branchNames(git).find((b) => b !== 'main' && movedToSeven(fileAt(git, `refs/heads/${b}`, 'events.html')))
      if (branchHas) {
        return fail(`The new time is in a commit on ${branchHas}, not on main. A commit goes onto the branch git status names on its first line.`)
      }
      if (movedToSeven(stagedFile(git, 'events.html'))) return fail('The new time is staged, but no commit holds it yet.')
      if (movedToSeven(workFile(t, 'events.html'))) return fail('events.html has the new time in the working folder, but no commit on main holds it yet.')
      return fail('events.html on main still has the reading group at 18:30. Change the time on that line in the editor and save it first.')
    }
    if (!movedToSeven(fileAt(git, main, 'events.html'))) {
      return fail('A later commit on main took the new reading group time out again.')
    }
    const rest = (text) => text.split('\n').filter((line) => !/first thursday/i.test(line)).map((line) => line.trim())
    const before = rest(fileAt(git, tip, 'events.html'))
    const lost = before.filter((line) => line && !rest(fileAt(git, main, 'events.html')).includes(line))
    if (lost.length) return fail('The reading group page lost or changed another line on the way. Only the time was meant to change.')
    if (hasSale(fileAt(git, main, 'index.html'))) {
      return fail(`main has the sale line too now. Wilma wants it only on ${BRANCH} until July. ${START_OVER}`)
    }
    return [check(name, true, '', output)]
  }
}
