import {
  check, commitOf, currentBranch, dirtyFiles, fileAt, graph, isAncestor, noRepo, openRepo, reference, unfinished
} from '../../grading.mjs'

const TIMETABLE = [
  '# Sailings',
  '07:00 Gullwick -> Gull Island',
  '08:00 Gullwick -> Seal Bay',
  '08:30 Gull Island -> Puffin Rock',
  '09:00 Gull Island -> Gullwick',
  '12:00 Gullwick -> Gull Island',
  '15:00 Gull Island -> Gullwick'
]
const FARES = ['adult (16+) 7.00', 'child 3.25', 'bike 1.00']

const lines = (text) => (text ?? '').split('\n').map((l) => l.trimEnd()).filter(Boolean)
const hasMarkers = (text) => /^(<{7}|={7}|>{7}|\|{7})( |$)/m.test(text ?? '')
const sameLines = (text, want) => JSON.stringify(lines(text)) === JSON.stringify(want)

function fileTask(git, path, want, intents) {
  const text = fileAt(git, 'main', path)
  const markers = hasMarkers(text)
  const kept = intents.every((line) => lines(text).includes(line))
  return [
    check(
      `${path} on main has no conflict markers`,
      text !== null && !markers,
      text === null
        ? `main has no ${path}.`
        : `${path} in main's last commit still contains conflict marker lines. Edit them out before you commit.`,
      text ?? undefined
    ),
    check(
      `${path} on main keeps both changes`,
      !markers && kept,
      `${path} in main's last commit does not keep what both sides wanted yet. Merge weekend-sailings, combine the two versions of the conflicting lines, and commit.`,
      text ?? undefined
    ),
    check(
      `${path} on main is otherwise unchanged`,
      sameLines(text, want),
      kept
        ? `${path} has both changes but the rest of the file does not look right. Keep every other line as it was, in the same order.`
        : `Once both changes are in, every other line of ${path} should stay as it was, in the same order.`,
      text ?? undefined
    )
  ]
}

export const checks = {
  async timetable(t) {
    const git = openRepo(t)
    if (!git) return noRepo(['timetable.txt on main keeps both sailings'])
    const results = fileTask(git, 'timetable.txt', TIMETABLE, [TIMETABLE[2], TIMETABLE[3]])
    const order = lines(fileAt(git, 'main', 'timetable.txt')).filter((l) => /^\d\d:\d\d /.test(l))
    const sorted = [...order].sort()
    results.splice(2, 0, check(
      'Sailings are in time order',
      order.length > 0 && JSON.stringify(order) === JSON.stringify(sorted),
      'The sailings in timetable.txt on main should be listed from earliest to latest.',
      order.join('\n')
    ))
    return results
  },

  async fares(t) {
    const git = openRepo(t)
    if (!git) return noRepo(['fares.txt on main keeps both changes'])
    return fileTask(git, 'fares.txt', FARES, [FARES[0]])
  },

  async finish(t) {
    const names = [
      'main has a merge commit joining both branches',
      'Pavel\'s other changes came along',
      'The merge is finished and the tree is clean',
      'You are back on main'
    ]
    const git = openRepo(t)
    if (!git) return noRepo(names)
    const ref = await reference(t)
    const oldMain = ref.hash('Raise adult fare to 7.00')
    const branchTip = ref.hash('Add weekend note')
    const parents = git('log', '-1', '--format=%P', 'main').out.trim().split(' ').filter(Boolean)
    const op = unfinished(git)
    const dirty = dirtyFiles(git)
    return [
      check(
        names[0],
        parents.length === 2 && isAncestor(git, oldMain, 'main') && isAncestor(git, branchTip, 'main'),
        op === 'a merge'
          ? 'A merge is started but not committed yet. Resolve the files, stage them and commit the merge.'
          : 'main\'s last commit should be a merge whose history contains both Ines\'s commits and all of weekend-sailings. Merge (do not rebase) and keep the original commits.',
        graph(git, 'main')
      ),
      check(
        names[1],
        fileAt(git, 'main', 'weekend.txt') === fileAt(ref.git, branchTip, 'weekend.txt'),
        'weekend.txt from weekend-sailings is missing or changed on main. A merge should bring it along untouched.',
        fileAt(git, 'main', 'weekend.txt') ?? 'main has no weekend.txt'
      ),
      check(
        names[2],
        !op && dirty.length === 0,
        op ? `The repository is still in the middle of ${op}. Stage the resolved files and commit, or abort and start again.` : 'git status shows uncommitted or untracked files. Leftover backup files from a merge tool count too.',
        dirty.join('\n')
      ),
      check(names[3], currentBranch(git) === 'main', 'HEAD should be on the main branch.', `HEAD: ${currentBranch(git) ?? commitOf(git, 'HEAD')}`)
    ]
  }
}
