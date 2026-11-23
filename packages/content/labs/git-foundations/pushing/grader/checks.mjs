import {
  allFail, branchNames, changedIn, check, commitOf, currentBranch, DETACHED, fileAt, graphs, hasShop,
  isAncestor, lines, listOf, LOST_HISTORY, mergeHead, NO_REPO, NO_SETUP, NOT_ORIGIN, OPEN_MERGE,
  openServer, openShop, readCopy, remoteIsServer, remoteTip, setupCommit, stagedFile, START_OVER, tipOf, workFile
} from '../../grading.mjs'

const START = 'Choose the August book for the reading group'
const MINE = 'Say that gift vouchers last two years'
const WILMA = 'Link the gift vouchers from the home page'
const FEMI = 'Add Winter Hedgerows to the finds'

const FORCED = `Femi's newest find is gone from the server: a forced push put your main there in place of the server's, and his commit went with it. ${START_OVER}`

async function open(live, names) {
  const t = await readCopy(live)
  if (!hasShop(t)) return { fail: allFail(names, NO_SETUP) }
  const server = openServer(t)
  if (!server) return { fail: allFail(names, NO_SETUP) }
  const git = openShop(t)
  if (!git) return { fail: allFail(names, NO_REPO) }
  const output = graphs(git, server)
  const [start, mine, wilma] = [START, MINE, WILMA].map((subject) => setupCommit(git, subject))
  if (!start || !mine || !wilma) return { fail: allFail(names, LOST_HISTORY, output) }
  if (!remoteIsServer(t, git)) return { fail: allFail(names, NOT_ORIGIN, output) }
  const femi = setupCommit(server, FEMI)
  if (!femi) return { fail: allFail(names, FORCED, output) }
  return { t, git, server, start, mine, wilma, femi, on: currentBranch(git), output }
}

/** True when `rev` in repository `git` has `commit`, which may not have reached it yet. */
const has = (git, commit, rev) => Boolean(rev) && Boolean(commitOf(git, commit)) && isAncestor(git, commit, rev)

const closedLine = (text) => lines(text).find((line) => /closed/i.test(line) && /10 to 16 August/i.test(line)) ?? null
const roughClosed = (text) => lines(text).some((line) => /closed|stocktak/i.test(line))

