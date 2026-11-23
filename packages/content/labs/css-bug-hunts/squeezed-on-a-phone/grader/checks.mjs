import { cascade, clean, detail, gate, line, openSite, whyLoses } from '../../site-checks.mjs'

// The site's phone layout is 640px and narrower. Widths of our own on both sides, the edge included.
const PHONE = [360, 480, 640]
const WIDE = [641, 800, 1024]
const SAMPLES = [320, 360, 400, 480, 560, 600, 640, 641, 700, 800, 900, 1024, 1200]

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

/** How many columns a grid-template-columns value makes, or 'auto' for auto-fill and auto-fit. */
function trackCount(value) {
  let count = 0
  for (const part of split(clean(value ?? 'none').replace(/\s*,\s*/g, ','))) {
    if (part === 'none') return 1
    const rep = part.match(/^repeat\((\w[\w-]*),(.*)\)$/i)
    if (!rep) count++
    else if (/^auto-(fill|fit)$/i.test(rep[1])) return 'auto'
    else count += Number(rep[1]) * split(rep[2]).length
  }
  return count
}

/** The film grid's columns at a width, as the visitor sees them: one when it is not a grid. */
function gridColumns(s, el, width) {
  const st = s.style(el, width)
  if (st.display === 'none') return 'hidden'
  if (!/grid/.test(st.display ?? '')) return /flex/.test(st.display ?? '') ? 'a row' : 1
  return trackCount(st['grid-template-columns'])
}

/** How the footer's parts sit at a width: 'stacked', 'a row' or 'hidden'. */
function footerShape(s, el, width) {
  const st = s.style(el, width)
  if (st.display === 'none') return 'hidden'
  if (/flex/.test(st.display ?? ''))
    return /^column/.test(st['flex-direction'] ?? 'row') ? 'stacked' : 'a row'
  if (/grid/.test(st.display ?? '')) return trackCount(st['grid-template-columns']) === 1 ? 'stacked' : 'a row'
  return 'stacked'
}

/** Declarations in media queries for `el` and `property` that never win at any width. */
function dead(s, el, property) {
  return s.decls.filter(
    (d) =>
      d.media.length &&
      d.property === property &&
      d.selectors.some((sel) => s.matches(el, sel)) &&
      SAMPLES.every((w) => cascade(s, el, property, w).at(-1)?.index !== d.index)
  )
}

/**
 * Why the phone layout does not reach `el` at `width` for one of `properties`, in words.
 * `right(d)` says whether a declaration gives the phone value.
 */
function phoneLoses(s, el, properties, width, right) {
  for (const property of properties) {
    const steps = cascade(s, el, property, width)
    const winner = steps.at(-1)
    if (winner && right(winner, property)) continue
    const good = steps.findLast((d) => right(d, property))
    if (good) return { property, why: whyLoses(good, winner), winner, good }
    const off = s.decls.find(
      (d) =>
        d.media.length &&
        d.property === property &&
        d.selectors.some((sel) => s.matches(el, sel)) &&
        right(d, property)
    )
    if (off) return { property, off }
  }
  return null
}

const output = (s, el, properties, width) =>
  properties
    .flatMap((p) => {
      const steps = cascade(s, el, p, width)
      return steps.map((d) => `${d === steps.at(-1) ? 'Wins:  ' : 'Loses: '}${line(d)}`).reverse()
    })
    .join('\n')

function phoneResult(s, el, what, shape, wantsPhone, properties, right, describe) {
  for (const width of PHONE) {
    const got = shape(s, el, width)
    if (got === 'hidden')
      return {
        ok: false,
        message: `On a phone ${what} is hidden. The visitor still needs it; the phone layout only changes how it is laid out.`,
        output: `${what} at ${width}px: display none`
      }
    if (wantsPhone(got)) continue
    const loss = phoneLoses(s, el, properties, width, right)
    const shown = `${what} at ${width}px: ${describe(got)}\n${output(s, el, properties, width)}`
    if (loss?.off)
      return {
        ok: false,
        message: `At ${width}px wide the phone rule for ${what} does not apply: its condition, ${loss.off.media.join(' and ')}, is false at that width. The site's phone layout is for screens 640px wide and narrower.`,
        output: `${shown}\nNot applying: ${line(loss.off)}`
      }
    if (loss?.why)
      return {
        ok: false,
        message: `On a phone ${what} ${describe(got)}. The phone layout has a rule for it, but ${loss.why}.${
          loss.good.media.length && !loss.winner.media.length ? ' A media query adds nothing to the strength of the rules inside it.' : ''
        }`,
        output: shown
      }
    return {
      ok: false,
      message: `On a phone ${what} ${describe(got)}, and nothing in the phone layout changes that any more. Keep the phone layout's rule for it.`,
      output: shown
    }
  }
  const force = PHONE.flatMap((w) => properties.flatMap((p) => cascade(s, el, p, w))).find((d) => d.important)
  if (force)
    return {
      ok: false,
      message: `The phone layout reaches ${what} by force: an !important wins over every normal rule. The rule that was beating it is still there, and the next change to ${what} will need force too. Take the !important out and fix why the phone rule lost.`,
      output: line(force)
    }
  const unused = properties.flatMap((p) => dead(s, el, p))
  if (unused.length)
    return {
      ok: false,
      message: `${what[0].toUpperCase()}${what.slice(1)} has the right layout on a phone, but a media query rule for it never applies at any width: something later or stronger always beats it. A copy that works next to one that never does leaves the next person guessing. Fix the rule that lost instead of adding another.`,
      output: unused.map(line).join('\n')
    }
  return { ok: true, output: `${what} at ${PHONE.join(', ')}px: right on a phone` }
}

