import { cascade, clean, computed, detail, forced, gate, line, openSite } from '../../site-checks.mjs'

const LIGHT = 'rgb(239, 232, 220)'
const INK = 'rgb(31, 27, 22)'
const ORANGE = 'rgb(232, 116, 59)'
const ORANGE_DEEP = 'rgb(168, 72, 27)'
const MUTED = 'rgb(107, 98, 88)'
const PAPER = 'rgb(246, 241, 231)'
// A colour of our own for the box's --ink, to see whether the writing follows it.
const PROBE = 'rgb(10, 160, 90)'
const WIDTHS = [360, 1024]

const describe = (el) => {
  const text = clean(el.textContent)
  return `<${el.tagName.toLowerCase()}> ${text.length > 36 ? `${text.slice(0, 36)}...` : text}`
}

/** The nearest element, from `el` up, with a rule that sets its colour, and that rule. */
function source(s, el, width) {
  for (let at = el; at; at = at.parentElement) {
    const winner = cascade(s, at, 'color', width).at(-1)
    if (winner && winner.value !== 'inherit') return { at, winner }
  }
  return null
}

const colourOf = (s, el, width) => s.norm('color', computed(s, el, 'color', width) ?? '')

/**
 * Whether the writing of a dark box (`selector`) is light because it follows the box's own
 * --ink. `what` names the box in words; returns { ok, message, output }.
 */
function followsInk(s, selector, what) {
  const box = s.$(selector)
  const texts = s.$$(`${selector} :is(h2, p, li, cite, address, label)`)
  for (const width of WIDTHS) {
    const dark = texts.filter((el) => colourOf(s, el, width) !== LIGHT)
    if (!dark.length) continue
    const from = source(s, dark[0], width)
    const output = `${dark
      .slice(0, 4)
      .map((el) => `${describe(el)}: ${colourOf(s, el, width)}`)
      .join('\n')}${from ? `\nTheir colour comes from: ${line(from.winner)}` : ''}`
    if (from && from.at !== dark[0] && from.at.contains(box))
      return {
        ok: false,
        message: `Some writing in ${what} is still dark. It has no colour of its own, so it takes the colour of the element around it, and that colour was worked out on ${from.at.tagName.toLowerCase()}, from the page's dark --ink. Changing --ink on ${what} comes too late for a colour that is already worked out.`,
        output
      }
    return {
      ok: false,
      message: `Some writing in ${what} is not the light ink of the box. Look at which rule gives it its colour.`,
      output
    }
  }
  const force = texts.flatMap((el) => forced(s, el, ['color']))[0]
  if (force)
    return {
      ok: false,
      message: `The writing in ${what} gets its colour by force: an !important wins over every normal rule. The cause is still there, and the next colour change in the box will need force too. Take the !important out.`,
      output: line(force)
    }
  const probe = s.page.document.createElement('style')
  probe.textContent = `${selector} { --ink: ${PROBE} !important; }`
  s.page.document.head.append(probe)
  const stuck = texts.filter((el) => colourOf(s, el, 1024) !== PROBE)
  probe.remove()
  if (stuck.length)
    return {
      ok: false,
      message: `The writing in ${what} is light, but not from the box's own --ink: when --ink on the box changes, this writing stays as it is. Lior keeps the box's colours in --ink, so the writing has to follow it. Look at where its colour is set, and to what.`,
      output: `The writing in ${what}: light, but it does not follow the box's --ink.\nWith --ink on the box set to another colour:\n${stuck
        .slice(0, 4)
        .map((el) => `${describe(el)}: did not follow`)
        .join('\n')}\nIts colour comes from: ${line(source(s, stuck[0], 1024)?.winner ?? { selector: '?', property: 'color', value: '?', media: [] })}`
    }
  return { ok: true, output: `The writing in ${what} is light, from the box's --ink` }
}

const asDetail = (name, r) => detail(name, r.ok, r.message, r.output)

export const checks = {
  async 'late-show'(t) {
    const s = await openSite(t)
    const name = 'The writing in the late show box is light'
    return gate(s, name) ?? [asDetail(name, followsInk(s, '.late-show', 'the late show box'))]
  },

  async footer(t) {
    const s = await openSite(t)
    const name = 'The writing in the footer is light'
    return gate(s, name) ?? [asDetail(name, followsInk(s, '.site-footer', 'the footer'))]
  },

  async 'other-colours'(t) {
    const s = await openSite(t)
    const name = 'Everything else keeps its colour'
    const stop = gate(s, name)
    if (stop) return stop
    const a = followsInk(s, '.late-show', 'the late show box')
    const b = followsInk(s, '.site-footer', 'the footer')
    if (!a.ok || !b.ok)
      return [
        detail(
          name,
          false,
          `This task checks the rest of the page once the dark boxes are right, so it waits for ${
            !a.ok && !b.ok ? 'tasks 1 and 2' : !a.ok ? 'task 1, the late show box' : 'task 2, the footer'
          }. Finish that first.`,
          [a, b].filter((r) => !r.ok).map((r) => r.output.split('\n')[0]).join('\n')
        )
      ]
    const off = (pairs) => {
      for (const [el, want] of pairs) {
        const got = colourOf(s, el, 1024)
        if (got !== want) {
          const from = source(s, el, 1024)
          return `${describe(el)}: ${got}${from ? `\nIts colour comes from: ${line(from.winner)}` : ''}`
        }
      }
      return null
    }
    const page = off([
      [s.$('.listings h2'), INK],
      [s.$('.membership p'), INK],
      [s.$('.gift-box p'), INK],
      [s.$('.film-card h3'), INK],
      [s.$('.times'), MUTED]
    ])
    const inherited = off([
      [s.$('.notice'), ORANGE_DEEP],
      [s.$('.notice strong'), ORANGE_DEEP]
    ])
    const own = off([
      [s.$('.late-show a'), ORANGE],
      [s.$('.hero-caption'), PAPER],
      [s.$('.membership .small a'), ORANGE_DEEP],
      [s.$('.gift-box .button'), INK],
      [s.$('.signup .button'), INK]
    ])
    return [
      detail(
        'The rest of the page keeps its dark writing',
        !page,
        'Writing outside the dark boxes changed colour. The page keeps its dark ink; only the two dark boxes have light writing.',
        page ?? 'Headings, paragraphs and times as before'
      ),
      detail(
        'Writing inside the notice still takes the notice colour',
        !inherited,
        'The bold line in the notice at the top of the films is not the notice colour any more. It has no colour of its own and took it from the notice; a rule that gives every element a colour of its own stops that from reaching it.',
        inherited ?? 'The notice and its bold line are dark orange, as before'
      ),
      detail(
        'Links, buttons and the caption keep their own colours',
        !own,
        'A link, a button or the picture caption changed colour. They have colours of their own, and a grey button needs its dark writing even inside a dark box; only the writing of the dark boxes was meant to change.',
        own ?? 'The late show link, the caption, the terms link and the grey buttons, as before'
      )
    ]
  }
}
