// What the CSS issues of this repo share: the page with only styles.css applied, every declaration
// of the stylesheet, and one way to say why an element does not get the value a task asks for.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const clean = (text) => text.replace(/\s+/g, ' ').trim()
export const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
export const cap = (text) => text[0].toUpperCase() + text.slice(1)
export const read = (t, file) => readFile(join(t.workspace, file), 'utf8').catch(() => null)

/** Every declaration of a stylesheet, with the selectors of its rule, in file order. */
export function declarations(css) {
  const found = []
  const text = (css ?? '').replace(/\/\*[\s\S]*?\*\//g, '')
  const walk = (part) => {
    let at = 0
    for (let open = part.indexOf('{', at); open !== -1; open = part.indexOf('{', at)) {
      let depth = 1
      let end = open + 1
      for (; end < part.length && depth; end++)
        depth += part[end] === '{' ? 1 : part[end] === '}' ? -1 : 0
      const head = part.slice(at, open).split(';').pop().trim()
      const body = part.slice(open + 1, end - 1)
      if (head.startsWith('@')) walk(body)
      else {
        const selectors = head.split(',').map((s) => s.trim())
        for (const line of body.split(';')) {
          const colon = line.indexOf(':')
          if (colon === -1) continue
          found.push({
            selector: clean(head),
            selectors,
            property: line.slice(0, colon).trim().toLowerCase(),
            value: line.slice(colon + 1).trim()
          })
        }
      }
      at = end
    }
  }
  walk(text)
  return found
}

export const line = (d) => `${d.selector} { ${d.property}: ${d.value} }`

const matches = (el, selector) => {
  try {
    return el.matches(selector)
  } catch {
    return false
  }
}

/**
 * Opens a page with only styles.css applied. Style attributes and style elements of the page
 * itself are taken out and listed in `inline`, so each check judges the stylesheet alone.
 */
export async function openStyled(t, file = 'index.html') {
  const page = await t.page(file)
  const css = await read(t, 'styles.css')
  const sheets = page.$$('style')
  const linked = css !== null && sheets.some((s) => s.textContent === css)
  const inline = []
  for (const s of sheets) {
    if (linked && s.textContent === css) continue
    inline.push('a style element')
    s.remove()
  }
  for (const el of page.$$('[style]')) {
    inline.push(`a style attribute on <${el.tagName.toLowerCase()}>`)
    el.removeAttribute('style')
  }
  const scratch = page.document.createElement('div').style
  return {
    page,
    file,
    css: css ?? '',
    linked,
    inline,
    decls: declarations(linked ? css : ''),
    style(el) {
      const style = page.style(el)
      // The DOM library files text-align under text-align-all.
      if (style['text-align'] === undefined && style['text-align-all'] !== undefined)
        style['text-align'] = style['text-align-all']
      return style
    },
    /** A value the way the page reports it, so `#FFF`, `#ffffff` and `rgb(255,255,255)` compare equal. */
    norm(property, value) {
      scratch.cssText = ''
      scratch.setProperty(property, value)
      return scratch.getPropertyValue(property) || clean(value)
    },
    known(property) {
      if (property.startsWith('--')) return true
      scratch.cssText = ''
      scratch.setProperty(property, 'inherit')
      return scratch.getPropertyValue(property) !== ''
    },
    matches
  }
}

/** The one detail a CSS task returns when the stylesheet does not reach the page at all. */
export function notLinked(s, fix) {
  return detail(
    `${s.file} reads styles.css`,
    false,
    `${s.file} does not link styles.css, so none of its rules reach the page. ${fix}`,
    s.inline.length
      ? `Not linked. Found in ${s.file} instead: ${s.inline.join(', ')}`
      : 'styles.css is not linked'
  )
}

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = keep
    }
  }
  return row[b.length]
}

// A shorthand sets the longhands that start with its name: background sets background-color.
const family = (property) => {
  const parts = property.split('-')
  return parts
    .map((_, i) => parts.slice(0, i + 1).join('-'))
    .concat(property.startsWith('font-') ? ['font'] : [])
}

/**
 * Says why `el` does not get the value a task asks for, or null when it does.
 * `ok(got)` decides; `target` names the element in words ("the body"), `what` the property in
 * words ("background colour"), `wrong(value)` may explain a value that was written on the
 * element but is not right, and `hint(declarations)` a rule whose selector misses the element.
 */
