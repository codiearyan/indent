import { join } from 'node:path'
import { existsSync } from 'node:fs'
import {
  check, commitOf, dirtyFiles, fileAt, gitIn, graph, isAncestor, noRepo, openRepo, reference, unfinished
} from '../../grading.mjs'

const ORIGINAL = ['Add sailing timetable', 'Add fares table', 'Load spring fares', 'Add Sunday sailings']

function fixedOnMain(git, ref) {
  const good = fileAt(ref.git, ref.hash('Add fares table'), 'fares.txt')
  const sunday = fileAt(ref.git, ref.hash('Add Sunday sailings'), 'timetable.txt')
  const missing = ORIGINAL.filter((subject) => !isAncestor(git, ref.hash(subject), 'main'))
  return {
    fares: fileAt(git, 'main', 'fares.txt'),
    faresOk: fileAt(git, 'main', 'fares.txt') === good,
    timetableOk: fileAt(git, 'main', 'timetable.txt') === sunday,
    missing
  }
}

export const checks = {
  async revert(t) {
    const names = [
      'The bad fares are gone on main',
      'The Sunday sailings are still there',
      'Shared history was not rewritten',
      'Nothing is left half done'
    ]
    const git = openRepo(t)
    if (!git) return noRepo(names)
    const ref = await reference(t)
    const s = fixedOnMain(git, ref)
    const op = unfinished(git)
    const dirty = dirtyFiles(git)
    return [
      check(
        names[0],
        s.faresOk,
        'fares.txt on main should be back to the prices from before "Load spring fares". Look at what that commit changed.',
        s.fares ?? 'main has no fares.txt'
      ),
      check(
        names[1],
        s.timetableOk,
        'timetable.txt on main should still include the Sunday sailings added after the bad commit. Undo only the bad commit.',
        fileAt(git, 'main', 'timetable.txt') ?? 'main has no timetable.txt'
      ),
      check(
        names[2],
        s.missing.length === 0,
        `Some commits that were already pushed are no longer in main's history: ${s.missing.join(', ')}. Others have these commits, so add a new commit that undoes the change instead of removing commits. Run setup again to start over.`,
        graph(git, 'main')
      ),
      check(
        names[3],
        !op && dirty.length === 0,
        op
          ? `The repository is in the middle of ${op}. Finish it or abort it.`
          : 'The working tree has uncommitted changes. Commit the fix or discard stray edits.',
        dirty.join('\n')
      )
    ]
  },

  async share(t) {
    const names = ['origin has your fix', 'origin kept its history', 'main and origin/main match']
    const git = openRepo(t)
    if (!git) return noRepo(names)
    const remoteDir = join(t.workspace, '.shared.git')
    if (!existsSync(remoteDir)) {
      return names.map((name) => check(name, false, 'The shared remote .shared.git is missing. Run `node setup.mjs` again.'))
    }
    const remote = gitIn(remoteDir)
    const ref = await reference(t)
    const good = fileAt(ref.git, ref.hash('Add fares table'), 'fares.txt')
    const sunday = fileAt(ref.git, ref.hash('Add Sunday sailings'), 'timetable.txt')
    const remoteMain = commitOf(remote, 'main')
    const missing = ORIGINAL.filter((subject) => !isAncestor(remote, ref.hash(subject), 'main'))
    const tracking = commitOf(git, 'refs/remotes/origin/main')
    return [
      check(
        names[0],
        fileAt(remote, 'main', 'fares.txt') === good && fileAt(remote, 'main', 'timetable.txt') === sunday,
        'main on origin still has the bad fares (or lost the Sunday sailings). Fix main locally, then push it.',
        fileAt(remote, 'main', 'fares.txt') ?? 'origin has no main branch'
      ),
      check(
        names[1],
        missing.length === 0,
        `main on origin no longer contains: ${missing.join(', ')}. The shared history must only grow.`,
        graph(remote, 'main')
      ),
      check(
        names[2],
        remoteMain !== null && remoteMain === commitOf(git, 'main') && tracking === remoteMain,
        'Your local main and main on origin point at different commits. Push main so both show the same commit.',
        `local main:  ${commitOf(git, 'main')}\norigin main: ${remoteMain}\norigin/main: ${tracking}`
      )
    ]
  }
}
