// t.page(): opens a workspace page in a headless DOM, the way the Browser panel would show it.
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const QUIET_MS = 25
const SETTLE_LIMIT_MS = 2000
const ROOT_PX = 16
const INHERITED = new Set([
  'color',
  'cursor',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'line-height',
  'list-style-type',
  'text-align',
  'text-transform',
  'visibility'
])

/** Bundles a module the same way the Browser panel does, wrapped so the page can run it. */
async function bundle(esbuild, options) {
  const result = await esbuild.build({
    bundle: true,
    format: 'esm',
    write: false,
    jsx: 'automatic',
    logLevel: 'silent',
    define: { 'process.env.NODE_ENV': '"development"' },
    ...options
  })
  // An async function body keeps top-level await working; a bundled entry has no imports left.
  const code = result.outputFiles[0].text.replace(/^export\s*\{[^}]*\};?\s*$/m, '')
  return `(async () => {${code}\n})()`
}

// shortcut: only width conditions in px, em and rem are understood; any other feature counts as
// not matching. Upgrade when an issue needs another media feature.
function matchesMedia(query, width) {
  const px = (value, unit) => Number(value) * (unit === 'px' ? 1 : ROOT_PX)
  const holds = (piece) => {
    if (piece === 'screen' || piece === 'all' || piece === '') return true
    const named = piece.match(/^(min|max)-width\s*:\s*([\d.]+)(px|em|rem)$/)
    if (named) {
      const limit = px(named[2], named[3])
      return named[1] === 'min' ? width >= limit : width <= limit
    }
    const range = piece.match(/^width\s*(<=|>=|<|>)\s*([\d.]+)(px|em|rem)$/)
    if (!range) return false
    const limit = px(range[2], range[3])
    if (range[1] === '<=') return width <= limit
    if (range[1] === '>=') return width >= limit
    return range[1] === '<' ? width < limit : width > limit
  }
  const strip = (piece) => piece.trim().replace(/^\(|\)$/g, '').trim()
  return query.split(',').some((part) => part.split(/\band\b/).map(strip).every(holds))
}

