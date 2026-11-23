import { clean, detail, explain, missingExport, openScreen, press, runaway, show, wait } from '../../grading.mjs'

// The check's own members, so no member of the lido's can be typed in as the answer.
const MEMBERS = [
  { id: 'y-1', name: 'Wilhelmina Featherstone' },
  { id: 'y-2', name: 'Willa Ingleby' },
  { id: 'y-3', name: 'Rosalind Fairley' },
  { id: 'y-4', name: 'Rowena Achebe' },
  { id: 'y-5', name: 'Osric Tanaka' },
  { id: 'y-6', name: 'Oswin Sefa' },
  { id: 'y-7', name: 'Quentin Whitlow' },
  { id: 'y-8', name: 'Calla Corrigan' }
]
const HISTORY = {
  'y-2': ['Sun 3 Aug, early birds'],
  'y-3': ['Mon 4 Aug, lunchtime', 'Thu 7 Aug, lunchtime'],
  'y-4': ['Tue 5 Aug, evening', 'Wed 6 Aug, evening', 'Sat 9 Aug, morning'],
  'y-5': ['Fri 8 Aug, lessons'],
  'y-8': ['Mon 4 Aug, morning', 'Sun 10 Aug, early birds']
}
const byName = (name) => MEMBERS.find((m) => m.name.startsWith(name))
const matching = (text) => MEMBERS.filter((m) => m.name.toLowerCase().includes(text.toLowerCase())).map((m) => m.name)

async function searchPage(t) {
  const { page, problem } = await openScreen(t, 'src/MemberSearch.jsx', { 'src/members.js': 'grader/members.js' })
  if (problem) return { problem }
  const missing = missingExport(page, 'MemberSearch.jsx', 'MemberSearch')
  if (missing) return { problem: missing }
  page.window.desk.members = structuredClone(MEMBERS)
  page.window.desk.history = structuredClone(HISTORY)
  return { page }
}

const stopped = (error) => detail('The member search runs without errors', false, explain(error), error)
// The grader hands a promise nobody caught to every open page, so one is another task's request
// and says nothing about this page.
const ownError = (page, before) => page.errors.slice(before).find((e) => !e.startsWith('Uncaught (in promise)')) ?? null
const desk = (page) => page.window.desk
const box = (page) => page.$('#root input.search-box')
const results = (page) => page.$$('#root button.result').map((b) => clean(b.textContent))
const cardName = (page) => clean(page.$('#root .member-name')?.textContent)
const visitsShown = (page) => page.$$('#root .visits li').map((li) => clean(li.textContent))
const listText = (page) => `list: ${results(page).join(', ') || '(empty)'}`
const cardText = (page) =>
  cardName(page)
    ? `card: ${cardName(page)}, ${page.$('#root .loading') ? 'loading' : `visits: ${visitsShown(page).join(' | ') || '(none)'}`}`
    : 'card: (no member)'
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
const search = (page, text) => desk(page).searches.findLast((r) => r.text.trim().toLowerCase() === text.toLowerCase())
const visitsOf = (page, id) => desk(page).visits.findLast((r) => r.id === id)

/**
 * Types into the search box one letter at a time, starting from what is there; `<` takes a letter
 * away. With `pause`, a second of the check's clock passes after each, as when someone types
 * slowly, so a search held back by a timer goes out too.
 */
async function typeOn(page, letters, pause = false) {
  for (const letter of letters) {
    const now = box(page).value
    await page.type(box(page), letter === '<' ? now.slice(0, -1) : now + letter)
    if (pause) await wait(page, 1000)
  }
}

/** One detail when typing sent no request for `text`, saying whether a timer held it back. */
function notAsked(page, text, log) {
  const waiting = page.window.clock.timers.size > 0
  return detail(
    'Each search goes out as soon as it is typed',
    false,
    waiting
      ? `"${text}" was typed and no search went out for it: the screen waited on a timer before asking. That makes the desk slower and does not stop old answers from coming last. Ask at once, and deal with the old answer when it comes.`
      : `"${text}" was typed and no search went out for it. Each change of the text asks the membership system with searchMembers.`,
    log.join('\n')
  )
}

/**
 * Task 1: types searches, answers them in the order given, and compares the list with what was
 * typed last. The details, or one detail for what went wrong first.
 */
