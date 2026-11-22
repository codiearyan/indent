import { broken, clean, detail, distance, judge, line, notLinked, openStyled } from '../../style-checks.mjs'
import { mediaDecls, mediaLine, nearName, noneYet, queryProblem, tracks, weight } from '../../layout-checks.mjs'

const FIX = 'Put the link back in its head.'
const PAGES = ['index.html', 'classes.html']
// Widths of our own on both sides of the 600px breakpoint, none of them on it.
const NARROW = [320, 375, 560]
const WIDE = [640, 800, 1024]
const asDetail = (name, r) => detail(name, r.ok, r.message, r.output)
const tag = (el) => clean(el.outerHTML).match(/^<[^>]*>/)[0]
const same18 = (v) => {
  const m = /^(\d*\.?\d+)(rem|em|%)$/.exec(v ?? '')
  return Boolean(m) && Number(m[1]) === (m[2] === '%' ? 112.5 : 1.125)
}

/** What is wrong with a page's viewport line, or null when it is right. */
function viewportProblem(doc, file) {
  const metas = [...doc.querySelectorAll('meta')]
  const meta = metas.find((m) => (m.getAttribute('name') ?? '').toLowerCase() === 'viewport')
  if (!meta) {
    const near = metas.find((m) => {
      const name = (m.getAttribute('name') ?? '').toLowerCase()
      return name && distance(name, 'viewport') <= 3
    })
    if (near)
      return {
        message: `${file} has a meta line named ${near.getAttribute('name')}. Check the spelling of its name against the lesson.`,
        output: tag(near)
      }
    const nameless = metas.find((m) => /width/i.test(m.getAttribute('content') ?? ''))
    if (nameless)
      return {
        message: `The meta line in ${file} has its content, but no name, so the browser does not know what it is for.`,
        output: tag(nameless)
      }
    return { message: `${file} has no viewport line yet.`, output: 'No <meta name="viewport">' }
  }
  const output = tag(meta)
  if (meta.closest('body'))
    return {
      message: `The viewport line in ${file} is in the body. Like the other meta lines, it belongs in the head.`,
      output
    }
  const content = meta.getAttribute('content') ?? ''
  if (!content.trim()) return { message: `The viewport line in ${file} has no content yet.`, output }
  if (content.includes(';'))
    return {
      message: `The parts of the content in ${file} are separated by a semicolon. In this line they are separated by commas.`,
      output
    }
  const parts = Object.fromEntries(
    content.split(',').map((p) => {
      const [key, ...rest] = p.split('=')
      return [key.trim().toLowerCase(), rest.join('=').trim().toLowerCase()]
    })
  )
  const width = parts.width
  if (width === undefined)
    return { message: `The content in ${file} does not say which width the page should be.`, output }
  if (width !== 'device-width')
    return {
      message:
        distance(width, 'device-width') <= 3
          ? `The width in ${file} is written ${width}. Check its spelling against the lesson.`
          : `The width in ${file} is not the width of the device, so phones still lay the page out for a wide screen.`,
      output
    }
  const scale = parts['initial-scale']
  if (scale === undefined)
    return {
      message: `The content in ${file} says the width, but not how far the page is zoomed when it opens.`,
      output
    }
  if (!/^\d*\.?\d+$/.test(scale) || Number(scale) !== 1)
    return {
      message: `The page in ${file} does not open at its normal size. Check the zoom in its content.`,
      output
    }
  return null
}

