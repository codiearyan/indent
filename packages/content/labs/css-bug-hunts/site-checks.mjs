// What the tickets of this repo share: the Wrenfield's page with only styles.css applied, every
// declaration with its media queries, and the cascade for one element at one width.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const clean = (text) => text.replace(/\s+/g, ' ').trim()
export const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
const read = (file) => readFile(file, 'utf8').catch(() => null)

// Copied from kit/page.mjs, so the checks weigh rules exactly the way t.page().style() does.
function matchesMedia(query, width) {
  const px = (value, unit) => Number(value) * (unit === 'px' ? 1 : 16)
  const holds = (piece) => {
    if (piece === 'screen' || piece === 'all' || piece === '') return true
    const named = piece.match(/^(min|max)-width\s*:\s*([\d.]+)(px|em|rem)$/)
    if (named) {
      const limit = px(named[2], named[3])
      return named[1] === 'min' ? width >= limit : width <= limit
    }
    const range = piece.match(/^width\s*(<=|>=|<|>)\s*([\d.]+)(px|em|rem)$/)
    if (!range) return false
    const limit = px(range[2], range[3])
    if (range[1] === '<=') return width <= limit
    if (range[1] === '>=') return width >= limit
    return range[1] === '<' ? width < limit : width > limit
  }
  const strip = (piece) =>
    piece
      .trim()
      .replace(/^\(|\)$/g, '')
      .trim()
  return query.split(',').some((part) => part.split(/\band\b/).map(strip).every(holds))
}

