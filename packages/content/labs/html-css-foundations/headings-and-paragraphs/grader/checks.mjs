const TITLES = ['Classes', 'The shop', 'Visit us']
const PARTS = [
  { find: 'Kofi teaches two classes', name: 'the classes text' },
  { find: 'Wear clothes', name: 'the line about clothes' },
  { find: 'Everything on our shelves', name: 'the shop text' },
  { find: 'The kiln is opened', name: 'the line about the kiln' },
  { find: 'OS4 7RB', name: 'the address' },
  { find: 'Open Tuesday to Saturday', name: 'the opening hours' }
]
const HEADINGS = 'h1, h2, h3, h4, h5, h6'

const clean = (text) => text.replace(/\s+/g, ' ').trim()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
const paragraphWith = (page, text) => page.$$('p').find((p) => clean(p.textContent).includes(text))

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
    const found = PARTS.map((part) => ({ ...part, p: paragraphWith(page, part.find) }))
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
        missing.length === 0 && shared.length === 0,
        'Some pieces still share one paragraph. Give each one listed in the task its own paragraph.',
        shared.length
          ? `Sharing a paragraph: ${shared.map((part) => part.name).join(', ')}`
          : `${found.length} pieces, ${new Set(found.map((part) => part.p)).size} paragraphs`
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
    const important = page
      .$$('strong')
      .find((el) => clean(el.textContent).includes('clothes you do not mind getting muddy'))
    const kiln = paragraphWith(page, 'The kiln is opened')
    const stressed = kiln
      ? [...kiln.querySelectorAll('em')].find(
          (el) => clean(el.textContent).toLowerCase() === 'saturday'
        )
      : null
    const looks = page.$$('b, i').map((el) => `<${el.tagName.toLowerCase()}> ${clean(el.textContent)}`)
    return [
      detail(
        'The line about clothes is marked as important',
        Boolean(important),
        'Kofi wants nobody to miss the line about clothes. Wrap it in the element that marks words as important, not just bold.',
        page.$$('strong').map((el) => clean(el.textContent)).join('\n') || `No important words yet${looks.length ? `\nFound: ${looks.join(', ')}` : ''}`
      ),
      detail(
        'The word Saturday is stressed',
        Boolean(stressed),
        kiln
          ? 'In the line about the kiln, one word is said with stress. Wrap only that word in the element for stress.'
          : 'The line about the kiln is not in a paragraph yet. Do the paragraphs first.',
        kiln
          ? [...kiln.querySelectorAll('em')].map((el) => clean(el.textContent)).join(', ') || 'No stressed words in that line'
          : 'Line not found'
      )
    ]
  },

  async 'address-lines'(t) {
    const page = await t.page()
    const address = paragraphWith(page, 'OS4 7RB')
    const text = address ? clean(address.textContent) : ''
    const breaks = address ? address.querySelectorAll('br').length : 0
    return [
      detail(
        'The address is one paragraph on its own',
        Boolean(address) && text.includes('14 Saddler Street') && text.includes('Ostley') && !text.includes('Open Tuesday'),
        'The three lines of the address belong together in one paragraph, with nothing else in it.',
        address ? text : 'No paragraph holds the postcode'
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
