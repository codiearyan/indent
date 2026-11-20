import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

const css = async (t) =>
  (await readFile(join(t.workspace, 'styles.css'), 'utf8').catch(() => '')).replace(
    /\/\*[\s\S]*?\*\//g,
    ''
  )

/** Every rule as { selector, declarations }, flattening @media and friends. */
function rules(text) {
  const found = []
  let at = 0
  for (let open = text.indexOf('{', at); open !== -1; open = text.indexOf('{', at)) {
    let depth = 1
    let end = open + 1
    for (; end < text.length && depth; end++)
      depth += text[end] === '{' ? 1 : text[end] === '}' ? -1 : 0
    const selector = text.slice(at, open).split(';').pop().trim()
    const body = text.slice(open + 1, end - 1)
    if (selector.startsWith('@')) found.push(...rules(body))
    else {
      const declarations = body
        .split(';')
        .filter((line) => line.includes(':'))
        .map((line) => {
          const colon = line.indexOf(':')
          return {
            property: line.slice(0, colon).trim().toLowerCase(),
            value: line.slice(colon + 1).trim()
          }
        })
      found.push({ selector, declarations })
    }
    at = end
  }
  return found
}

function channels(colour) {
  const rgb = String(colour ?? '').match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
  if (rgb) return rgb.slice(1, 4).map(Number)
  const hex = String(colour ?? '').match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!hex) return null
  const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

function luminance(colour) {
  const c = channels(colour)
  if (!c) return null
  const [r, g, b] = c.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)]
  if (x === null || y === null) return null
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** The first background colour declared on the element or the boxes around it. */
function backgroundOf(page, el) {
  for (let at = el; at; at = at.parentElement) {
    const bg = page.style(at)['background-color']
    if (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)/.test(bg)) return bg
  }
  return 'rgb(255, 255, 255)'
}

const removesOutline = (d) =>
  (d.property === 'outline' && /^(none|0(px)?)(\s|$)/.test(d.value)) ||
  (d.property === 'outline-style' && d.value === 'none') ||
  (d.property === 'outline-width' && /^0(px)?$/.test(d.value))

/** An outline that shows: not removed, and at least 2px when a width is given. */
function visibleOutline(declarations) {
  const outline = declarations.filter(
    (d) => d.property.startsWith('outline') && d.property !== 'outline-offset'
  )
  if (!outline.length || outline.some(removesOutline)) return false
  const width = outline.map((d) => d.value.match(/([\d.]+)px/)).find(Boolean)
  return !width || Number(width[1]) >= 2
}

