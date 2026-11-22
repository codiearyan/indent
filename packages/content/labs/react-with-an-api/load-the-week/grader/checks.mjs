import {
  WEEK,
  copy,
  detail,
  openApp,
  pageError,
  pageText,
  requestList,
  screen,
  studio,
  titles
} from '../../shared/checks-lib.mjs'

const TITLES = WEEK.map((workshop) => workshop.title)
const EMPTY = /no workshops/i

const noRequest = (api) =>
  detail(
    'The screen asks for the workshops',
    false,
    'No request for the workshops reached the API, so there was nothing to check here yet. Task 1 is not right yet.',
    requestList(api.requests)
  )

const notAList = (page) =>
  page.errors.some((error) => /\.map is not a function|not iterable/i.test(error))

export const checks = {
  async 'ask-once'(t) {
    const api = studio(() => [200, copy(WEEK)])
    const page = await openApp(t, api)
    await page.settle(150)
    if (!api.requests.length && page.errors.length) return [pageError(page)]

    const lists = api.lists()
    const asked = lists.length > 0
    const elsewhere = api.requests.filter((r) => r.path !== '/api/workshops')
    return [
      detail(
        'Asks GET /api/workshops when the screen opens',
        asked,
        elsewhere.length
          ? 'A request went out, but not to /api/workshops, where the studio API keeps the list. Look at the address you pass to fetch.'
          : 'No request reached the API after the screen opened. Look at where your fetch call sits: it has to run once the screen appears, without anyone clicking anything.',
        requestList(api.requests)
      ),
      detail(
        'Asks only once',
        lists.length === 1,
        asked
          ? `The screen asked for the workshops ${lists.length >= 60 ? 'over and over' : `${lists.length} times`} while it stayed open. Something runs the request again after every render. It should run once, when the screen first appears.`
          : 'There was no request to count yet.',
        `requests to /api/workshops: ${lists.length}${page.errors.length ? `\n${page.errors[0]}` : ''}`
      )
    ]
  },

  async 'show-workshops'(t) {
    const api = studio(() => [200, copy(WEEK)])
    const page = await openApp(t, api)
    await page.settle(100)
    if (!api.lists().length) return [page.errors.length ? pageError(page) : noRequest(api)]
    if (notAList(page)) {
      return [
        detail(
          'Shows the workshops the API sent',
          false,
          'The page stopped when it tried to draw the workshops: what it holds as the list is not an array. Look at what response.json() gives back, and what you put into state.',
          page.errors.join('\n')
        )
      ]
    }
    const broken = pageError(page)
    if (broken) return [broken]

    const shown = titles(page)
    return [
      detail(
        'Shows the workshops the API sent, in its order',
        JSON.stringify(shown) === JSON.stringify(TITLES),
        shown.length === 0
          ? `The API answered with ${WEEK.length} workshops your code has never seen, but no workshop is on the screen. Follow the answer after it arrives: the screen only draws again when state changes, and what goes into state has to be the list itself. response.json() gives a promise of the list, not the list.`
          : 'The screen shows workshops, but not the ones the API answered with, or not in its order. Draw one card for each workshop of the answer, as it came.',
        screen(page)
      ),
      detail(
        'Each card has a key the list can follow',
        !page.logs.some((line) => /unique "key" prop/.test(line)),
        'React warned that the cards in the list have no key. Give each card the id of its workshop as its key.',
        page.logs.filter((line) => /key/.test(line)).join('\n') || '(no warning)'
      )
    ]
  },

  async 'empty-week'(t) {
    let waiting
    const api = studio((request) => {
      waiting = request
      return 'hold'
    })
    const page = await openApp(t, api)
    await page.settle(50)
    if (!waiting) return [page.errors.length ? pageError(page) : noRequest(api)]

    const beforeAnswer = pageText(page)
    waiting.answer(200, [])
    await page.settle(50)
    const afterEmpty = pageText(page)
    const emptyErrors = [...page.errors]
    page.close()

    const full = studio(() => [200, copy(WEEK)])
    const second = await openApp(t, full)
    await second.settle(100)
    const withWorkshops = pageText(second)

    return [
      detail(
        'Says nothing about an empty week before the answer arrives',
        !EMPTY.test(beforeAnswer),
        'While the answer was still on its way, the screen already said there are no workshops. At that moment it does not know yet. Look at the value the workshops start from: it has to tell "not here yet" apart from "here, and empty".',
        `while waiting: ${beforeAnswer}`
      ),
      detail(
        'Says the week is empty when the answer is an empty list',
        EMPTY.test(afterEmpty) && emptyErrors.length === 0,
        'The API answered with an empty list, and the screen should then say there are no workshops this week. If the screen does not change at all when an answer arrives, task 2 is not right yet.',
        `after an empty answer: ${afterEmpty}${emptyErrors.length ? `\n${emptyErrors[0]}` : ''}`
      ),
      detail(
        'Does not say the week is empty when it has workshops',
        !EMPTY.test(withWorkshops),
        'The API answered with workshops, and the screen still said there are none.',
        `after an answer with workshops: ${withWorkshops}`
      )
    ]
  }
}
