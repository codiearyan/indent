import { spawnSync } from 'node:child_process'
import {
  allFail, changedIn, check, commitOf, commits, fileAt, hasRepo, hasShop, listOf, NO_SETUP,
  openShop, parentOf, reference, stagedFile, START_OVER, status, strayRepo, workFile
} from '../../grading.mjs'

const SITE = ['finds.html', 'index.html', 'style.css', 'visit.html']

const NOT_INIT = `shop is not a repository yet, so Git keeps no history for it. ${START_OVER}`

function noRepo(t, names) {
  if (!hasShop(t)) return allFail(names, NO_SETUP)
  if (!hasRepo(t)) return allFail(names, NOT_INIT)
  return null
}

/** The learner's own setting for every repository, read only to explain a failure. */
function globalSetting(key) {
  const r = spawnSync('git', ['config', '--global', '--get', key], { encoding: 'utf8', timeout: 5000 })
  return r.status === 0 ? r.stdout.trim() : ''
}

const saturdayLine = (text) => (text ?? '').split('\n').find((line) => /saturday/i.test(line)) ?? null
const opensAtNine = (line) => /\b0?9[:.]00\b/.test(line ?? '') && !/10[:.]00/.test(line ?? '')
const opensAtTen = (line) => /10[:.]00/.test(line ?? '')

export const checks = {
  async init(t) {
    const name = 'shop is a repository'
    if (!hasShop(t)) return [check(name, false, NO_SETUP)]
    if (hasRepo(t)) return [check(name, true, '', 'shop/.git is there')]
    if (strayRepo(t)) {
      return [
        check(
          name,
          false,
          'There is a repository in the top folder, the one that holds setup.mjs, but none in shop. Git makes the repository in the folder the terminal is in. Run `node setup.mjs` in the top folder: it removes that repository and starts the issue over. Then go into shop before you make one.',
          'top folder: .git\nshop: no .git'
        )
      ]
    }
    return [
      check(
        name,
        false,
        'shop has no .git folder yet, so it is still a plain folder. Make the repository from inside shop.',
        'shop: no .git'
      )
    ]
  },

  async identity(t) {
    const names = ['Your name is set in this repository', 'Your email is set in this repository']
    const missing = noRepo(t, names)
    if (missing) return missing
    const git = openShop(t)
    const local = (key) => git('config', '--local', '--get', key).out.trim()
    const userName = local('user.name')
    const email = local('user.email')
    const output = `in shop: user.name = ${userName || '(not set)'}, user.email = ${email || '(not set)'}`
    const elsewhere = (key) =>
      globalSetting(key)
        ? ' There is one in the settings for every repository on this computer, but this task asks for the setting of this repository only, made from inside shop without --global.'
        : ''
    return [
      check(
        names[0],
        userName.length > 0,
        `shop's own settings have no user.name yet.${elsewhere('user.name')}`,
        output
      ),
      check(
        names[1],
        email.includes('@') && !/\s/.test(email),
        email
          ? 'The user.email in shop does not look like an email address: it needs an @ and no spaces. A made-up one is fine.'
          : `shop's own settings have no user.email yet.${elsewhere('user.email')}`,
        output
      )
    ]
  },

  async first(t) {
    const name = 'The first commit holds the whole site'
    const missing = noRepo(t, [name])
    if (missing) return missing
    const git = openShop(t)
    if (!commitOf(git, 'HEAD')) {
      const staged = SITE.filter((file) => stagedFile(git, file) !== null)
      const message = staged.length
        ? `${listOf(staged)} ${staged.length > 1 ? 'are' : 'is'} staged, but there is no commit yet: git status still says "No commits yet". A commit is made in a separate step. If Git refused to commit, read what it printed: it names what is missing.`
        : 'There is no commit yet, and nothing is staged. Git only commits what was added to the staging area first.'
      return [check(name, false, message, status(git))]
    }
    const first = commits(git).at(-1)
    const inFirst = changedIn(git, first)
    const left = SITE.filter((file) => !inFirst.includes(file))
    const output = `files in the first commit:\n${inFirst.join('\n')}`
    if (left.length) {
      return [
        check(
          name,
          false,
          `The first commit holds ${listOf(inFirst) || 'no files'}, but not ${listOf(left)}. A commit takes only what is staged, and git status listed every file before you committed. ${START_OVER}`,
          output
        )
      ]
    }
    const ref = await reference(t)
    const edited = SITE.filter((file) => fileAt(git, first, file) !== ref.file(file))
    return [
      check(
        name,
        edited.length === 0,
        `The first commit has all four files, but ${listOf(edited)} ${edited.length > 1 ? 'were' : 'was'} changed before it was committed. Wilma wants the site exactly as Femi left it in the first commit, so the history starts from there. ${START_OVER}`,
        output
      )
    ]
  },

  async saturday(t) {
    const name = 'The new Saturday hours are a commit of their own'
    const missing = noRepo(t, [name])
    if (missing) return missing
    const git = openShop(t)
    const working = workFile(t, 'visit.html')
    const history = commits(git)
    // The oldest commit whose visit.html opens at 9:00 on Saturdays.
    const changed = [...history].reverse().find((hash) => opensAtNine(saturdayLine(fileAt(git, hash, 'visit.html'))))
    if (!changed) {
      let message
      if (opensAtNine(saturdayLine(stagedFile(git, 'visit.html')))) {
        message = 'The new Saturday hours are staged, but no commit holds them yet.'
      } else if (opensAtNine(saturdayLine(working))) {
        message = 'visit.html opens at 9:00 on Saturdays in the working folder, but no commit holds that yet. Git saves a change only when it is staged and then committed.'
      } else if (working === null) {
        message = `visit.html is gone from shop. ${START_OVER}`
      } else {
        message = 'visit.html still opens at 10:00 on Saturdays. Change the time on the Saturday line in the editor and save it first.'
      }
      return [check(name, false, message, `Saturday line in the working folder: ${saturdayLine(working)?.trim() ?? '(none)'}`)]
    }
    const parent = parentOf(git, changed)
    const before = parent ? fileAt(git, parent, 'visit.html') : null
    const after = fileAt(git, changed, 'visit.html')
    const output = `commit ${changed.slice(0, 7)}, Saturday line: ${saturdayLine(after).trim()}`
    if (before === null) {
      return [
        check(
          name,
          false,
          'visit.html came into the history already opening at 9:00, so no commit shows the change from 10:00. Wilma wants the site as Femi left it in one commit and the new hours in the next one. ' + START_OVER,
          output
        )
      ]
    }
    if (!opensAtTen(saturdayLine(before))) {
      return [check(name, false, `The commit before the change does not open at 10:00 on Saturdays, so the history does not show the change Wilma asked for. ${START_OVER}`, output)]
    }
    const otherLines = (text) => text.split('\n').filter((line) => !/saturday/i.test(line)).map((line) => line.trim())
    const lost = otherLines(before).filter((line) => line && !otherLines(after).includes(line))
    if (!/17[:.]00/.test(saturdayLine(after)) || lost.length) {
      return [
        check(
          name,
          false,
          lost.length
            ? 'The commit with the new hours also changed another line of visit.html. Only the opening time on Saturdays was meant to change.'
            : 'The Saturday line no longer closes at 17:00. Only the opening time was meant to change.',
          output
        )
      ]
    }
    const others = changedIn(git, changed).filter((file) => file !== 'visit.html')
    return [
      check(
        name,
        others.length === 0,
        `The commit with the new hours also holds ${listOf(others)}. This commit should hold the one change to visit.html.`,
        output
      )
    ]
  }
}
