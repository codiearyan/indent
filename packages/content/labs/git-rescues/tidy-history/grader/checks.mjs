import { check, commitOf, dirtyFiles, graph, noRepo, openRepo, reference, unfinished } from '../../grading.mjs'

const MAIN_TIP = 'Add fares table'
const OLD_TIP = 'fix typo again'
const THROWAWAY = /\b(wip|typo|tmp|temp|fixup!|squash!|amend!|maybe)\b/i

const describe = (git, rev) => (rev ? git('log', '-1', '--format=%h %s', rev).out.trim() : 'missing')

export const checks = {
  async backup(t) {
    const names = ['route-planner-backup exists', 'route-planner-backup is the untouched branch']
    const git = openRepo(t)
    if (!git) return noRepo(names)
    const ref = await reference(t)
    const backup = commitOf(git, 'refs/heads/route-planner-backup')
    return [
      check(names[0], backup !== null, 'There is no branch called route-planner-backup.', git('branch', '--list').out),
      check(
        names[1],
        backup === ref.hash(OLD_TIP),
        'route-planner-backup should point at the last of the five original commits ("fix typo again"). If you already rewrote the branch, the reflog still knows that commit.',
        `route-planner-backup: ${describe(git, backup)}`
      )
    ]
  },

  async squash(t) {
    const names = [
      'route-planner is one commit on top of main',
      'The final content did not change',
      'main did not change',
      'Nothing is left half done'
    ]
    const git = openRepo(t)
    if (!git) return noRepo(names)
    const ref = await reference(t)
    const tip = commitOf(git, 'refs/heads/route-planner')
    const mainTip = ref.hash(MAIN_TIP)
    const parents = tip ? git('log', '-1', '--format=%P', tip).out.trim() : ''
    const tree = tip ? git('rev-parse', `${tip}^{tree}`).out.trim() : null
    const wantTree = ref.git('rev-parse', `${ref.hash(OLD_TIP)}^{tree}`).out.trim()
    const op = unfinished(git)
    const dirty = dirtyFiles(git)
    return [
      check(
        names[0],
        tip !== null && parents === mainTip,
        tip === null
          ? 'There is no branch called route-planner any more.'
          : 'route-planner should be exactly one commit whose parent is main\'s last commit.',
        tip ? git('log', '--oneline', 'refs/heads/main..refs/heads/route-planner').out : undefined
      ),
      check(
        names[1],
        tree === wantTree,
        'The files on route-planner are not the same as at the end of the original five commits. Squashing should change history, not content.',
        tip ? git('diff', '--stat', ref.hash(OLD_TIP), tip).out || git('ls-tree', '-r', '--name-only', tip).out : undefined
      ),
      check(
        names[2],
        commitOf(git, 'refs/heads/main') === mainTip,
        'main should still point at "Add fares table". Rewrite only the feature branch.',
        graph(git, 'refs/heads/main')
      ),
      check(
        names[3],
        !op && dirty.length === 0,
        op ? `The repository is in the middle of ${op}. Finish it or abort it.` : 'git status shows uncommitted changes. Everything should be in the new commit.',
        dirty.join('\n')
      )
    ]
  },

  async message(t) {
    const names = ['The subject is 10 to 72 characters', 'The subject has no throwaway words', 'The message is new']
    const git = openRepo(t)
    if (!git) return noRepo(names)
    const tip = commitOf(git, 'refs/heads/route-planner')
    const subject = tip ? git('log', '-1', '--format=%s', tip).out.trim() : ''
    const shown = tip ? git('log', '-1', '--format=%B', tip).out : 'There is no branch called route-planner.'
    const old = ['wip', 'wip 2', 'fix typo', 'add tests maybe', 'fix typo again']
    return [
      check(
        names[0],
        subject.length >= 10 && subject.length <= 72,
        `The first line of the message on route-planner's last commit is ${subject.length} characters. Aim for a short sentence that says what the branch adds.`,
        shown
      ),
      check(
        names[1],
        subject !== '' && !THROWAWAY.test(subject),
        'The subject still reads like a work-in-progress note. Describe what the change does for the reader.',
        shown
      ),
      check(
        names[2],
        subject !== '' && !old.includes(subject.toLowerCase()),
        'The message is one of the original scrappy messages. Write a new one when you create the squashed commit.',
        shown
      )
    ]
  }
}
