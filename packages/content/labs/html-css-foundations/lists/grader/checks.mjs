const BRING = ['apron', 'towel', 'hair tie', 'bag']
const STEPS = ['wedge', 'centre', 'walls', 'dry']
const SHELVES = [
  { name: 'Mugs', kinds: ['small', 'tall'] },
  { name: 'Bowls', kinds: ['cereal', 'serving'] }
]

const clean = (text) => text.replace(/\s+/g, ' ').trim()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
const lower = (el) => clean(el.textContent).toLowerCase()
const items = (list) => [...list.children].filter((el) => el.tagName === 'LI')

/** The text of a list item without the lists inside it. */
function ownText(li) {
  return clean(
    [...li.childNodes]
      .filter((node) => !(node.nodeType === 1 && ['UL', 'OL'].includes(node.tagName)))
      .map((node) => node.textContent)
      .join(' ')
  ).toLowerCase()
}

/** The list whose items hold every word, each in a different item. */
function listWith(page, words) {
  return page.$$('ul, ol').find((list) => {
    const texts = items(list).map(ownText)
    const at = words.map((word) => texts.findIndex((text) => text.includes(word)))
    return at.every((i) => i !== -1) && new Set(at).size === words.length
  })
}

const describe = (list) =>
  list
    ? `<${list.tagName.toLowerCase()}> with ${items(list).length} items:\n${items(list).map(ownText).join('\n')}`
    : 'No list holds them yet'

export const checks = {
  async 'bring-list'(t) {
    const page = await t.page()
    const list = listWith(page, BRING)
    return [
      detail(
        'Each thing to bring is a list item',
        Boolean(list),
        'The four things to bring should each be one item of one list. Keep their words as they are.',
        describe(list)
      ),
      detail(
        'The list is a bulleted one',
        list?.tagName === 'UL',
        list
          ? 'The order of the things to bring does not matter. Pick the list for items in no special order.'
          : 'Make the list first.',
        list ? `<${list.tagName.toLowerCase()}>` : 'not found'
      )
    ]
  },

  async steps(t) {
    const page = await t.page()
    const list = listWith(page, STEPS)
    const texts = list ? items(list).map(ownText) : []
    const at = STEPS.map((step) => texts.findIndex((text) => text.includes(step)))
    const inOrder = list && at.every((i, n) => n === 0 || i > at[n - 1])
    return [
      detail(
        'Each step of the class is a list item',
        Boolean(list),
        'The four steps of a first wheel class should each be one item of one list.',
        describe(list)
      ),
      detail(
        'The steps are numbered, in order',
        list?.tagName === 'OL' && Boolean(inOrder),
        !list
          ? 'Make the list first.'
          : list.tagName !== 'OL'
            ? 'Here the order matters. Pick the list that numbers its items.'
            : 'The steps are out of order. Follow the order Kofi wrote them in.',
        describe(list)
      )
    ]
  },

  async nested(t) {
    const page = await t.page()
    const outer = page
      .$$('ul, ol')
      .find((list) => ['mugs', 'bowls', 'plates'].every((word) => items(list).some((li) => ownText(li).startsWith(word))))
    const groups = SHELVES.map(({ name, kinds }) => {
      const li = outer && items(outer).find((item) => ownText(item).startsWith(name.toLowerCase()))
      const inner = li && [...li.children].find((el) => ['UL', 'OL'].includes(el.tagName))
      const ok = Boolean(inner) && kinds.every((kind) => items(inner).some((item) => lower(item).includes(kind)))
      return { name, ok, inner }
    })
    return [
      detail(
        'Mugs, bowls and plates are the items of one list',
        Boolean(outer),
        'What is on the shelves is a list of three things: mugs, bowls and plates. Each starts its own item, with its name first.',
        outer ? describe(outer) : 'No list has mugs, bowls and plates as its items'
      ),
      detail(
        'The kinds of mugs and bowls are lists inside their items',
        groups.every((group) => group.ok),
        outer
          ? 'Inside the mugs item, a list of its kinds, and the same inside the bowls item. The inner list goes inside the item, before it closes.'
          : 'Make the outer list first.',
        groups.map((group) => `${group.ok ? 'ok' : 'missing'}  ${group.name}`).join('\n')
      )
    ]
  }
}
