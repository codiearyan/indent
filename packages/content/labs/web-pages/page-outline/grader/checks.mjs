const EVENTS = [
  { title: 'Seed swap in the reading garden', date: '2026-12-05', time: '10:00' },
  { title: 'Knit and natter', date: '2026-12-08', time: '14:00' },
  { title: 'Homework club', date: '2026-12-10', time: '16:00' },
  { title: 'Winter reading challenge launch', date: '2026-12-12', time: '11:00' },
  { title: 'History walk along the old mill race', date: '2026-12-19', time: '13:30' }
]
const SECTION_TITLES = ["What's on in December", 'Events', 'Save a place', 'Visit us']
const HEADINGS = 'h1, h2, h3, h4, h5, h6'

const clean = (text) => text.replace(/\s+/g, ' ').trim()
const tagOf = (el) => (el ? `<${el.tagName.toLowerCase()}>` : 'nothing')
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

function articleFor(page, title) {
  return page.$$('article').find((a) => clean(a.textContent).includes(title))
}

export const checks = {
  async landmarks(t) {
    const page = await t.page()
    const mains = page.$$('main')
    const main = mains[0]
    const header = page
      .$$('header')
      .find(
        (el) => !el.closest('main, article') && clean(el.textContent).includes('Quillmoor Library')
      )
    const nav = page.$$('nav').find((el) => el.querySelectorAll('a[href]').length >= 3)
    const footer = page
      .$$('footer')
      .find((el) => !el.closest('main, article') && clean(el.textContent).includes("Tanner's Row"))
    const eventsIn = main && clean(main.textContent).includes(EVENTS[0].title)
    const formIn = main && main.querySelector('[name="email"]')
    return [
      detail(
        'The library name sits in a page header',
        Boolean(header),
        'Look at the strip at the top with the library name and the menu. Which element marks the top of a page?',
        `Header elements outside main: ${page.$$('header').filter((el) => !el.closest('main')).length}`
      ),
      detail(
        'The menu links are a navigation landmark',
        Boolean(nav) && !nav.closest('main'),
        'The three menu links help people move around the page. Wrap them in the element made for that, outside the main content.',
        nav
          ? `Found a nav with ${nav.querySelectorAll('a').length} links`
          : 'No nav holds the menu links'
      ),
      detail(
        'One main holds the events and the form',
        mains.length === 1 && Boolean(eventsIn) && Boolean(formIn),
        mains.length === 1
          ? 'The main element should wrap the heading, the events and the sign-up form.'
          : 'A page has exactly one main element, around its main content.',
        `main elements: ${mains.length}; events inside: ${Boolean(eventsIn)}; form inside: ${Boolean(formIn)}`
      ),
      detail(
        'The opening hours sit in a page footer',
        Boolean(footer),
        'The "Visit us" block at the bottom is the end of the page. Which element marks that, outside main?',
        `Footer elements outside main: ${page.$$('footer').filter((el) => !el.closest('main')).length}`
      )
    ]
  },

  async headings(t) {
    const page = await t.page()
    const headings = page.$$(HEADINGS)
    const levels = headings.map((h) => Number(h.tagName[1]))
    const h1s = page.$$('h1')
    const outline = headings
      .map((h) => `${h.tagName.toLowerCase()} ${clean(h.textContent)}`)
      .join('\n')
    const skip = levels.findIndex((level, i) => level > (i === 0 ? 1 : levels[i - 1] + 1))
    const notHeadings = [...SECTION_TITLES.slice(1), ...EVENTS.map((e) => e.title)].filter(
      (title) => !headings.some((h) => clean(h.textContent) === title)
    )
    return [
      detail(
        'There is one h1 and it names the page',
        h1s.length === 1 && clean(h1s[0].textContent) === SECTION_TITLES[0],
        h1s.length === 1
          ? 'The single top heading should be the page title in the big text near the top.'
          : 'A page has one top level heading: the title of the page itself.',
        `h1 elements: ${h1s.map((h) => clean(h.textContent)).join(' | ') || 'none'}`
      ),
      detail(
        'Section and event titles are headings',
        notHeadings.length === 0,
        'Some titles still only look like headings. Find the bold text and the big divs that start a part of the page.',
        notHeadings.length ? `Not a heading yet:\n${notHeadings.join('\n')}` : outline
      ),
      detail(
        'No heading level is skipped',
        headings.length > 0 && skip === -1,
        'Read the outline from top to bottom. Each heading may go at most one level deeper than the one before it, and the first is the h1.',
        outline || 'No headings found'
      )
    ]
  },

  async 'event-list'(t) {
    const page = await t.page()
    const articles = EVENTS.map((e) => articleFor(page, e.title))
    const missing = EVENTS.filter((_, i) => !articles[i]).map((e) => e.title)
    const items = articles.filter(Boolean).map((a) => a.parentElement)
    const lists = new Set(items.map((li) => li.parentElement))
    const [list] = lists
    const inOneList =
      missing.length === 0 &&
      items.every((li) => li.tagName === 'LI') &&
      lists.size === 1 &&
      ['UL', 'OL'].includes(list.tagName)
    const dates = EVENTS.map((e, i) => {
      const time = articles[i]?.querySelector('time[datetime]')
      const value = time?.getAttribute('datetime') ?? ''
      const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::\d{2})?)?$/)
      const ok = Boolean(match) && match[1] === e.date && (!match[2] || match[2] === e.time)
      return { title: e.title, value: time ? value : 'no <time datetime>', ok }
    })
    return [
      detail(
        'Every event is an article',
        missing.length === 0,
        'Each event card makes sense on its own. Give each card the element made for a self-contained piece.',
        missing.length ? `No article holds:\n${missing.join('\n')}` : `${articles.length} articles`
      ),
      detail(
        'The articles are the items of one list',
        inOneList,
        'A screen reader announces "list, 5 items" when the cards are list items. Put each article in a list item, all in one list.',
        missing.length
          ? 'Make the articles first.'
          : `Parents of the articles: ${items.map(tagOf).join(', ')}; their parents: ${[...lists].map(tagOf).join(', ')}`
      ),
      detail(
        'Each date is a time with a machine-readable datetime',
        dates.every((d) => d.ok),
        'Wrap each event date in a time element whose datetime gives the date as year-month-day, with the start time after a T if you add one. Check the day against the card.',
        dates.map((d) => `${d.ok ? 'ok' : 'wrong'}  ${d.title}: ${d.value}`).join('\n')
      )
    ]
  }
}
