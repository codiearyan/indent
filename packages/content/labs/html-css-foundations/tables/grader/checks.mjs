const FILE = 'classes.html'
const TITLE = 'Autumn timetable'
const HEAD = {
  name: 'the top row',
  cells: ['Class', 'Day', 'Time', 'Price', 'Places'],
  starts: 'class, day'
}
const CLASSES = [
  {
    name: 'the wheel throwing line',
    cells: ['Wheel throwing', 'Thursday', '6pm to 8.30pm', '£180', '6'],
    anchors: ['wheel throwing', 'thursday', '6pm to', '£180'],
    starts: 'wheel throwing,'
  },
  {
    name: 'the handbuilding line',
    cells: ['Handbuilding', 'Saturday', '10am to 12.30pm', '£150', '8'],
    anchors: ['handbuilding', 'saturday', '10am to', '£150'],
    starts: 'handbuilding,'
  }
]

const clean = (text) => text.replace(/\s+/g, ' ').trim()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
const cap = (text) => text[0].toUpperCase() + text.slice(1)
const texts = (row) => [...row.cells].map((cell) => clean(cell.textContent))
const cellTag = (cell) =>
  `<${cell.tagName.toLowerCase()}${cell.hasAttribute('scope') ? ` scope="${cell.getAttribute('scope')}"` : ''}>`
const shown = (row) =>
  [...row.cells].map((cell) => cellTag(cell) + clean(cell.textContent)).join(' | ')

/** The rows of the table that hold the header line and each class line, found by their words. */
function findRows(page) {
  const rows = page.$$('table tr')
  const head = rows.find((row) =>
    texts(row).some((text) => HEAD.cells.some((c) => c.toLowerCase() === text.toLowerCase()))
  )
  const classes = CLASSES.map((line) => ({
    ...line,
    row: rows.find((row) =>
      line.anchors.some((a) => clean(row.textContent).toLowerCase().includes(a))
    )
  }))
  return { head: { ...HEAD, row: head }, classes }
}

const leftover = (page, line) =>
  page
    .$$('p')
    .find((p) => !p.closest('table') && clean(p.textContent).toLowerCase().startsWith(line.starts))

/** What is wrong with the cells of one row, or null. */
function cellProblem(line) {
  const got = texts(line.row)
  if (got.length !== line.cells.length) {
    return got.some((text) => text.includes(','))
      ? `In ${line.name}, some pieces still share one cell, joined by commas. Give each piece a cell of its own.`
      : `${cap(line.name)} has ${got.length} cells, but Kofi's line has ${line.cells.length} pieces. Give each piece a cell of its own.`
  }
  const same = (a, b) => a.toLowerCase() === b.toLowerCase()
  if (got.every((text, i) => same(text, line.cells[i]))) return null
  const sorted = (list) =>
    list
      .map((x) => x.toLowerCase())
      .sort()
      .join('|')
  if (sorted(got) === sorted(line.cells))
    return `The cells of ${line.name} are in a different order from Kofi's. Keep his order, so each column holds one kind of thing.`
  return `The cells of ${line.name} are there, but the words in some of them have changed. Keep Kofi's words as he wrote them.`
}

const notYet = (what) =>
  detail(
    `The timetable is in a table`,
    false,
    `${what} is not in a table row yet. Finish the first task, then come back to this one.`,
    'Rows found in the table: none that match'
  )

