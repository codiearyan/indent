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
  'overflow-wrap',
  'text-transform',
  'visibility',
  'white-space',
  'word-break'
])

// A promise the page never catches would otherwise end the whole grader. Each page runs in a realm
// of its own, so a promise its code made is traced to it by its Promise; one that cannot be traced
// goes to every open page, and with no page open it is the grader's own bug.
const openPages = new Map()
// A page closed while its promises were pending must not hand them to another page, or crash.
const closedPages = new Set()
process.on('unhandledRejection', (reason, promise) => {
  if ([...closedPages].some((window) => promise instanceof window.Promise)) return
  if (!openPages.size) throw reason
  const message = `Uncaught (in promise) ${reason?.message ?? reason}`
  const owner = [...openPages].find(([window]) => promise instanceof window.Promise)
  for (const errors of owner ? [owner[1]] : openPages.values()) errors.push(message)
})

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
  // A module is always strict in a browser, so assigning to a frozen prop throws here too.
  const code = result.outputFiles[0].text.replace(/^export\s*\{[^}]*\};?\s*$/m, '')
  return `(async () => {'use strict';\n${code}\n})()`
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
  const strip = (piece) =>
    piece
      .trim()
      .replace(/^\(|\)$/g, '')
      .trim()
  return query.split(',').some((part) =>
    part
      .split(/\band\b/)
      .map(strip)
      .every(holds)
  )
}

/** Splits at top-level commas, leaving those inside parentheses and quotes alone. */
function splitTop(list) {
  const parts = ['']
  let depth = 0
  let quote = null
  for (const char of list) {
    if (quote) quote = char === quote ? null : quote
    else if (char === '"' || char === "'") quote = char
    else depth += char === '(' ? 1 : char === ')' ? -1 : 0
    if (char === ',' && depth === 0 && !quote) parts.push('')
    else parts[parts.length - 1] += char
  }
  return parts.map((part) => part.trim()).filter(Boolean)
}

const WEIGHED = /:(where|is|not|has)\(/i

/** The index just past the parenthesis that closes the one at `open`. */
function closing(text, open) {
  let depth = 1
  let end = open + 1
  for (; end < text.length && depth; end++) depth += text[end] === '(' ? 1 : text[end] === ')' ? -1 : 0
  return end
}

/**
 * A selector's weight: ids, then classes, attributes and pseudo-classes, then element names.
 * :where() adds nothing; :is(), :not() and :has() add only their heaviest argument.
 */
function specificity(selector) {
  let rest = selector.replace(/\[[^\]]*\]/g, '[]')
  let inner = 0
  let at = rest.search(WEIGHED)
  while (at !== -1) {
    const open = rest.indexOf('(', at)
    const end = closing(rest, open)
    if (!/^:where/i.test(rest.slice(at))) {
      inner += Math.max(0, ...splitTop(rest.slice(open + 1, end - 1)).map(specificity))
    }
    rest = `${rest.slice(0, at)} ${rest.slice(end)}`
    at = rest.search(WEIGHED)
  }
  // `:nth-child(2 of .a)` also counts `.a`; what else is in parentheses is not a selector.
  rest = rest.replace(/\(([^()]*)\)/g, (_, inside) => {
    const of = /\bof\s+(.+)$/i.exec(inside)
    if (of) inner += Math.max(0, ...splitTop(of[1]).map(specificity))
    return ''
  })
  const plain = rest.replace(/::[\w-]+/g, ' x')
  const count = (pattern) => (plain.match(pattern) ?? []).length
  return (
    inner +
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
    for (; end < css.length && depth; end++)
      depth += css[end] === '{' ? 1 : css[end] === '}' ? -1 : 0
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
      rules.push({ selectors: splitTop(head), media, declarations })
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
    for (const d of rule.declarations)
      found.push({ ...d, weight: weight + (d.important ? 1e9 : 0) })
  }
  for (const property of element.style) {
    found.push({ property, value: element.style.getPropertyValue(property), weight: 1e8 })
  }
  // A stable sort keeps source order among declarations of equal weight.
  found.sort((a, b) => a.weight - b.weight)

  const variables = {}
  for (const [name, value] of Object.entries(parent))
    if (name.startsWith('--')) variables[name] = value
  for (const { property, value } of found)
    if (property.startsWith('--')) variables[property] = value
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
export async function openPage(
  dir,
  file = 'index.html',
  { fetch, storage = {}, width = 1024 } = {}
) {
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
    if (/Not implemented: (navigation|.*submit)/i.test(error.message)) reloads++
    else if (!/Not implemented/.test(error.message))
      errors.push(error.detail?.message ?? error.message)
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
  openPages.set(window, errors)
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
  const fetchFile = async (input) => {
    try {
      return new Response(await readFile(local(String(input?.url ?? input))))
    } catch {
      return new Response('Not found', { status: 404 })
    }
  }
  // Handed back as the page's own promise, so what the page chains on it stays traceable to it.
  window.fetch = (...args) => window.Promise.resolve((fetch ?? fetchFile)(...args))
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
      observer.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true
      })
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
    close() {
      openPages.delete(window)
      closedPages.add(window)
      window.close()
    }
  }
}