export const checks = {
  async 'dark-theme'(t) {
    const page = await t.page()
    const text = await css(t)
    const darkRules = rules(text).filter((r) => /data-theme\s*=\s*['"]?dark/.test(r.selector))
    const extra = darkRules.flatMap((r) =>
      r.declarations
        .filter((d) => !d.property.startsWith('--') && d.property !== 'color-scheme')
        .map((d) => `${r.selector} { ${d.property}: ${d.value} }`)
    )
    const repoints = darkRules.some((r) => r.declarations.some((d) => d.property.startsWith('--')))

    const light = page.style('body')['background-color']
    page.document.documentElement.setAttribute('data-theme', 'dark')
    const body = page.style('body')
    const card = page.$('.event')
    const pairs = [
      ['page text', page.$('main') ?? page.document.body],
      ['event description', card?.querySelector('p:not(.when)')],
      ['event date', card?.querySelector('.when')],
      ['"Save a place" link', page.$('.event-footer a')]
    ].map(([label, el]) => {
      if (!el) return { label, ok: false, line: `${label}: not found` }
      const fg = page.style(el).color
      const bg = backgroundOf(page, el)
      const ratio = contrast(fg, bg)
      return {
        label,
        ok: ratio !== null && ratio >= 4.5,
        line: `${label}: ${fg} on ${bg}, contrast ${ratio === null ? 'unknown' : ratio.toFixed(1)}`
      }
    })
    const dark = luminance(body['background-color'])
    page.document.documentElement.removeAttribute('data-theme')
    return [
      detail(
        'The dark theme only re-points custom properties',
        repoints && extra.length === 0,
        repoints
          ? 'The dark theme rule should only give the custom properties new values. Move other declarations out, the existing rules already use the colours.'
          : 'Add a rule that matches the html element when its data-theme is dark, and give the colour custom properties new values there.',
        extra.join('\n') || `${darkRules.length} dark theme rules`
      ),
      detail(
        'The page turns dark in the evening theme',
        dark !== null && dark < 0.05 && body['background-color'] !== light,
        'With data-theme="dark" on the html element the page background should be a dark colour.',
        `light: ${light}\ndark: ${body['background-color'] ?? 'not set'}`
      ),
      detail(
        'Text stays readable in the evening theme',
        pairs.every((p) => p.ok),
        'Some text is too close to its background in the dark theme. Each text colour needs a contrast of at least 4.5 to 1, so re-point that colour too.',
        pairs.map((p) => `${p.ok ? 'ok   ' : 'low  '} ${p.line}`).join('\n')
      )
    ]
  },

  async 'focus-ring'(t) {
    const page = await t.page()
    const all = rules(await css(t))
    const removers = all.filter(
      (r) => !/:not\(\s*:focus-visible\s*\)/.test(r.selector) && r.declarations.some(removesOutline)
    )
    const focusRules = all.filter((r) => /:focus(-visible)?\b/.test(r.selector))
    const targets = [
      ['a link', page.$('main a[href]') ?? page.$('a[href]')],
      ['a button', page.$('button')],
      ['a text field', page.$('input[name="email"]')]
    ]
    const covered = targets.map(([label, el]) => {
      const rule = focusRules.find(
        (r) =>
          visibleOutline(r.declarations) &&
          r.selector.split(',').some((part) => {
            if (!/:focus/.test(part)) return false
            const base = part.replace(/:focus(-visible|-within)?/g, '').trim() || '*'
            try {
              return Boolean(el) && el.matches(/[>+~]$/.test(base) ? `${base} *` : base)
            } catch {
              return false
            }
          })
      )
      return {
        label,
        ok: Boolean(rule),
        line: `${label}: ${rule ? rule.selector : 'no focus style'}`
      }
    })
    return [
      detail(
        'Nothing hides the focus ring',
        removers.length === 0,
        'A rule still takes away the outline that shows where the keyboard is. Find it and remove it.',
        removers.map((r) => r.selector).join('\n') || 'none'
      ),
      detail(
        'Links, buttons and fields get a visible focus style',
        covered.every((c) => c.ok),
        'Add a focus rule with an outline at least 2px thick that reaches links, buttons and form fields. The selector that matches only keyboard focus is the one to use.',
        covered.map((c) => c.line).join('\n')
      )
    ]
  },

  async 'toggle-state'(t) {
    const page = await t.page()
    const button = page.$('#theme-toggle')
    if (!button) {
      return [
        detail(
          'The evening mode button is on the page',
          false,
          'Keep the button with id theme-toggle.',
          'not found'
        )
      ]
    }
    const root = page.document.documentElement
    const state = () =>
      `aria-pressed="${button.getAttribute('aria-pressed')}", data-theme="${root.dataset.theme ?? ''}"`
    const before = button.getAttribute('aria-pressed')
    const log = [`before: ${state()}`]
    await page.click(button)
    const on = button.getAttribute('aria-pressed') === 'true' && root.dataset.theme === 'dark'
    log.push(`after one click: ${state()}`)
    await page.click(button)
    const off = button.getAttribute('aria-pressed') === 'false' && root.dataset.theme !== 'dark'
    log.push(`after two clicks: ${state()}`)
    return [
      detail(
        'The button starts out not pressed',
        before === 'false',
        'Before anyone clicks, a screen reader should hear that the evening mode is off. Which attribute says whether a toggle button is pressed?',
        log[0]
      ),
      detail(
        'One click turns the evening mode on and says so',
        on,
        'After a click the theme is dark, and the button should tell a screen reader it is now pressed. Update the attribute in theme.js.',
        log[1]
      ),
      detail(
        'A second click turns it off again',
        off,
        'The second click should bring back the light theme and mark the button as not pressed.',
        log[2]
      ),
      detail(
        'The page has no script errors',
        page.errors.length === 0,
        'Open the console in the Browser panel and fix the error it shows.',
        page.errors.join('\n') || 'none'
      )
    ]
  }
}
