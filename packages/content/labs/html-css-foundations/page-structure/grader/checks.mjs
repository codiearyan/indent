const SECTIONS = [
  { title: 'Classes', holds: 'a[href="classes.html"], a[href="./classes.html"]', what: 'the link to the classes page' },
  { title: 'The shop', holds: 'figure', what: 'the mug of the month' },
  { title: 'Visit us', holds: 'a[href^="mailto:"]', what: 'the email link' }
]
const JUMPS = ['#classes', '#shop', '#visit']
const SMALL_PRINT = 'Words and drawings by Dilys'

const clean = (text) => text.replace(/\s+/g, ' ').trim()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
const tag = (el) => (el ? `<${el.tagName.toLowerCase()}>` : 'nothing')
const chain = (el) => {
  const parents = []
  for (let at = el?.parentElement; at && at.tagName !== 'BODY'; at = at.parentElement)
    parents.push(tag(at))
  return parents.length ? `inside ${parents.join(' in ')}` : 'straight in the body'
}
const heading = (page, title) => page.$$('h2').find((h) => clean(h.textContent) === title)

export const checks = {
  async header(t) {
    const page = await t.page()
    const h1 = page.$('h1')
    const header = h1?.closest('header')
    const nav = header?.querySelector('nav')
    const jumps = JUMPS.map((href) => nav?.querySelector(`a[href="${href}"]`))
    return [
      detail(
        'The studio name is in a page header',
        Boolean(header) && !header.closest('main, section, article'),
        'The strip at the top of the page, with the studio name, belongs in the element made for that. It sits outside the main content.',
        h1 ? `The main heading is ${chain(h1)}` : 'No main heading found'
      ),
      detail(
        'The Jump to links are in a nav inside the header',
        jumps.every(Boolean),
        header
          ? 'The links that move around the page go in the element made for navigation, inside the header.'
          : 'Make the header first.',
        JUMPS.map((href, i) => `${jumps[i] ? 'ok' : 'missing'}  ${href}`).join('\n')
      )
    ]
  },

  async main(t) {
    const page = await t.page()
    const mains = page.$$('main')
    const main = mains[0]
    const inside = SECTIONS.filter(({ title }) => main?.contains(heading(page, title) ?? null))
    const welcome = page.$$('p').find((p) => clean(p.textContent).includes('kettle'))
    return [
      detail(
        'There is exactly one main',
        mains.length === 1,
        mains.length > 1
          ? 'A page has one main element. Keep one around all the main content.'
          : 'Wrap the main content of the page in the element made for it.',
        `main elements: ${mains.length}`
      ),
      detail(
        'The welcome and the three sections are inside main',
        mains.length === 1 && inside.length === SECTIONS.length && main.contains(welcome ?? null),
        'Everything between the header and the small print is the reason the page exists, so it all goes inside main.',
        main
          ? `Inside main: ${[welcome && main.contains(welcome) ? 'welcome' : null, ...inside.map((s) => s.title)].filter(Boolean).join(', ') || 'nothing yet'}`
          : 'No main yet'
      ),
      detail(
        'main does not hold the header or the small print',
        Boolean(main) && !main.querySelector('header, footer, h1'),
        'The header and the small print sit outside main, before and after it.',
        main ? `In main: ${[...main.querySelectorAll('header, footer, h1')].map(tag).join(', ') || 'neither'}` : 'No main yet'
      )
    ]
  },

  async sections(t) {
    const page = await t.page()
    const found = SECTIONS.map(({ title, holds, what }) => {
      const h = heading(page, title)
      const section = h?.closest('section')
      const first = section?.querySelector('h1, h2, h3, h4, h5, h6') === h
      return { title, what, h, section, ok: Boolean(section) && first && Boolean(section.querySelector(holds)) }
    })
    const shared = found.filter((s, i) => s.section && found.some((o, j) => j !== i && o.section === s.section))
    return [
      detail(
        'Each part has a section of its own, led by its heading',
        found.every((s) => s.section) && shared.length === 0,
        shared.length
          ? 'Two parts share one section. Close each section before the next heading.'
          : 'Wrap each of the three parts in the element for a part with its own heading, starting at its heading.',
        found.map((s) => `${s.title}: ${s.h ? chain(s.h) : 'heading not found'}`).join('\n')
      ),
      detail(
        'Each section holds all of its content',
        found.every((s) => s.ok) && shared.length === 0,
        'A section runs from its heading to just before the next heading. Some content has been left outside its section.',
        found.map((s) => `${s.ok ? 'ok' : 'missing'}  ${s.title} holds ${s.what}`).join('\n')
      ),
      detail(
        'The sections are inside main',
        found.every((s) => s.section?.closest('main')),
        'The three sections are main content, so they sit inside main.',
        found.map((s) => `${s.title}: ${s.section ? chain(s.section) : 'no section'}`).join('\n')
      )
    ]
  },

  async footer(t) {
    const page = await t.page()
    const small = page.$$('p').find((p) => clean(p.textContent).includes(SMALL_PRINT))
    const footer = small?.closest('footer')
    return [
      detail(
        'The small print is in a page footer',
        Boolean(footer) && !footer.closest('main, section, article'),
        small
          ? 'The line about who made the page belongs in the element for the end of a page, outside main.'
          : 'The small print line is missing. Keep its words as they are.',
        small ? `The small print is ${chain(small)}` : 'not found'
      )
    ]
  }
}