export const checks = {
  async viewport(t) {
    const out = []
    for (const file of PAGES) {
      const page = await t.page(file).catch(() => null)
      const name = `${file} has the viewport line in its head`
      if (!page) {
        out.push(detail(name, false, `${file} could not be opened. Keep it beside index.html.`, 'Not found'))
        continue
      }
      const problem = viewportProblem(page.document, file)
      out.push(
        detail(
          name,
          !problem,
          problem?.message,
          problem?.output ?? tag(page.document.querySelector('meta[name="viewport" i]'))
        )
      )
      page.close()
    }
    return out
  },

  async images(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const imgs = s.page.$$('img')
    if (!imgs.length)
      return [
        detail(
          'The pictures are on the page',
          false,
          'The pictures from earlier issues are not on the home page any more.',
          'No img elements'
        )
      ]
    const describe = (el) => `the picture ${el.getAttribute('src') ?? ''}`.trim()
    const capped = imgs.map((el) =>
      judge(s, el, 'max-width', (v) => v === '100%', {
        target: describe(el),
        what: 'max-width',
        wants: 'the full width of its box and no more',
        length: true,
        wrong: (v) =>
          /^[\d.]+(px|rem|em)$/.test(v)
            ? 'A max-width in a fixed length stops at that size on every screen, so a phone narrower than it still gets a picture wider than itself. A percentage follows the width of the box.'
            : null
      })
    )
    let cap = capped.find((r) => !r.ok) ?? capped[0]
    const first = imgs[capped.indexOf(cap)] ?? imgs[0]
    if (!cap.ok && s.style(first).width === '100%' && !s.style(first)['max-width'])
      cap = {
        ok: false,
        message:
          'width: 100% stretches every picture to the full width of its box, the small divider too. Kofi wants pictures that shrink when the page is narrow, but never grow past their own size.',
        output: `${cap.output.split('\n')[0]}\nwidth: 100%`
      }
    const heights = imgs.map((el) =>
      judge(s, el, 'height', (v) => v === 'auto', {
        target: describe(el),
        what: 'height',
        wants: 'a height that follows its width'
      })
    )
    let tall = heights.find((r) => !r.ok) ?? heights[0]
    if (!tall.ok && /has no height/.test(tall.message))
      tall = {
        ok: false,
        message: imgs.some((el) => el.hasAttribute('height'))
          ? 'The studio picture has a height in index.html. When max-width makes it narrower, that height stays, and the picture is squashed. Let the height follow the width.'
          : 'The pictures have no height in styles.css yet. Let each height follow its width, so a picture keeps its shape whatever its size.',
        output: tall.output.split('\n')[0]
      }
    return [
      asDetail('No picture is wider than its box', cap),
      asDetail('Each picture keeps its shape as it shrinks', tall)
    ]
  },

  async rem(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const body = s.page.$('body')
    const r = judge(s, body, 'font-size', same18, {
      target: 'the body',
      what: 'text size',
      wants: 'the same 18px, written in rem',
      length: true,
      wrong: (v) => {
        if (/^\d+,\d+/.test(v))
          return 'CSS writes a decimal with a point, not a comma, so the browser skips the line.'
        if (/px$/.test(v))
          return "The body's text size is still in px, a fixed size. Kofi's notes ask for rem, which follows the reader's own setting."
        if (/^\d*\.?\d+(rem|em|%)$/.test(v))
          return 'That is not the same size as the 18px the page has now. 1rem is usually 16px.'
        return null
      }
    })
    return [asDetail("The body's text is 18px, written in rem", r)]
  },

  async width(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const main = s.page.$('main')
    if (!main)
      return [
        detail('main can shrink', false, 'The main element is not on the page any more.', 'No main')
      ]
    const width = s.style(main).width
    const fixed = width && !/^(auto|100%)$/.test(width)
    const winner = s.decls.filter((d) => d.property === 'width' && s.matches(main, d.selector)).at(-1)
    const shrink = detail(
      'main can shrink on a narrow screen',
      !fixed,
      'main still has a width, so it stays that wide on a phone and the page runs off the edge. A size that is only an upper limit has a property of its own.',
      fixed ? `main, width: ${width}${winner ? `\n${line(winner)}` : ''}` : `main, width: ${width ?? 'not set'}`
    )
    let limit = noneYet(
      judge(s, main, 'max-width', (v) => v === '60rem', {
        target: 'the main element',
        what: 'max-width',
        wants: 'the same 960px, written in rem',
        length: true,
        wrong: (v) => {
          if (/^[\d.]+px$/.test(v))
            return "That limit is in px. Kofi's notes ask for rem, so it follows the reader's text size like the body."
          if (/^[\d.]+em$/.test(v))
            return "em on main is measured against main's own text size, which is 18px here, not 16px. rem is always measured against the page's root."
          if (/^[\d.]+rem$/.test(v)) return 'That is not the same as 960px. 1rem is usually 16px.'
          return null
        }
      }),
      'The main element has no max-width yet.'
    )
    const around = ['body', 'html'].find((x) => s.style(s.page.$(x))['max-width'])
    const forImages = (d) => s.page.$$('img').some((img) => s.matches(img, d.selector))
    if (!limit.ok && !s.style(main)['max-width'] && around)
      limit = {
        ok: false,
        message: `The max-width is on the ${around}. Kofi's notes ask for it on main, the box that holds the page's content.`,
        output: `${limit.output.split('\n')[0]}\n${around}, max-width: ${s.style(s.page.$(around))['max-width']}`
      }
    else if (
      !limit.ok &&
      /selector does not pick/.test(limit.message) &&
      s.decls.every((d) => d.property !== 'max-width' || forImages(d))
    )
      limit = {
        ok: false,
        message: 'The main element has no max-width yet.',
        output: limit.output.split('\n')[0]
      }
    return [shrink, asDetail('main is no wider than 960px, written in rem', limit)]
  },

  async phone(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const el = s.page.$('ul.classes')
    const name = 'The classes are in one column on a phone, and two on a wider screen'
    if (!el)
      return [
        detail(
          name,
          false,
          'The list with the class classes is not on the page any more. Keep the cards from the starter.',
          'No ul.classes'
        )
      ]
    // The page's own copy of styles.css; "only screen" means the same as "screen" to a browser.
    for (const style of s.page.$$('style'))
      style.textContent = style.textContent.replace(/@media\s+only\s+/gi, '@media ')
    const at = (width) => {
      const st = s.page.style(el, { width })
      const list = tracks(st['grid-template-columns'] ?? '')?.list
      const kind =
        st.display !== 'grid'
          ? `display: ${st.display ?? 'not set'}`
          : list?.length === 1
            ? 'one column'
            : list?.length === 2 && list[0] === list[1]
              ? 'two columns'
              : `columns: ${st['grid-template-columns'] ?? 'not set'}`
      return { width, kind }
    }
    const narrow = NARROW.map(at)
    const wide = WIDE.map(at)
    const output = [...narrow, ...wide].map((r) => `${r.width}px wide: ${r.kind}`).join('\n')
    const fail = (message, more = '') => [detail(name, false, message, more ? `${output}\n${more}` : output)]
    const all = mediaDecls(s.css)
    // The page's style() reads some queries a browser ignores, so those are judged first.
    for (const query of new Set(all.flatMap((d) => d.media))) {
      const problem = queryProblem(query)
      if (problem) return [detail(name, false, problem, `@media ${query}`)]
    }
    if (narrow.every((r) => r.kind === 'one column') && wide.every((r) => r.kind === 'two columns'))
      return [detail(name, true, undefined, output)]
    const fault = broken(s, ['grid-template-columns', 'display'])
    if (fault) return fail(fault.message, fault.output)
    const inMedia = all.filter((d) => d.media.length)
    const forClasses = inMedia.filter(
      (d) => d.property === 'grid-template-columns' && d.selectors.some((x) => s.matches(el, x))
    )
    const blockNarrow = narrow.find((r) => r.kind === 'display: block')
    if (blockNarrow)
      return fail(
        'With display: block the cards stack, but the grid and its gap are gone, so the cards touch. Keep the grid and change its columns.'
      )
    if (wide.some((r) => r.kind !== 'two columns')) {
      if (wide.every((r) => r.kind === 'one column') && narrow.every((r) => r.kind === 'one column'))
        return fail(
          'The classes are in one column at every width, a wide screen too. The one-column rule should apply only to narrow screens, inside a media query.'
        )
      if (wide.some((r) => r.kind === 'one column') && narrow.every((r) => r.kind === 'two columns'))
        return fail(
          'One column on a wide screen and two on a phone: the media query is the wrong way round. Look at whether it asks for a smallest or a largest width.'
        )
      if (wide[0].kind === 'one column')
        return fail(
          "On a screen a little wider than Kofi's breakpoint the classes are already in one column. Check the width in the media query against his notes."
        )
      return fail('On a wide screen the classes should still be in their two columns from the last issue.')
    }
    if (narrow.every((r) => r.kind === 'two columns')) {
      if (!inMedia.length)
        return fail('On a phone the classes are still side by side. There is no media query yet.')
      if (forClasses.length) {
        const index = (d) => all.indexOf(d)
        const later = all.find(
          (d) =>
            !d.media.length &&
            d.property === 'grid-template-columns' &&
            d.selectors.some((x) => s.matches(el, x)) &&
            index(d) > index(forClasses.at(-1))
        )
        if (later)
          return fail(
            'The rule in the media query comes before the rule that gives the classes two columns, so that later rule wins at every width. A media query adds no weight; it has to come after.',
            `${mediaLine(forClasses.at(-1))}\nLater: ${line(later)}`
          )
      }
      const near = nearName(inMedia, 'classes')
      if (near)
        return fail(
          `The selector ${near.written} inside the media query does not match the class on the list, which is classes. Check its spelling.`,
          mediaLine(near.decl)
        )
      const misspelt = inMedia.find(
        (d) => !s.known(d.property) && distance(d.property, 'grid-template-columns') <= 3
      )
      if (misspelt)
        return fail(
          `${misspelt.property} is not a property CSS knows, so the browser skips that line. Check its spelling.`,
          mediaLine(misspelt)
        )
      if (!forClasses.length)
        return fail(
          'There is a media query, but nothing inside it changes the columns of the list of classes.',
          inMedia.map(mediaLine).join('\n')
        )
      const last = forClasses.at(-1)
      if (tracks(last.value)?.list?.length === 2)
        return fail(
          'The last rule for the classes inside a media query still gives them two columns. On a phone they need one.',
          mediaLine(last)
        )
      const strength = (d) => Math.max(...d.selectors.filter((x) => s.matches(el, x)).map(weight))
      const stronger = all.find(
        (d) =>
          !d.media.length &&
          d.property === 'grid-template-columns' &&
          d.selectors.some((x) => s.matches(el, x)) &&
          strength(d) > strength(last)
      )
      if (stronger)
        return fail(
          'The selector inside the media query is weaker than the one in the rule that gives the classes two columns, so that rule wins at every width. A media query adds no weight; use a selector at least as strong.',
          `${mediaLine(last)}\nStronger: ${line(stronger)}`
        )
      return fail(
        'The media query does not apply on a phone. Check the width in it against Kofi\'s notes, and whether it asks for a smallest or a largest width.',
        forClasses.map(mediaLine).join('\n')
      )
    }
    if (narrow.some((r) => r.kind === 'two columns'))
      return fail(
        "The classes go to one column only on the narrowest screens. Check the width in the media query against Kofi's notes."
      )
    const notGrid = narrow.find((r) => r.kind.startsWith('display:'))
    if (notGrid)
      return fail(
        `On a phone the list of classes is not a grid any more (${notGrid.kind}). Keep the grid from the last issue and give it one column.`
      )
    return fail(
      'On a phone the classes have columns, but not one column.',
      forClasses.map(mediaLine).join('\n')
    )
  }
}
