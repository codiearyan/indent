import { clean, detail, judge, line, notLinked, openStyled } from '../../style-checks.mjs'
import { nearName, onChildren, unknownWord, withGap } from '../../layout-checks.mjs'

const FIX = 'Put the link back in its head.'
const asDetail = (name, r) => detail(name, r.ok, r.message, r.output)
const px = (v) => (/^-?[\d.]+px$/.test(v ?? '') ? Number(v.slice(0, -2)) : 0)
const TEXT_ALIGN =
  'text-align lines up the words inside each box, not the boxes themselves. In a flex container, the boxes are lined up with the properties from the lesson.'

/** The list of links, or a detail that says why it is not on the page. */
function links(s) {
  const ul = s.page.$('nav ul.links') ?? s.page.$('ul.links')
  if (ul) return { ul }
  const other = s.page.$('nav ul')
  return {
    missing: detail(
      'The list of links is on the page',
      false,
      other
        ? `The list in the nav has ${other.className ? `the class ${other.className}` : 'no class'}, not links. Keep the class from the starter, spelt the same way.`
        : 'The list of links in the nav is not on the page any more. Keep the list from the starter.',
      other ? clean(other.outerHTML).match(/^<[^>]*>/)[0] : 'No list in the nav'
    )
  }
}

/** A message for a rule that picks the list's items, or a misspelt class, instead of the list. */
function listHint(s, ul, what, wanted) {
  return (away) => {
    if (onChildren(s, ul, away.filter((d) => wanted(s.norm(d.property, d.value)))).length)
      return `The ${what} is set on each link inside the list. It belongs on the flex container, the list that holds them, and the browser applies it to the items inside.`
    const near = nearName(away, 'links')
    if (near)
      return `The selector ${near.written} does not match the class on the list, which is links. Check its spelling.`
    return null
  }
}

/** A rule for the header that picks its h1 or nav instead. */
function headerHint(s, header, what, wanted) {
  return (away) => {
    if (onChildren(s, header, away.filter((d) => wanted(s.norm(d.property, d.value))), true).length)
      return `The ${what} is set on what is inside the header. It belongs on the flex container, the header, and the browser applies it to the name and the nav inside.`
    // A rule for the list of links belongs to another task; it says nothing about the header.
    if (onChildren(s, header, away).length === away.length) return `The header has no ${what} yet.`
    return null
  }
}

