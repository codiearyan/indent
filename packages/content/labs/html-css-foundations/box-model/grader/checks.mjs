import { clean, detail, judge, line, notLinked, openStyled } from '../../style-checks.mjs'

const CLAY = 'rgb(164, 73, 42)'
const FIX = 'Put the link back in its head.'
const SIDES = ['top', 'right', 'bottom', 'left']
const EVERY =
  'html, body, header, nav, main, section, footer, h1, h2, p, a, ul, li, img, figure, figcaption, strong'

const px = (v) =>
  v === '0' || v === '0px' ? 0 : /^-?[\d.]+px$/.test(v ?? '') ? Number(v.slice(0, -2)) : null
const first = (results) => results.find((r) => !r.ok) ?? results[0]
const asDetail = (name, r) => detail(name, r.ok, r.message, r.output)
const describe = (el) => {
  const text = clean(el.textContent)
  return `<${el.tagName.toLowerCase()}> ${text.length > 30 ? `${text.slice(0, 30)}...` : text}`
}

function notes(s) {
  const found = s.page.$$('.note')
  if (found.length) return found
  return null
}

const noNotes = () =>
  detail(
    'The notes are on the page',
    false,
    'No element has the class note any more. The two notes from an earlier issue should still have it.',
    'No .note elements'
  )

