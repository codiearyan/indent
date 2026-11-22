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
const pathOf = (page, a) => new URL(a.getAttribute('href'), page.window.location.href).pathname
const listLinks = (links) =>
  links.map((a) => `<a href="${a.getAttribute('href')}">${clean(a.textContent)}</a>`).join('\n') ||
  'No links on the page'

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
    const email = links.find((a) => {
      const href = a.getAttribute('href').trim()
      return /^mailto:/i.test(href) && href.slice(7).split('?')[0].toLowerCase() === EMAIL
    })
    const phone = links.find((a) => {
      const href = a.getAttribute('href').trim()
      return /^tel:/i.test(href) && href.replace(/\D/g, '').endsWith(PHONE)
    })
    return [
      detail(
        'The email address opens an email',
        Boolean(email),
        'Clicking the studio email should start a new email to it. A link can begin with a scheme for that instead of a page address.',
        listLinks(links.filter((a) => /^mailto:/i.test(a.getAttribute('href').trim())))
      ),
      detail(
        'The phone number can be called',
        Boolean(phone),
        'On a phone, tapping the number should offer to call it. A link can begin with a scheme for that, followed by the number. Check every digit.',
        listLinks(links.filter((a) => /^tel:/i.test(a.getAttribute('href').trim())))
      )
    ]
  }
}
