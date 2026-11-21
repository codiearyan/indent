import { check, commitOf, dirtyFiles, fileAt, graph, isAncestor, noRepo, openRepo, reference, unfinished } from '../../grading.mjs'

const describe = (git, rev) => (rev ? git('log', '-1', '--format=%h %s', rev).out.trim() : 'missing')

export const checks = {
  async branch(t) {
    const names = ['harbour-alerts exists', 'harbour-alerts has all three of Pavel\'s commits', 'harbour-alerts ends where it ended before']
    const git = openRepo(t)
    if (!git) return noRepo(names)
    const ref = await reference(t)
    const tip = commitOf(git, 'refs/heads/harbour-alerts')
    const want = ref.hash('Add fog alert wording')
    return [
      check(names[0], tip !== null, 'There is no branch called harbour-alerts. Create it at the commit you find in the reflog.', git('branch', '--list').out),
      check(
        names[1],
        isAncestor(git, want, tip),
        'harbour-alerts does not contain the newest of Pavel\'s commits. Look further back in `git reflog` for the last commit made on that branch.',
        tip ? graph(git, 'refs/heads/harbour-alerts') : undefined
      ),
      check(
        names[2],
        tip === want,
        'harbour-alerts should point exactly at the last commit it had before it was deleted, with nothing added on top.',
        `harbour-alerts: ${describe(git, tip)}`
      )
    ]
  },

  async main(t) {
    const names = ['main is back where it was', 'main kept the winter note and the bike notice', 'The working tree is clean']
    const git = openRepo(t)
    if (!git) return noRepo(names)
    const ref = await reference(t)
    const main = commitOf(git, 'refs/heads/main')
    const want = ref.hash('Add bike rack notice')
    const op = unfinished(git)
    const dirty = dirtyFiles(git)
    const contentOk =
      fileAt(git, 'main', 'README.md') === fileAt(ref.git, want, 'README.md') &&
      fileAt(git, 'main', 'timetable.txt') === fileAt(ref.git, want, 'timetable.txt')
    return [
      check(
        names[0],
        main === want,
        'main should point at the commit it pointed at just before the reset. The reflog lists every place main and HEAD have been.',
        `main: ${describe(git, main)}`
      ),
      check(
        names[1],
        contentOk,
        'README.md and timetable.txt on main should match the two commits the reset removed.',
        graph(git, 'main')
      ),
      check(
        names[2],
        !op && dirty.length === 0,
        op ? `The repository is in the middle of ${op}. Finish it or abort it.` : 'git status shows uncommitted changes. A reset that moves only the branch can leave old files behind.',
        dirty.join('\n')
      )
    ]
  }
}
