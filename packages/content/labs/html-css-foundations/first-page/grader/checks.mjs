import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const NAME = 'Kilnworth Pottery'
const LINES = [
  {
    name: 'the welcome about Saddler Street',
    anchors: ['saddler', 'mugs, bowls', 'teach anyone'],
    text: 'We make mugs, bowls and plates by hand at 14 Saddler Street, and we teach anyone who wants to learn.'
  },
  {
    name: 'the line about the kettle',
    anchors: ['come in', 'say hello', 'kettle', 'usually on'],
    text: 'Come in and say hello. The kettle is usually on.'
  }
]
const clean = (text) => text.replace(/\s+/g, ' ').trim()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

// The browser adds html, head and body when they are missing, and repairs tags in the wrong
// place, so the file itself is read too.
async function source(t) {
  const text = await readFile(join(t.workspace, 'index.html'), 'utf8')
  return text.replace(/<!--[\s\S]*?-->/g, '').trim()
}

const opens = (text, name) => new RegExp(`<${name}[\\s>/]`, 'i').test(text)
const closes = (text, name) => new RegExp(`</${name}\\s*>`, 'i').test(text)
const count = (text, re) => (text.match(re) ?? []).length
const tags = (text, name) =>
  `opening tag ${opens(text, name) ? 'found' : 'missing'}, closing tag ${closes(text, name) ? 'found' : 'missing'}`
const firstLine = (text) => clean(text.split('\n').find((line) => line.trim()) ?? '').slice(0, 60)

/** Where the html tags sit in the file when they do not wrap it, or null. */
function htmlProblem(text) {
  if (!opens(text, 'html') || !closes(text, 'html')) return null
  const rest = text.replace(/^<!doctype[^>]*>/i, '').trim()
  if (!/^<html[\s>]/i.test(rest))
    return {
      message:
        'The opening html tag is there, but something comes before it. It goes right after the doctype.',
      output: `Before <html>: ${firstLine(rest)}`
    }
  const last = [...text.matchAll(/<\/html\s*>/gi)].pop()
  const after = text.slice(last.index + last[0].length).trim()
  if (after)
    return {
      message:
        'The closing html tag is there, but more of the page comes after it. It goes at the very end of the file.',
      output: `After </html>: ${firstLine(after)}`
    }
  return null
}

/** What follows the opening html tag when it is not the head, or null. */
function headProblem(text) {
  const html = text.match(/<html[^>]*>/i)
  if (!html || !opens(text, 'head')) return null
  const next = text.slice(html.index + html[0].length).trim()
  return /^<head[\s>]/i.test(next) ? null : `Right after <html>: ${firstLine(next)}`
}

/** What is wrong with the two paragraphs, or null. */
function paragraphProblem(paragraphs) {
  const found = LINES.map((line) => ({
    ...line,
    p: paragraphs.find((p) =>
      line.anchors.some((a) => clean(p.textContent).toLowerCase().includes(a))
    )
  }))
  const missing = found.filter((line) => !line.p)
  if (missing.length)
    return {
      message: `${missing.length > 1 ? 'Neither of her lines' : `The ${missing[0].name.slice(4)}`} is in a paragraph yet. Each of Dilys's two lines goes in a paragraph of its own.`,
      output: `Paragraphs: ${paragraphs.length}`
    }
  if (found[0].p === found[1].p)
    return {
      message:
        'The welcome and the line about the kettle share one paragraph. Give each one its own element.',
      output: `Paragraphs: ${paragraphs.length}`
    }
  if (paragraphs.length > 2)
    return {
      message:
        "Dilys's words make two paragraphs, one for each of her lines. Keep each line whole, in one paragraph.",
      output: `Paragraphs: ${paragraphs.length}\n${paragraphs.map((p) => clean(p.textContent)).join('\n')}`
    }
  const changed = found.find((line) => clean(line.p.textContent) !== line.text)
  if (changed)
    return {
      message: `The paragraphs are right, but the words of ${changed.name} have changed. Keep Dilys's words exactly as she wrote them.`,
      output: `Paragraph: ${clean(changed.p.textContent)}`
    }
  return null
}

