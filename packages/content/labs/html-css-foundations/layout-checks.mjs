// What the layout issues of this repo add to style-checks.mjs: gap read as one value, values CSS
// does not know, rules put on the wrong element, grid tracks and media queries.
import { clean, distance, line } from './style-checks.mjs'

/** `s` with gap reported as one value, so `gap: 24px` and two longhands judge alike. */
export function withGap(s) {
  return {
    ...s,
    style(el) {
      const st = s.style(el)
      const row = st['row-gap']
      const column = st['column-gap']
      if (st.gap === undefined && (row || column))
        st.gap = row === column ? row : `${row ?? 'normal'} ${column ?? 'normal'}`
      return st
    }
  }
}

/** `s` with every style read at a viewport width. */
export function atWidth(s, width) {
  return withGap({ ...s, style: (el) => s.page.style(el, { width }) })
}

const scratch = (s) => s.page.document.createElement('div').style

/** True when CSS knows `value` for `property`. */
export function knownValue(s, property, value) {
  const st = scratch(s)
  st.setProperty(property, value)
  return st.getPropertyValue(property) !== ''
}

/** A `wrong` option for judge(): says when a keyword is one CSS does not know. */
export const unknownWord = (s, property, more) => (value) => {
  if (/^centre$/i.test(value))
    return 'CSS spells the word center. It does not know centre, so the browser skips the line.'
  if (/^[a-z-]+$/i.test(value) && !knownValue(s, property, value))
    return `${property} does not take ${value}, so the browser skips the line. Check the spelling, and the values the lesson lists.`
  return more?.(value) ?? null
}

/** The declarations among `decls` whose selector picks an element inside `el`, or its children. */
export function onChildren(s, el, decls, direct = false) {
  const inside = direct ? [...el.children] : [...el.querySelectorAll('*')]
  return decls.filter((d) => d.selectors.some((sel) => inside.some((c) => s.matches(c, sel))))
}

/** A selector among `decls` with a class or id one or two letters off `name`, or null. */
export function nearName(decls, name) {
  for (const d of decls)
    for (const m of d.selector.matchAll(/[.#]([\w-]+)/g))
      if (m[1] !== name && distance(m[1].toLowerCase(), name) <= 2)
        return { decl: d, written: m[0], name }
  return null
}

/** Every declaration with the media queries around it, in file order. */
export function mediaDecls(css) {
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
      if (/^@media\b/i.test(head)) walk(body, [...media, clean(head.slice(6))])
      else if (!head.startsWith('@'))
        for (const piece of body.split(';')) {
          const colon = piece.indexOf(':')
          if (colon === -1) continue
          found.push({
            media,
            selector: clean(head),
            selectors: head.split(',').map((x) => x.trim()),
            property: piece.slice(0, colon).trim().toLowerCase(),
            value: piece.slice(colon + 1).trim()
          })
        }
      at = end
    }
  }
  walk((css ?? '').replace(/\/\*[\s\S]*?\*\//g, ''), [])
  return found
}

export const mediaLine = (d) =>
  d.media.length ? `@media ${d.media.join(' and ')} { ${line(d)} }` : line(d)

/** Why a media query cannot work as written, or null. */
export function queryProblem(query) {
  const text = query.replace(/^(only\s+)?(screen|all)\s*(and\s*)?/i, '').trim()
  if (!text) return null
  if (!/^\(.*\)$/.test(text))
    return 'The condition of a media query goes in round brackets, or the browser ignores the whole query.'
  for (const [, value] of text.matchAll(/(?:min-|max-)?width\s*(?::|<=|>=|<|>)\s*([^)\s]+)/gi))
    if (/^[\d.]+$/.test(value) && Number(value) !== 0)
      return 'The width in the media query is a number with no unit, so the browser ignores the whole query.'
  return null
}

const split = (text) => {
  const parts = []
  let depth = 0
  let word = ''
  for (const ch of text) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (/\s/.test(ch) && !depth) {
      if (word) parts.push(word)
      word = ''
    } else word += ch
  }
  if (word) parts.push(word)
  return parts
}

/**
 * The columns of a grid-template-columns value: `{ list }` for a fixed set of tracks (repeat()
 * with a number expanded), `{ auto, track }` for repeat(auto-fill | auto-fit, track), or null.
 */
export function tracks(value) {
  const parts = split(clean(value ?? '').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s*,\s*/g, ','))
  const list = []
  for (const part of parts) {
    const rep = part.match(/^repeat\((.*)\)$/i)
    if (!rep) {
      list.push(part)
      continue
    }
    const comma = rep[1].indexOf(',')
    if (comma === -1) return null
    const count = rep[1].slice(0, comma).trim().toLowerCase()
    const track = rep[1].slice(comma + 1).trim()
    if (count === 'auto-fill' || count === 'auto-fit')
      return parts.length === 1 ? { auto: count, track } : null
    if (!/^\d+$/.test(count)) return null
    for (let i = 0; i < Number(count); i++) list.push(...split(track))
  }
  return { list }
}

/**
 * A `hint` option for judge() when a rule meant for `el` landed elsewhere. `wanted(value)` says
 * which values count, `name` is the class the selector should have, `others` are elements other
 * tasks style, so their rules are not taken for a wrong selector.
 */
export const missedHint =
  (s, el, { phrase, container, name, wanted = () => true, others = [] }) =>
  (away) => {
    const relevant = away.filter((d) => wanted(s.norm(d.property, d.value)))
    if (onChildren(s, el, relevant, true).length)
      return `The ${phrase} set on what is inside ${container}. It belongs on ${container} itself, and the browser lays out what is inside.`
    const near = name && nearName(away, name)
    if (near)
      return `The selector ${near.written} does not match the class ${name}. Check its spelling.`
    const mine = relevant.filter(
      (d) => !d.selectors.some((sel) => others.some((o) => o && o !== el && s.matches(o, sel)))
    )
    return mine.length ? null : 'none yet'
  }

/** judge()'s result with a 'none yet' hint turned into a plain sentence and a short output. */
export function noneYet(r, sentence) {
  return r.message === 'none yet' || /has no .* yet\.$/.test(r.message ?? '')
    ? { ok: false, message: r.message === 'none yet' ? sentence : r.message, output: r.output.split('\n')[0] }
    : r
}
