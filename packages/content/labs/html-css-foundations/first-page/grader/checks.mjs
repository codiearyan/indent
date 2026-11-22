import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const NAME = 'Kilnworth Pottery'
const clean = (text) => text.replace(/\s+/g, ' ').trim()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

// The browser adds html, head and body when they are missing, so the file itself is read too.
async function source(t) {
  const text = await readFile(join(t.workspace, 'index.html'), 'utf8')
  return text.replace(/<!--[\s\S]*?-->/g, '')
}

const opens = (text, name) => new RegExp(`<${name}[\\s>/]`, 'i').test(text)
const closes = (text, name) => new RegExp(`</${name}\\s*>`, 'i').test(text)
const tags = (text, name) =>
  `opening tag ${opens(text, name) ? 'found' : 'missing'}, closing tag ${closes(text, name) ? 'found' : 'missing'}`

export const checks = {
  async doctype(t) {
    const page = await t.page()
    const text = await source(t)
    const doctype = page.document.doctype
    const lang = page.document.documentElement.getAttribute('lang') ?? ''
    return [
      detail(
        'The page starts with a doctype',
        doctype?.name === 'html' && !doctype.publicId,
        'The very first line of a page tells the browser it is a modern HTML page. Look at how the lesson starts every page.',
        doctype ? `Found <!doctype ${doctype.name}>` : 'No doctype found'
      ),
      detail(
        'An html element wraps the whole page',
        opens(text, 'html') && closes(text, 'html'),
        'Everything after the doctype sits inside one root element, with its opening tag at the start and its closing tag at the very end.',
        `html: ${tags(text, 'html')}`
      ),
      detail(
        'The page says it is in English',
        /^en(-|$)/i.test(lang),
        'The root element can say which language the page is written in. Add the attribute for that, with the short code for English.',
        lang ? `lang="${lang}"` : 'No lang attribute on the root element'
      )
    ]
  },

  async head(t) {
    const page = await t.page()
    const text = await source(t)
    const { head } = page.document
    const charset = head.querySelector('meta[charset]')?.getAttribute('charset') ?? ''
    const title = clean(head.querySelector('title')?.textContent ?? '')
    return [
      detail(
        'There is a head element',
        opens(text, 'head') && closes(text, 'head'),
        'The details about the page go in their own element, right after the opening html tag. Write its opening and closing tags.',
        `head: ${tags(text, 'head')}`
      ),
      detail(
        'The head says which characters the file uses',
        /^utf-?8$/i.test(charset),
        'Without a character set some letters can come out as odd symbols. One meta element in the head names it.',
        charset ? `charset="${charset}"` : 'No meta charset in the head'
      ),
      detail(
        'The tab shows the studio name',
        title === NAME,
        'The words on the browser tab come from one element in the head. Its text should be the studio name, exactly as Dilys wrote it.',
        title ? `Title: ${title}` : 'No title in the head'
      )
    ]
  },

  async body(t) {
    const page = await t.page()
    const text = await source(t)
    const h1s = page.$$('h1')
    const paragraphs = page.$$('body p')
    const welcome = paragraphs.find((p) => clean(p.textContent).includes('Saddler Street'))
    const kettle = paragraphs.find((p) => clean(p.textContent).includes('kettle'))
    const loose = [...page.document.body.childNodes]
      .filter((node) => node.nodeType === 3 && clean(node.textContent))
      .map((node) => clean(node.textContent))
    return [
      detail(
        'There is a body element',
        opens(text, 'body') && closes(text, 'body'),
        'What people see on the page goes in its own element after the head. Write its opening and closing tags.',
        `body: ${tags(text, 'body')}`
      ),
      detail(
        'The studio name is the main heading',
        h1s.length === 1 && clean(h1s[0].textContent) === NAME,
        h1s.length > 1
          ? 'A page has one main heading. Keep one and turn the others back into text.'
          : 'The first line is the name of the studio. Make it the main heading of the page, with the words as they are.',
        `Main headings: ${h1s.map((h) => clean(h.textContent)).join(' | ') || 'none'}`
      ),
      detail(
        'The two sentences are two paragraphs',
        Boolean(welcome) && Boolean(kettle) && welcome !== kettle,
        'The welcome about Saddler Street and the line about the kettle are two separate paragraphs. Give each one its own element.',
        `Paragraphs: ${paragraphs.length}`
      ),
      detail(
        'No words are left outside an element',
        loose.length === 0,
        'Some words still sit straight in the body. Put every bit of text inside the heading or a paragraph.',
        loose.length ? `Loose text:\n${loose.join('\n')}` : 'All text is inside elements'
      )
    ]
  }
}
