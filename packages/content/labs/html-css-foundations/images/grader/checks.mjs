import { access } from 'node:fs/promises'
import { join } from 'node:path'

const GENERIC = /^(an? )?(image|picture|photo|photograph|img|graphic|studio)$/i
const clean = (text) => text.replace(/\s+/g, ' ').trim()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
const pathOf = (page, img) => new URL(img.getAttribute('src'), page.window.location.href).pathname
const named = (page, file) =>
  page.$$('img[src]').find((img) => img.getAttribute('src').split(/[/\\]/).pop() === file)
const show = (img) => (img ? clean(img.outerHTML) : 'not found')

async function exists(t, path) {
  try {
    await access(join(t.workspace, decodeURIComponent(path)))
    return true
  } catch {
    return false
  }
}

function altProblem(alt) {
  if (alt === null) return 'It has no alt attribute.'
  const text = clean(alt)
  if (!text) return 'Its alt text is empty, which says the picture is only decoration.'
  if (/\.(svg|png|jpe?g|gif|webp)\b/i.test(text)) return 'Its alt text is a file name.'
  if (GENERIC.test(text) || text.split(' ').length < 3)
    return 'Its alt text is too short to say what the picture shows.'
  if (/^(an? )?(image|picture|photo|photograph) of\b/i.test(text))
    return 'A screen reader already says it is an image. Start with what it shows.'
  return null
}

export const checks = {
  async 'studio-picture'(t) {
    const page = await t.page()
    const img = named(page, 'studio.svg')
    const path = img ? pathOf(page, img) : ''
    const found = img ? await exists(t, path) : false
    return [
      detail(
        'The studio picture is on the page',
        Boolean(img),
        'Add an image element for the picture of the studio. Its file is studio.svg, in the pictures folder.',
        page.$$('img').map(show).join('\n') || 'No images on the page'
      ),
      detail(
        'Its address finds the file',
        found,
        'The browser cannot find the picture at that address. Start from the folder index.html is in, then the pictures folder, then the file.',
        img ? `src="${img.getAttribute('src')}" looks for ${path.slice(1)}` : 'Add the picture first'
      )
    ]
  },

  async 'alt-text'(t) {
    const page = await t.page()
    const studio = named(page, 'studio.svg')
    const divider = named(page, 'divider.svg')
    const problem = studio ? altProblem(studio.getAttribute('alt')) : 'Add the studio picture first.'
    return [
      detail(
        'The studio picture is described',
        !problem,
        studio
          ? `${problem} Describe what the picture shows in a few words, as you would to someone on the phone.`
          : problem,
        show(studio)
      ),
      detail(
        'The divider is marked as decoration',
        Boolean(divider) && divider.getAttribute('alt') !== null && !clean(divider.getAttribute('alt')),
        divider
          ? 'The wavy divider adds nothing a listener needs. Give it an alt attribute that tells a screen reader to skip it.'
          : 'The divider picture is no longer on the page. Keep it where it was.',
        show(divider)
      )
    ]
  },

  async size(t) {
    const page = await t.page()
    const studio = named(page, 'studio.svg')
    const width = studio?.getAttribute('width')?.trim()
    const height = studio?.getAttribute('height')?.trim()
    return [
      detail(
        'The studio picture says how wide it is',
        width === '640',
        studio
          ? 'Give the studio picture a width attribute: its real width in pixels from the first line of pictures/studio.svg, as a plain number.'
          : 'Add the studio picture first.',
        studio ? `width: ${width ?? 'missing'}` : 'not found'
      ),
      detail(
        'The studio picture says how tall it is',
        height === '400',
        studio
          ? 'Give the studio picture a height attribute: its real height in pixels from the first line of pictures/studio.svg, as a plain number.'
          : 'Add the studio picture first.',
        studio ? `height: ${height ?? 'missing'}` : 'not found'
      )
    ]
  },

  async figure(t) {
    const page = await t.page()
    const mug = named(page, 'mug.svg')
    const figure = mug?.closest('figure')
    const caption = figure?.querySelector('figcaption')
    const captionText = caption ? clean(caption.textContent) : ''
    const mugAlt = mug ? altProblem(mug.getAttribute('alt')) : null
    const found = mug ? await exists(t, pathOf(page, mug)) : false
    return [
      detail(
        'The mug picture sits in a figure',
        Boolean(figure) && found,
        !mug
          ? 'Add the picture of the mug, pictures/mug.svg, in the shop section.'
          : !found
            ? 'The browser cannot find the mug picture at that address. Check the folder and the file name.'
            : 'The mug picture and its caption belong together. Wrap them in the element made for a picture with a caption.',
        show(mug)
      ),
      detail(
        'The figure has the mug of the month as its caption',
        /mug of the month/i.test(captionText),
        'Inside the figure, the line about the mug of the month becomes the caption, in the element made for captions.',
        caption ? `Caption: ${captionText}` : 'No caption in the figure'
      ),
      detail(
        'The mug picture is described',
        Boolean(mug) && !mugAlt,
        `${mugAlt ?? 'Add the mug picture first.'} The caption names the mug; the alt text says what it looks like.`,
        show(mug)
      )
    ]
  }
}
