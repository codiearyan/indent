import { clean, detail, judge, line, notLinked, openStyled } from '../../style-checks.mjs'
import { missedHint, noneYet, tracks, unknownWord, withGap } from '../../layout-checks.mjs'

const FIX = 'Put the link back in its head.'
const MIN = '200px'
const asDetail = (name, r) => detail(name, r.ok, r.message, r.output)
const px = (v) => (/^-?[\d.]+px$/.test(v ?? '') ? Number(v.slice(0, -2)) : 0)
const fr = (v) => /^\d*\.?\d+fr$/.test(v)

const LISTS = {
  classes: { selector: 'ul.classes', name: 'classes', target: 'the list of classes' },
  shelf: { selector: 'ul.shelf', name: 'shelf', target: 'the shelf' }
}

/** The list, or a detail that says why it is not on the page. */
function find(s, key) {
  const { selector, name, target } = LISTS[key]
  const el = s.page.$(selector)
  if (el) return { el }
  const section = key === 'classes' ? '#classes' : '#shop'
  const other = [...(s.page.$(section)?.closest('section')?.querySelectorAll('ul') ?? [])].find(
    (ul) => ul.querySelector('.card') || ul.querySelectorAll('h3').length > 1
  )
  return {
    missing: detail(
      `${target[0].toUpperCase()}${target.slice(1)} is on the page`,
      false,
      other
        ? `The list of cards has ${other.className ? `the class ${other.className}` : 'no class'}, not ${name}. Keep the class from the starter, spelt the same way.`
        : `The list with the class ${name} is not on the page any more. Keep the cards from the starter.`,
      other ? clean(other.outerHTML).match(/^<[^>]*>/)[0] : `No ul.${name}`
    )
  }
}

const OTHERS = (s) => ['ul.classes', 'ul.shelf', 'ul.links', 'header'].map((x) => s.page.$(x))

/** judge() for one list, with the messages for a rule on the cards or a misspelt class. */
function judgeList(s, el, key, property, ok, { what, phrase, wanted, ...options }) {
  const { target, name } = LISTS[key]
  const r = judge(s, el, property, ok, {
    target,
    what,
    ...options,
    hint: missedHint(s, el, { phrase, container: target, name, wanted, others: OTHERS(s) })
  })
  return noneYet(r, `${target[0].toUpperCase()}${target.slice(1)} has no ${what} yet.`)
}