export const checks = {
  async row(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const { ul, missing } = links(s)
    if (missing) return [missing]
    const nav = ul.closest('nav')
    let r = judge(s, ul, 'display', (v) => v === 'flex', {
      target: 'the list of links',
      what: 'display',
      wants: 'flex',
      wrong: unknownWord(s, 'display', (v) =>
        /^(inline-flex|grid|inline)$/.test(v)
          ? `display: ${v} is a different kind of box. The task asks for a flex container.`
          : null
      ),
      hint: listHint(s, ul, 'display', (v) => v === 'flex')
    })
    if (!r.ok && nav && s.style(nav).display === 'flex' && r.message.endsWith('around it.'))
      r = {
        ok: false,
        message:
          'The nav is a flex container, so its one child, the list, is the item that gets lined up. The links are inside the list, so the list is the container they need.',
        output: r.output
      }
    const details = [asDetail('The list of links is a flex container', r)]
    if (r.ok) {
      const dir = s.style(ul)['flex-direction'] ?? 'row'
      details.push(
        detail(
          'The links run from left to right',
          dir === 'row',
          dir === 'row-reverse'
            ? 'The links run in a row, but from right to left, so Book a class comes first.'
            : 'The links are lined up from top to bottom. Kofi wants them side by side; look at the direction of the list.',
          `The list of links, flex-direction: ${dir === 'row' && !s.style(ul)['flex-direction'] ? 'row (the default)' : dir}`
        )
      )
    }
    return details
  },

  async gap(t) {
    const s = withGap(await openStyled(t))
    if (!s.linked) return [notLinked(s, FIX)]
    const { ul, missing } = links(s)
    if (missing) return [missing]
    const st = s.style(ul)
    const items = [...ul.querySelectorAll('li, a')]
    const spaced = items.find((el) => {
      const own = s.style(el)
      return ['left', 'right'].some((side) => px(own[`margin-${side}`]) > 0 || px(own[`padding-${side}`]) > 0)
    })
    let r = judge(s, ul, 'gap', (v) => v === '24px', {
      target: 'the list of links',
      what: 'gap',
      wants: '24px between the links and between rows',
      length: true,
      hint: listHint(s, ul, 'gap', () => true)
    })
    if (!r.ok && spaced && !st['column-gap'] && !s.decls.some((d) => /gap$/.test(d.property)))
      r = {
        ok: false,
        message:
          'That space is margin or padding on each link. A flex container puts space between its items with gap, set once on the container.',
        output: `${r.output}\n${s.decls
          .filter((d) => /^(margin|padding)/.test(d.property) && items.some((el) => s.matches(el, d.selector)))
          .map(line)
          .join('\n')}`
      }
    else if (!r.ok && st['column-gap'] === '24px' && !st['row-gap'])
      r = {
        ok: false,
        message:
          'The links are 24px apart along the row, but once they wrap the rows would touch. Kofi wants the same space between rows; one property sets both.',
        output: r.output
      }
    return [asDetail('The links have 24px of gap between them', r)]
  },

  async header(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const header = s.page.$('body > header') ?? s.page.$('header')
    if (!header)
      return [
        detail(
          'The header is on the page',
          false,
          'The header from an earlier issue is not on the page any more. Keep it as it was.',
          'No header element'
        )
      ]
    const target = 'the header'
    const display = judge(s, header, 'display', (v) => v === 'flex', {
      target,
      what: 'display',
      wants: 'flex',
      wrong: unknownWord(s, 'display'),
      hint: headerHint(s, header, 'display', (v) => v === 'flex')
    })
    const direction = judge(s, header, 'flex-direction', (v) => v === 'column', {
      target,
      what: 'direction',
      wants: 'a column, top to bottom',
      wrong: unknownWord(s, 'flex-direction', (v) =>
        v === 'row' || v === 'row-reverse'
          ? 'The header runs in a row, so the name and the links sit side by side. Kofi wants the name on top.'
          : v === 'column-reverse'
            ? 'The header runs from the bottom up, so the links come before the name. Kofi wants the name on top.'
            : null
      ),
      hint: headerHint(s, header, 'direction', (v) => /column/.test(v))
    })
    let middle = judge(s, header, 'align-items', (v) => v === 'center', {
      target,
      what: 'alignment across',
      wants: 'the middle',
      wrong: unknownWord(s, 'align-items'),
      hint: headerHint(s, header, 'alignment', (v) => v === 'center')
    })
    const st = s.style(header)
    if (!middle.ok && !st['align-items'] && st['justify-content'] === 'center')
      middle = {
        ok: false,
        message:
          'In a column, justify-content works from top to bottom, along the column. Centring from side to side is across the direction, which is a different property.',
        output: `${middle.output}\nThe header, justify-content: center`
      }
    else if (!middle.ok && !st['align-items'] && st['text-align'] === 'center')
      middle = { ok: false, message: TEXT_ALIGN, output: `${middle.output}\nThe header, text-align: center` }
    for (const r of [display, direction, middle])
      if (r.message?.startsWith('The header has no')) r.output = r.output.split('\n')[0]
    return [
      asDetail('The header is a flex container', display),
      asDetail('The name sits above the links', direction),
      asDetail('The name and the links sit in the middle', middle)
    ]
  },

  async wrap(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const { ul, missing } = links(s)
    if (missing) return [missing]
    const target = 'the list of links'
    const wraps = judge(s, ul, 'flex-wrap', (v) => v === 'wrap', {
      target,
      what: 'wrapping',
      wants: 'wrap',
      wrong: unknownWord(s, 'flex-wrap', (v) =>
        v === 'nowrap' ? 'nowrap keeps every link on one line, however narrow the window.' : null
      ),
      hint: listHint(s, ul, 'wrapping', (v) => /wrap/.test(v))
    })
    let middle = judge(s, ul, 'justify-content', (v) => v === 'center', {
      target,
      what: 'alignment along the row',
      wants: 'the middle',
      wrong: unknownWord(s, 'justify-content'),
      hint: listHint(s, ul, 'alignment', (v) => v === 'center')
    })
    const st = s.style(ul)
    if (!middle.ok && !st['justify-content'] && st['align-items'] === 'center')
      middle = {
        ok: false,
        message:
          'In a row, align-items lines the links up from top to bottom, across the row. Lining them up along the row is a different property.',
        output: `${middle.output}\nThe list of links, align-items: center`
      }
    else if (!middle.ok && !st['justify-content'] && st['text-align'] === 'center')
      middle = { ok: false, message: TEXT_ALIGN, output: `${middle.output}\nThe list of links, text-align: center` }
    return [
      asDetail('The links wrap onto a new line when there is no room', wraps),
      asDetail('Each line of links sits in the middle', middle)
    ]
  }
}
