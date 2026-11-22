import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  allFail, branchNames, changedIn, check, commitOf, commits, currentBranch, DETACHED, fileAt, graphs,
  isAncestor, lines, listOf, NO_SETUP, openServer, openShop, readCopy, remoteIsServer, remoteTip, SERVER_LOST,
  setupCommit, shopDir, stagedFile, START_OVER, tipOf, upstreamOf, workFile
} from '../../grading.mjs'

const MAIN = "Merge branch 'june-finds'"
const GIFT = 'Add gift vouchers to the visit page'

/** Why shop is not a copy of the server yet, in words. */
function noCopy(t) {
  const shop = shopDir(t)
  if (existsSync(join(shop, 'shop', '.git'))) {
    return `The copy went into shop/shop, a folder inside shop: the clone ran from inside shop and made a new folder there. The copy belongs in shop itself. ${START_OVER}`
  }
  if (existsSync(join(shop, 'HEAD')) && existsSync(join(shop, 'objects'))) {
    return `shop holds a bare repository, a history with no working folder, like the server's. Your copy needs its working folder. ${START_OVER}`
  }
  const elsewhere = readdirSync(t.workspace).find(
    (name) => !['shop', 'server'].includes(name) && !name.startsWith('.') && existsSync(join(t.workspace, name, '.git'))
  )
  if (elsewhere) {
    return `There is a copy in ${elsewhere}, but none in shop. The copy belongs in shop, which is still empty, so clone again and give shop as the folder.`
  }
  if (existsSync(shop) && readdirSync(shop).length) {
    return `shop has files in it, but it is not a repository: they were not copied with Git, so there is no history and no link to the server. ${START_OVER}`
  }
  return 'shop is still empty: there is no copy of the server\'s repository in it yet.'
}

async function open(live, names) {
  const t = await readCopy(live)
  const server = openServer(t)
  if (!server) return { fail: allFail(names, NO_SETUP) }
  const [main, gift] = [MAIN, GIFT].map((subject) => setupCommit(server, subject))
  if (!main || !gift) return { fail: allFail(names, SERVER_LOST) }
  const git = openShop(t)
  if (!git) return { fail: allFail(names, noCopy(t)) }
  return { t, git, server, main, gift, on: currentBranch(git), output: graphs(git, server) }
}

/** What is wrong with shop as a copy of the server, or null. */
function copyProblem(t, git, main) {
  const remotes = git('remote').out.split('\n').filter(Boolean)
  if (!remotes.includes('origin')) {
    const other = remotes.find((name) => remoteIsServer(t, git, name))
    return other
      ? `shop's remote for the server is called ${other}. Git names it origin when it makes a copy, and this repo's lessons and checks use that name. ${START_OVER}`
      : `shop is a repository, but it has no remote called origin, so it does not know where the server is. A copy made with git clone has one. ${START_OVER}`
  }
  if (!remoteIsServer(t, git)) return `origin in shop points somewhere other than server/shop.git: git remote -v shows where. ${START_OVER}`
  if (!remoteTip(git, 'main')) return `shop knows where the server is, but has no origin/main: nothing has come from the server yet. ${START_OVER}`
  if (!isAncestor(git, main, tipOf(git, 'main'))) return `shop has no branch main with the server's history on it. ${START_OVER}`
  return null
}

const voucherLine = (text) => lines(text).find((line) => /gift vouchers/i.test(line)) ?? null
const fixed = (line) => Boolean(line) && !/never expire/i.test(line) && /\b(two|2) years\b/i.test(line)

