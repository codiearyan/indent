import {
  WARNING,
  childList,
  clean,
  detail,
  draw,
  drawnBy,
  exportType,
  nearName,
  openComponent,
  openScreen,
  same,
  shorten,
  warningsOf
} from '../../grading.mjs'

const FILE = 'src/App.jsx'
const HOURS = { title: 'Opening hours', line: 'Every day, 10:00 to 16:00' }
const LINES = ['Foundry Lane, Coalbrook', 'Run by volunteers since 1987']

function missingExport(page, name, task) {
  const near = nearName(page, name)
  return detail(
    `App.jsx exports ${name}`,
    false,
    near
      ? `App.jsx exports ${near}, not ${name}. The task needs the name exactly as written, starting with a capital letter.`
      : `App.jsx has no export called ${name} yet${task}. Write the whole function below App, with export in front of it, so the screen and the check can use it.`,
    `exports found: ${Object.keys(page.window.mod ?? {}).join(', ') || '(none)'}`
  )
}

/** What is wrong with OpeningHours drawn on its own, or null. */
function hoursProblem(page) {
  const { root, warnings } = draw(page, 'OpeningHours')
  const html = root.innerHTML || '(nothing)'
  if (!root.children.length) {
    return {
      message:
        'OpeningHours drew nothing. A component hands React its markup by returning it: look at what the function returns.',
      output: html
    }
  }
  const classWarning = warnings.filter((line) => WARNING.domProperty.test(line))
  if (classWarning.length) {
    return {
      message:
        'React warned about an attribute name. JSX is JavaScript, so a few HTML attributes have other names there; the lesson lists them.',
      output: classWarning.map(shorten).join('\n')
    }
  }
  const section = root.querySelector('section.hours')
  if (!section) {
    return {
      message: 'There is no section with the class hours in what OpeningHours returns.',
      output: `drawn: ${childList(root)}`
    }
  }
  const h2 = section.querySelector('h2')
  const p = section.querySelector('p')
  if (!h2 || !same(h2.textContent, HOURS.title) || !p || !same(p.textContent, HOURS.line)) {
    return {
      message:
        'The section is there, but its heading or its line does not read as the task says. The heading is an h2, the line a paragraph, both inside the section.',
      output: `h2: ${h2 ? clean(h2.textContent) : '(none)'}\np: ${p ? clean(p.textContent) : '(none)'}`
    }
  }
  return null
}

