import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const PHONE = 375
const WIDE = 1280
// Room left for the list after the page's own padding and its widest content column.
const roomAt = (width) => Math.min(width, 960) - 48
const SPREAD = ['space-between', 'space-around', 'space-evenly']
const BREAKS = ['break-word', 'anywhere', 'break-all']

const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

function toPx(value, room) {
  const match = String(value ?? '')
    .trim()
    .match(/^([\d.]+)(px|rem|em|%)$/)
  if (!match) return null
  const n = Number(match[1])
  return match[2] === 'px' ? n : match[2] === '%' ? (n / 100) * room : n * 16
}

/** Splits on spaces or commas that are not inside brackets. */
function topLevel(text, separator) {
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of text) {
    depth += ch === '(' ? 1 : ch === ')' ? -1 : 0
    if (depth === 0 && separator.test(ch)) {
      if (current.trim()) parts.push(current.trim())
      current = ''
    } else current += ch
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/** How many columns a declared grid gives in `room` pixels, or null when it cannot tell. */
function columnCount(style, room) {
  if (style.display !== 'grid' && style.display !== 'inline-grid') return 1
  const template = style['grid-template-columns']
  if (!template || template === 'none') return 1
  const gap = toPx(style['column-gap'], room) ?? 0
  const auto = template.match(/^repeat\(\s*auto-(?:fill|fit)\s*,\s*(.+)\)$/)
  if (auto) {
    const track = auto[1].trim()
    const minmax = track.match(/^minmax\((.+)\)$/)
    let min = minmax ? topLevel(minmax[1], /,/)[0] : track
    const capped = min.match(/^min\((.+)\)$/)
    if (capped)
      min = String(Math.min(...topLevel(capped[1], /,/).map((v) => toPx(v, room) ?? room))) + 'px'
    const size = toPx(min, room)
    if (!size) return null
    return Math.max(1, Math.floor((room + gap) / (size + gap)))
  }
  return topLevel(template, /\s/).reduce((sum, part) => {
    const repeat = part.match(/^repeat\(\s*(\d+)\s*,(.+)\)$/)
    return sum + (repeat ? Number(repeat[1]) * topLevel(repeat[2], /\s/).length : 1)
  }, 0)
}

/** True when a row's items are pushed to its two ends. */
function spreads(page, row) {
  if (SPREAD.includes(page.style(row)['justify-content'])) return true
  return [...row.children].some((child) => {
    const s = page.style(child)
    return s['margin-left'] === 'auto' || s['margin-inline-start'] === 'auto'
  })
}

function flexRow(page, row, label) {
  if (!row) {
    return detail(
      `The ${label} is a flex row that wraps`,
      false,
      `The ${label} is missing.`,
      'not found'
    )
  }
  const at = (width) => page.style(row, { width })
  const isFlex = [PHONE, WIDE].every((w) => ['flex', 'inline-flex'].includes(at(w).display))
  const wraps =
    at(PHONE)['flex-wrap'] === 'wrap' || at(PHONE)['flex-direction']?.startsWith('column')
  const ends = spreads(page, row)
  const s = at(WIDE)
  return detail(
    `The ${label} is a flex row that wraps`,
    isFlex && wraps && ends,
    !isFlex
      ? `Make the ${label} a flex container so its children sit in a row.`
      : !ends
        ? `The two groups in the ${label} should sit at opposite ends. Look at how flex shares out the free space.`
        : `On a phone the ${label} runs out of room. Let its items move to a new line.`,
    `display: ${s.display ?? 'not set'}; flex-wrap: ${at(PHONE)['flex-wrap'] ?? 'not set'}; justify-content: ${s['justify-content'] ?? 'not set'}`
  )
}

export const checks = {
  async 'flex-rows'(t) {
    const page = await t.page()
    const css = (await readFile(join(t.workspace, 'styles.css'), 'utf8').catch(() => '')).replace(
      /\/\*[\s\S]*?\*\//g,
      ''
    )
    const floats = css
      .split('\n')
      .filter((line) => /float\s*:\s*(left|right|inline-start|inline-end)/.test(line))
    const header = page.$$('header').find((el) => !el.closest('main, article'))
    return [
      flexRow(page, header, 'page header'),
      flexRow(page, page.$('.event-footer'), 'card footer (.event-footer)'),
      detail(
        'No floats left in styles.css',
        floats.length === 0,
        'Floats were made for wrapping text around a picture, not for laying out rows. Replace the rules that still use them.',
        floats.map((line) => line.trim()).join('\n') || 'none'
      )
    ]
  },

  async 'card-grid'(t) {
    const page = await t.page()
    const list = page.$('.event-list')
    if (!list)
      return [
        detail(
          'The event list is on the page',
          false,
          'Keep the class event-list on the list of events.',
          'not found'
        )
      ]
    const phone = page.style(list, { width: PHONE })
    const wide = page.style(list, { width: WIDE })
    const phoneColumns = columnCount(phone, roomAt(PHONE))
    const wideColumns = columnCount(wide, roomAt(WIDE))
    const cards = [...page.$$('.event-list > li'), ...page.$$('.event')]
    const sized = cards
      .map((el) => [el, page.style(el, { width: WIDE }).width])
      .filter(([, width]) => width && !['auto', '100%'].includes(width))
    const viewport = page.$('meta[name="viewport"]')?.getAttribute('content') ?? ''
    const show = (s) =>
      `display: ${s.display ?? 'not set'}; grid-template-columns: ${s['grid-template-columns'] ?? 'not set'}`
    return [
      detail(
        'The page tells phones how wide it is',
        /width\s*=\s*device-width/.test(viewport),
        'Without a viewport meta tag a phone draws the page as if it were a wide screen and shrinks it. Add one to the head.',
        viewport ? `viewport content: ${viewport}` : 'no viewport meta tag'
      ),
      detail(
        `Several columns at ${WIDE}px wide`,
        wide.display?.endsWith('grid') && wideColumns >= 2,
        wide.display?.endsWith('grid')
          ? 'On a wide screen the grid should hold at least two cards side by side. Look at the size of each column.'
          : 'Make the event list a grid.',
        `${show(wide)}\ncolumns: ${wideColumns ?? 'cannot tell from this template'}`
      ),
      detail(
        `One column at ${PHONE}px wide`,
        phoneColumns === 1,
        'On a phone the cards should stack in one column. Either the columns need a larger smallest size, or a media query should change them on narrow screens.',
        `${show(phone)}\ncolumns: ${phoneColumns ?? 'cannot tell from this template'}`
      ),
      detail(
        'The cards do not set their own width',
        sized.length === 0,
        'The grid decides how wide each card is. Remove the width the old layout put on the list items or the cards.',
        sized.length
          ? `<${sized[0][0].tagName.toLowerCase()}> has width: ${sized[0][1]}`
          : 'no widths on the cards'
      )
    ]
  },

  async 'no-overflow'(t) {
    const page = await t.page()
    const images = page.$$('.event img')
    const bad = images.filter((img) => {
      const s = page.style(img, { width: PHONE })
      const capped = s['max-width'] === '100%' || (s.width === '100%' && !s['max-width'])
      const height =
        !s.height || s.height === 'auto' || Boolean(s['object-fit']) || Boolean(s['aspect-ratio'])
      return !capped || !height
    })
    const first = images[0] ? page.style(images[0], { width: PHONE }) : {}
    const word = page
      .$$('.event p')
      .find((p) => p.textContent.includes('#QuillmoorWinterReadingChallenge'))
    // overflow-wrap is inherited in CSS, so a rule on any ancestor counts.
    const chain = []
    for (let el = word; el; el = el.parentElement) chain.push(el)
    const breaker = chain
      .map((el) => [el, page.style(el, { width: PHONE })])
      .find(
        ([, s]) =>
          BREAKS.includes(s['overflow-wrap']) ||
          BREAKS.includes(s['word-wrap']) ||
          BREAKS.includes(s['word-break'])
      )
    return [
      detail(
        'Event pictures shrink with their card',
        images.length > 0 && bad.length === 0,
        'A picture with a fixed width pokes out of a narrow card. Let it be at most as wide as its card, and let the height follow so it keeps its shape.',
        `width: ${first.width ?? 'not set'}; max-width: ${first['max-width'] ?? 'not set'}; height: ${first.height ?? 'not set'}`
      ),
      detail(
        'Long words break inside the card',
        Boolean(breaker),
        word
          ? 'The hashtag in the reading challenge card is one long word with no space to break at. Tell the browser it may break a word that would overflow.'
          : 'Keep the reading challenge card and its hashtag on the page.',
        breaker
          ? `set on <${breaker[0].tagName.toLowerCase()}${breaker[0].className ? ` class="${breaker[0].className}"` : ''}>`
          : 'No overflow-wrap or word-break on the paragraph or around it'
      )
    ]
  }
}
