import { join } from 'node:path'
import { check, filesUnder, findByContent, isDir, kind, listing, names, read, starterText } from '../../grading.mjs'

const RESET = 'Nothing comes back from rm, but the Reset button puts the starter\'s files back.'
const list = (items) => items.join(', ')

export const checks = {
  async duplicate(t) {
    const name = 'Only the copy of the fox poster is gone'
    const ws = t.workspace
    const output = `artwork:\n${listing(ws, 'artwork')}`
    const original = read(join(ws, 'artwork', 'fox-poster.svg'))
    let message
    if (kind(ws, 'artwork', 'fox-poster.svg') !== 'file') {
      message =
        kind(ws, 'artwork', 'fox-poster copy.svg') === 'file'
          ? `fox-poster.svg is gone, and fox-poster copy.svg is still there: the original went instead of the copy. ${RESET}`
          : `fox-poster.svg is gone from artwork too. Only the copy had to go. ${RESET}`
    } else if (original !== starterText(t, 'artwork/fox-poster.svg')) {
      message = 'fox-poster.svg in artwork has changed. It should be the poster as it was, untouched.'
    } else if (kind(ws, 'artwork', 'fox-poster copy.svg') !== null) {
      message = 'artwork still has fox-poster copy.svg.'
    } else {
      return [check(name, true, '', output)]
    }
    return [check(name, false, message, output)]
  },

  async temp(t) {
    const name = 'downloads has no .tmp files left'
    const ws = t.workspace
    const output = `downloads:\n${listing(ws, 'downloads')}`
    const starter = names(t.chapterPath('starter/downloads'))
    const keep = starter.filter((n) => !n.endsWith('.tmp'))
    const gone = keep.filter((n) => read(join(ws, 'downloads', n)) !== starterText(t, `downloads/${n}`))
    const tmp = names(join(ws, 'downloads')).filter((n) => n.endsWith('.tmp'))
    let message
    if (!isDir(ws, 'downloads')) {
      message = `The downloads folder itself is gone. Only the .tmp files in it had to go. ${RESET}`
    } else if (gone.length) {
      message = `${list(gone)} ${gone.length > 1 ? 'are' : 'is'} gone from downloads too. Only the .tmp files had to go. ${RESET}`
    } else if (tmp.length) {
      message = `downloads still has ${list(tmp)}.`
    } else {
      return [check(name, true, '', output)]
    }
    return [check(name, false, message, output)]
  },

  async rescue(t) {
    const name = 'logo.svg is safe in artwork'
    const ws = t.workspace
    const content = starterText(t, 'old-site/logo.svg')
    const output = `artwork:\n${listing(ws, 'artwork')}`
    if (read(join(ws, 'artwork', 'logo.svg')) === content && kind(ws, 'artwork', 'logo.svg') === 'file') {
      return [check(name, true, '', output)]
    }
    let message
    if (kind(ws, 'artwork', 'logo.svg') === 'file') {
      message = 'artwork/logo.svg is there, but it is not the logo from old-site: its contents differ.'
    } else if (read(join(ws, 'old-site', 'logo.svg')) === content) {
      message = 'The logo is still in old-site. Get it into artwork before the folder goes.'
    } else {
      const elsewhere = filesUnder(ws).find((rel) => read(join(ws, ...rel.split('/'))) === content)
      message = elsewhere
        ? `The logo is ${elsewhere.includes('/') ? `at ${elsewhere}` : `in the top folder as ${elsewhere}`}. It should be in artwork, named logo.svg.`
        : `artwork has no logo.svg, and the logo is nowhere else either: it went with old-site. ${RESET}`
    }
    return [check(name, false, message, output)]
  },

  async 'old-site'(t) {
    const name = 'The old-site folder is gone'
    const ws = t.workspace
    const k = kind(ws, 'old-site')
    if (k === null) {
      const site = filesUnder(t.chapterPath('starter/old-site')).filter((rel) => rel !== 'logo.svg')
      const left = site.flatMap((rel) => findByContent(ws, starterText(t, `old-site/${rel}`)))
      if (!left.length) return [check(name, true, '', listing(ws))]
      return [
        check(
          name,
          false,
          `old-site is gone from the top folder, but its files are still in the workspace, at ${left[0]}${left.length > 1 ? ` and ${left.length - 1} more` : ''}. The site goes for good: remove those too.`,
          left.join('\n')
        )
      ]
    }
    const inside = k === 'dir' ? filesUnder(join(ws, 'old-site')) : []
    const message =
      k === 'file'
        ? 'old-site in the top folder is a file now. Remove it too.'
        : inside.length
          ? `old-site is still there, with ${inside.length} file${inside.length > 1 ? 's' : ''} inside.`
          : 'old-site is empty now, but the folder itself is still there.'
    return [check(name, false, message, k === 'dir' ? `old-site:\n${inside.join('\n') || '(empty)'}` : listing(ws))]
  }
}