const oneColumn = (d, p) =>
  p === 'display' ? !/grid|flex/.test(d.value) : trackCount(d.value) === 1
const filmGrid = (s, el) =>
  phoneResult(
    s,
    el,
    'the film grid',
    gridColumns,
    (got) => got === 1,
    ['grid-template-columns', 'display'],
    oneColumn,
    (got) => (got === 'auto' ? 'picks its columns by itself' : got === 'a row' ? 'is a row' : `has ${got} columns`)
  )

const stacked = (d, p) => {
  if (p === 'display') return !/flex|grid/.test(d.value)
  if (p === 'flex-direction' || p === 'flex-flow') return /^column/.test(d.value)
  return true
}
const footer = (s, el) =>
  phoneResult(
    s,
    el,
    'the footer',
    footerShape,
    (got) => got === 'stacked',
    ['display', 'flex-direction'],
    stacked,
    () => 'is still three columns side by side'
  )

const asDetail = (name, r) => detail(name, r.ok, r.message, r.output)

export const checks = {
  async 'film-grid'(t) {
    const s = await openSite(t)
    const name = 'On a phone the films are in one column'
    return gate(s, name) ?? [asDetail(name, filmGrid(s, s.$('.film-grid')))]
  },

  async footer(t) {
    const s = await openSite(t)
    const name = 'On a phone the footer is stacked'
    return gate(s, name) ?? [asDetail(name, footer(s, s.$('.footer-columns')))]
  },

  async 'wide-layout'(t) {
    const s = await openSite(t)
    const name = 'Wider screens keep the wide layout'
    const stop = gate(s, name)
    if (stop) return stop
    const grid = s.$('.film-grid')
    const foot = s.$('.footer-columns')
    const extras = s.$('.extras')
    const a = filmGrid(s, grid)
    const b = footer(s, foot)
    if (!a.ok || !b.ok)
      return [
        detail(
          name,
          false,
          `This task checks the wide layout once the phone layout works, so it waits for ${
            !a.ok && !b.ok ? 'tasks 1 and 2' : !a.ok ? 'task 1, the film grid' : 'task 2, the footer'
          }. Finish that first.`,
          [a, b].filter((r) => !r.ok).map((r) => r.output.split('\n')[0]).join('\n')
        )
      ]
    const off = (shape, el, want) => WIDE.map((w) => [w, shape(s, el, w)]).find(([, got]) => got !== want)
    const gridOff = off(gridColumns, grid, 3)
    const footOff = off(footerShape, foot, 'a row')
    const extrasOff = off(gridColumns, extras, 2) ?? (gridColumns(s, extras, 360) === 1 ? null : [360, gridColumns(s, extras, 360)])
    const say = (what, [w, got], before) =>
      `At ${w}px wide ${what} ${got === 'stacked' || got === 1 ? 'is in one column' : `has ${got} columns`}. ${before} The phone layout is for screens 640px wide and narrower only.`
    return [
      detail(
        'The films stay three in a row on wider screens',
        !gridOff,
        gridOff && say('the film grid', gridOff, 'Wider than a phone it had three columns.'),
        gridOff ? output(s, grid, ['grid-template-columns'], gridOff[0]) : `Three columns at ${WIDE.join(', ')}px`
      ),
      detail(
        'The footer stays in a row on wider screens',
        !footOff,
        footOff && `At ${footOff[0]}px wide the footer is stacked. Wider than a phone its three parts sat side by side. The phone layout is for screens 640px wide and narrower only.`,
        footOff ? output(s, foot, ['display', 'flex-direction'], footOff[0]) : `A row at ${WIDE.join(', ')}px`
      ),
      detail(
        'Membership and gifts keep their layout',
        !extrasOff,
        extrasOff && `At ${extrasOff[0]}px wide the membership and gift boxes are not in the layout they had: two columns wider than a phone, one on a phone. Only the films and the footer needed fixing.`,
        extrasOff ? output(s, extras, ['grid-template-columns'], extrasOff[0]) : 'Two columns wide, one on a phone'
      )
    ]
  }
}
