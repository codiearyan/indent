import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const COLOUR = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(/i
const NIGHT = 'rgb(32, 56, 74)'
const GREEN = 'rgb(46, 107, 69)'
const GREY = 'rgb(91, 87, 80)'

const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

const read = (t, file) => readFile(join(t.workspace, file), 'utf8').catch(() => '')
const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Every declaration in the stylesheet with the selector it sits under, at any depth. */
function declarations(css) {
  const found = []
  const walk = (text) => {
    let at = 0
    for (let open = text.indexOf('{', at); open !== -1; open = text.indexOf('{', at)) {
      let depth = 1
      let end = open + 1
      for (; end < text.length && depth; end++)
        depth += text[end] === '{' ? 1 : text[end] === '}' ? -1 : 0
      const selector = text.slice(at, open).split(';').pop().trim()
      const body = text.slice(open + 1, end - 1)
      if (selector.startsWith('@')) walk(body)
      else {
        for (const line of body.split(';')) {
          const colon = line.indexOf(':')
          if (colon === -1) continue
          found.push({
            selector,
            property: line.slice(0, colon).trim().toLowerCase(),
            value: line.slice(colon + 1).trim()
          })
        }
      }
      at = end
    }
  }
  walk(withoutComments(css))
  return found
}

function toPx(value) {
  const match = String(value ?? '').match(/^([\d.]+)(px|rem|em)$/)
  if (!match) return null
  return Number(match[1]) * (match[2] === 'px' ? 1 : 16)
}

export const checks = {
  async 'no-inline'(t) {
    const page = await t.page()
    const html = await read(t, 'index.html')
    const styled = page.$$('[style]')
    const styleTags = (html.match(/<style[\s>]/gi) ?? []).length
    const header = page.$('header')
    const card = page.$('.event')
    const button = page.$('form button, form [type="submit"]')
    const footer = page.$('footer')
    const expect = [
      ['header background', header, 'background-color', NIGHT],
      ['header text colour', header, 'color', 'rgb(253, 248, 238)'],
      ['page title size', page.$('h1'), 'font-size', 32],
      ['event card background', card, 'background-color', 'rgb(255, 253, 248)'],
      ['event card padding', card, 'padding-top', 16],
      ['event card border', card, 'border-top-width', 1],
      ['event title size', card?.querySelector('h3'), 'font-size', 19],
      ['card footer text size', page.$('.event-footer'), 'font-size', 14],
      ['submit button colour', button, 'background-color', 'rgb(232, 185, 49)'],
      ['footer background', footer, 'background-color', NIGHT]
    ].map(([label, el, property, want]) => {
      const got = el ? page.style(el)[property] : undefined
      const ok = typeof want === 'number' ? toPx(got) === want : got === want
      return { label, ok, line: `${ok ? 'ok   ' : 'wrong'} ${label}: ${got ?? 'not set'}` }
    })
    return [
      detail(
        'No style attributes left in index.html',
        styled.length === 0,
        'Some elements still carry a style attribute. Search index.html for them, give each element a class or a selector, and move the declarations to styles.css.',
        `${styled.length} elements with a style attribute${styled.length ? `, first: <${styled[0].tagName.toLowerCase()} style="${styled[0].getAttribute('style')}">` : ''}`
      ),
      detail(
        'No style element in index.html',
        styleTags === 0,
        'Every rule belongs in styles.css, not in a style element inside the page.',
        `${styleTags} style elements`
      ),
      detail(
        'The page still looks the same',
        expect.every((e) => e.ok),
        'A declaration got lost on the way from an attribute to the stylesheet. Compare the lines marked wrong with the old attribute values.',
        expect.map((e) => e.line).join('\n')
      )
    ]
  },

  async 'custom-properties'(t) {
    const page = await t.page()
    const css = await read(t, 'styles.css')
    const all = declarations(css)
    const root = page.style('html')
    const colourVars = Object.entries(root).filter(([k, v]) => k.startsWith('--') && COLOUR.test(v))
    const loose = all.filter((d) => !d.property.startsWith('--') && COLOUR.test(d.value))
    const spacing = all.filter(
      (d) =>
        /^(padding|margin|gap|row-gap|column-gap)/.test(d.property) && d.value.includes('var(--')
    )
    return [
      detail(
        'Colours are named as custom properties on :root',
        colourVars.length >= 3,
        'Give each colour of the page a name on :root, as a custom property starting with two dashes.',
        colourVars.map(([k, v]) => `${k}: ${v}`).join('\n') ||
          'No colour custom properties on :root'
      ),
      detail(
        'Each colour is written only once, in its custom property',
        loose.length === 0,
        'Some declarations still spell out a colour. Use var() with the colour name you gave it instead.',
        loose.length
          ? loose.map((d) => `${d.selector} { ${d.property}: ${d.value} }`).join('\n')
          : 'No colour values outside custom properties'
      ),
      detail(
        'Spacing uses custom properties too',
        spacing.length > 0,
        'Name the spacing steps the page uses as custom properties and use them in padding, margin or gap.',
        `${spacing.length} padding, margin or gap declarations use var()`
      )
    ]
  },

  async 'no-important'(t) {
    const page = await t.page()
    const css = withoutComments(await read(t, 'styles.css'))
    const important = css.split('\n').filter((line) => /!\s*important/i.test(line))
    const dates = page.$$('.when')
    const dateColours = dates.map((el) => page.style(el).color)
    const descriptions = page
      .$$('.event p')
      .filter(
        (p) => !p.closest('.when, .event-footer') && !p.querySelector('time') && !p.matches('.when')
      )
    const descColours = descriptions.map((el) => page.style(el).color)
    return [
      detail(
        'No !important in the stylesheet',
        important.length === 0,
        'Find the rule that needed !important and make it win the normal way, by how specific the selectors are.',
        important.map((line) => line.trim()).join('\n') || 'none'
      ),
      detail(
        'Event dates are green',
        dates.length > 0 && dateColours.every((c) => c === GREEN),
        'A rule with a stronger selector paints the dates grey. Compare the two selectors and change one so the date rule is the more specific.',
        dates.length
          ? `.when colours: ${[...new Set(dateColours)].join(', ')}`
          : 'No element with class "when"'
      ),
      detail(
        'Event descriptions stay grey',
        descriptions.length > 0 && descColours.every((c) => c === GREY),
        'The description paragraphs lost their grey. Keep a rule for them while you fix the dates.',
        `description colours: ${[...new Set(descColours)].join(', ') || 'none found'}`
      )
    ]
  }
}
