import { cascade, clean, detail, forced, gate, line, openSite } from '../../site-checks.mjs'

const VIEWPORTS = [360, 1024]
// Widths of the column a box sits in, from a small phone's to a wide screen's. The page tool
// knows no layout, so a box fits when its declared sizes fit every one of them.
const COLUMNS = [240, 280, 320, 400, 600, 900]
const cap = (text) => text[0].toUpperCase() + text.slice(1)
const BORDER_WORDS = { thin: 1, medium: 3, thick: 5 }

/** A length as { pct, px }, so it can be measured against any column; null for auto, NaN if unreadable. */
function length(value) {
  const text = clean(value ?? 'auto')
  if (/^(auto|none|initial|unset|fit-content|max-content|min-content)$/.test(text)) return null
  const body = text.replace(/^calc\((.*)\)$/, '$1')
  let pct = 0
  let px = 0
  for (const m of body.matchAll(/([+-])?\s*(-?\d*\.?\d+)(px|rem|em|%|vw)?/g)) {
    const n = Number(m[2]) * (m[1] === '-' ? -1 : 1)
    if (m[3] === '%') pct += n / 100
    else if (m[3] === 'vw') (pct += n / 100), (px += (32 * n) / 100)
    else if (m[3] === 'rem' || m[3] === 'em') px += n * 16
    else if (m[3] === 'px' || n === 0) px += n
    else return NaN
  }
  if (body.replace(/([+-])?\s*(-?\d*\.?\d+)(px|rem|em|%|vw)?/g, '').trim()) return NaN
  return { pct, px }
}
const at = (len, column) => len.pct * column + len.px
const px = (value) => {
  if (value in BORDER_WORDS) return BORDER_WORDS[value]
  const len = length(value)
  return len && !Number.isNaN(len) ? len.px : 0
}

/** How a box is sized at a viewport width, read from the CSS that applies to it. */
function sizing(s, el, viewport) {
  const st = s.style(el, viewport)
  const side = (p) => px(st[`padding-${p}`]) + (/^(none|hidden)?$/.test(st[`border-${p}-style`] ?? '') ? 0 : px(st[`border-${p}-width`] ?? 'medium'))
  return {
    st,
    model: st['box-sizing'] ?? 'content-box',
    width: length(st.width),
    min: length(st['min-width']),
    max: length(st['max-width']),
    edges: side('left') + side('right'),
    margins: [st['margin-left'], st['margin-right']].map((m) => (m === 'auto' ? 0 : px(m)))
  }
}

/** The width a box takes in a column of `column` px, padding, border and margins included. */
function outer(z, column, fills) {
  const sized = (len) => (len ? at(len, column) : null)
  const margins = z.margins.reduce((a, b) => a + b, 0)
  if (!z.width && fills) return column
  let w = z.width ? at(z.width, column) : null
  if (w === null) return null
  if (z.max) w = Math.min(w, sized(z.max))
  if (z.min) w = Math.max(w, sized(z.min))
  return (z.model === 'border-box' ? Math.max(w, z.edges) : w + z.edges) + margins
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
 * Whether a box fits its column at every width without a patch. `what` names it in words, and
 * `fill` says it must also take the whole width of its column, as a field must.
 */
function fits(s, el, what, fill) {
  for (const viewport of VIEWPORTS) {
    const z = sizing(s, el, viewport)
    const declared = cascade(s, el, 'width', viewport).at(-1)
    const output = `${cap(what)} at ${viewport}px: width ${z.st.width ?? 'not set'}, box-sizing ${z.model}, padding and border ${z.edges}px across${
      z.st['max-width'] ? `, max-width ${z.st['max-width']}` : ''
    }${z.st['min-width'] ? `, min-width ${z.st['min-width']}` : ''}${declared ? `\nWidth from: ${line(declared)}` : ''}`
    const cover = hidden(s, el, viewport)
    if (cover)
      return {
        ok: false,
        message: `${name(cover.el)} has overflow: ${cover.value}. That hides whatever sticks out of it, on this page and the next: ${what} is cut off instead of fitting, and its edge and padding go with it. Take it out and fix how ${what} is sized.`,
        output: `${name(cover.el)}: overflow ${cover.value}`
      }
    if (z.margins.some((m) => m < 0))
      return {
        ok: false,
        message: `${what} has a negative margin. It pulls the box outward to make up for the extra width, and the box is still as wide as before. Fix how its width is worked out instead.`,
        output
      }
    if ([z.width, z.min, z.max].some((len) => Number.isNaN(len)))
      return {
        ok: false,
        message: `The check cannot read the width of ${what} in this form. Write it as a length, a percentage, or calc() with those.`,
        output
      }
    if (fill && !z.width)
      return {
        ok: false,
        message: `${what} has no width, so it is only as wide as its own default size, and no longer fills the form as Bartek designed it. Keep a width that fills the column, and size it so its padding and border fit inside.`,
        output
      }
    const over = COLUMNS.find((c) => outer(z, c, !fill) > c + 0.5)
    if (over !== undefined) {
      const fixed = z.width && z.width.pct === 0
      return {
        ok: false,
        message: fixed
          ? `${what} has a fixed width, so it cannot shrink when its column is narrower than that, as it is on a small phone.`
          : z.model === 'content-box' && z.edges
            ? `${what} is wider than its column at ${viewport}px wide. With box-sizing content-box, its width covers only what is inside, and its padding and border are added on top of it.`
            : `${what} is wider than its column at ${viewport}px wide: its width and its margins together are more than the column.`,
        output
      }
    }
    if (fill && COLUMNS.some((c) => outer(z, c, false) < c - 0.5))
      return {
        ok: false,
        message: `${what} fits now, but no longer fills the width of its column. Keep it as wide as the column, padding and border included.`,
        output
      }
  }
  const force = forced(s, el, ['width', 'box-sizing', 'max-width'])[0]
  if (force)
    return {
      ok: false,
      message: `${what} is sized by force: an !important wins over every normal rule, and the next change to its size will need force too. Take the !important out.`,
      output: line(force)
    }
  return { ok: true, output: `${what}: fits its column, phone and wide screen` }
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