export function judge(
  s,
  el,
  property,
  ok,
  { target, what, wrong, hint, length = false, wants = 'the value the task asks for' }
) {
  const got = el ? s.style(el)[property] : undefined
  const output = `${cap(target)}, ${what}: ${got ?? 'not set'}`
  if (!el) return { ok: false, message: `${cap(target)} is not on the page.`, output }
  if (got !== undefined && ok(got)) return { ok: true, output }
  const names = family(property)
  const onEl = s.decls.filter((d) => d.selectors.some((sel) => matches(el, sel)))
  const misspelt = onEl.find(
    (d) => !s.known(d.property) && names.some((n) => distance(d.property, n) <= 3)
  )
  if (misspelt)
    return {
      ok: false,
      message: `${misspelt.property} is not a property CSS knows, so the browser skips that line. Check its spelling.`,
      output: `${output}\n${line(misspelt)}`
    }
  const mine = onEl.filter((d) => names.includes(d.property))
  if (mine.length) {
    const vars = s.style(el)
    const bare = (d) => d.value.replace(/\s*!\s*important$/i, '')
    const resolve = (v) =>
      v.replace(/var\(\s*(--[\w-]+)\s*(?:,([^)]*))?\)/g, (_, n, fb) => vars[n] ?? fb ?? '')
    for (const d of [...mine].reverse()) {
      const value = bare(d)
      const shown = `${output}\n${line(d)}`
      if (
        length &&
        value.split(/\s+/).some((tok) => /^-?\d*\.?\d+$/.test(tok) && Number(tok) !== 0)
      )
        return {
          ok: false,
          message: `The ${what} is a number with no unit after it. A length needs its unit, or the browser skips the line.`,
          output: shown
        }
      if (/(^|\s)([0-9a-f]{3}|[0-9a-f]{6})(\s|$)/i.test(value) && !/#/.test(value))
        return {
          ok: false,
          message: 'A colour code starts with #. Without it the browser skips the line.',
          output: shown
        }
      if (/var\(\s*[^-\s)]/.test(value))
        return {
          ok: false,
          message: 'Inside var(), the name of a custom property keeps its two dashes.',
          output: shown
        }
      const unknown = [...value.matchAll(/var\(\s*(--[\w-]+)/g)]
        .map((m) => m[1])
        .find((n) => vars[n] === undefined)
      if (unknown)
        return {
          ok: false,
          message: `The ${what} uses ${unknown}, but no custom property has that name. Check it against the names on :root.`,
          output: shown
        }
    }
    const winner =
      [...mine]
        .reverse()
        .find((d) => d.property === property && s.norm(property, resolve(bare(d))) === got) ??
      mine.at(-1)
    const beaten = mine.find(
      (d) => d !== winner && d.property === property && ok(s.norm(property, resolve(bare(d))))
    )
    if (beaten)
      return {
        ok: false,
        message: `A line gives ${target} the right ${what}, but another rule sets it again and wins. Look at which rule comes later in the file, or has the stronger selector.`,
        output: `${output}\nRight but losing: ${line(beaten)}\nWinning: ${line(winner)}`
      }
    const shown = `${output}\n${line(winner)}`
    const explained = wrong?.(bare(winner), winner)
    if (explained) return { ok: false, message: explained, output: shown }
    return { ok: false, message: `${cap(target)} has a ${what}, but not ${wants}.`, output: shown }
  }
  const parents = []
  for (let at = el.parentElement; at; at = at.parentElement) parents.push(at)
  const fromParent = (d) => d.selectors.some((sel) => parents.some((p) => matches(p, sel)))
  const elsewhere = s.decls.filter((d) => names.includes(d.property) && !onEl.includes(d))
  const away = elsewhere.filter((d) => !fromParent(d))
  if (away.length)
    return {
      ok: false,
      message:
        hint?.(away) ??
        `There is a ${what} in styles.css, but its selector does not pick ${target}.`,
      output: `${output}\n${away.map(line).join('\n')}`
    }
  if (s.inline.length)
    return {
      ok: false,
      message: `Some CSS sits in ${s.file} itself. This repo keeps every rule in styles.css, and the check reads only that file.`,
      output: `${output}\nIn ${s.file}: ${s.inline.join(', ')}`
    }
  if (elsewhere.length)
    return {
      ok: false,
      message: `${cap(target)} has no ${what} of its own yet. The one in styles.css is set on an element around it.`,
      output: `${output}\nFrom: ${elsewhere.map(line).join(', ')}`
    }
  return { ok: false, message: `${cap(target)} has no ${what} yet.`, output }
}

/** judge() as a detail. */
export function judged(name, s, el, property, ok, options) {
  const r = judge(s, el, property, ok, options)
  return detail(name, r.ok, r.message, r.output)
}