/** Why a column size cannot be read, in words, or null. */
function unreadable(value) {
  const top = value.replace(/\([^()]*(\([^()]*\))?[^()]*\)/g, '()')
  if (top.includes(','))
    return 'Column sizes are separated by spaces, not commas, or the browser skips the line.'
  const fn = [...value.matchAll(/([a-z-]+)\s*\(/gi)].map((m) => m[1].toLowerCase())
  const odd = fn.find((f) => f !== 'repeat' && f !== 'minmax')
  if (odd) return `${odd}() is not something CSS knows in a column size. Check its spelling.`
  if (/minmax\(\s*[^,()]+\s+[^,()]+\)/i.test(value))
    return 'minmax() takes two sizes separated by a comma, or the browser skips the line.'
  if (/(^|[\s(,])\d*\.?\d+(?=[\s),]|$)/.test(value.replace(/repeat\(\s*\d+/gi, 'repeat(')))
    return 'A column size is a number with no unit after it, so the browser skips the line.'
  const t = tracks(value)
  if (!t)
    return /repeat/i.test(value)
      ? 'repeat() takes how many columns, then a comma, then the size of each. Check the word or number before the comma.'
      : 'The browser cannot read these column sizes. Check them against the lesson.'
  return null
}

/** grid-template-columns written on the rows instead, for a list with no columns. */
function rowsInstead(s, el, r) {
  const rows = s.style(el)['grid-template-rows']
  if (r.ok || s.style(el)['grid-template-columns'] || !rows) return r
  return {
    ok: false,
    message:
      'grid-template-rows sets the rows, from top to bottom. Cards side by side are in columns.',
    output: `${r.output.split('\n')[0]}\ngrid-template-rows: ${rows}`
  }
}

const display = (s, el, key) =>
  judgeList(s, el, key, 'display', (v) => v === 'grid', {
    what: 'display',
    phrase: 'display is',
    wanted: (v) => v === 'grid',
    wants: 'grid',
    wrong: unknownWord(s, 'display', (v) =>
      /flex$/.test(v)
        ? 'display: flex lines the cards up in one row, with no columns. The task asks for a grid.'
        : null
    ),
  })

/** The size of each column of the shelf, when it is as many columns as fit, else null. */
const autoTrack = (value) => {
  const t = tracks(value ?? '')
  return t?.auto ? clean(t.track.replace(/\s*,\s*/g, ', ')) : null
}

export const checks = {
  async columns(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const { el, missing } = find(s, 'classes')
    if (missing) return [missing]
    const two = (v) => {
      const list = tracks(v)?.list
      return list?.length === 2 && list[0] === list[1] && fr(list[0])
    }
    let cols = judgeList(s, el, 'classes', 'grid-template-columns', two, {
      what: 'grid-template-columns',
      phrase: 'grid-template-columns is',
      wants: 'two columns of the same width',
      wrong: (v) => {
        const problem = unreadable(v)
        if (problem) return problem
        const t = tracks(v)
        if (t.auto) return 'These columns change in number with the screen. The classes need exactly two.'
        if (t.list.length !== 2)
          return `That makes ${t.list.length === 1 ? 'one column' : `${t.list.length} columns`}. The two classes need one size for each of two columns.`
        if (t.list.some((x) => x.endsWith('%')))
          return 'Two halves in percent leave no room for the gap, so the cards would spill out of the page. The lesson shows a unit that shares out only the room that is left.'
        if (t.list.some((x) => /px$|rem$|em$/.test(x)))
          return 'Columns in a fixed length keep that width on every screen. The lesson shows a unit that shares out the room there is.'
        if (t.list[0] !== t.list[1]) return 'The two columns are not the same width.'
        return null
      }
    })
    cols = rowsInstead(s, el, cols)
    return [
      asDetail('The list of classes is a grid', display(s, el, 'classes')),
      asDetail('It has two columns of the same width', cols)
    ]
  },

  async gap(t) {
    const s = withGap(await openStyled(t))
    if (!s.linked) return [notLinked(s, FIX)]
    const out = []
    for (const key of ['classes', 'shelf']) {
      const { el, missing } = find(s, key)
      if (missing) {
        out.push(missing)
        continue
      }
      const { target } = LISTS[key]
      let r = judgeList(s, el, key, 'gap', (v) => v === '24px', {
        what: 'gap',
        phrase: 'gap is',
        wants: '24px across and down',
        length: true
      })
      const cards = [...el.children]
      const spaced = cards.find((c) =>
        ['top', 'right', 'bottom', 'left'].some((side) => px(s.style(c)[`margin-${side}`]) > 0)
      )
      if (!r.ok && spaced && !s.style(el)['column-gap'] && !s.style(el)['row-gap'])
        r = {
          ok: false,
          message:
            'That space is margin on each card. A grid puts space between its cards with gap, set once on the container, and never around the outside.',
          output: `${r.output}\n${s.decls
            .filter((d) => /^margin/.test(d.property) && s.matches(spaced, d.selector))
            .map(line)
            .join('\n')}`
        }
      else if (!r.ok && /^(normal 24px|24px normal)$/.test(s.style(el).gap))
        r = {
          ok: false,
          message: `${target[0].toUpperCase()}${target.slice(1)} has the space one way only. Dilys wants 24px across and down; one property sets both.`,
          output: r.output
        }
      out.push(
        asDetail(
          key === 'classes'
            ? 'The classes have 24px of gap between their cards'
            : 'The shelf has 24px of gap between its cards',
          r
        )
      )
    }
    return out
  },

  async shelf(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const { el, missing } = find(s, 'shelf')
    if (missing) return [missing]
    const sized = (track) => track === MIN || new RegExp(`^minmax\\(${MIN},`).test(track ?? '')
    let cols = judgeList(s, el, 'shelf', 'grid-template-columns', (v) => sized(autoTrack(v)), {
      what: 'grid-template-columns',
      phrase: 'grid-template-columns is',
      wants: 'as many 200px columns as fit, written with repeat()',
      wrong: (v) => {
        const problem = unreadable(v)
        if (problem) return problem
        const t = tracks(v)
        if (t.list)
          return /repeat/i.test(v)
            ? 'repeat() with a number always makes that many columns, however wide the screen. Dilys wants as many as fit; the lesson shows the word that counts them for you.'
            : 'That is a fixed number of columns, so a narrow screen has too many and a wide one too few. Dilys wants as many as fit, which repeat() can count for you.'
        const track = autoTrack(v)
        if (fr(track))
          return 'To count how many columns fit, the browser needs a size it can measure, such as a length. A share of the room left is not one, so the browser skips the line.'
        if (/^minmax\(/.test(track)) return null
        return `Each column is ${track} wide, not the 200px in Dilys's notes.`
      }
    })
    cols = rowsInstead(s, el, cols)
    if (!cols.ok && /^minmax\(/.test(autoTrack(s.style(el)['grid-template-columns']) ?? ''))
      cols = {
        ok: false,
        message: "The smallest size of each column is not the 200px in Dilys's notes.",
        output: cols.output
      }
    return [
      asDetail('The shelf is a grid', display(s, el, 'shelf')),
      asDetail('It has as many 200px columns as fit, written with repeat()', cols)
    ]
  },

  async minmax(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const { el, missing } = find(s, 'shelf')
    if (missing) return [missing]
    const EARLIER =
      'The shelf does not have as many columns as fit yet. That is the task before this one; do it first.'
    const parts = (v) => autoTrack(v)?.match(/^minmax\((.+), (.+)\)$/)
    let r = judgeList(
      s,
      el,
      'shelf',
      'grid-template-columns',
      (v) => parts(v)?.[1] === MIN && fr(parts(v)[2]),
      {
        what: 'grid-template-columns',
        phrase: 'grid-template-columns is',
        wants: 'columns at least 200px wide that grow to fill the row',
        wrong: (v) => {
          const problem = unreadable(v)
          if (problem) return problem
          const track = autoTrack(v)
          if (!track) return EARLIER
          const m = parts(v)
          if (!m)
            return `Each column is exactly ${track}, so the room left at the end of a row stays empty. The lesson shows how to give a column a smallest and a largest size.`
          const [, min, max] = m
          if (fr(min)) return 'minmax() takes the smallest size first, then the largest.'
          if (min !== MIN) return "The smallest size inside minmax() is not the 200px in Dilys's notes."
          return 'The largest size inside minmax() is not a share of the room that is left, so the columns do not grow to fill the row.'
        }
      }
    )
    if (!r.ok && /has no grid-template-columns( of its own)? yet/.test(r.message)) r = { ...r, message: EARLIER }
    return [asDetail('Each column is at least 200px and grows to fill the row', r)]
  }
}