export const checks = {
  async doctype(t) {
    const page = await t.page()
    const text = await source(t)
    const doctype = page.document.doctype
    const first = /^<!doctype\s/i.test(text)
    const late = /<!doctype/i.test(text) && !first
    const html = htmlProblem(text)
    const lang = page.document.documentElement.getAttribute('lang') ?? ''
    return [
      detail(
        'The page starts with a doctype',
        first && doctype?.name === 'html' && !doctype.publicId,
        late
          ? 'The doctype is in the file, but something comes before it. It goes above everything else; only a comment may sit over it.'
          : 'The very first line of a page tells the browser it is a modern HTML page. Look at how the lesson starts every page.',
        late
          ? `The file starts with: ${firstLine(text)}`
          : doctype
            ? `Found <!doctype ${doctype.name}>`
            : 'No doctype found'
      ),
      detail(
        'An html element wraps the whole page',
        opens(text, 'html') && closes(text, 'html') && !html,
        html?.message ??
          'Everything after the doctype sits inside one root element, with its opening tag at the start and its closing tag at the very end.',
        html?.output ?? `html: ${tags(text, 'html')}`
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
    const placed = headProblem(text)
    const charset = head.querySelector('meta[charset]')?.getAttribute('charset') ?? ''
    const title = clean(head.querySelector('title')?.textContent ?? '')
    const misplaced =
      'The browser only reads the head where it belongs, so fix where the head sits first.'
    return [
      detail(
        'There is a head element',
        opens(text, 'head') && closes(text, 'head') && !placed,
        placed
          ? 'The head is there, but it is not the first thing inside html. It comes right after the opening html tag, before the body.'
          : 'The details about the page go in their own element, right after the opening html tag. Write its opening and closing tags.',
        placed ?? `head: ${tags(text, 'head')}`
      ),
      detail(
        'The head says which characters the file uses',
        /^utf-?8$/i.test(charset),
        placed
          ? misplaced
          : 'Without a character set some letters can come out as odd symbols. One meta element in the head names it.',
        charset
          ? `charset="${charset}"`
          : placed
            ? 'The head is not in its place yet'
            : 'No meta charset in the head'
      ),
      detail(
        'The tab shows the studio name',
        title === NAME,
        placed && !title
          ? misplaced
          : 'The words on the browser tab come from one element in the head. Its text should be the studio name, exactly as Dilys wrote it.',
        title ? `Title: ${title}` : placed ? 'The head is not in its place yet' : 'No title in the head'
      )
    ]
  },

  async body(t) {
    const page = await t.page()
    const text = await source(t)
    const h1s = page.$$('h1')
    const paragraphs = page.$$('body p')
    const problem = paragraphProblem(paragraphs)
    const opened = count(text, /<p[\s>]/gi)
    const closed = count(text, /<\/p\s*>/gi)
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
          : h1s.length === 1
            ? 'There is one main heading, but its words have changed. It holds the studio name exactly as Dilys wrote it.'
            : 'The first line is the name of the studio. Make it the main heading of the page, with the words as they are.',
        `Main headings: ${h1s.map((h) => clean(h.textContent)).join(' | ') || 'none'}`
      ),
      detail(
        'The two lines are two paragraphs',
        !problem,
        problem?.message,
        problem?.output ?? `Paragraphs: ${paragraphs.length}`
      ),
      detail(
        'Every paragraph is closed',
        opened === closed,
        opened > closed
          ? 'A paragraph is opened but never closed. Each one needs its closing tag.'
          : 'There are more closing paragraph tags than opening ones. Each paragraph opens once and closes once.',
        `Opening p tags: ${opened}, closing p tags: ${closed}`
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
