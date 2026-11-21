// The checks swap in their own src/routes.js, so filters tied to the learner's own data fail.
const ALL = [
  'Quartz Ladder',
  'Pocket <Rocket>',
  'Overhang Eleven',
  'Soft Landing',
  'Sidepull Saga',
  'Wide Side Story'
]

async function open(t, data = 'grader/routes.js') {
  const dir = await t.sandbox({ 'src/routes.js': t.chapterPath(data) })
  return t.page('index.html', { dir })
}

const clean = (text) => (text ?? '').replace(/\s+/g, ' ').trim()
const isShown = (page, element) =>
  !!element && !element.closest('[hidden]') && page.style(element).display !== 'none'
const visible = (page) =>
  page
    .$$('#route-list > li')
    .filter((item) => isShown(page, item))
    .map((item) => item.querySelector('.route-name')?.textContent ?? clean(item.textContent))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const show = (names) => (names.length ? names.join(', ') : '(no routes shown)')

function runs(page) {
  return {
    name: 'The page runs without errors',
    passed: page.errors.length === 0,
    message: 'The page threw an error. Open the console in the Browser panel and read the first one.',
    output: page.errors.join('\n')
  }
}

/** Sets the search box the way a keystroke does: an input event and no change event. */
async function key(page, value) {
  const box = page.$('#search')
  box.value = value
  box.dispatchEvent(new page.window.Event('input', { bubbles: true }))
  await page.settle()
}

function shows(name, page, expected, message, setup) {
  const got = visible(page)
  return {
    name,
    passed: same(got, expected),
    message,
    output: `${setup}\nexpected ${show(expected)}\ngot      ${show(got)}`
  }
}

export const checks = {
  async 'search-names'(t) {
    const page = await open(t)
    const details = [runs(page)]
    await key(page, '  side ')
    details.push(
      shows(
        'Typing narrows the list',
        page,
        ['Sidepull Saga', 'Wide Side Story'],
        'While someone types in #search, only routes whose name contains the text should stay on the board. The check sends input events, the ones a keystroke fires. Spaces around the text do not count.',
        'search: "  side "'
      )
    )
    await key(page, 'OVERHANG')
    details.push(
      shows(
        'Search ignores upper and lower case',
        page,
        ['Overhang Eleven'],
        'Searching in capitals should find the same routes as searching in small letters.',
        'search: "OVERHANG"'
      )
    )
    await key(page, '')
    details.push(
      shows(
        'An empty search shows every route',
        page,
        ALL,
        'Clearing the search box should bring every route back, in the original order.',
        'search: ""'
      )
    )

    const ticks = await open(t)
    const tick = ticks.$('#route-list li[data-id="g-41"] .tick')
    if (tick) await ticks.click(tick)
    await key(ticks, 'saga')
    const whileHidden = clean(ticks.$('#tick-count')?.textContent)
    await key(ticks, '')
    const after = ticks.$('#route-list li[data-id="g-41"] .tick')?.getAttribute('aria-pressed')
    details.push({
      name: 'A tick survives a search',
      passed: after === 'true' && whileHidden === '1 of 6 ticked',
      message: 'Ticking a route, searching it out of view and clearing the search should leave it ticked, and the count covers every route, not only the ones shown.',
      output: `count while searching "saga": "${whileHidden}"\nQuartz Ladder aria-pressed after clearing: ${after}`
    })
    return details
  },

  async 'grade-band'(t) {
    const page = await open(t)
    const details = [runs(page)]
    if (!page.$('#grade-filter') || !page.$('#search')) {
      return [
        ...details,
        { name: 'The filters are on the page', passed: false, message: 'Keep #search and #grade-filter in index.html.' }
      ]
    }
    const cases = [
      ['', 'hard', ['Overhang Eleven', 'Sidepull Saga'], 'Hard is V6 and up, two-digit grades too.'],
      ['', 'easy', ['Quartz Ladder', 'Soft Landing'], 'Easy is V0 to V2, and V2 counts.'],
      ['side', 'mid', ['Wide Side Story'], 'The search and the grade apply together: a route must pass both.'],
      ['', '', ALL, 'Any grade with an empty search shows every route again.']
    ]
    for (const [text, band, expected, why] of cases) {
      await page.type('#search', text)
      await page.type('#grade-filter', band)
      details.push(
        shows(
          `Grade "${band || 'any'}"${text ? ` with search "${text}"` : ''}`,
          page,
          expected,
          `Picking a band in #grade-filter should narrow the board. ${why}`,
          `search: "${text}", grade: "${band}"`
        )
      )
    }
    return details
  },

  async 'no-match'(t) {
    const page = await open(t)
    await page.type('#search', 'zzz')
    const noneShown = visible(page)
    const lineShown = isShown(page, page.$('#no-match'))
    const emptyWhileSearching = isShown(page, page.$('#board-empty'))
    await page.type('#search', '')
    const lineAfter = isShown(page, page.$('#no-match'))

    const bare = await open(t, 'grader/no-routes.js')
    return [
      runs(page),
      {
        name: 'Nothing matching shows the line',
        passed: noneShown.length === 0 && lineShown && !emptyWhileSearching,
        message: 'When the search matches no route, the list shows nothing and #no-match is visible. #board-empty stays hidden, because the wall is not empty.',
        output: `search "zzz": routes shown: ${show(noneShown)}, #no-match visible: ${lineShown}, #board-empty visible: ${emptyWhileSearching}`
      },
      {
        name: 'The line goes away when routes match again',
        passed: !lineAfter && visible(page).length === ALL.length,
        message: 'After the search is cleared, #no-match should be hidden again.',
        output: `#no-match visible after clearing: ${lineAfter}`
      },
      {
        name: 'An empty wall is not a failed search',
        passed: isShown(bare, bare.$('#board-empty')) && !isShown(bare, bare.$('#no-match')),
        message: 'With no routes at all, #board-empty shows and #no-match stays hidden.',
        output: `#board-empty visible: ${isShown(bare, bare.$('#board-empty'))}, #no-match visible: ${isShown(bare, bare.$('#no-match'))}`
      }
    ]
  }
}
