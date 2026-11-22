import { statSync } from 'node:fs'
import { basename, join, sep } from 'node:path'
import { check, expandHome, missingAnswer, names, readNotes, real } from '../../grading.mjs'

const KEYS = ['here', 'biggest', 'hidden']

/** The answer without a leading folder, so `artwork/x.svg` counts as `x.svg`. */
const bare = (value, folder) => value.replace(new RegExp(`^(\\./)?${folder}/`), '')

export const checks = {
  async here(t) {
    const name = 'The path of the starting folder'
    const notes = readNotes(t, KEYS)
    const missing = missingAnswer(name, notes, 'here')
    if (missing) return [missing]
    const value = notes.here
    const output = `here: ${value}`
    const workspace = real(t.workspace)
    const path = expandHome(value)
    if (!path.startsWith('/')) {
      const message =
        value === basename(t.workspace)
          ? 'That is only the name of the folder. Check wants its full path: the whole line pwd prints, from the first / to the end.'
          : 'A full path starts with / at the top of the computer. Copy the whole line pwd prints.'
      return [check(name, false, message, output)]
    }
    const answer = real(path)
    if (answer === null) {
      return [
        check(
          name,
          false,
          'No folder exists at that path on this computer, so a letter or a slash is off. Copy the line pwd prints exactly as it is.',
          output
        )
      ]
    }
    if (answer === workspace) return [check(name, true, '', output)]
    const message = workspace.startsWith(answer + sep)
      ? 'That folder is above the one the terminal starts in. The path pwd prints there is longer.'
      : answer.startsWith(workspace + sep)
        ? 'That folder is inside the one the terminal starts in. Check wants the starting folder itself, the folder that holds notes.txt.'
        : 'That path leads to a different folder from the one the terminal starts in for this issue.'
    return [check(name, false, message, output)]
  },

  async biggest(t) {
    const name = 'The biggest file in artwork'
    const notes = readNotes(t, KEYS)
    const missing = missingAnswer(name, notes, 'biggest')
    if (missing) return [missing]
    const value = bare(notes.biggest, 'artwork')
    const output = `biggest: ${notes.biggest}`
    const dir = join(t.workspace, 'artwork')
    const files = names(dir).filter((n) => !n.startsWith('.'))
    if (!files.length) {
      return [check(name, false, 'The artwork folder is empty or gone. Reset brings its files back.', output)]
    }
    const size = (n) => statSync(join(dir, n)).size
    const biggest = files.reduce((a, b) => (size(b) > size(a) ? b : a))
    if (value === biggest) return [check(name, true, '', output)]
    const stem = (n) => n.replace(/\.[^.]*$/, '')
    let message
    if (files.includes(value)) {
      message = `${value} is in artwork, but another file there is bigger. Compare the numbers in the size column of the long listing.`
    } else if (files.some((n) => n.toLowerCase() === value.toLowerCase())) {
      message = 'Names care about capital letters. Write the name exactly as ls shows it.'
    } else if (files.some((n) => stem(n) === value)) {
      message = 'Write the whole name as ls shows it, with the part after the dot.'
    } else {
      message = 'No file in artwork has that name. Copy the name from the listing ls prints.'
    }
    return [check(name, false, message, output)]
  },

  async hidden(t) {
    const name = 'The hidden note in desk'
    const notes = readNotes(t, KEYS)
    const missing = missingAnswer(name, notes, 'hidden')
    if (missing) return [missing]
    const value = bare(notes.hidden, 'desk')
    const output = `hidden: ${notes.hidden}`
    const all = names(join(t.workspace, 'desk'))
    const hidden = all.filter((n) => n.startsWith('.'))
    if (hidden.includes(value)) return [check(name, true, '', output)]
    let message
    if (value === '.' || value === '..') {
      message =
        'Every folder lists . and .. : they stand for the folder itself and the one above it. The note has a name of its own.'
    } else if (value === '.indent') {
      message = '.indent is in the top folder and belongs to the app. The note is inside desk.'
    } else if (all.includes(value)) {
      message = `${value} is in desk, but it is not hidden: plain ls shows it too.`
    } else if (hidden.some((n) => n.slice(1) === value)) {
      message = 'The dot at the start is part of a hidden file\'s name. Write the name exactly as ls shows it.'
    } else if (hidden.some((n) => n.toLowerCase() === value.toLowerCase())) {
      message = 'Names care about capital letters. Write the name exactly as ls shows it.'
    } else {
      message = 'No file in desk has that name. Copy the name from what ls prints for desk.'
    }
    return [check(name, false, message, output)]
  }
}
