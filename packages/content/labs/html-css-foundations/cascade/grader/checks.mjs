import {
  broken,
  clean,
  detail,
  distance,
  judged,
  line,
  notLinked,
  openStyled
} from '../../style-checks.mjs'

const COLOURS = {
  '--clay': 'rgb(164, 73, 42)',
  '--cream': 'rgb(247, 241, 232)',
  '--ink': 'rgb(59, 47, 42)',
  '--sand': 'rgb(239, 220, 195)',
  '--stone': 'rgb(122, 108, 100)'
}
const { '--clay': CLAY, '--ink': INK, '--stone': STONE } = COLOURS
const FIX = 'Put the link back in its head.'
const TEXT = 'h1, h2, p, li, figcaption, a'

const important = (s, el) =>
  s.decls.filter(
    (d) => /!\s*important$/i.test(d.value) && d.selectors.some((x) => s.matches(el, x))
  )
const noImportant = (s, els, what) => {
  const found = [...new Set(els.flatMap((el) => important(s, el)))]
  return detail(
    `No !important for ${what}`,
    found.length === 0,
    '!important wins by force, and the next rule that needs to win then needs it too. Remove it and make the right rule win by its place in the file or by its selector.',
    found.map(line).join('\n') || 'No !important'
  )
}

const paragraph = (page, words) =>
  page.$$('p').find((p) => clean(p.textContent).toLowerCase().includes(words))