async function searches(page) {
  const logsBefore = page.logs.length
  const before = page.errors.length
  const error = await show(page, 'MemberSearch')
  if (error) return [stopped(error)]
  if (!box(page)) return [detail('The search box is there', false, 'The search box is gone. Keep the input with the class search-box.')]
  const log = []
  const rounds = [
    { type: 'Wi', answer: ['Wi', 'W'], want: 'Wi', say: 'typed W, i; "Wi" answered first, then "W"' },
    { type: 'lh', answer: ['Wilh', 'Wil'], want: 'Wilh', say: 'typed l, h; "Wilh" answered first, then "Wil"' },
    { type: '<<', answer: ['Wi', 'Wil'], want: 'Wi', say: 'took two letters away; "Wi" answered first, then "Wil"' },
    { type: 'Ro', clear: true, answer: ['Ro', 'R'], want: '', say: 'emptied the box, typed R, o, emptied it again; "Ro" answered, then "R"' },
    { type: 'Os', fresh: true, answer: ['O', 'Os'], want: 'Os', say: 'emptied the box, typed O, s; "O" answered first, then "Os"' }
  ]
  for (const round of rounds) {
    if (round.clear || round.fresh) await page.type(box(page), '')
    await typeOn(page, round.type, true)
    if (round.clear) await page.type(box(page), '')
    const asked = round.answer.map((text) => search(page, text))
    const missing = round.answer.find((text, i) => !asked[i])
    if (missing) return [notAsked(page, missing, [...log, round.say.split(';')[0]])]
    for (const request of asked) {
      request.answer()
      await page.settle()
    }
    if (ownError(page, before)) return [stopped(ownError(page, before))]
    const loop = await runaway(page, logsBefore, 'The member search')
    if (loop) return [loop]
    log.push(`${round.say}:\n  ${listText(page)}`)
    const want = round.want ? matching(round.want) : []
    if (!sameList(results(page), want)) {
      const older = round.answer[1]
      let message
      if (round.want === '')
        message = `The box was emptied while two searches were still out, and when their answers came the list filled up again. An answer to a search nobody wants any more must change nothing.`
      else if (round.answer[0] === round.want)
        message = `The results for "${older}" arrived after the results for "${round.want}", and the list showed them, or a part of them, though "${round.want}" was typed last. Each answer is put on the screen whenever it comes, whatever was typed since. When the text changes, React runs the effect's cleanup: that is the moment the old search stops being wanted.`
      else message = `"${round.want}" was typed last and its answer came last, and the list did not show its results.`
      return [detail('The list shows the search typed last', false, message, log.join('\n'))]
    }
  }
  return [detail('The list shows the search typed last, whatever order the answers come in', true, '', log.join('\n'))]
}