export const checks = {
  async clone(t) {
    const name = "shop is a copy of the server's repository, with origin pointing at it"
    const s = await open(t, [name])
    if (s.fail) return s.fail
    const problem = copyProblem(s.t, s.git, s.main)
    return [check(name, problem === null, problem, s.output)]
  },

  async branch(t) {
    const name = 'shop has a branch gift-vouchers that follows the server\'s'
    const s = await open(t, [name])
    if (s.fail) return s.fail
    const { git, main, gift, on, output } = s
    const fail = (message) => [check(name, false, message, output)]
    const problem = copyProblem(s.t, git, main)
    if (problem) return fail(`The copy is not right yet, so this task cannot be judged. ${problem}`)
    const tip = tipOf(git, 'gift-vouchers')
    if (!tip) {
      if (!on && commitOf(git, 'HEAD') === remoteTip(git, 'gift-vouchers')) {
        return fail(
          "git status says HEAD detached at origin/gift-vouchers. origin/gift-vouchers is Git's memory of the server's branch, not a branch of your own, so you are on no branch and a commit made there would belong to none. The lesson says how to get a branch of your own that follows it."
        )
      }
      const near = branchNames(git).find((branch) => branch !== 'main' && /gift|voucher/i.test(branch))
      if (near) {
        return fail(`There is a branch ${near}, but the server's branch is called gift-vouchers, and yours needs the same name. The lesson on branches says how to rename one.`)
      }
      if (!on) return fail(DETACHED)
      return fail('There is no branch gift-vouchers in shop yet. git branch -a lists the server\'s as origin/gift-vouchers, but a branch of your own is still to be made.')
    }
    if (!isAncestor(git, gift, tip)) {
      return fail(
        `gift-vouchers in shop does not have Wilma's commit: it started from main, not from the server's branch, so her voucher line is not on it. Switch to main, delete it with -d as in the merging issue, and make it again from the server's branch. If Git says it is not fully merged, start over: run \`node setup.mjs\` in the top folder.`
      )
    }
    const upstream = upstreamOf(git, 'gift-vouchers')
    if (upstream !== 'origin/gift-vouchers') {
      return fail(
        upstream
          ? `gift-vouchers has Wilma's commit, but it follows ${upstream} instead of origin/gift-vouchers. ${START_OVER}`
          : `gift-vouchers has Wilma's commit, but it does not follow origin/gift-vouchers: git status on it says nothing about origin. ${START_OVER}`
      )
    }
    return [check(name, true, '', output)]
  },

  async fix(t) {
    const name = 'The voucher fix is committed on gift-vouchers, and not on the server yet'
    const s = await open(t, [name])
    if (s.fail) return s.fail
    const { git, server, gift, on, output } = s
    const fail = (message) => [check(name, false, message, output)]
    const tip = tipOf(git, 'gift-vouchers')
    if (!tip || !isAncestor(git, gift, tip)) {
      return fail('The fix goes on gift-vouchers with Wilma\'s commit, and shop has no such branch yet: that is the second task.')
    }
    const serverTip = tipOf(server, 'gift-vouchers')
    if (serverTip !== gift) {
      return fail(`The server's gift-vouchers has changed: something was sent to it from shop, and Wilma wanted to read the fix before it goes there. ${START_OVER}`)
    }
    const line = voucherLine(fileAt(git, tip, 'visit.html'))
    if (!fixed(line)) {
      if (fixed(voucherLine(stagedFile(git, 'visit.html')))) return fail('The fix is staged, but no commit on gift-vouchers holds it yet.')
      if (on === 'gift-vouchers' && fixed(voucherLine(workFile(s.t, 'visit.html')))) {
        return fail('visit.html has the fix in the working folder, but no commit on gift-vouchers holds it yet.')
      }
      if (on && on !== 'gift-vouchers') {
        return fail(`You are on ${on}. The voucher line is only on gift-vouchers, so switch to it before you edit visit.html.`)
      }
      if (!line) return fail('The voucher line is gone from visit.html on gift-vouchers. Only its last sentence changes.')
      if (/never expire/i.test(line)) return fail('The voucher line on gift-vouchers still says they never expire.')
      return fail('The voucher line no longer says they never expire, but it does not say two years either. Write the sentence the task gives.')
    }
    const before = lines(fileAt(git, gift, 'visit.html'))
    const after = new Set(lines(fileAt(git, tip, 'visit.html')))
    if (before.some((row) => row && !/gift vouchers/i.test(row) && !after.has(row))) {
      return fail('The voucher line is right, but another line of visit.html changed or went missing on gift-vouchers. Put it back as Wilma had it and commit that.')
    }
    const others = [...new Set(commits(git, tip, gift).flatMap((hash) => changedIn(git, hash)))].filter(
      (file) => file !== 'visit.html' && fileAt(git, tip, file) !== fileAt(git, gift, file)
    )
    if (others.length) {
      return fail(`gift-vouchers also changes ${listOf(others)}. The fix only needs visit.html. Put ${others.length > 1 ? 'them' : 'it'} back as Wilma had ${others.length > 1 ? 'them' : 'it'} and commit that.`)
    }
    return [check(name, true, '', output)]
  }
}