// shortcut: a count of ids, classes and element names. :is(), :not() and :where() are not
// weighed by their arguments. Upgrade when an issue teaches those.
function specificity(selector) {
  const plain = selector.replace(/\[[^\]]*\]/g, '[]').replace(/::[\w-]+/g, ' x')
  const count = (pattern) => (plain.match(pattern) ?? []).length
  return (
    count(/#[\w-]+/g) * 10000 +
    count(/\.[\w-]+|\[\]|:[\w-]+/g) * 100 +
    count(/(^|[\s>+~(])[a-zA-Z][\w-]*/g)
  )
}

// shortcut: plain rules, @media, @supports and @layer. Nested rules and @import are not read.
// Upgrade when an issue teaches CSS nesting.
function parseCss(text, media = [], rules = []) {
  const css = text.replace(/\/\*[\s\S]*?\*\//g, '')
  let at = 0
  for (let open = css.indexOf('{', at); open !== -1; open = css.indexOf('{', at)) {
    let depth = 1
    let end = open + 1
    for (; end < css.length && depth; end++) depth += css[end] === '{' ? 1 : css[end] === '}' ? -1 : 0
    const head = css.slice(at, open).split(';').pop().trim()
    const body = css.slice(open + 1, end - 1)
    if (head.startsWith('@media')) parseCss(body, [...media, head.slice(6)], rules)
    else if (/^@(supports|layer)/.test(head)) parseCss(body, media, rules)
    else if (!head.startsWith('@')) {
      const declarations = body.split(';').flatMap((line) => {
        const colon = line.indexOf(':')
        if (colon === -1) return []
        const value = line.slice(colon + 1).trim()
        const important = /!\s*important$/i.test(value)
        return [
          {
            property: line.slice(0, colon).trim().toLowerCase(),
            value: value.replace(/\s*!\s*important$/i, ''),
            important
          }
        ]
      })
      rules.push({ selectors: head.split(',').map((s) => s.trim()), media, declarations })
    }
    at = end
  }
  return rules
}

function matches(element, selector) {
  try {
    return element.matches(selector)
  } catch {
    return false
  }
}

/** The CSS that applies to an element: the cascade, inheritance and var(), without layout. */
function styleOf(rules, element, width) {
  const parent = element.parentElement ? styleOf(rules, element.parentElement, width) : {}
  const found = []
  for (const rule of rules) {
    if (!rule.media.every((query) => matchesMedia(query, width))) continue
    const hits = rule.selectors.filter((selector) => matches(element, selector))
    if (!hits.length) continue
    const weight = Math.max(...hits.map(specificity))
    for (const d of rule.declarations) found.push({ ...d, weight: weight + (d.important ? 1e9 : 0) })
  }
  for (const property of element.style) {
    found.push({ property, value: element.style.getPropertyValue(property), weight: 1e8 })
  }
  // A stable sort keeps source order among declarations of equal weight.
  found.sort((a, b) => a.weight - b.weight)

  const variables = {}
  for (const [name, value] of Object.entries(parent)) if (name.startsWith('--')) variables[name] = value
  for (const { property, value } of found) if (property.startsWith('--')) variables[property] = value
  const resolve = (value, depth = 0) =>
    depth > 8
      ? value
      : value.replace(
          /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g,
          (_, name, fallback) => resolve(variables[name] ?? fallback ?? '', depth + 1).trim()
        )

  // A scratch declaration expands shorthands, so `margin: 0 auto` and four longhands read alike.
  const scratch = element.ownerDocument.createElement('div').style
  const raw = {}
  for (const { property, value } of found) {
    if (property.startsWith('--')) continue
    const resolved = resolve(value)
    const before = scratch.cssText
    scratch.setProperty(property, resolved)
    // The DOM library drops values it cannot parse; keep those as written.
    if (scratch.cssText === before && !scratch.getPropertyValue(property)) raw[property] = resolved
  }
  const style = { ...raw }
  for (const property of scratch) style[property] = scratch.getPropertyValue(property)
  for (const [name, value] of Object.entries(variables)) style[name] = resolve(value)
  for (const property of INHERITED) {
    if (style[property] === undefined && parent[property] !== undefined) {
      style[property] = parent[property]
    }
  }
  return style
}

/**
 * Loads `file` from `dir`, runs its scripts and returns handles for checking the result.
 * `fetch` replaces the page's fetch (by default it reads files of the workspace), `storage` fills
 * localStorage before any script runs, and `width` is the viewport width media queries see.
 */
export async function openPage(dir, file = 'index.html', { fetch, storage = {}, width = 1024 } = {}) {
  const require = createRequire(join(dir, 'noop.js'))
  const { JSDOM, VirtualConsole } = require('jsdom')
  const esbuild = require('esbuild')

  const errors = []
  const logs = []
  const virtualConsole = new VirtualConsole()
  for (const level of ['log', 'info', 'warn', 'error']) {
    virtualConsole.on(level, (...args) => logs.push(`${level}: ${args.map(String).join(' ')}`))
  }
  let reloads = 0
  virtualConsole.on('jsdomError', (error) => {
    if (/Not implemented: navigation|form submission/i.test(error.message)) reloads++
    else if (!/Not implemented/.test(error.message)) errors.push(error.detail?.message ?? error.message)
  })

  const html = await readFile(join(dir, file), 'utf8')
  const dom = new JSDOM(html, {
    url: `http://localhost/${file}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole
  })
  const { window } = dom
  const { document } = window
  const local = (reference) => join(dir, new URL(reference, window.location.href).pathname)

  window.innerWidth = width
  window.matchMedia = (query) => ({
    matches: matchesMedia(query, width),
    media: query,
    addEventListener() {},
    removeEventListener() {}
  })
  window.scrollTo = () => {}
  window.Element.prototype.scrollIntoView = () => {}
  window.fetch =
    fetch ??
    (async (input) => {
      try {
        return new Response(await readFile(local(String(input?.url ?? input))))
      } catch {
        return new Response('Not found', { status: 404 })
      }
    })
  for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value)

  for (const link of document.querySelectorAll('link[rel="stylesheet"][href]')) {
    const css = await readFile(local(link.getAttribute('href')), 'utf8').catch(() => null)
    if (css === null) {
      errors.push(`The stylesheet ${link.getAttribute('href')} was not found.`)
      continue
    }
    const style = document.createElement('style')
    style.textContent = css
    link.replaceWith(style)
  }

  // jsdom cannot load modules, so every script runs here in document order.
  for (const script of document.querySelectorAll('script')) {
    const src = script.getAttribute('src')
    const isModule = script.getAttribute('type') === 'module'
    const type = script.getAttribute('type')
    if (type && !isModule && !/javascript/.test(type)) continue
    try {
      let code = script.textContent
      if (isModule) {
        code = await bundle(
          esbuild,
          src
            ? { entryPoints: [local(src)] }
            : { stdin: { contents: code, resolveDir: dirname(join(dir, file)), loader: 'jsx' } }
        )
      } else if (src) code = await readFile(local(src), 'utf8')
      await window.eval(code)
    } catch (error) {
      errors.push(error?.errors?.map((e) => e.text).join('\n') || error?.message || String(error))
    }
  }
  document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }))
  window.dispatchEvent(new window.Event('load'))

  const find = (target) => {
    const element = typeof target === 'string' ? document.querySelector(target) : target
    if (!element) throw new Error(`Nothing on the page matches ${target}`)
    return element
  }

  /** Waits until the page has stopped changing, so renders and effects have landed. */
  const settle = async (waitMs = 0) => {
    if (waitMs) await new Promise((done) => setTimeout(done, waitMs))
    await new Promise((done) => {
      let quiet = setTimeout(finish, QUIET_MS)
      const limit = setTimeout(finish, SETTLE_LIMIT_MS)
      const observer = new window.MutationObserver(() => {
        clearTimeout(quiet)
        quiet = setTimeout(finish, QUIET_MS)
      })
      observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true })
      function finish() {
        clearTimeout(quiet)
        clearTimeout(limit)
        observer.disconnect()
        done()
      }
    })
  }

  const fire = (element, type, Event = window.Event, init = {}) =>
    element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true, ...init }))

  await settle()

  return {
    window,
    document,
    /** Uncaught errors and script failures, as text. */
    errors,
    /** Console output, one `level: text` line per call. */
    logs,
    /** How often the page tried to navigate away, for example a form that was not stopped. */
    get reloads() {
      return reloads
    },
    $: (selector) => document.querySelector(selector),
    $$: (selector) => [...document.querySelectorAll(selector)],
    text: (target) => find(target).textContent.replace(/\s+/g, ' ').trim(),
    settle,
    async click(target) {
      find(target).click()
      await settle()
    },
    /** Sets a field's value the way typing or picking does, so frameworks notice. */
    async type(target, value) {
      const element = find(target)
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set
      if (setter) setter.call(element, value)
      else element.value = value
      fire(element, 'input')
      fire(element, 'change')
      await settle()
    },
    async press(target, key) {
      const element = find(target)
      fire(element, 'keydown', window.KeyboardEvent, { key })
      fire(element, 'keyup', window.KeyboardEvent, { key })
      await settle()
    },
    /** Submits through the browser's own validation, like pressing the submit button. */
    async submit(target) {
      find(target).requestSubmit()
      await settle()
    },
    /** The CSS that applies to an element at a viewport width: cascade, inheritance and var(). */
    style(target, { width: at = width } = {}) {
      const css = [...document.querySelectorAll('style')].map((style) => style.textContent)
      return styleOf(parseCss(css.join('\n')), find(target), at)
    },
    close: () => window.close()
  }
}
