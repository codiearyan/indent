import {
  detail,
  distance,
  judged,
  namedColour,
  notLinked,
  openStyled,
  read
} from '../../style-checks.mjs'

const CREAM = 'rgb(247, 241, 232)'
const INK = 'rgb(59, 47, 42)'
const FIX = 'Link it in the first task, then come back to this one.'

const colourWrong = (value) =>
  namedColour(value)
    ? "That is a named colour. Dilys's notes give a code for this one; use her code."
    : null

/** What is wrong with the stylesheet link of one page, or null. */
async function linkProblem(t, file) {
  const source = await read(t, file)
  const page = await t.page(file)
  const doc = new page.window.DOMParser().parseFromString(source ?? '', 'text/html')
  const script = [...doc.querySelectorAll('script[src], style[src], style[href]')].find((el) =>
    /\.css$/i.test(el.getAttribute('src') ?? el.getAttribute('href') ?? '')
  )
  const links = [...doc.querySelectorAll('link')]
  const link =
    links.find((l) => /stylesheet/i.test(l.getAttribute('rel') ?? '')) ??
    links.find((l) => /\.css/i.test(l.getAttribute('href') ?? ''))
  const tag = (el) => el.outerHTML.replace(/\s+/g, ' ')
  if (!link && script)
    return {
      message: `${file} loads the stylesheet with a <${script.tagName.toLowerCase()}> tag. A stylesheet is linked with the link element.`,
      output: tag(script)
    }
  if (!link)
    return {
      message: `${file} has no link to a stylesheet yet. Add one in its head.`,
      output: 'No link element'
    }
  const href = link.getAttribute('href') ?? ''
  const path = href ? new URL(href, `http://page/${file}`).pathname : ''
  if (path !== '/styles.css')
    return {
      message: href
        ? `The link in ${file} points at ${href}, but the file is called styles.css and sits next to the page. The address must match the file's name exactly.`
        : `The link in ${file} has no address. Its href names the file to load.`,
      output: tag(link)
    }
  if (!/(^|\s)stylesheet(\s|$)/i.test(link.getAttribute('rel') ?? ''))
    return {
      message: `The link in ${file} does not say the file is a stylesheet, so the browser does not use it for styles. Look at its rel.`,
      output: tag(link)
    }
  if (!link.closest('head'))
    return {
      message: `The link in ${file} is in the body. It goes in the head, with the other things about the page.`,
      output: tag(link)
    }
  return null
}

export const checks = {
  async link(t) {
    const details = []
    for (const file of ['index.html', 'classes.html']) {
      const problem = await linkProblem(t, file)
      details.push(
        detail(
          `${file} links styles.css from its head`,
          !problem,
          problem?.message,
          problem?.output ?? 'Linked from the head'
        )
      )
    }
    return details
  },

  async colours(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const body = s.page.$('body')
    return [
      judged('The body has the cream background', s, body, 'background-color', (v) => v === CREAM, {
        target: 'the body',
        what: 'background colour',
        wants: "Dilys's cream",
        wrong: colourWrong
      }),
      judged('The body has the dark brown text', s, body, 'color', (v) => v === INK, {
        target: 'the body',
        what: 'text colour',
        wants: "Dilys's dark brown",
        wrong: colourWrong
      })
    ]
  },

  async font(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const body = s.page.$('body')
    const families = (value) =>
      value.split(',').map((f) =>
        f
          .trim()
          .replace(/^["']|["']$/g, '')
          .toLowerCase()
      )
    const familyWrong = (value) => {
      const list = families(value)
      if (list.length === 1 && /georgia\s+serif/.test(list[0]))
        return 'The two fonts are not separated, so the browser reads them as one font name. Put a comma between them.'
      if (!list.includes('georgia') && distance(list[0], 'georgia') <= 3)
        return "The first font is not spelt the way Dilys's notes spell it. Keep the font's name exactly as she wrote it."
      if (list[0] !== 'georgia')
        return 'Georgia comes first, so the browser uses it whenever the computer has it.'
      if (list.length === 1)
        return 'If a computer has no Georgia, the browser should fall back to any serif font. Add the fallback after a comma.'
      if (list.at(-1) === 'sans-serif')
        return 'sans-serif is the family without the small strokes at the ends of letters. Dilys wants the other one.'
      return 'The last font in the list should be the general family the browser falls back to.'
    }
    return [
      judged(
        'The body uses Georgia, with serif to fall back on',
        s,
        body,
        'font-family',
        (v) => {
          const list = families(v)
          return list[0] === 'georgia' && list.length > 1 && list.at(-1) === 'serif'
        },
        { target: 'the body', what: 'font', wants: "the font in Dilys's notes", wrong: familyWrong }
      ),
      judged('The body text is 18px', s, body, 'font-size', (v) => v === '18px', {
        target: 'the body',
        what: 'text size',
        wants: "the size in Dilys's notes, in px",
        length: true
      })
    ]
  }
}
