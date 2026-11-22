const BRING = ['apron', 'towel', 'hair tie', 'bag']
const STEPS = ['wedge', 'centre', 'walls', 'dry']
const SHELF = ['mugs', 'bowls', 'plates']
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

/** The text of a list item without the lists inside it, and without a joining "and" in front. */
function ownText(li) {
  return clean(
    [...li.childNodes]
      .filter((node) => !(node.nodeType === 1 && ['UL', 'OL'].includes(node.tagName)))
      .map((node) => node.textContent)
      .join(' ')
  )
    .toLowerCase()
    .replace(/^and\s+/, '')
}

/** How many of the words a list holds, each in a different item. */
function matches(list, words) {
  const texts = items(list).map(ownText)
  const at = words.map((word) => texts.findIndex((text) => text.includes(word)))
  return new Set(at.filter((i) => i !== -1)).size
}

/** The list whose items hold every word, or else the one that holds the most of them. */
function listWith(page, words) {
  const ranked = page
    .$$('ul, ol')
    .map((list) => ({ list, count: matches(list, words) }))
    .sort((a, b) => b.count - a.count)
  const best = ranked[0]
  if (best?.count === words.length) return { list: best.list, near: null }
  return { list: null, near: best?.count >= 2 ? best.list : null }
}

/** The words a list is missing, said once for every list task. */
function notKept(near, words, what) {
  const texts = items(near).map(ownText)
  const missing = words.filter((word) => !texts.some((text) => text.includes(word)))
  return {
    message: `The list is there, but some ${what} no longer have Kofi's words. Keep his words for each item.`,
    output: `${describe(near)}\nNot found: ${missing.join(', ')}`
  }
}

const describe = (list) =>
  list
    ? `<${list.tagName.toLowerCase()}> with ${items(list).length} items:\n${items(list).map(ownText).join('\n')}`
    : 'No list holds them yet'

export const checks = {
  async 'bring-list'(t) {
    const page = await t.page()
    const { list, near } = listWith(page, BRING)
    const kept = near && notKept(near, BRING, 'of the things to bring')
    return [
      detail(
        'Each thing to bring is a list item',
        Boolean(list),
        kept?.message ??
          'The four things to bring should each be one item of one list. Keep their words as they are.',
        kept?.output ?? describe(list)
      ),
      detail(
        'The list is a bulleted one',
        (list ?? near)?.tagName === 'UL',
        list ?? near
          ? 'The order of the things to bring does not matter. Pick the list for items in no special order.'
          : 'Make the list first.',
        list ?? near ? `<${(list ?? near).tagName.toLowerCase()}>` : 'not found'
      )
    ]
  },

  async steps(t) {
    const page = await t.page()
    const { list, near } = listWith(page, STEPS)
    const kept = near && notKept(near, STEPS, 'of the steps')
    const texts = list ? items(list).map(ownText) : []
    const at = STEPS.map((step) => texts.findIndex((text) => text.includes(step)))
    const inOrder = list && at.every((i, n) => n === 0 || i > at[n - 1])
    const typed = texts.filter((text) => /^(step\s*)?\d+\s*[.):-]?\s/.test(text))
    return [
      detail(
        'Each step of the class is a list item',
        Boolean(list),
        kept?.message ?? 'The four steps of a first wheel class should each be one item of one list.',
        kept?.output ?? describe(list)
      ),
      detail(
        'The steps are numbered, in order',
        list?.tagName === 'OL' && Boolean(inOrder),
        !(list ?? near)
          ? 'Make the list first.'
          : (list ?? near).tagName !== 'OL'
            ? 'Here the order matters. Pick the list that numbers its items.'
            : !list
              ? "Once every step has Kofi's words, this check reads their order."
              : 'The steps are out of order. Follow the order Kofi wrote them in.',
        describe(list ?? near)
      ),
      detail(
        'No numbers are typed in the steps',
        typed.length === 0,
        'Some steps start with a number typed by hand. The list numbers its items itself, so typed numbers show twice.',
        typed.length ? `Typed numbers:\n${typed.join('\n')}` : 'None'
      )
    ]
  },

  async nested(t) {
    const page = await t.page()
    const startsWith = (list) =>
      SHELF.filter((word) => items(list).some((li) => ownText(li).startsWith(word))).length
    const lists = page.$$('ul, ol')
    const outer = lists.find((list) => startsWith(list) === SHELF.length)
    const near = !outer && lists.find((list) => startsWith(list) >= 2)
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
        near
          ? "The list is there, but not every item starts with Kofi's word for it. Each of mugs, bowls and plates starts its own item, spelled as he wrote it."
          : 'What is on the shelves is a list of three things: mugs, bowls and plates. Each starts its own item, with its name first.',
        outer || near ? describe(outer || near) : 'No list has mugs, bowls and plates as its items'
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