export const checks = {
  async 'show-app'(t) {
    const { page, problem } = await openScreen(t, { [FILE]: 'grader/App.jsx' })
    if (problem) return [problem]
    const root = page.$('#root')
    const drawn = page.$('.grader-app')
    const functionWarnings = warningsOf(page.logs, WARNING.functionChild)
    let message = 'Nothing was drawn on the screen. main.jsx should make a React root on the element with the id root, then render App into it.'
    if (functionWarnings.length)
      message =
        'React was given the App function itself, not an element. Render it the way you write any component in JSX: as a tag.'
    else if (drawn && !root?.contains(drawn))
      message = 'App is on the screen, but not inside the element with the id root. Look at which element you hand to createRoot.'
    return [
      detail(
        'App is drawn inside the root element',
        Boolean(root?.contains(drawn)),
        message,
        functionWarnings.length
          ? functionWarnings.map(shorten).join('\n')
          : `inside #root: ${root ? childList(root) : '(there is no #root any more)'}`
      )
    ]
  },

  async 'opening-hours'(t) {
    const { page, problem } = await openComponent(t, FILE)
    if (problem) return [problem]
    if (exportType(page, 'OpeningHours') !== 'function') return [missingExport(page, 'OpeningHours', '')]
    const wrong = hoursProblem(page)
    return [
      detail('App.jsx exports OpeningHours', true),
      detail(
        'OpeningHours returns the opening hours section',
        !wrong,
        wrong?.message,
        wrong?.output ?? draw(page, 'OpeningHours').root.innerHTML
      )
    ]
  },

  async 'use-opening-hours'(t) {
    const { page, problem } = await openComponent(t, FILE)
    if (problem) return [problem]
    if (exportType(page, 'OpeningHours') !== 'function' || hoursProblem(page)) {
      return [
        detail(
          'OpeningHours is written',
          false,
          'Task 2 is not right yet: OpeningHours has to draw the opening hours before App can show it.'
        )
      ]
    }
    const { root, warnings } = draw(page, 'App')
    const unknown = warnings.filter((line) => WARNING.unknownTag.test(line))
    if (unknown.length) {
      return [
        detail(
          'App uses OpeningHours as a component',
          false,
          'React drew a tag it does not know instead of your component. JSX treats a tag that starts with a small letter as an HTML element.',
          unknown.map(shorten).join('\n')
        )
      ]
    }
    const h1 = root.querySelector('h1')
    const section = root.querySelector('section.hours')
    const byComponent = drawnBy(section) === 'OpeningHours'
    const below = Boolean(h1 && section && h1.compareDocumentPosition(section) & 4)
    let message = 'App does not show the opening hours yet. Use OpeningHours inside what App returns.'
    if (section && !byComponent)
      message =
        'The opening hours are on the screen, but OpeningHours did not draw them: the markup was written into App again. Use the component as a tag instead.'
    else if (section && !h1) message = 'The opening hours are there, but the heading Coalbrook Tram Museum is gone. Keep it.'
    else if (section && !below) message = 'The opening hours are drawn above the heading. They go under it.'
    return [
      detail(
        'App shows OpeningHours under the heading',
        byComponent && below,
        message,
        `App draws: ${childList(root.firstElementChild)}${section ? `\nthe hours section is drawn by: ${drawnBy(section)}` : ''}`
      )
    ]
  },

  async 'footer-lines'(t) {
    const { page, problem } = await openComponent(t, FILE)
    if (problem) {
      problem.message +=
        ' When the line is where two elements are returned side by side, read "One element comes back" in the lesson.'
      return [problem]
    }
    if (exportType(page, 'FooterLines') !== 'function') return [missingExport(page, 'FooterLines', '')]

    const alone = draw(page, 'FooterLines')
    const elements = [...alone.root.children]
    const texts = elements.map((el) => clean(el.textContent))
    const keyWarnings = alone.warnings.filter((line) => WARNING.key.test(line))
    const twoLines =
      elements.length === 2 &&
      elements.every((el) => el.tagName === 'P') &&
      LINES.every((line, i) => same(texts[i], line))
    let message = 'FooterLines should give back two paragraphs with the two lines of the task, in that order.'
    if (keyWarnings.length)
      message =
        'React warned about keys, so FooterLines returned a list. Two lines are not a list: there is a way to return them with nothing around them and no keys.'
    else if (elements.length === 1 && elements[0].querySelectorAll('p').length === 2)
      message =
        'The two lines are wrapped in an extra element. They go straight into the footer, with nothing around them.'
    else if (!elements.length) message = 'FooterLines drew nothing. Look at what the function returns.'

    const results = [
      detail('App.jsx exports FooterLines', true),
      detail(
        'FooterLines returns the two lines with nothing around them',
        twoLines && !keyWarnings.length,
        message,
        keyWarnings.length
          ? keyWarnings.map(shorten).join('\n')
          : `drawn: ${childList(alone.root)}\n${texts.map((text) => `- ${text}`).join('\n')}`
      )
    ]
    if (!twoLines || keyWarnings.length) return results

    const { root } = draw(page, 'App')
    const footer = root.querySelector('footer.footer')
    const inside = [...(footer?.children ?? [])]
    const placed =
      inside.length === 2 && inside.every((el) => el.tagName === 'P' && drawnBy(el) === 'FooterLines')
    results.push(
      detail(
        'App shows FooterLines in its footer',
        placed,
        inside.length && !inside.every((el) => drawnBy(el) === 'FooterLines')
          ? 'The footer has lines in it, but FooterLines did not draw them. Use the component as a tag inside the footer.'
          : 'The footer in App should hold FooterLines, and nothing else.',
        `inside the footer: ${footer ? childList(footer) : '(there is no footer with the class footer)'}`
      )
    )
    return results
  }
}
