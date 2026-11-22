const SECTIONS = [
  { id: 'classes', title: 'Classes' },
  { id: 'shop', title: 'The shop' },
  { id: 'visit', title: 'Visit us' }
]
const EMAIL = 'hello@kilnworth.example'
const PHONE = '1632960418'

const clean = (text) => text.replace(/\s+/g, ' ').trim()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
// A link that leaves the workspace does not count, whatever its path.
const pathOf = (page, a) => {
  const url = new URL(a.getAttribute('href'), page.window.location.href)
  return url.host === page.window.location.host ? url.pathname : ''
}
const listLinks = (links) =>
  links.map((a) => `<a href="${a.getAttribute('href')}">${clean(a.textContent)}</a>`).join('\n') ||
  'No links on the page'

/** What keeps a phone link from dialling the studio from anywhere, or null. */
function phoneProblem(href) {
  if (!href)
    return 'On a phone, tapping the number should offer to call it. A link can begin with a scheme for that, followed by the number.'
  if (!/^tel:/i.test(href))
    return 'The phone number is a link, but its address does not start with the scheme for calls.'
  // Dashes, dots and brackets are allowed in a phone link; the lesson only rules out spaces.
  const number = href.slice(4)
  if (/\s|%20/.test(number))
    return 'The number in a phone link has no spaces. The words on the page can keep theirs.'
  const bare = number.replace(/[-.()]/g, '')
  if (!bare.startsWith('+44'))
    return 'A phone link works from anywhere when the number starts with a + and the country code. Look at how the lesson writes a UK number.'
  if (bare.startsWith('+440')) return 'After the country code, a UK number drops its first 0.'
  if (bare !== `+44${PHONE}`)
    return 'The phone link has the right start, but some digits differ from the number on the page. Check every digit.'
  return null
}

export const checks = {
  async 'to-classes'(t) {
    const page = await t.page()
    const links = page.$$('a[href]')
    const link = links.find((a) => pathOf(page, a) === '/classes.html')
    const text = link ? clean(link.textContent) : ''
    return [
      detail(
        'A link goes to the classes page',
        Boolean(link),
        'Under Classes, the words about the classes page should take a visitor to classes.html. The file sits right beside index.html.',
        listLinks(links)
      ),
      detail(
        'The link text says where it goes',
        /classes/i.test(text) && !/^(click )?here$/i.test(text),
        'A visitor should know where a link leads from its words alone. Wrap the words that name the classes page.',
        link ? `Link text: ${text || 'empty'}` : 'Make the link first'
      )
    ]
  },

  async 'back-home'(t) {
    const page = await t.page('classes.html')
    const links = page.$$('a[href]')
    const link = links.find((a) => ['/index.html', '/'].includes(pathOf(page, a)))
    return [
      detail(
        'The classes page links back to the home page',
        Boolean(link),
        'At the top of classes.html, the words about going back should take a visitor to index.html.',
        listLinks(links)
      ),
      detail(
        'The link back has words a visitor can read',
        Boolean(link) && clean(link.textContent).length > 0,
        'A link needs words between its tags, or nobody can see it or click it.',
        link ? `Link text: ${clean(link.textContent) || 'empty'}` : 'Make the link first'
      )
    ]
  },

  async 'jump-links'(t) {
    const page = await t.page()
    const targets = SECTIONS.map(({ id, title }) => {
      const el = page.document.getElementById(id)
      const heading = el && (el.matches('h2') ? el : el.querySelector('h2'))
      return { id, title, ok: Boolean(heading) && clean(heading.textContent) === title, el }
    })
    const jumps = SECTIONS.map(({ id }) => page.$$('a[href]').find((a) => a.getAttribute('href') === `#${id}`))
    return [
      detail(
        'Each section heading has its id',
        targets.every((target) => target.ok),
        'Give each of the three section headings the id the task names, so a link can point at it.',
        targets
          .map((target) => `${target.ok ? 'ok' : 'missing'}  id="${target.id}" on ${target.title}`)
          .join('\n')
      ),
      detail(
        'The Jump to words link to the sections',
        jumps.every(Boolean),
        'Each word after "Jump to" should be a link to its section on the same page. A link to an id on the same page starts with #.',
        SECTIONS.map(({ id }, i) => `${jumps[i] ? 'ok' : 'missing'}  a link to #${id}`).join('\n')
      )
    ]
  },

  async contact(t) {
    const page = await t.page()
    const links = page.$$('a[href]')
    const href = (a) => a.getAttribute('href').trim()
    const email = links.find((a) => `${href(a)} ${a.textContent}`.toLowerCase().includes(EMAIL))
    const phone = links.find((a) => `${href(a)} ${a.textContent}`.replace(/\D/g, '').includes(PHONE))
    const emailProblem = !email
      ? 'Clicking the studio email should start a new email to it. A link can begin with a scheme for that instead of a page address.'
      : !/^mailto:/i.test(href(email))
        ? 'The email address is a link, but its address does not start with the scheme for email.'
        : href(email).slice(7).split('?')[0].toLowerCase() !== EMAIL
          ? "The email link has the right scheme, but the address after it is not the studio's. Check every letter."
          : null
    return [
      detail(
        'The email address opens an email',
        !emailProblem,
        emailProblem,
        email ? listLinks([email]) : 'The email address is not a link yet'
      ),
      detail(
        'The phone number can be called',
        !phoneProblem(phone && href(phone)),
        phoneProblem(phone && href(phone)),
        phone ? listLinks([phone]) : 'The phone number is not a link yet'
      )
    ]
  }
}