const families = (value) =>
  (value ?? '').split(',').map((f) =>
    f
      .trim()
      .replace(/^["']|["']$/g, '')
      .toLowerCase()
  )

export const checks = {
  async 'source-order'(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const h1 = s.page.$('h1')
    const h2s = s.page.$$('h2')
    const h2 = h2s.find((h) => s.style(h).color !== INK) ?? h2s[0]
    return [
      judged('The main heading stays clay', s, h1, 'color', (v) => v === CLAY, {
        target: 'the main heading',
        what: 'colour',
        wants: 'clay'
      }),
      judged('The h2 headings are dark brown', s, h2, 'color', (v) => v === INK, {
        target: `the ${clean(h2?.textContent ?? 'h2')} heading`,
        what: 'colour',
        wants: 'the dark brown'
      }),
      noImportant(s, [h1, ...h2s], 'the headings')
    ]
  },

  async specificity(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const hours = paragraph(s.page, 'tuesday to saturday')
    const muddy = paragraph(s.page, 'muddy')
    const address = s.page.$$('p').find((p) => /OS4/.test(p.textContent))
    const contact = s.page.$$('p').find((p) => p.querySelector('a[href^="mailto:"]'))
    const welcome = paragraph(s.page, 'kettle')
    const lost = [
      ['the opening hours', hours],
      ['the line about muddy clothes', muddy],
      ['the address', address],
      ['the email and phone line', contact]
    ].find(([, el]) => !el)
    if (lost)
      return [
        detail(
          'The opening hours are clay',
          false,
          `The paragraph with ${lost[0]} could not be found. If its words changed, keep them as they were.`,
          'not found'
        )
      ]
    const greys = [address, contact].filter((p) => s.style(p).color !== STONE)
    const welcomeGrey = s.style(welcome ?? s.page.body).color === STONE
    return [
      judged('The opening hours are clay', s, hours, 'color', (v) => v === CLAY, {
        target: 'the opening hours',
        what: 'colour',
        wants: 'clay'
      }),
      judged('The line about muddy clothes stays clay', s, muddy, 'color', (v) => v === CLAY, {
        target: 'the line about muddy clothes',
        what: 'colour',
        wants: 'clay'
      }),
      detail(
        'The rest of Visit us stays grey, and only Visit us',
        greys.length === 0 && !welcomeGrey,
        greys.length
          ? 'The other lines of Visit us lost their grey. Keep a rule for them while you fix the opening hours.'
          : 'Paragraphs outside Visit us turned grey too. The grey belongs to the lines of Visit us only.',
        [
          `The address: ${s.style(address).color ?? 'not set'}`,
          `The email and phone line: ${s.style(contact).color ?? 'not set'}`,
          `The welcome: ${s.style(welcome ?? s.page.body).color ?? 'not set'}`
        ].join('\n')
      ),
      noImportant(s, [hours, muddy], 'the notes')
    ]
  },

  async inheritance(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const body = s.page.$('body')
    const off = s.page
      .$$(TEXT)
      .filter((el) => families(s.style(el)['font-family'])[0] !== 'palatino')
    const fonts = s.decls.filter((d) => d.property === 'font-family' || d.property === 'font')
    const onBody = fonts.filter((d) => d.selectors.some((x) => x.toLowerCase() === 'body'))
    const list = families(s.style(body)['font-family'])
    const describe = (el) => {
      const text = clean(el.textContent)
      return `<${el.tagName.toLowerCase()}> ${text.length > 40 ? `${text.slice(0, 40)}...` : text}`
    }
    const misspelt = fonts
      .map((d) => families(d.value)[0])
      .find((f) => f !== 'palatino' && distance(f, 'palatino') <= 3)
    const offMessage = misspelt
      ? "The font's name is not spelt the way Dilys's notes spell it. Keep Palatino exactly as she wrote it."
      : 'Some text is not in Palatino yet. An element without a font of its own takes the font of the element around it, all the way up to the body.'
    let onceMessage =
      'The font list is set somewhere other than the body. Set it on the body, and nowhere else.'
    if (fonts.length > 1)
      onceMessage = `A font list is written ${fonts.length} times in styles.css. Set Palatino once, on the body; everything inside it takes the font from there, so remove the copies.`
    else if (!fonts.length)
      onceMessage = 'There is no font list in styles.css any more. Set Palatino on the body.'
    return [
      detail(
        'All the text is in Palatino',
        off.length === 0,
        offMessage,
        off.length
          ? `Not in Palatino:\n${off
              .slice(0, 4)
              .map((el) => `${describe(el)}: ${s.style(el)['font-family'] ?? 'no font'}`)
              .join('\n')}`
          : 'Every heading, paragraph, item, caption and link is in Palatino'
      ),
      detail(
        'The font is set once, on the body',
        fonts.length === 1 && onBody.length === 1,
        onceMessage,
        fonts.map(line).join('\n') || 'No font list in styles.css'
      ),
      judged(
        "The body's font list is Palatino, then serif",
        s,
        body,
        'font-family',
        () => list[0] === 'palatino' && list.length > 1 && list.at(-1) === 'serif',
        {
          target: 'the body',
          what: 'font list',
          wants: 'Palatino with serif to fall back on'
        }
      )
    ]
  },

  async 'custom-properties'(t) {
    const s = await openStyled(t)
    if (!s.linked) return [notLinked(s, FIX)]
    const root = s.style(s.page.document.documentElement)
    const names = Object.keys(COLOURS)
    const missing = names.filter((n) => root[n] === undefined)
    const wrong = names.filter(
      (n) => root[n] !== undefined && s.norm('color', root[n]) !== COLOURS[n]
    )
    const elsewhere = s.decls.filter(
      (d) => names.includes(d.property) && !d.selectors.some((x) => /^(:root|html)$/i.test(x))
    )
    const oneDash = s.decls.find((d) => /^-[a-z]/i.test(d.property))
    const colonless = elsewhere.some((d) => d.selectors.some((x) => x.toLowerCase() === 'root'))
    const fault = broken(s, names)
    let namesMessage =
      'Some colours are named, but with a different code from the one used on the page. Copy each code exactly.'
    if (fault) namesMessage = fault.message
    else if (oneDash)
      namesMessage = `${oneDash.property} has one dash in front. The name of a custom property starts with two.`
    else if (colonless)
      namesMessage =
        'The rule for the names is written root, without the colon in front. Without it, the selector looks for an element called root.'
    else if (missing.length && elsewhere.length)
      namesMessage =
        'The colour names are set on another element. Put them on :root, the top of the page, so every rule can use them.'
    else if (missing.length)
      namesMessage = `Not every colour has its name on :root yet. Missing: ${missing.join(', ')}. Use the names in Dilys's notes.`

    const scratch = s.page.document.createElement('div').style
    const isColourWord = (word) => {
      if (
        !/^[a-z]+$/i.test(word) ||
        /^(inherit|initial|unset|transparent|currentcolor)$/i.test(word)
      )
        return false
      scratch.color = ''
      scratch.color = word
      return scratch.color !== ''
    }
    const literal = (value) =>
      /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(/i.test(value) || value.split(/\s+/).some(isColourWord)
    const written = s.decls.filter(
      (d) => !d.property.startsWith('-') && literal(d.value.replace(/var\([^)]*\)/g, ''))
    )

    const used = [
      ...new Set(
        s.decls.flatMap((d) => [...d.value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]))
      )
    ]
    const unknown = used.filter((n) => !s.decls.some((d) => d.property === n))
    const dashless = s.decls.find((d) => /var\(\s*[^-\s)]/.test(d.value))
    const address = s.page.$$('p').find((p) => /OS4/.test(p.textContent))
    const expect = [
      ['page background', s.page.$('body'), 'background-color', COLOURS['--cream']],
      ['writing', s.page.$('body'), 'color', INK],
      ['main heading', s.page.$('h1'), 'color', CLAY],
      ['notes background', s.page.$('.note'), 'background-color', COLOURS['--sand']],
      ['address', address, 'color', STONE]
    ].map(([label, el, property, want]) => {
      const got = el ? s.style(el)[property] : undefined
      return {
        ok: got === want,
        text: `${got === want ? 'ok   ' : 'wrong'} ${label}: ${got || 'not set'}`
      }
    })
    let lookMessage =
      'A colour changed on the way to its name. Compare the lines marked wrong with the colours before.'
    if (fault) lookMessage = fault.message
    else if (dashless) lookMessage = 'Inside var(), the name of a custom property keeps its two dashes.'
    else if (unknown.length)
      lookMessage = `Some var() uses a name that no custom property has: ${unknown.join(', ')}. Check the spelling.`
    return [
      detail(
        'The five colours are named on :root',
        missing.length === 0 && wrong.length === 0,
        namesMessage,
        names.map((n) => `${n}: ${root[n] ?? 'not set'}`).join('\n')
      ),
      detail(
        'Every rule uses the names, not the codes',
        written.length === 0,
        'Some rules still write a colour out. Use var() with its name instead, so each code is written once.',
        written.map(line).join('\n') || 'No colours written out'
      ),
      detail(
        'The page looks the same',
        expect.every((e) => e.ok) && !dashless && unknown.length === 0,
        lookMessage,
        expect.map((e) => e.text).join('\n')
      )
    ]
  }
}