export const checks = {
  async search(t) {
    const { page, problem } = await searchPage(t)
    if (problem) return [problem]
    return searches(page)
  },

  async visits(t) {
    const { page, problem } = await searchPage(t)
    if (problem) return [problem]
    const logsBefore = page.logs.length
    const before = page.errors.length
    const error = await show(page, 'MemberSearch')
    if (error) return [stopped(error)]
    if (!box(page)) return [detail('The search box is there', false, 'The search box is gone. Keep the input with the class search-box.')]
    await typeOn(page, 'a', true)
    const asked = search(page, 'a')
    if (!asked) return [notAsked(page, 'a', [])]
    asked.answer()
    await page.settle()
    const log = [`typed a, answered: ${listText(page)}`]
    if (!sameList(results(page), matching('a'))) {
      return [detail('A search shows its results', false, 'One search was typed and answered, and the list did not show its results.', log.join('\n'))]
    }
    const pickName = (name) => press(page, page.$$('#root button.result').find((b) => clean(b.textContent) === byName(name).name))
    const rounds = [
      { pick: ['Rowena', 'Osric'], answer: ['Osric', 'Rowena'], want: 'Osric' },
      { pick: ['Calla', 'Rosalind'], answer: ['Calla', 'Rosalind'], want: 'Rosalind' },
      { pick: ['Willa'], answer: ['Willa'], want: 'Willa' }
    ]
    for (const round of rounds) {
      for (const name of round.pick) {
        if (!(await pickName(name))) {
          return [detail('Each result is a button', false, 'The results have no button with the class result to pick a member with. Keep them.', log.join('\n'))]
        }
      }
      const requests = round.answer.map((name) => visitsOf(page, byName(name).id))
      const missing = round.answer.find((_, i) => !requests[i])
      if (missing) {
        return [
          detail('Picking a member asks for their visits', false, `${byName(missing).name} was picked and no request for their visits went out.`, log.join('\n'))
        ]
      }
      for (const request of requests) {
        request.answer()
        await page.settle()
      }
      if (ownError(page, before)) return [stopped(ownError(page, before))]
      const loop = await runaway(page, logsBefore, 'The member search')
      if (loop) return [loop]
      const said = round.pick.length > 1 ? `picked ${round.pick.join(', then ')}; ${round.answer.join("'s visits answered first, then ")}'s` : `picked ${round.pick[0]}; answered`
      log.push(`${said}:\n  ${cardText(page)}`)
      const want = byName(round.want)
      const right = cardName(page) === want.name && sameList(visitsShown(page), HISTORY[want.id] ?? [])
      if (!right) {
        const late = round.answer[1] !== round.want ? byName(round.answer[1]).name : null
        return [
          detail(
            'The card shows the visits of the member picked last',
            false,
            late
              ? `${late}'s visits arrived after ${want.name}'s, and the card showed them under ${want.name}'s name. Each answer is put on the card whenever it comes, whoever was picked since. When the member picked changes, React runs the effect's cleanup: that is the moment the old request stops being wanted.`
              : `${want.name} was picked last and their visits came last, and the card did not show them.`,
            log.join('\n')
          )
        ]
      }
    }
    return [detail('The card shows the visits of the member picked last', true, '', log.join('\n'))]
  },

  async 'first-answer'(t) {
    const { page, problem } = await searchPage(t)
    if (problem) return [problem]
    const first = (await searches(page)).find((d) => !d.passed)
    if (first) {
      return [
        /stops |runs without errors|loads|is there|as soon as/.test(first.name)
          ? first
          : detail('The list shows the search typed last', false, 'The list does not show the search typed last yet. That is the first task of this issue: do it first.')
      ]
    }
    const logsBefore = page.logs.length
    const before = page.errors.length
    const error = await show(page, 'MemberSearch')
    if (error) return [stopped(error)]
    const log = []

    await typeOn(page, 'Qu')
    const locked = box(page).disabled || box(page).readOnly
    log.push(`typed Q, u: box "${box(page).value}"${locked ? ', locked' : ''}`)
    if (locked || box(page).value !== 'Qu') {
      return [
        detail(
          'The box takes every letter while a search is out',
          false,
          'While a search was out, the search box did not take every letter typed. Staff type at their own speed: the box stays free, and the old answer is dealt with when it comes.',
          log.join('\n')
        )
      ]
    }
    const q = search(page, 'Q')
    const qu = search(page, 'Qu')
    if (!q || !qu) return [notAsked(page, q ? 'Qu' : 'Q', log)]
    qu.answer()
    await page.settle()
    log.push(`"Qu" answered while "Q" was still out: ${listText(page)}`)
    if (!sameList(results(page), matching('Qu'))) {
      return [
        detail(
          'An answer still wanted shows at once',
          false,
          'The answer for "Qu", the search typed last, came while an older search was still out, and the list did not show it. Only answers nobody wants any more are left out; the one still wanted shows as soon as it comes.',
          log.join('\n')
        )
      ]
    }
    q.answer()
    await page.settle()
    log.push(`then "Q" answered: ${listText(page)}`)

    await page.type(box(page), '')
    await typeOn(page, 'C')
    const c = search(page, 'C')
    if (!c) return [notAsked(page, 'C', log)]
    c.answer()
    await page.settle()
    log.push(`emptied the box, typed C, answered: ${listText(page)}`)
    if (!sameList(results(page), matching('C'))) {
      return [
        detail('A new search shows its first answer', false, 'After the box was emptied, a new search was typed and answered, and its results did not show.', log.join('\n'))
      ]
    }
    await press(page, page.$$('#root button.result').find((b) => clean(b.textContent) === byName('Calla').name))
    const calla = visitsOf(page, byName('Calla').id)
    if (!calla) return [detail('Picking a member asks for their visits', false, 'Calla Corrigan was picked and no request for her visits went out.', log.join('\n'))]
    calla.answer()
    await page.settle()
    if (ownError(page, before)) return [stopped(ownError(page, before))]
    const loop = await runaway(page, logsBefore, 'The member search')
    if (loop) return [loop]
    log.push(`picked Calla, answered: ${cardText(page)}`)
    const shown = cardName(page) === byName('Calla').name && sameList(visitsShown(page), HISTORY[byName('Calla').id])
    return [
      detail(
        'Every answer still wanted shows at once',
        shown,
        'A member was picked and their visits came, with nothing else out, and the card did not show them.',
        log.join('\n')
      )
    ]
  }
}
