import {
  allFail, check, commits, currentBranch, DETACHED, graph, hasShop, isAncestor, mergeHead,
  NO_REPO, NO_SETUP, openShop, setupCommit, START_OVER, tipOf, LOST_HISTORY
} from '../../grading.mjs'

const MAIN = 'Add Ferns and Their Keepers to the finds'
const SALE = 'Add the sale dates to the visit page'
const GROUP = 'Choose the July book for the reading group'

function open(t, names) {
  if (!hasShop(t)) return { fail: allFail(names, NO_SETUP) }
  const git = openShop(t)
  if (!git) return { fail: allFail(names, NO_REPO) }
  const [start, sale, group] = [MAIN, SALE, GROUP].map((subject) => setupCommit(git, subject))
  const main = tipOf(git, 'main')
  const gone = [['summer-sale', sale], ['reading-group', group]].find(([branch, hash]) => !hash && !tipOf(git, branch))
  if (gone && start && main) {
    const message = `${gone[0]} is gone, and its commits with it: it was deleted before it was merged. ${START_OVER}`
    return { fail: allFail(names, message, graph(git)) }
  }
  if (!start || !sale || !group || !main || !isAncestor(git, start, main)) {
    return { fail: allFail(names, LOST_HISTORY, graph(git)) }
  }
  return { git, start, sale, group, main, on: currentBranch(git), output: graph(git) }
}

const parents = (git, hash) => git('rev-list', '--parents', '-n', '1', hash).out.trim().split(' ').slice(1)

/** The merge commit on main's own line that brought `commit` in, or null. */
function mergeOf(git, main, commit) {
  return (
    commits(git, main).find((hash) => {
      const [first, ...others] = parents(git, hash)
      return others.length > 0 && !isAncestor(git, commit, first) && others.some((p) => isAncestor(git, commit, p))
    }) ?? null
  )
}

const OPEN_MERGE =
  'A merge is started and not finished: git status says you are still merging. The lesson says how to finish it with Git\'s own message, or how to call it off.'

export const checks = {
  async sale(t) {
    const name = 'main moved forward to the summer sale, with no merge commit'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, start, sale, group, main, on, output } = s
    const fail = (message) => [check(name, false, message, output)]
    if (!isAncestor(git, sale, main)) {
      const saleBranch = tipOf(git, 'summer-sale')
      if (on === 'summer-sale' && saleBranch && isAncestor(git, start, saleBranch)) {
        return fail(
          'main does not have the summer sale yet, and you are on summer-sale. A merge changes the branch you are on. Merging main into summer-sale only says Already up to date, because summer-sale already has everything main has.'
        )
      }
      if (mergeHead(git)) return fail(OPEN_MERGE)
      return fail('main does not have the summer sale yet.')
    }
    if (!commits(git, main).includes(sale)) {
      const merge = mergeOf(git, main, sale)
      const why = merge && isAncestor(git, group, parents(git, merge)[0])
        ? 'It was joined to a line that already had the reading group book. The sale goes first, merged while on main.'
        : 'main had nothing new of its own, so Git could simply move it forward, and it makes a merge commit then only when told to.'
      return fail(`The sale came into main with a merge commit. ${why} ${START_OVER}`)
    }
    return [check(name, true, '', output)]
  },

  async group(t) {
    const name = 'The reading group book came into main with a merge commit'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, group, main, on, output } = s
    const fail = (message) => [check(name, false, message, output)]
    const merge = mergeOf(git, main, group)
    if (merge) {
      const both = parents(git, merge).length === 2
      return [check(name, both, 'The merge commit joins more than two lines. Merge one branch at a time.', output)]
    }
    if (isAncestor(git, group, main)) {
      return fail(
        `The reading group book is on main, but no merge commit brought it in: main moved forward to it. That happens when main has nothing new of its own. ${START_OVER}`
      )
    }
    if (mergeHead(git)) return fail(OPEN_MERGE)
    if (on === 'reading-group') {
      const groupBranch = tipOf(git, 'reading-group')
      return fail(
        groupBranch !== group && isAncestor(git, main, groupBranch)
          ? `reading-group now has main's commits, but main does not have the reading group book. A merge brings the other branch into the one you are on. ${START_OVER}`
          : 'You are on reading-group. A merge brings the other branch into the one you are on, so main is where it has to run.'
      )
    }
    if (!on) return fail(DETACHED)
    return fail('main does not have the reading group book yet.')
  },

  async tidy(t) {
    const name = 'The merged branches are deleted, and window-display is kept'
    const s = open(t, [name])
    if (s.fail) return s.fail
    const { git, sale, group, main, output } = s
    const fail = (message) => [check(name, false, message, output)]
    const window = tipOf(git, 'window-display')
    if (!window) {
      return fail(`window-display is gone, and Femi's commit with it. Wilma has not decided about it yet, so it had to stay. ${START_OVER}`)
    }
    const lost = [['summer-sale', sale], ['reading-group', group]].filter(([, tip]) => !isAncestor(git, tip, main))
    const left = ['summer-sale', 'reading-group'].filter((branch) => tipOf(git, branch))
    if (lost.length) {
      const [branch] = lost[0]
      return tipOf(git, branch)
        ? fail(`${branch} is not merged into main yet. Do the first two tasks before you tidy up.`)
        : fail(`${branch} is deleted, but its commits never went into main, so they are lost. ${START_OVER}`)
    }
    if (left.length) {
      return fail(
        `${left.join(' and ')} ${left.length > 1 ? 'are' : 'is'} still there, though every commit on ${left.length > 1 ? 'them' : 'it'} is in main now. git log --oneline --graph --all shows where each branch points.`
      )
    }
    return [check(name, true, '', output)]
  }
}
