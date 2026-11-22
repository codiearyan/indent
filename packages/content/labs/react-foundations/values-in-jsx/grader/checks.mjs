import { WARNING, clean, detail, openScreen, same, shorten, warningsOf } from '../../grading.mjs'
import { today as A } from './today-a.mjs'
import { today as B } from './today-b.mjs'

const pence = (n) => `£${(n / 100).toFixed(2)}`

/** The board drawn with each of the check's own days, or one detail saying why it could not be. */
async function boards(t) {
  const shown = []
  for (const [data, file] of [
    [A, 'grader/today-a.mjs'],
    [B, 'grader/today-b.mjs']
  ]) {
    const { page, problem } = await openScreen(t, { 'src/today.js': file })
    if (problem) return { problem }
    const board = page.$('.board')
    if (!board) {
      return {
        problem: detail(
          'The ride board is on the screen',
          false,
          'There is no element with the class board on the screen any more. Keep the section that RideBoard returns.'
        )
      }
    }
    shown.push({ data, page, board })
  }
  return { shown }
}

const text = (board, selector) => clean(board.querySelector(selector)?.textContent ?? '(missing)')

/** Why a line does not show the check's data, in plain words. */
function why(found, want, field, hint) {
  if (/\btoday\.|\bformatPence\b/.test(found))
    return `The board shows the name of a value as text instead of the value. Without curly braces, JSX writes ${field} as it is.`
  if (/NaN/.test(found))
    return 'The board shows NaN: a sum used something that is not a number. Look at the field names you read from today, and do sums on numbers, not on text.'
  const bare = (line) => line.toLowerCase().replace(/[^a-z0-9£.]+/g, ' ').trim()
  if (bare(found) === bare(want))
    return 'The values follow the day, but the words around them are not written as the task says. Compare the line with the task, commas and spaces included.'
  return `The check gave the board a different day, and this line did not follow it. ${hint}`
}

function lineCheck(name, shown, selector, expected, field, hint) {
  const rows = shown.map(({ data, board }) => ({ found: text(board, selector), want: expected(data) }))
  const bad = rows.find((row) => !same(row.found, row.want))
  return detail(
    name,
    !bad,
    bad && why(bad.found, bad.want, field, hint),
    rows.map((row) => `expected: ${row.want}\nshown:    ${row.found}`).join('\n')
  )
}

export const checks = {
  async 'todays-tram'(t) {
    const { shown, problem } = await boards(t)
    if (problem) return [problem]
    return [
      lineCheck('The heading shows the date', shown, 'h2', (d) => d.date, 'the date', 'The heading shows the date from today.'),
      lineCheck(
        "The tram line shows today's tram",
        shown,
        '.tram',
        (d) => `No. ${d.tram.number}, ${d.tram.name}`,
        "the tram's number and name",
        "The line shows the number and the name of today's tram."
      )
    ]
  },

  async 'ride-times'(t) {
    const { shown, problem } = await boards(t)
    if (problem) return [problem]
    return [
      lineCheck(
        'Shows the first and the last ride',
        shown,
        '.times',
        (d) => `First ride ${d.firstRide}, last ride ${d.lastRide}`,
        'each time',
        'Both times come from today.'
      ),
      lineCheck(
        'Works out how often a tram runs',
        shown,
        '.every',
        (d) => `A tram every ${60 / d.ridesPerHour} minutes`,
        'the number of minutes',
        'The minutes are worked out from ridesPerHour, so the line changes when the tram runs more often.'
      )
    ]
  },

  async fares(t) {
    const { shown, problem } = await boards(t)
    if (problem) return [problem]
    const functions = shown.flatMap(({ page }) => warningsOf(page.logs, WARNING.functionChild))
    if (functions.length) {
      return [
        detail(
          'Shows the fares',
          false,
          'React was handed the formatPence function itself and showed nothing for it. A function in curly braces has to be called to give a value.',
          [...new Set(functions.map(shorten))].join('\n')
        )
      ]
    }
    const result = lineCheck(
      'Shows the adult and child fares',
      shown,
      '.fare',
      (d) => `Adult ${pence(d.farePence)}, child ${pence(d.farePence / 2)}`,
      'each fare',
      'Both fares are worked out from farePence in today.'
    )
    const found = shown.map(({ board }) => text(board, '.fare'))
    const unformatted = found.some((line) => /\d/.test(line) && !/£\d+\.\d\d\b/.test(line))
    if (!result.passed && unformatted && !/today\./.test(found.join(' ')))
      result.message =
        'The fares are not written the way the screen writes money. Pass each amount in pence through formatPence.'
    return [result]
  },

  async 'tram-photo'(t) {
    const { shown, problem } = await boards(t)
    if (problem) return [problem]
    const rows = shown.map(({ data, board }) => {
      const img = board.querySelector('img')
      return { data, src: img?.getAttribute('src'), alt: img?.getAttribute('alt') }
    })
    const bad = rows.find((row) => row.src !== row.data.tram.photo || !same(row.alt ?? '', row.data.tram.name))
    let message = "The check gave today a different tram, and the image did not follow it. Its src is the tram's photo and its alt the tram's name, both from today."
    if (bad && !bad.src) message = 'There is no img on the board any more. Keep it, and give it its values from today.'
    else if (bad && /today/.test(`${bad.src} ${bad.alt}`))
      message = 'The image got the words you wrote, not the values. An attribute in quotes is text; a value from JavaScript goes in curly braces instead.'
    return [
      detail(
        "The image shows today's tram",
        !bad,
        message,
        rows
          .map((row) => `expected: src=${row.data.tram.photo} alt=${row.data.tram.name}\nshown:    src=${row.src ?? "(none)"} alt=${row.alt ?? "(none)"}`)
          .join('\n')
      )
    ]
  },

  async livery(t) {
    const { shown, problem } = await boards(t)
    if (problem) return [problem]
    const names = shown.flatMap(({ page }) => warningsOf(page.logs, WARNING.styleName))
    if (names.length) {
      return [
        detail(
          "The strip is painted in the tram's colour",
          false,
          'React warned about a style name. In a JSX style object, CSS names are written in camelCase.',
          [...new Set(names.map(shorten))].join('\n')
        )
      ]
    }
    const rows = shown.map(({ data, page, board }) => {
      const strip = board.querySelector('.livery')
      const want = page.document.createElement('div').style
      want.background = data.tram.livery
      return { strip, found: strip?.style.backgroundColor || '(none)', want: want.backgroundColor }
    })
    const bad = rows.find((row) => row.found !== row.want)
    return [
      detail(
        "The strip is painted in the tram's colour",
        !bad,
        bad && !bad.strip
          ? 'There is no element with the class livery on the board any more. Keep it.'
          : "The check gave today a tram of another colour, and the strip did not follow it. Its background comes from the tram's livery, set with the style attribute.",
        rows.map((row) => `expected: ${row.want}\nshown:    ${row.found}`).join('\n')
      )
    ]
  }
}
