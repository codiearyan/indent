import { cascade, clean, detail, gate, line, openSite } from '../../site-checks.mjs'

const WIDTHS = [360, 1024]
const POSITIONED = /^(relative|absolute|fixed|sticky)$/

const name = (el) =>
  `<${el.tagName.toLowerCase()}${el.className ? ` class="${clean(el.className)}"` : ''}>`

/**
 * What the CSS that applies to an element says about stacking: whether it is positioned, its
 * z-index when one counts, and why it makes a stacking context of its own, if it does.
 */
function layerOf(s, el, width) {
  const st = s.style(el, width)
  const position = st.position ?? 'static'
  const positioned = POSITIONED.test(position)
  const parent = el.parentElement && s.style(el.parentElement, width)
  const item = /flex|grid/.test(parent?.display ?? '')
  const raw = st['z-index']
  const z = raw && raw !== 'auto' && (positioned || item) ? Number(raw) : null
  let context = null
  if (el === el.ownerDocument.documentElement) context = 'the page itself'
  else if (positioned && z !== null) context = `position ${position} with a z-index of ${z}`
  else if (/^(fixed|sticky)$/.test(position)) context = `position ${position}`
  else if (item && z !== null) context = `a z-index of ${z} on a ${parent.display} item`
  else if (st.opacity && Number(st.opacity) < 1) context = `opacity ${st.opacity}`
  else if (st.transform && st.transform !== 'none') context = `transform ${st.transform}`
  else if (st.filter && st.filter !== 'none') context = `filter ${st.filter}`
  else if (st.isolation === 'isolate') context = 'isolation isolate'
  return { el, positioned, z, context, position }
}

/** Where a layer is painted among its neighbours: lower numbers first. */
const rank = (l) => {
  if (!l.context && !l.positioned) return [1, 0]
  const z = l.z ?? 0
  return z < 0 ? [0, z] : z === 0 ? [2, 0] : [3, z]
}

/**
 * Whether `a` is painted above `b`, from the stacking rules: find the nearest stacking context
 * both are inside, then compare what stands for each of them there.
 */
function stacking(s, a, b, width) {
  const chain = (el) => {
    const list = []
    for (let x = el; x; x = x.parentElement) list.unshift(x)
    return list
  }
  const ca = chain(a)
  const cb = chain(b)
  let common = 0
  while (ca[common] && ca[common] === cb[common]) common++
  let c = common - 1
  while (c > 0 && !layerOf(s, ca[c], width).context) c--
  const standIn = (path) => {
    const below = path.slice(c + 1).map((el) => layerOf(s, el, width))
    return (
      below.find((l) => l.context) ??
      [...below].reverse().find((l) => l.positioned) ??
      below.at(-1)
    )
  }
  const pa = standIn(ca)
  const pb = standIn(cb)
  const [ra, rb] = [rank(pa), rank(pb)]
  let above
  if (ra[0] !== rb[0]) above = ra[0] > rb[0]
  else if (ra[1] !== rb[1]) above = ra[1] > rb[1]
  else {
    const [x, y] = pa.el === pb.el ? [a, b] : [pa.el, pb.el]
    above = Boolean(y.compareDocumentPosition(x) & 4)
  }
  return { above, pa, pb, own: layerOf(s, a, width) }
}

/** The element a positioned box is placed against. */
function containingBlock(s, el, width) {
  const { position } = layerOf(s, el, width)
  if (position === 'fixed') return null
  if (position !== 'absolute') return el.parentElement
  for (let up = el.parentElement; up; up = up.parentElement) {
    const st = s.style(up, width)
    if (POSITIONED.test(st.position ?? 'static') || (st.transform && st.transform !== 'none')) return up
  }
  return null
}

/** The element around `el` whose overflow cuts it off, or null. */
function clippedBy(s, el, width) {
  const block = containingBlock(s, el, width)
  for (let up = el.parentElement; up; up = up.parentElement) {
    const st = s.style(up, width)
    const value = ['overflow', 'overflow-x', 'overflow-y'].map((p) => st[p]).find((v) => v && v !== 'visible')
    if (value && (block === null ? false : up === block || up.contains(block))) return { el: up, value }
  }
  return null
}

const rankWords = (l) =>
  !l.context && !l.positioned
    ? 'not positioned, so it is painted under everything that is'
    : l.z === null || l.z === 0
      ? 'positioned, on the layer with no z-index'
      : `on z-index ${l.z}`