export const checks = {
  async padding(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const list = notes(s)
    if (!list) return [noNotes()]
    const options = {
      target: 'the note',
      what: 'padding',
      wants: '12px on every side',
      length: true
    }
    const results = list.flatMap((el) =>
      SIDES.map((side) =>
        judge(s, el, `padding-${side}`, (v) => v === '12px', {
          ...options,
          what: `${side} padding`
        })
      )
    )
    let inside = first(results)
    const margin = s.decls.find(
      (d) => /^margin/.test(d.property) && d.selectors.some((x) => s.matches(list[0], x))
    )
    if (
      !inside.ok &&
      margin &&
      !s.decls.some(
        (d) => /^padding/.test(d.property) && d.selectors.some((x) => s.matches(list[0], x))
      )
    )
      inside = {
        ok: false,
        message:
          "That space is margin, outside the note's background. The space inside, between the words and the edge of the sand, is padding.",
        output: `${inside.output}\n${line(margin)}`
      }
    const anyPadding = s.decls.some((d) => /^padding/.test(d.property))
    if (!inside.ok && inside.message.endsWith('yet.') && !margin && !anyPadding && !s.inline.length)
      inside = { ok: false, message: 'The notes have no padding yet.', output: inside.output }
    const others = s.page
      .$$('p, li')
      .filter(
        (el) =>
          !el.classList.contains('note') &&
          SIDES.some((side) => px(s.style(el)[`padding-${side}`]) > 0)
      )
    return [
      asDetail('The notes have 12px of padding on every side', inside),
      detail(
        'Only the notes get it',
        others.length === 0,
        'Other paragraphs got padding too. The rule for the notes picks them by their class.',
        others.length ? others.slice(0, 4).map(describe).join('\n') : 'Only the notes have padding'
      )
    ]
  },

  async border(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const list = notes(s)
    if (!list) return [noNotes()]
    const options = { target: 'the note', length: true }
    const results = list.flatMap((el) => [
      judge(s, el, 'border-left-width', (v) => v === '4px', {
        ...options,
        what: 'left border width',
        wants: '4px'
      }),
      judge(s, el, 'border-left-style', (v) => v === 'solid', {
        ...options,
        what: 'left border style',
        wants: 'solid'
      }),
      judge(s, el, 'border-left-color', (v) => v === CLAY, {
        ...options,
        what: 'left border colour',
        wants: 'clay'
      })
    ])
    let left = first(results)
    const coded = s.decls.find(
      (d) =>
        /^border(-left)?(-color)?$/.test(d.property) &&
        d.selectors.some((x) => s.matches(list[0], x)) &&
        /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(/i.test(d.value)
    )
    if (left.ok && coded)
      left = {
        ok: false,
        message:
          'The clay is written as a code here. Use its name from the last issue with var(), so the code stays in one place, on :root.',
        output: `${left.output}\n${line(coded)}`
      }
    const style = s.style(list[0])['border-left-style']
    if (
      !left.ok &&
      (!style || style === 'none') &&
      results.filter((r) => !r.ok).every((r) => r.output.includes('left border style'))
    )
      left = {
        ok: false,
        message:
          'The line has a width and a colour but no style, and a border without a style does not show. Add solid.',
        output: left.output
      }
    if (
      !left.ok &&
      left.message.endsWith('yet.') &&
      !s.decls.some((d) => /^border/.test(d.property)) &&
      !s.inline.length
    )
      left = { ok: false, message: 'The notes have no border yet.', output: left.output }
    const around = list.flatMap((el) =>
      ['top', 'right', 'bottom'].filter((side) => {
        const st = s.style(el)
        return (
          st[`border-${side}-style`] &&
          st[`border-${side}-style`] !== 'none' &&
          px(st[`border-${side}-width`]) !== 0
        )
      })
    )
    return [
      asDetail('Each note has a 4px solid clay line on its left', left),
      detail(
        'The other sides have no line',
        around.length === 0,
        'The note has a line on other sides too. Dilys wants it down the left side only.',
        around.length
          ? `Lines on: ${[...new Set(around)].join(', ')}`
          : 'Only the left side has a line'
      )
    ]
  },

  async margin(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const sections = s.page.$$('main section')
    if (!sections.length)
      return [
        detail(
          'Each section has 48px of margin below',
          false,
          'The sections from the first part of this repo are not on the page any more.',
          'No sections in main'
        )
      ]
    const results = sections.map((el) =>
      judge(s, el, 'margin-bottom', (v) => v === '48px', {
        target: 'the section',
        what: 'margin below',
        wants: '48px',
        length: true
      })
    )
    let below = first(results)
    const st = s.style(sections[0])
    if (!below.ok && st['padding-bottom'] === '48px')
      below = {
        ok: false,
        message: 'That space is padding, inside each section. Space between two boxes is margin.',
        output: below.output
      }
    else if (!below.ok && st['margin-top'] === '48px')
      below = {
        ok: false,
        message: 'The space is above each section. Dilys asked for it below each one.',
        output: below.output
      }
    return [asDetail('Each section has 48px of margin below', below)]
  },

  async 'box-sizing'(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const sizing = (el) => {
      const v = el ? s.style(el)['box-sizing'] : undefined
      return v === 'inherit' ? sizing(el.parentElement) : v
    }
    const all = s.page.$$(EVERY)
    const off = all.filter((el) => sizing(el) !== 'border-box')
    const on = all.length - off.length
    let r = off.length
      ? judge(
          s,
          off[0],
          'box-sizing',
          (v) => v === 'border-box' || (v === 'inherit' && sizing(off[0]) === 'border-box'),
          {
            target: `the ${describe(off[0]).split(' ')[0]} element`,
            what: 'box-sizing',
            wants: 'the value that counts padding and border in the size'
          }
        )
      : { ok: true, output: `All ${all.length} elements: border-box` }
    if (
      off.length &&
      r.message.endsWith('yet.') &&
      !s.decls.some((d) => d.property === 'box-sizing') &&
      !s.inline.length
    )
      r = {
        ok: false,
        message:
          'No element sets box-sizing yet, so each one still counts only its content in its size.',
        output: `border-box: none of ${all.length} elements`
      }
    else if (off.length && on > 0)
      r = {
        ok: false,
        message:
          'Only some elements count their padding and border. box-sizing is not passed down, so the rule has to pick every element.',
        output: `border-box: ${on} of ${all.length}; not yet: ${off
          .slice(0, 4)
          .map((el) => `<${el.tagName.toLowerCase()}>`)
          .join(', ')}${off.length > 4 ? '...' : ''}`
      }
    return [asDetail('Every element counts its padding and border in its size', r)]
  }
}