export function specificity(selector) {
  const plain = selector.replace(/\[[^\]]*\]/g, '[]').replace(/::[\w-]+/g, ' x')
  const count = (pattern) => (plain.match(pattern) ?? []).length
  return (
    count(/#[\w-]+/g) * 10000 +
    count(/\.[\w-]+|\[\]|:[\w-]+/g) * 100 +
    count(/(^|[\s>+~(])[a-zA-Z][\w-]*/g)
  )
}

/** A selector's strength in words: "one id, one class and one element name". */
export function strength(selector) {
  const w = specificity(selector)
  const ids = Math.floor(w / 10000)
  const classes = Math.floor((w % 10000) / 100)
  const names = w % 100
  const words = ['no', 'one', 'two', 'three', 'four', 'five']
  const say = (n, one) => `${words[n] ?? n} ${n === 1 ? one : one === 'class' ? 'classes' : `${one}s`}`
  const parts = [
    ids && say(ids, 'id'),
    classes && say(classes, 'class'),
    names && say(names, 'element name')
  ].filter(Boolean)
  if (!parts.length) return 'nothing to count'
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

/** Every declaration of a stylesheet in file order, with its selectors and media queries. */
export function declarations(css) {
  const found = []
  const walk = (part, media) => {
    let at = 0
    for (let open = part.indexOf('{', at); open !== -1; open = part.indexOf('{', at)) {
      let depth = 1
      let end = open + 1
      for (; end < part.length && depth; end++)
        depth += part[end] === '{' ? 1 : part[end] === '}' ? -1 : 0
      const head = part.slice(at, open).split(';').pop().trim()
      const body = part.slice(open + 1, end - 1)
      if (head.startsWith('@media')) walk(body, [...media, clean(head.slice(6))])
      else if (/^@(supports|layer)/.test(head)) walk(body, media)
      else if (!head.startsWith('@'))
        for (const piece of body.split(';')) {
          const colon = piece.indexOf(':')
          if (colon === -1) continue
          const value = piece.slice(colon + 1).trim()
          found.push({
            media,
            selector: clean(head),
            selectors: head.split(',').map((s) => s.trim()),
            property: piece.slice(0, colon).trim().toLowerCase(),
            value: value.replace(/\s*!\s*important$/i, ''),
            important: /!\s*important$/i.test(value),
            index: found.length
          })
        }
      at = end
    }
  }
  walk((css ?? '').replace(/\/\*[\s\S]*?\*\//g, ''), [])
  return found
}

export const line = (d) => {
  const rule = `${d.selector} { ${d.property}: ${d.value}${d.important ? ' !important' : ''} }`
  return d.media.length ? `@media ${d.media.join(' and ')} { ${rule} }` : rule
}

const ALSO = {
  flex: /^flex-(grow|shrink|basis)$/,
  'flex-flow': /^flex-(direction|wrap)$/,
  font: /^(font-[a-z-]+|line-height)$/,
  inset: /^(top|right|bottom|left)$/,
  grid: /^grid-(template|auto)-/,
  'border-width': /^border-(top|right|bottom|left)-width$/,
  'border-style': /^border-(top|right|bottom|left)-style$/,
  'border-color': /^border-(top|right|bottom|left)-color$/
}
/** True when a declaration of `short` sets the property `long`, itself or as a shorthand. */
export function sets(short, long) {
  if (short === long) return true
  if (short in ALSO) return ALSO[short].test(long)
  return long.startsWith(`${short}-`)
}

const tag = (el) =>
  `<${el.tagName.toLowerCase()}${el.id ? ` id="${el.id}"` : ''}${
    el.getAttribute('class') ? ` class="${clean(el.getAttribute('class'))}"` : ''
  }${el.getAttribute('type') ? ` type="${el.getAttribute('type')}"` : ''}>`

/** Every element of the body with its tag, id, classes and type, in order. */
function outline(window, html) {
  const doc = new window.DOMParser().parseFromString(html, 'text/html')
  return [...doc.body.querySelectorAll('*')].filter((el) => el.tagName !== 'STYLE')
}

/** How index.html differs from the page the ticket was filed on, or null. */
function htmlChange(window, original, html) {
  if (original === null) return null
  const was = outline(window, original)
  const now = outline(window, html)
  for (let i = 0; i < Math.max(was.length, now.length); i++) {
    const a = was[i] && tag(was[i])
    const b = now[i] && tag(now[i])
    if (a === b) continue
    return a ? `Expected here: ${a}\nFound: ${b ?? 'nothing'}` : `An element the page did not have: ${b}`
  }
  return null
}

/**
 * Opens index.html with only styles.css applied. Style attributes and style elements of the page
 * itself are taken out and listed in `inline`, so each check judges the stylesheet alone.
 */
export async function openSite(t) {
  const html = await read(join(t.workspace, 'index.html'))
  const css = await read(join(t.workspace, 'styles.css'))
  if (html === null) return { missing: 'index.html' }
  if (css === null) return { missing: 'styles.css' }
  // The page has no scripts; one added could run forever before any check, so it is never opened.
  if (/<script\b/i.test(html)) return { scripted: true }
  const page = await t.page('index.html')
  const sheets = page.$$('style')
  const linked = sheets.some((s) => s.textContent === css)
  const inline = []
  for (const s of sheets) {
    if (linked && s.textContent === css) continue
    inline.push('a style element')
    s.remove()
  }
  for (const el of page.$$('[style]')) {
    inline.push(`a style attribute on ${tag(el)}`)
    el.removeAttribute('style')
  }
  const original = await read(t.chapterPath('starter/index.html'))
  const scratch = page.document.createElement('div').style
  const s = {
    page,
    css,
    linked,
    inline,
    changed: htmlChange(page.window, original, html),
    decls: declarations(linked ? css : ''),
    $: page.$,
    $$: page.$$,
    style: (el, width = 1024) => page.style(el, { width }),
    /** A value the way the page reports it, so `#FFF` and `rgb(255, 255, 255)` compare equal. */
    norm(property, value) {
      scratch.cssText = ''
      scratch.setProperty(property, value)
      return scratch.getPropertyValue(property) || clean(value)
    },
    matches(el, selector) {
      try {
        return el.matches(selector)
      } catch {
        return false
      }
    }
  }
  return s
}

const BRACES =
  'A rule in styles.css is missing a brace: each selector is followed by { and each rule ends with }. The browser misreads every rule after a missing one.'

/**
 * The one failed detail a task returns when the page cannot be judged on its stylesheet: a file
 * is missing, the stylesheet is not linked or broken, CSS sits in the HTML, or the HTML changed.
 * Null when the page can be judged.
 */
export function gate(s, name) {
  if (s.missing)
    return [
      detail(
        name,
        false,
        `${s.missing} is missing from your workspace. This repo fixes the page in place, so both files stay.`,
        `${s.missing}: not found`
      )
    ]
  if (s.scripted)
    return [
      detail(
        name,
        false,
        'index.html has a script in it now. The page the ticket was filed on has none, and every fix in this repo is CSS in styles.css. Take the script out of index.html.',
        'A <script> in index.html'
      )
    ]
  if (!s.linked)
    return [
      detail(
        name,
        false,
        'index.html does not link styles.css any more, so none of the site\'s rules reach the page. Put the link back in its head.',
        'styles.css is not linked'
      )
    ]
  if (s.inline.length)
    return [
      detail(
        name,
        false,
        'Some CSS sits in index.html itself. A style there wins over the stylesheet by force and hides the rule that is really at fault. Every fix in this repo goes in styles.css; take the CSS out of index.html.',
        `In index.html: ${[...new Set(s.inline)].join(', ')}`
      )
    ]
  if (s.changed)
    return [
      detail(
        name,
        false,
        'index.html is not the page the ticket was filed on any more. Changing the HTML moves the page away from the rule at fault, and the same rule waits for the next page that uses it. Put index.html back as it was and fix the cause in styles.css.',
        s.changed
      )
    ]
  const opens = (s.css.replace(/\/\*[\s\S]*?\*\//g, '').match(/{/g) ?? []).length
  const closes = (s.css.replace(/\/\*[\s\S]*?\*\//g, '').match(/}/g) ?? []).length
  if (opens !== closes)
    return [detail(name, false, BRACES, `Opening braces: ${opens}, closing braces: ${closes}`)]
  return null
}

/**
 * Every declaration that sets `property` on `el` at a viewport `width`, weakest first and the
 * winner last, weighed the way the browser does: !important, then the selector, then file order.
 */
export function cascade(s, el, property, width = 1024) {
  const hits = []
  for (const d of s.decls) {
    if (!sets(d.property, property)) continue
    if (!d.media.every((q) => matchesMedia(q, width))) continue
    // The strongest selector of a list that matches is the one that counts, and the one named.
    const picked = d.selectors
      .filter((sel) => s.matches(el, sel))
      .sort((a, b) => specificity(b) - specificity(a))
    if (!picked.length) continue
    hits.push({ ...d, picked: picked[0], weight: specificity(picked[0]) + (d.important ? 1e9 : 0) })
  }
  return hits.sort((a, b) => a.weight - b.weight)
}

/** The value `el` ends up with, following `inherit` up to the element that sets one. */
export function computed(s, el, property, width = 1024) {
  for (let at = el; at; at = at.parentElement) {
    const value = s.style(at, width)[property]
    if (value !== 'inherit' && value !== 'unset') return value
  }
  return undefined
}

/** `value` with every var() replaced the way it resolves on `el`. */
export function resolve(s, el, value, width = 1024) {
  const vars = s.style(el, width)
  return value.replace(
    /var\(\s*(--[\w-]+)\s*(?:,([^)]*))?\)/g,
    (_, n, fallback) => vars[n] ?? fallback?.trim() ?? ''
  )
}

/** Why a declaration with the right value loses to the winner, in words, or null. */
export function whyLoses(right, winner) {
  if (!right || !winner || right === winner) return null
  if (winner.important && !right.important)
    return `${winner.picked} is marked !important, so it wins over every normal rule`
  const a = specificity(winner.picked)
  const b = specificity(right.picked)
  if (a > b)
    return `${winner.picked} (${strength(winner.picked)}) is a stronger selector than ${right.picked} (${strength(right.picked)}), and the stronger selector wins wherever it sits in the file`
  if (winner.picked === right.picked)
    return `another rule for ${winner.picked} further down the file sets it again, and between equally strong rules the later one wins`
  return `${winner.picked} is as strong as ${right.picked} and comes later in the file, so it wins`
}

/** The !important declarations among `properties` that reach `el`. */
export function forced(s, el, properties, width = 1024) {
  return properties.flatMap((p) => cascade(s, el, p, width).filter((d) => d.important))
}