/** Whether the open panel `panel` is on top of every element in `below`, at every width. */
function onTop(s, panel, below, what, under) {
  for (const width of WIDTHS) {
    if (s.style(panel, width).display === 'none')
      return { ok: false, message: `${what} is hidden when it is open.`, output: `${name(panel)}: display none` }
    const cut = clippedBy(s, panel, width)
    if (cut)
      return {
        ok: false,
        message: `${what} is cut off: ${name(cut.el)} has overflow ${cut.value}, which clips whatever sticks out of it, and ${what} sticks out of it on purpose.`,
        output: `${name(cut.el)}: overflow ${cut.value}`
      }
    for (const other of below) {
      const r = stacking(s, panel, other, width)
      if (r.above) continue
      const zLine = cascade(s, panel, 'z-index', width).at(-1)
      const output = [
        `${what}: ${name(panel)}${r.own.z !== null ? `, z-index ${r.own.z}` : ''}${zLine ? `\n  from ${line(zLine)}` : ''}`,
        `Stands for it on the page: ${name(r.pa.el)}, ${r.pa.context ?? (r.pa.positioned ? 'positioned' : 'not positioned')}`,
        `Stands for ${under}: ${name(r.pb.el)}, ${r.pb.context ?? (r.pb.positioned ? 'positioned' : 'not positioned')}`
      ].join('\n')
      const tie = rank(r.pa).join() === rank(r.pb).join()
      const theirs = `${label(r.pb.el, panel)}, which is ${rankWords(r.pb)}${tie ? ', the same layer, and comes later in the page' : ''}`
      if (r.pa.el !== panel)
        return {
          ok: false,
          message: `${what} opens behind ${under}. Its z-index only counts among the elements inside ${label(r.pa.el, panel)}, which makes a stacking context of its own (${r.pa.context}). On the page it is that whole layer that is compared with ${theirs}, so ${label(r.pb.el, panel)} wins. No z-index on ${what} can get it out of that layer.`,
          output
        }
      return {
        ok: false,
        message: `${what} opens behind ${under}. ${cap(what)} is ${rankWords(r.pa)}, and it is compared with ${theirs}.`,
        output
      }
    }
  }
  return { ok: true, output: `${what}: on top of ${under}, phone and wide screen` }
}
const cap = (text) => text[0].toUpperCase() + text.slice(1)
const label = (el, panel) =>
  el.matches('.film-card') ? (el.contains(panel) ? 'its own card' : 'a later card') : name(el)

function menu(s) {
  s.$('.nav-menu').setAttribute('open', '')
  return onTop(s, s.$('.menu-panel'), [s.$('.hero')], 'the Visit menu', 'the big picture')
}

function seatGuide(s) {
  const cards = s.$$('.film-card')
  const guide = cards[0].querySelector('.seat-guide')
  guide.setAttribute('open', '')
  guide.querySelector('summary').focus()
  return onTop(s, guide.querySelector('.seat-panel'), cards.slice(1), 'the open seat guide', 'the cards after it')
}

const asDetail = (title, r) => detail(title, r.ok, r.message && cap(r.message), r.output)

export const checks = {
  async 'visit-menu'(t) {
    const s = await openSite(t)
    const title = 'The Visit menu opens on top of the picture'
    return gate(s, title) ?? [asDetail(title, menu(s))]
  },

  async 'seat-guide'(t) {
    const s = await openSite(t)
    const title = 'An open seat guide sits on top of the cards below it'
    return gate(s, title) ?? [asDetail(title, seatGuide(s))]
  },

  async 'still-in-place'(t) {
    const s = await openSite(t)
    const title = 'The header, the caption and the badges stay where they were'
    const stop = gate(s, title)
    if (stop) return stop
    const a = menu(s)
    const b = seatGuide(s)
    if (!a.ok || !b.ok)
      return [
        detail(
          title,
          false,
          `This task checks what the fix may have moved, so it waits for ${
            !a.ok && !b.ok ? 'tasks 1 and 2' : !a.ok ? 'task 1, the Visit menu' : 'task 2, the seat guide'
          }. Finish that first.`,
          [a, b].filter((r) => !r.ok).map((r) => r.output.split('\n')[0]).join('\n')
        )
      ]
    const header = s.$('.site-header')
    const hero = s.$('.hero')
    const caption = s.$('.hero-caption')
    const hs = s.style(header)
    const sticky = hs.position === 'sticky' && hs.top === '0px'
    const overHero = WIDTHS.every((w) => stacking(s, header, hero, w).above)
    const captionOk = WIDTHS.every(
      (w) => containingBlock(s, caption, w) === hero && stacking(s, caption, hero.querySelector('img'), w).above
    )
    const badges = s.$$('.badge')
    const lost = badges.find((badge) => WIDTHS.some((w) => containingBlock(s, badge, w) !== badge.closest('.film-card')))
    return [
      detail(
        'The header stays at the top, above the page, while it scrolls',
        sticky && overHero,
        sticky
          ? 'The header still sticks to the top, but the page now scrolls over it: something below it is painted above it.'
          : 'The header no longer stays at the top of the screen while the page scrolls. Its position is what kept it there, and it also gave it a stacking context; the menu needed a different fix.',
        `Header: position ${hs.position ?? 'static'}, top ${hs.top ?? 'not set'}, z-index ${hs['z-index'] ?? 'auto'}`
      ),
      detail(
        'The caption stays on the picture',
        captionOk,
        'The caption on the big picture is no longer placed against the picture, or no longer above it. The caption is positioned against the nearest positioned element around it, and the picture was that element.',
        `Caption placed against: ${name(containingBlock(s, caption, 1024) ?? s.page.document.documentElement)}`
      ),
      detail(
        'The badges stay on the corner of their card',
        !lost,
        'A badge such as Live piano is no longer placed against its film card. It is positioned against the nearest positioned element around it, and the card was that element.',
        lost
          ? `Badge placed against: ${name(containingBlock(s, lost, 1024) ?? s.page.document.documentElement)}`
          : 'Every badge on the corner of its card'
      )
    ]
  }
}