export const checks = {
  async rows(t) {
    const page = await t.page(FILE)
    const table = page.$('table')
    const { head, classes } = findRows(page)
    const lines = [head, ...classes]
    const missing = lines.filter((line) => !line.row)
    const shared = lines.filter(
      (line, i) => line.row && lines.some((o, j) => j !== i && o.row === line.row)
    )
    const loose = lines.filter((line) => leftover(page, line))
    const problems = lines
      .filter((line) => line.row)
      .map(cellProblem)
      .filter(Boolean)

    let rowsMessage = 'Each of the three lines of the timetable is a row of its own.'
    if (shared.length)
      rowsMessage =
        "Two of Kofi's lines share one row. Each line is a row of its own, so close a row before the next one starts."
    else if (missing.length && loose.some((line) => missing.includes(line)))
      rowsMessage = `${cap(missing.map((l) => l.name).join(' and '))} ${missing.length > 1 ? 'are' : 'is'} still a paragraph. Move each line into the table as a row of its own.`
    else if (missing.length)
      rowsMessage = `${cap(missing.map((l) => l.name).join(' and '))} could not be found in the table. If its words changed, keep Kofi's words as he wrote them.`

    const gone = detail(
      'The old lines are gone',
      loose.length === 0,
      'Some of the timetable lines are still paragraphs on the page. Once they are in the table, remove the old lines.',
      loose.length
        ? loose.map((l) => clean(leftover(page, l).textContent)).join('\n')
        : 'No old lines left'
    )
    if (!table)
      return [
        detail(
          'The timetable is in a table',
          false,
          "Kofi's timetable is still lines of text. Put it in the element made for a table.",
          'No table on the classes page'
        ),
        gone
      ]
    return [
      detail(
        'The timetable is in a table',
        Boolean(table),
        "Kofi's timetable is still lines of text. Put it in the element made for a table.",
        table ? 'A table is on the page' : 'No table on the classes page'
      ),
      detail(
        'Each line is a row of its own',
        Boolean(table) && missing.length === 0 && shared.length === 0,
        rowsMessage,
        lines.map((l) => `${l.name}: ${l.row ? shown(l.row) : 'not in a row'}`).join('\n')
      ),
      detail(
        "Each piece has its own cell, with Kofi's words",
        Boolean(table) && missing.length === 0 && shared.length === 0 && problems.length === 0,
        missing.length || shared.length ? 'Give each line its own row first.' : problems[0],
        lines
          .map((l) => `${l.name}: ${l.row ? texts(l.row).join(' | ') : 'not in a row'}`)
          .join('\n')
      ),
      gone
    ]
  },

  async 'column-headers'(t) {
    const page = await t.page(FILE)
    const { head } = findRows(page)
    if (!head.row) return [notYet('The top row, with the names of the columns,')]
    const cells = [...head.row.cells]
    const allTh = cells.every((cell) => cell.tagName === 'TH')
    const first = page.$('table tr') === head.row
    const scopes = cells
      .filter((cell) => cell.tagName === 'TH')
      .map((cell) => (cell.getAttribute('scope') ?? '').toLowerCase())
    const rowScope = scopes.some((s) => s === 'row')
    return [
      detail(
        'The top row is made of header cells',
        allTh && first,
        !allTh
          ? 'Some cells of the top row are ordinary data cells. The names of the columns are headers, so they use the cell made for headers.'
          : 'The row with the names of the columns is not the first row of the table. Move it to the top.',
        first
          ? shown(head.row)
          : `First row: ${shown(page.$('table tr'))}\nRow of names: ${shown(head.row)}`
      ),
      detail(
        'Each column header says it heads a column',
        scopes.length > 0 && scopes.every((s) => s === 'col'),
        rowScope
          ? 'Some of these headers say they head a row, but each one heads the column below it.'
          : scopes.some((s) => s && s !== 'col')
            ? 'Some headers have a scope, but its value is not one the browser knows. The lesson gives the two values a scope takes.'
            : 'A header cell can say which way it points: along its row or down its column. Add the attribute for that to each header in the top row.',
        shown(head.row)
      )
    ]
  },

  async 'row-headers'(t) {
    const page = await t.page(FILE)
    const { classes } = findRows(page)
    const missing = classes.find((line) => !line.row)
    if (missing) return [notYet(cap(missing.name))]
    const leads = classes.map((line) => line.row.cells[0])
    const scope = (cell) => (cell.getAttribute('scope') ?? '').toLowerCase()
    const allTh = leads.every((cell) => cell.tagName === 'TH')
    const rest = classes.flatMap((line) => [...line.row.cells].slice(1))
    const extraTh = rest.filter((cell) => cell.tagName === 'TH')
    return [
      detail(
        'Each class name is a header for its row',
        allTh && leads.every((cell) => scope(cell) === 'row'),
        !allTh
          ? 'The name of a class starts its row, and the rest of the row is about it. It is still an ordinary data cell; make it a header.'
          : leads.some((cell) => scope(cell) === 'col')
            ? 'These headers say they head a column, but each class name heads its own row.'
            : leads.some((cell) => scope(cell) && scope(cell) !== 'row')
              ? 'Some headers have a scope, but its value is not one the browser knows. The lesson gives the two values a scope takes.'
              : 'A header cell can say which way it points: along its row or down its column. Add the attribute for that to each class name.',
        classes.map((line) => shown(line.row)).join('\n')
      ),
      detail(
        'The rest of each row stays data',
        extraTh.length === 0,
        'Only the class name heads its row. The day, time, price and places are data, so they stay ordinary cells.',
        extraTh.length
          ? `Header cells that hold data: ${extraTh.map((cell) => clean(cell.textContent)).join(', ')}`
          : 'The day, time, price and places are data cells'
      )
    ]
  },

  async caption(t) {
    const page = await t.page(FILE)
    const table = page.$('table')
    if (!table)
      return [
        detail(
          'The table has a caption',
          false,
          'There is no table yet. Finish the first task, then give the table its caption.',
          'No table on the classes page'
        )
      ]
    const caption = table.caption
    const words = caption ? clean(caption.textContent) : ''
    const lower = TITLE.toLowerCase()
    const asParagraph = page.$$('p').find((p) => clean(p.textContent).toLowerCase() === lower)
    const inCell = [...table.querySelectorAll('td, th')].find((cell) =>
      clean(cell.textContent).toLowerCase().includes(lower)
    )
    const outside =
      !asParagraph &&
      !inCell &&
      clean(page.document.body.textContent.replace(table.textContent, ''))
        .toLowerCase()
        .includes(lower)
    let message = "A table has its own element for its title. Give the table one with Kofi's title."
    if (caption)
      message =
        "The table has a caption, but its words have changed. Keep Kofi's title as he wrote it."
    else if (inCell)
      message =
        "The title is in a cell of the table. A table's title is not a row; it has an element of its own."
    else if (outside)
      message =
        'The title is outside the table. A caption only counts inside the table, right after its opening tag.'
    else if (asParagraph)
      message =
        'The title is still a paragraph above the table. A table has its own element for its title, inside the table.'
    return [
      detail(
        "The table has a caption with Kofi's title",
        Boolean(caption) && words === TITLE,
        message,
        caption ? `Caption: ${words}` : 'No caption in the table'
      ),
      detail(
        'The caption comes first in the table',
        Boolean(caption) && table.firstElementChild === caption,
        caption
          ? 'The caption is there, but it must come right after the opening table tag, before the first row.'
          : 'Add the caption first.',
        caption
          ? `First inside the table: ${/^(TBODY|THEAD|TR)$/.test(table.firstElementChild.tagName) ? 'a row' : `<${table.firstElementChild.tagName.toLowerCase()}>`}`
          : 'No caption in the table'
      ),
      detail(
        'The title shows only once',
        !asParagraph,
        'The title is still a paragraph above the table too. Once it is the caption, remove the old paragraph.',
        asParagraph
          ? `Paragraph: ${clean(asParagraph.textContent)}`
          : 'No paragraph repeats the title'
      )
    ]
  }
}
