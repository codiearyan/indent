import { cascade, clean, detail, forced, gate, line, openSite, resolve } from '../../site-checks.mjs'

const VIEWPORTS = [360, 1024]
// Widths of the column a box sits in, from a small phone's to a wide screen's. The page tool
// knows no layout, so a box fits when its declared sizes fit every one of them.
const COLUMNS = [240, 280, 320, 400, 600, 900]
const cap = (text) => text[0].toUpperCase() + text.slice(1)
const BORDER_WORDS = { thin: 1, medium: 3, thick: 5 }
const zero = () => 0

/**
 * A length as a function of the column's width in px, so % (of the column, for widths, padding
 * and margins alike), em, calc(), min(), max() and clamp() all count. Null for auto, NaN when
 * it cannot be read.
 */
function length(value, em) {
  const text = clean(value ?? 'auto')
  if (/^(auto|none|initial|unset|fit-content|max-content|min-content)$/.test(text)) return null
  const tokens = text.match(/\d*\.?\d+(?:px|rem|em|%|vw)?|[a-z]+\(|[()+\-*/,]/gi) ?? []
  if (tokens.join('') !== text.replace(/\s+/g, '')) return NaN
  let i = 0
  const sum = () => {
    let f = product()
    while (tokens[i] === '+' || tokens[i] === '-') {
      const [op, a, b] = [tokens[i++], f, product()]
      f = op === '+' ? (c) => a(c) + b(c) : (c) => a(c) - b(c)
    }
    return f
  }
  const product = () => {
    let f = unit()
    while (tokens[i] === '*' || tokens[i] === '/') {
      const [op, a, b] = [tokens[i++], f, unit()]
      f = op === '*' ? (c) => a(c) * b(c) : (c) => a(c) / b(c)
    }
    return f
  }
  const unit = () => {
    const t = tokens[i++]
    if (t === '-') {
      const f = unit()
      return (c) => -f(c)
    }
    const fn = t?.match(/^(calc|min|max|clamp)?\($/i)
    if (fn) {
      const args = [sum()]
      while (tokens[i] === ',') i++, args.push(sum())
      if (tokens[i++] !== ')') throw new Error('unclosed')
      const kind = fn[1]?.toLowerCase()
      if (kind === 'min') return (c) => Math.min(...args.map((f) => f(c)))
      if (kind === 'max') return (c) => Math.max(...args.map((f) => f(c)))
      if (kind === 'clamp' && args.length === 3)
        return (c) => Math.max(args[0](c), Math.min(args[1](c), args[2](c)))
      if (args.length !== 1) throw new Error('arguments')
      return args[0]
    }
    const m = t?.match(/^(\d*\.?\d+)(px|rem|em|%|vw)?$/i)
    if (!m) throw new Error('unknown')
    const n = Number(m[1])
    const per = { '%': (c) => (n * c) / 100, vw: (c) => (n * (c + 32)) / 100, em: () => n * em, rem: () => n * 16 }
    return per[m[2]?.toLowerCase()] ?? (() => n)
  }
  try {
    const f = sum()
    return i === tokens.length ? f : NaN
  } catch {
    return NaN
  }
}

/** The element's font size in px, from the font-size rules on it and the elements around it. */
function fontPx(s, el, viewport) {
  if (!el) return 16
  const parent = fontPx(s, el.parentElement, viewport)
  const d = cascade(s, el, 'font-size', viewport).at(-1)
  const value = d && resolve(s, el, d.value, viewport)
  const size = d?.property === 'font' ? value.match(/\d*\.?\d+(px|rem|em|%)/)?.[0] : value
  const len = size && length(size, parent)
  if (!len || Number.isNaN(len)) return parent
  return size.endsWith('%') ? len(parent) : len(0)
}

/** How a box is sized at a viewport width, read from the CSS that applies to it. */
function sizing(s, el, viewport) {
  const st = s.style(el, viewport)
  const em = fontPx(s, el, viewport)
  const read = (value) => length(value, em)
  const border = (p) => {
    if (/^(none|hidden)?$/.test(st[`border-${p}-style`] ?? '')) return zero
    const width = st[`border-${p}-width`] ?? 'medium'
    return width in BORDER_WORDS ? () => BORDER_WORDS[width] : (read(width) ?? zero)
  }
  const parts = ['left', 'right'].flatMap((p) => [read(st[`padding-${p}`]) ?? zero, border(p)])
  const margins = ['left', 'right'].map((p) => read(st[`margin-${p}`]) ?? zero)
  const z = {
    st,
    model: st['box-sizing'] === 'border-box' ? 'border-box' : 'content-box',
    width: read(st.width),
    min: read(st['min-width']),
    max: read(st['max-width']),
    edges: (c) => parts.reduce((a, f) => a + f(c), 0),
    margins: (c) => margins.map((f) => f(c))
  }
  z.unreadable = [z.width, z.min, z.max, ...parts, ...margins].some((f) => Number.isNaN(f))
  return z
}

/**
 * The width a box takes in a column of `column` px, padding, border and margins included. A box
 * with no width `stretches` to fill the column when it is a block box.
 */
function outer(z, column, stretches) {
  const edges = z.edges(column)
  const margins = z.margins(column).reduce((a, b) => a + b, 0)
  const box = (f) => (z.model === 'border-box' ? f(column) : f(column) + edges)
  let w
  if (z.width) w = box(z.width)
  else if (stretches) w = column - margins
  else return null
  if (z.max) w = Math.min(w, box(z.max))
  if (z.min) w = Math.max(w, box(z.min))
  return Math.max(w, edges) + margins
}

const hidden = (s, el, viewport) => {
  for (let up = el.parentElement; up; up = up.parentElement) {
    const st = s.style(up, viewport)
    const value = ['overflow', 'overflow-x'].map((p) => st[p]).find((v) => v && v !== 'visible')
    if (value) return { el: up, value }
  }
  return null
}

const name = (el) => `${el.tagName.toLowerCase()}${el.className ? `.${clean(el.className).replace(/ /g, '.')}` : ''}`

/**
 * Whether a box fits its column at every width without a patch, and still fills it. `what` names
 * it in words; a `field` does not stretch without a width, as a block box does.
 */
function fits(s, el, what, field) {
  for (const viewport of VIEWPORTS) {
    const z = sizing(s, el, viewport)
    const declared = cascade(s, el, 'width', viewport).at(-1)
    const output = `${cap(what)} at ${viewport}px: width ${z.st.width ?? 'not set'}, box-sizing ${z.model}, padding and border ${z.unreadable ? '?' : z.edges(COLUMNS[0])}px across${
      z.st['max-width'] ? `, max-width ${z.st['max-width']}` : ''
    }${z.st['min-width'] ? `, min-width ${z.st['min-width']}` : ''}${declared ? `\nWidth from: ${line(declared)}` : ''}`
    const cover = hidden(s, el, viewport)
    if (cover)
      return {
        ok: false,
        message: `the element around ${what}, ${name(cover.el)}, has overflow: ${cover.value}. That hides whatever sticks out of it, on this page and the next: ${what} is cut off instead of fitting, and its edge and padding go with it. Take it out and fix how ${what} is sized.`,
        output: `${name(cover.el)}: overflow ${cover.value}`
      }
    if (z.unreadable)
      return {
        ok: false,
        message: `The check cannot read the width, padding or margins of ${what} in this form. Write them as lengths or percentages, or calc(), min() or max() with those.`,
        output
      }
    if (z.margins(COLUMNS[0]).some((m) => m < 0))
      return {
        ok: false,
        message: `${what} has a negative margin. It pulls the box outward to make up for the extra width, and the box is still as wide as before. Fix how its width is worked out instead.`,
        output
      }
    if (field && !z.width)
      return {
        ok: false,
        message: `${what} has no width, so it is only as wide as its own default size, and no longer fills the form as Bartek designed it. Keep a width that fills the column, and size it so its padding and border fit inside.`,
        output
      }
    const over = COLUMNS.find((c) => outer(z, c, !field) > c + 0.5)
    if (over !== undefined) {
      const fixed = z.width && z.width(COLUMNS[0]) === z.width(COLUMNS.at(-1))
      const tooMin = z.min && (z.model === 'border-box' ? z.min(over) : z.min(over) + z.edges(over)) > over
      return {
        ok: false,
        message: tooMin
          ? `${what} has a min-width, ${z.st['min-width']}, that keeps it wider than a ${over}px column, as on a small phone.`
          : fixed
            ? `${what} has a fixed width, so it cannot shrink when its column is narrower than that, as it is on a small phone.`
            : z.model === 'content-box' && z.edges(over)
              ? `${what} is wider than a ${over}px column, as on a small phone. With box-sizing content-box, its width covers only what is inside, and its padding and border are added on top of it.`
              : `${what} is wider than a ${over}px column, as on a small phone: its width and its margins together are more than the column.`,
        output
      }
    }
    if (COLUMNS.some((c) => outer(z, c, !field) < c - 0.5))
      return {
        ok: false,
        message: `${what} fits now, but no longer fills the width of its column. Keep it as wide as the column, padding and border included.`,
        output
      }
  }
  const force = forced(s, el, ['width', 'box-sizing', 'max-width', 'min-width'])[0]
  if (force)
    return {
      ok: false,
      message: `${what} is sized by force: an !important wins over every normal rule, and the next change to its size will need force too. Take the !important out.`,
      output: line(force)
    }
  return { ok: true, output: `${what}: fits and fills its column, phone and wide screen` }
}

const asDetail = (title, r) => detail(title, r.ok, r.message && cap(r.message), r.output)

const tracks = (value) =>
  clean(value ?? 'none')
    .replace(/repeat\((\d+),\s*([^)]*)\)/g, (_, n, t) => Array(Number(n)).fill(t).join(' '))
    .split(' ')
    .filter((x) => x && x !== 'none').length || 1

export const checks = {
  async 'gift-box'(t) {
    const s = await openSite(t)
    const title = 'The gift box fits its column'
    return gate(s, title) ?? [asDetail(title, fits(s, s.$('.gift-box'), 'the gift box', false))]
  },

  async 'email-field'(t) {
    const s = await openSite(t)
    const title = 'The email field fits its column and fills it'
    return gate(s, title) ?? [asDetail(title, fits(s, s.$('.signup input'), 'the email field', true))]
  },

  async 'same-look'(t) {
    const s = await openSite(t)
    const title = 'The boxes keep their padding, borders and layout'
    const stop = gate(s, title)
    if (stop) return stop
    const a = fits(s, s.$('.gift-box'), 'the gift box', false)
    const b = fits(s, s.$('.signup input'), 'the email field', true)
    if (!a.ok || !b.ok)
      return [
        detail(
          title,
          false,
          `This task checks what the fix may have changed, so it waits for ${
            !a.ok && !b.ok ? 'tasks 1 and 2' : !a.ok ? 'task 1, the gift box' : 'task 2, the email field'
          }. Finish that first.`,
          [a, b].filter((r) => !r.ok).map((r) => r.output.split('\n')[0]).join('\n')
        )
      ]
    const keeps = (el, what, wants) => {
      const st = s.style(el, 360)
      const off = Object.entries(wants).filter(([p, v]) => st[p] !== v)
      return off.length ? `${what}: ${off.map(([p]) => `${p} ${st[p] ?? 'not set'}`).join(', ')}` : null
    }
    const sides = (prefix, v) =>
      Object.fromEntries(['top', 'right', 'bottom', 'left'].map((p) => [`${prefix}-${p}${prefix === 'border' ? '-width' : ''}`, v]))
    const look = [
      keeps(s.$('.gift-box'), 'The gift box', { ...sides('padding', '24px'), ...sides('border', '3px') }),
      keeps(s.$('.signup input'), 'The email field', {
        'padding-left': '12px',
        'padding-right': '12px',
        ...sides('border', '2px')
      }),
      keeps(s.$('.film-card'), 'A film card', { ...sides('padding', '16px'), ...sides('border', '1px') })
    ].filter(Boolean)
    const extras = s.$('.extras')
    const wide = tracks(s.style(extras, 1024)['grid-template-columns'])
    const narrow = tracks(s.style(extras, 360)['grid-template-columns'])
    return [
      detail(
        'The boxes keep their padding and borders',
        !look.length,
        'A box lost some of its padding or border. Taking them away makes the box fit by making it look different; the fix is in how the width is worked out, not in what is inside it.',
        look.join('\n') || 'Gift box, email field and film cards as before'
      ),
      detail(
        'Membership and gifts keep their layout',
        wide === 2 && narrow === 1,
        'The membership and gift boxes changed layout. They have two columns on a wide screen and one on a phone, and nothing about the columns needed fixing.',
        `Columns at 1024px: ${wide}, at 360px: ${narrow}`
      )
    ]
  }
}
