import {
  allFail, check, commitOf, currentBranch, DETACHED, graphs, hasShop, isAncestor, LOST_HISTORY,
  mergeHead, NO_REPO, NO_SETUP, NOT_ORIGIN, OPEN_MERGE, openServer, openShop, readCopy, remoteIsServer, remoteTip,
  SERVER_LOST, setupCommit, START_OVER, tipOf
} from '../../grading.mjs'

const START = "Merge branch 'june-finds'"
const MINE = 'Say that gift vouchers last two years'
const FEMI = 'Choose the August book for the reading group'
const WILMA = 'Link the gift vouchers from the home page'

async function open(live, names) {
  const t = await readCopy(live)
  if (!hasShop(t)) return { fail: allFail(names, NO_SETUP) }
  const server = openServer(t)
  if (!server) return { fail: allFail(names, NO_SETUP) }
  const git = openShop(t)
  if (!git) return { fail: allFail(names, NO_REPO) }
  const [femi, wilma] = [FEMI, WILMA].map((subject) => setupCommit(server, subject))
  if (!femi || !wilma) return { fail: allFail(names, SERVER_LOST) }
  const [start, mine] = [START, MINE].map((subject) => setupCommit(git, subject))
  const output = graphs(git, server)
  if (!start || !mine) return { fail: allFail(names, LOST_HISTORY, output) }
  if (!remoteIsServer(t, git)) return { fail: allFail(names, NOT_ORIGIN, output) }
  return { t, git, femi, wilma, mine, on: currentBranch(git), output }
}

/** Femi's or Wilma's commits are in shop only once something has fetched them. */
const has = (git, commit, rev) => Boolean(commitOf(git, commit)) && isAncestor(git, commit, rev)

export const checks = {
  async fetch(t) {
    const name = "origin/main and origin/gift-vouchers know what is new on the server"
    const s = await open(t, [name])
    if (s.fail) return s.fail
    const { git, femi, wilma, output } = s
    const fail = (message) => [check(name, false, message, output)]
    const behind = [['main', femi], ['gift-vouchers', wilma]].filter(([branch, commit]) => !has(git, commit, remoteTip(git, branch)))
    if (!behind.length) return [check(name, true, '', output)]
    if (behind.length === 1) {
      return fail(`origin/${behind[0][0]} does not know the new commit on the server yet. Fetching one branch by name leaves the others as they were.`)
    }
    if (commitOf(git, femi)) {
      return fail('The new commits reached shop, but origin/main and origin/gift-vouchers did not move: they were fetched by the server\'s address instead of the remote\'s name, so Git did not update its memory of origin.')
    }
    return fail(
      'origin/main and origin/gift-vouchers are where they were in the last issue: shop has not heard from the server since. git status still says up to date, because it compares with what Git last heard.'
    )
  },

  async femi(t) {
    const name = "main has Femi's two new commits"
    const s = await open(t, [name])
    if (s.fail) return s.fail
    const { git, femi, on, output } = s
    const fail = (message) => [check(name, false, message, output)]
    if (has(git, femi, tipOf(git, 'main'))) {
      return [check(name, !mergeHead(git), OPEN_MERGE, output)]
    }
    if (has(git, femi, tipOf(git, 'gift-vouchers'))) {
      return fail(`Femi's commits went into gift-vouchers, not main: the merge ran while you were on gift-vouchers. A merge brings the other branch into the one you are on. ${START_OVER}`)
    }
    if (mergeHead(git)) return fail(OPEN_MERGE)
    if (!has(git, femi, remoteTip(git, 'main'))) {
      return fail(
        "main does not have Femi's commits, and origin/main does not have them either: shop has not fetched them from the server. A merge of origin/main can only bring in what was fetched; before that it says Already up to date."
      )
    }
    if (!on) return fail(DETACHED)
    if (on !== 'main') return fail(`origin/main has Femi's commits, but main does not yet. You are on ${on}, and a merge brings them into the branch you are on.`)
    return fail("origin/main has Femi's commits, but main does not have them yet: they were fetched, not brought in.")
  },

  async vouchers(t) {
    const name = "gift-vouchers has Wilma's new commit and your fix"
    const s = await open(t, [name])
    if (s.fail) return s.fail
    const { git, femi, wilma, mine, on, output } = s
    const fail = (message) => [check(name, false, message, output)]
    const tip = tipOf(git, 'gift-vouchers')
    if (!tip) return fail(`gift-vouchers is gone from shop, and your fix from the last issue with it. ${START_OVER}`)
    if (!isAncestor(git, mine, tip)) return fail(`gift-vouchers no longer has your voucher fix from the last issue. ${START_OVER}`)
    if (has(git, wilma, tipOf(git, 'main'))) {
      return fail(`Wilma's voucher commit went into main, and she has not said the vouchers can go on the site. A pull or merge brings the other branch into the one you are on. ${START_OVER}`)
    }
    if (has(git, wilma, tip)) {
      if (has(git, femi, tip)) {
        return fail(`gift-vouchers also has Femi's commits for main now: main or origin/main was merged into it. ${START_OVER}`)
      }
      return [check(name, !mergeHead(git), OPEN_MERGE, output)]
    }
    if (mergeHead(git)) return fail(OPEN_MERGE)
    if (!has(git, wilma, remoteTip(git, 'gift-vouchers'))) {
      return fail("gift-vouchers does not have Wilma's new commit, and origin/gift-vouchers does not have it either: shop has not fetched it from the server.")
    }
    if (!on) return fail(DETACHED)
    if (on !== 'gift-vouchers') {
      return fail(`origin/gift-vouchers has Wilma's new commit, but your gift-vouchers does not. You are on ${on}, and a pull or merge brings it into the branch you are on.`)
    }
    return fail("origin/gift-vouchers has Wilma's new commit, but your gift-vouchers does not have it yet: it was fetched, not brought in.")
  }
}
