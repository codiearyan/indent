const TITLES = ['Classes', 'The shop', 'Visit us']
// A piece is found by any of its phrases, so a typo elsewhere in it is not taken for a missing
// paragraph.
const PARTS = [
  { find: ['kofi teaches', 'thursday evenings', 'no wheel at all'], name: 'the classes text' },
  { find: ['wear clothes', 'getting muddy'], name: 'the line about clothes' },
  { find: ['everything on our shelves', 'every firing', 'come back often'], name: 'the shop text' },
  { find: ['kiln is opened', 'friday nights'], name: 'the line about the kiln' },
  { find: ['os4', '7rb', 'ostley'], name: 'the address' },
  { find: ['open tuesday', '10am to 5pm'], name: 'the opening hours' }
]
const [, CLOTHES, , KILN, ADDRESS] = PARTS
const CLOTHES_LINE = 'wear clothes you do not mind getting muddy'
const HEADINGS = 'h1, h2, h3, h4, h5, h6'
// The address element suits the studio's own address too.
const BLOCKS = 'p, address'

const clean = (text) => text.replace(/\s+/g, ' ').trim()
const lower = (el) => clean(el.textContent).toLowerCase()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
const blockWith = (page, part) =>
  page.$$(BLOCKS).find((p) => part.find.some((words) => lower(p).includes(words)))

export const checks = {
  async headings(t) {
    const page = await t.page()
    const headings = page.$$(HEADINGS)
    const outline = headings.map((h) => `${h.tagName.toLowerCase()} ${clean(h.textContent)}`)
    const h1s = page.$$('h1')
    const missing = TITLES.filter(
      (title) => !page.$$('h2').some((h) => clean(h.textContent) === title)
    )
    const levels = headings.map((h) => Number(h.tagName[1]))
    const skip = levels.findIndex((level, i) => level > (i === 0 ? 1 : levels[i - 1] + 1))
    return [
      detail(
        'The page still has one main heading',
        h1s.length === 1 && clean(h1s[0].textContent) === 'Kilnworth Pottery',
        'The studio name stays the one main heading. The new titles go one level below it.',
        `Main headings: ${h1s.map((h) => clean(h.textContent)).join(' | ') || 'none'}`
      ),
      detail(
        'Classes, The shop and Visit us are headings one level below',
        missing.length === 0,
        'Some section titles are still plain text, or not at the level just below the main heading. Keep their words exactly as they are.',
        missing.length ? `Not a heading at that level yet: ${missing.join(', ')}` : outline.join('\n')
      ),
      detail(
        'No heading level is skipped',
        headings.length > 0 && skip === -1,
        'Read the headings from top to bottom. Each one goes at most one level deeper than the one before it.',
        outline.join('\n') || 'No headings found'
      )
    ]
  },

  async paragraphs(t) {
    const page = await t.page()
    const found = PARTS.map((part) => ({ ...part, p: blockWith(page, part) }))
    const missing = found.filter((part) => !part.p).map((part) => part.name)
    const shared = found.filter(
      (part, i) => part.p && found.some((other, j) => j !== i && other.p === part.p)
    )
    const withTitle = page
      .$$('p')
      .filter((p) => TITLES.some((title) => clean(p.textContent).startsWith(title)))
    return [
      detail(
        'Each piece of text is in a paragraph',
        missing.length === 0,
        'Some text is no longer inside a paragraph. Every sentence on the page sits in a paragraph or a heading.',
        missing.length ? `Not in a paragraph: ${missing.join(', ')}` : 'All found'
      ),
      detail(
        'Each idea has a paragraph of its own',
        shared.length === 0,
        'Some pieces still share one paragraph. Give each one listed in the task its own paragraph.',
        shared.length
          ? `Sharing a paragraph: ${shared.map((part) => part.name).join(', ')}`
          : `${found.length - missing.length} of ${found.length} pieces in a paragraph, none sharing one`
      ),
      detail(
        'No paragraph starts with a section title',
        withTitle.length === 0,
        'A section title is still inside a paragraph. Titles live in headings, outside the paragraphs.',
        withTitle.length
          ? withTitle.map((p) => clean(p.textContent).slice(0, 60)).join('\n')
          : 'None'
      )
    ]
  },

  async emphasis(t) {
    const page = await t.page()
    const marked = page
      .$$('strong')
      .find((el) => ['clothes', ...CLOTHES.find].some((words) => lower(el).includes(words)))
    const line = marked ? lower(marked.closest(BLOCKS) ?? marked) : ''
    const kiln = blockWith(page, KILN)
    const ems = kiln ? [...kiln.querySelectorAll('em')] : []
    const stressed = ems.find((el) => lower(el) === 'saturday')
    const looks = page.$$('b, i').map((el) => `<${el.tagName.toLowerCase()}> ${clean(el.textContent)}`)
    return [
      detail(
        'The line about clothes is marked as important',
        Boolean(marked) && lower(marked).includes(CLOTHES_LINE.slice(5)),
        !marked
          ? 'Kofi wants nobody to miss the line about clothes. Wrap it in the element that marks words as important, not just bold.'
          : !line.includes(CLOTHES_LINE)
            ? "The line about clothes is marked as important, but its words have changed. Keep Kofi's words as he wrote them."
            : 'Only part of the line about clothes is marked. Mark the whole line as important.',
        page.$$('strong').map((el) => clean(el.textContent)).join('\n') ||
          `No important words yet${looks.length ? `\nFound: ${looks.join(', ')}` : ''}`
      ),
      detail(
        'The word Saturday is stressed',
        Boolean(stressed),
        !kiln
          ? 'The line about the kiln is not in a paragraph yet. Do the paragraphs first.'
          : ems.length === 1 && !lower(ems[0]).includes(' ')
            ? 'One word in the line about the kiln is stressed, but it is not Saturday as Kofi wrote it. Check which word it is and how it is spelled.'
            : 'In the line about the kiln, one word is said with stress. Wrap only that word in the element for stress.',
        kiln
          ? ems.map((el) => clean(el.textContent)).join(', ') || 'No stressed words in that line'
          : 'Line not found'
      )
    ]
  },

  async 'address-lines'(t) {
    const page = await t.page()
    const address = blockWith(page, ADDRESS)
    const text = address ? clean(address.textContent) : ''
    const breaks = address ? address.querySelectorAll('br').length : 0
    const alone = Boolean(address) && !/open tuesday|kiln|shelves/i.test(text)
    const kept = ['14 Saddler Street', 'Ostley', 'OS4 7RB'].every((part) => text.includes(part))
    return [
      detail(
        'The address is one paragraph on its own',
        alone && kept,
        alone
          ? 'The address has a paragraph of its own, but some of its words have changed. Keep the street, the town and the postcode as Kofi wrote them.'
          : 'The three lines of the address belong together in one paragraph, with nothing else in it.',
        address ? text : 'No paragraph holds the address'
      ),
      detail(
        'Each part of the address starts a new line',
        breaks >= 2,
        'Inside the address the browser joins the lines into one. Add a line break after the street and after the town.',
        `Line breaks in the address: ${breaks}`
      )
    ]
  }
}