export const checks = {
  async vouchers(t) {
    const name = "The server's gift-vouchers has your fix and Wilma's link"
    const s = await open(t, [name])
    if (s.fail) return s.fail
    const { git, server, mine, wilma, on, output } = s
    const fail = (message) => [check(name, false, message, output)]
    const there = tipOf(server, 'gift-vouchers')
    if (!has(server, wilma, there)) {
      return fail(`Wilma's link is gone from the server's gift-vouchers: a forced push put another version there. ${START_OVER}`)
    }
    if (has(server, mine, there)) return [check(name, true, '', output)]
    const elsewhere = branchNames(server).find((branch) => has(server, mine, tipOf(server, branch)))
    if (elsewhere) {
      return fail(`Your fix reached the server, but as a branch called ${elsewhere}, not on gift-vouchers, where Wilma looks for it. A push names the branch on the server it goes to.`)
    }
    if (!has(git, mine, tipOf(git, 'gift-vouchers'))) return fail(`Your gift-vouchers no longer has your fix. ${START_OVER}`)
    if (on && on !== 'gift-vouchers') {
      return fail(`The server's gift-vouchers does not have your fix yet. You are on ${on}, and a push with no names sends the branch you are on.`)
    }
    return fail("The server's gift-vouchers does not have your fix and the merge with Wilma's link yet: nothing has been sent from your gift-vouchers.")
  },

  async closed(t) {
    const name = 'main has a commit that says the shop is closed from 10 to 16 August'
    const s = await open(t, [name])
    if (s.fail) return s.fail
    const { git, start, mine, femi, on, output } = s
    const fail = (message) => [check(name, false, message, output)]
    const main = tipOf(git, 'main')
    if (has(git, mine, main)) {
      return fail(`main has the commits of gift-vouchers now: gift-vouchers or origin/gift-vouchers was merged into it. Wilma wants the vouchers on the server's gift-vouchers, not on the site. ${START_OVER}`)
    }
    const text = fileAt(git, main, 'visit.html')
    if (!closedLine(text)) {
      const branch = branchNames(git).find((b) => b !== 'main' && closedLine(fileAt(git, `refs/heads/${b}`, 'visit.html')))
      if (branch) return fail(`The closing week is in a commit on ${branch}, not on main. A commit goes onto the branch git status names on its first line. ${START_OVER}`)
      if (mergeHead(git)) return fail(OPEN_MERGE)
      if (closedLine(stagedFile(git, 'visit.html'))) return fail('The closing week is staged, but no commit on main holds it yet.')
      if (closedLine(workFile(s.t, 'visit.html'))) return fail('visit.html has the closing week in the working folder, but no commit on main holds it yet.')
      if (on && on !== 'main') return fail(`You are on ${on}. The closing week goes on main, so switch to it before you edit visit.html.`)
      if (roughClosed(text) || roughClosed(workFile(s.t, 'visit.html'))) {
        return fail('There is a line about closing in visit.html, but it does not have the dates as the task gives them. Copy the line from the task.')
      }
      return fail('visit.html on main does not say yet that the shop is closed in August.')
    }
    const before = lines(fileAt(git, start, 'visit.html'))
    const after = new Set(lines(text))
    if (before.some((row) => row && !after.has(row))) {
      return fail('The closing line is there, but another line of visit.html on main changed or went missing. Put it back as it was and commit that.')
    }
    const stop = [start, ...(commitOf(git, femi) ? [femi] : [])].map((hash) => `^${hash}`)
    const mineOnMain = git('rev-list', '--no-merges', main, ...stop).out.split('\n').filter(Boolean)
    const base = has(git, femi, main) ? femi : start
    const others = [...new Set(mineOnMain.flatMap((hash) => changedIn(git, hash)))].filter(
      (file) => file !== 'visit.html' && fileAt(git, main, file) !== fileAt(git, base, file)
    )
    if (others.length) {
      return fail(`Your commits on main also change ${listOf(others)}. The closing week only needs visit.html. Put ${others.length > 1 ? 'them' : 'it'} back as ${others.length > 1 ? 'they were' : 'it was'} and commit that.`)
    }
    return [check(name, true, '', output)]
  },

  async pull(t) {
    const name = "main has Femi's newest find from the server"
    const s = await open(t, [name])
    if (s.fail) return s.fail
    const { git, femi, on, output } = s
    const fail = (message) => [check(name, false, message, output)]
    if (has(git, femi, tipOf(git, 'main'))) return [check(name, !mergeHead(git), OPEN_MERGE, output)]
    if (mergeHead(git)) return fail(OPEN_MERGE)
    if (has(git, femi, tipOf(git, 'gift-vouchers'))) {
      return fail(`Femi's find went into gift-vouchers, not main: main or origin/main was merged while you were on gift-vouchers. ${START_OVER}`)
    }
    if (!has(git, femi, remoteTip(git, 'main'))) {
      return fail(
        "main does not have Femi's newest find, and origin/main does not have it either: shop has not heard from the server since Femi sent it. That commit is why a push of main is rejected."
      )
    }
    if (!on) return fail(DETACHED)
    if (on !== 'main') return fail(`origin/main has Femi's newest find, but main does not. You are on ${on}, and a pull or merge brings it into the branch you are on.`)
    return fail("origin/main has Femi's newest find, but main does not have it yet: it was fetched, not brought in.")
  },

  async push(t) {
    const name = 'The server\'s main has your closing week and Femi\'s find'
    const s = await open(t, [name])
    if (s.fail) return s.fail
    const { git, server, femi, output } = s
    const fail = (message) => [check(name, false, message, output)]
    const there = tipOf(server, 'main')
    if (!has(server, femi, there)) return fail(FORCED)
    if (closedLine(fileAt(server, there, 'visit.html'))) return [check(name, true, '', output)]
    const main = tipOf(git, 'main')
    const elsewhere = branchNames(server).find((branch) => branch !== 'main' && closedLine(fileAt(server, `refs/heads/${branch}`, 'visit.html')))
    if (elsewhere) {
      return fail(`The closing week reached the server, but on a branch called ${elsewhere}, not on main, which is the site.`)
    }
    if (!closedLine(fileAt(git, main, 'visit.html'))) return fail('main has no commit with the closing week yet: that is the second task.')
    if (!has(git, femi, main)) {
      return fail(
        "The server's main does not have your closing week. The server has Femi's newest find and your main does not, so a push of main is refused: git push says rejected. Bring his commit in first: that is the third task."
      )
    }
    return fail("Your main has your closing week and Femi's find, but the server's main does not have your work yet: nothing was sent since you brought Femi's find in.")
  }
}
