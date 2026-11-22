const FILE = 'classes.html'
const FIELDS = [
  { name: 'name', type: 'text', label: 'Your name', what: 'name', kind: 'a plain text field' },
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    what: 'email',
    kind: 'the input type made for email addresses'
  },
  {
    name: 'places',
    type: 'number',
    label: 'Places',
    what: 'places',
    kind: 'the input type made for numbers'
  }
]
const BUTTON = 'Book my place'

const clean = (text) => text.replace(/\s+/g, ' ').trim()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
const html = (el) => (el ? clean(el.outerHTML) : 'not found')
const same = (a, b) => clean(a).replace(/:$/, '').toLowerCase() === b.toLowerCase()
const labelText = (field) => clean([...(field.labels ?? [])].map((l) => l.textContent).join(' '))

/** The field for one answer: by its name, else by the label with Kofi's words, else by its type. */
function findField(page, f) {
  const byName = page.$(`input[name="${f.name}"]`)
  if (byName) return { field: byName, byName: true }
  const label = page.$$('label').find((l) => same(l.textContent, f.label))
  const byLabel = label?.control
  const byType = f.type === 'text' ? null : page.$(`input[type="${f.type}"]`)
  return { field: byLabel ?? byType ?? null, byName: false }
}

/** A paragraph that still holds only Kofi's words, with no field in it. */
const oldLine = (page, words) =>
  page
    .$$('p')
    .find(
      (p) =>
        same(p.textContent, words) && !p.querySelector('input, select, textarea, button, label')
    )

export const checks = {
  async fields(t) {
    const page = await t.page(FILE)
    const form = page.$('form')
    const details = [
      detail(
        'There is a form',
        Boolean(form),
        'There is no form on the classes page yet. Fields that are sent together live inside the element made for a form.',
        form ? 'A form is on the page' : 'No form found'
      )
    ]
    for (const f of FIELDS) {
      const { field, byName } = findField(page, f)
      let message = `There is no field for the ${f.what} yet. Add an input for it inside the form.`
      if (field && !field.getAttribute('name'))
        message = `There is a field for the ${f.what}, but it has no name. A field without a name is not sent at all.`
      else if (field && !byName)
        message = `There is a field for the ${f.what}, but its name is not the one in the task. The name is what the answer is sent under.`
      else if (field && field.form !== form)
        message = `The ${f.what} field is outside the form. Only fields inside the form are sent with it.`
      else if (field && field.type !== f.type)
        message = `The ${f.what} field has the wrong type. It should be ${f.kind}.`
      details.push(
        detail(
          `The ${f.what} field is in the form, with its type and name`,
          Boolean(form) && Boolean(field) && byName && field.form === form && field.type === f.type,
          message,
          html(field)
        )
      )
    }
    return details
  },

  async labels(t) {
    const page = await t.page(FILE)
    const details = FIELDS.map((f) => {
      const { field } = findField(page, f)
      if (!field)
        return detail(
          `${f.label} is the label of the ${f.what} field`,
          false,
          `There is no ${f.what} field to label yet. Add it first, in the first task.`,
          'No field found'
        )
      const text = labelText(field)
      const loose = page
        .$$('label')
        .find((l) => same(l.textContent, f.label) && l.control !== field)
      let message = `The ${f.what} field has no label. Tie a label with Kofi's words to it.`
      if (text)
        message = `The ${f.what} field has a label, but its words have changed. Keep Kofi's words as he wrote them.`
      else if (loose)
        message = `The words ${f.label} are in a label, but the label is not tied to the field. Point the label at the field's id, or put the field inside the label.`
      else if (oldLine(page, f.label))
        message = `The words ${f.label} are still a paragraph next to the field. A paragraph is not tied to anything; a label is.`
      else if (
        clean(field.parentElement?.textContent ?? '')
          .toLowerCase()
          .includes(f.label.toLowerCase())
      )
        message = `The words ${f.label} sit next to the field as plain text. Plain text is not tied to the field; put the words in a label.`
      return detail(
        `${f.label} is the label of the ${f.what} field`,
        Boolean(text) && same(text, f.label),
        message,
        `${html(field)}\nlabel: ${text || (loose ? `${html(loose)}, not tied to it` : 'none')}`
      )
    })
    const left = FIELDS.filter(
      (f) =>
        oldLine(page, f.label) && findField(page, f).field && labelText(findField(page, f).field)
    )
    details.push(
      detail(
        'The old lines are gone',
        left.length === 0,
        "Some of Kofi's words are now labels and still a paragraph too. Remove the old paragraphs.",
        left.length ? left.map((f) => `Paragraph: ${f.label}`).join('\n') : 'No old lines left'
      )
    )
    return details
  },

  async limits(t) {
    const page = await t.page(FILE)
    const { field } = findField(page, FIELDS[2])
    if (!field)
      return [
        detail(
          'Places can be 1 to 4',
          false,
          'There is no places field yet. Add it first, in the first task.',
          'No field found'
        )
      ]
    const min = field.getAttribute('min')
    const max = field.getAttribute('max')
    const isNumber = field.type === 'number'
    const checkLimit = (value, want, word) => {
      if (value === null)
        return `Nothing stops someone asking for ${word === 'smallest' ? 'no places at all' : 'more places than Kofi takes from one booking'}. A number field has an attribute for its ${word} value.`
      if (Number(value) !== want || value.trim() === '')
        return `The places field has a ${word} value, but not the one Kofi gave.`
      return null
    }
    const low = checkLimit(min, 1, 'smallest')
    const high =
      max === null && field.hasAttribute('maxlength')
        ? 'maxlength counts the characters typed, not the size of the number. A number field has another attribute for its largest value.'
        : checkLimit(max, 4, 'largest')
    const typeNote =
      'Limits only work on a number field, and the places field is not one yet. Fix its type in the first task.'
    return [
      detail(
        'Places can be no fewer than 1',
        isNumber && !low,
        isNumber ? low : typeNote,
        html(field)
      ),
      detail(
        'Places can be no more than 4',
        isNumber && !high,
        isNumber ? high : typeNote,
        html(field)
      )
    ]
  },

  async submit(t) {
    const page = await t.page(FILE)
    const form = page.$('form')
    const words = (el) => clean(el.tagName === 'INPUT' ? el.value : el.textContent)
    const candidates = page.$$('button, input[type="submit"], input[type="button"], a')
    const button =
      candidates.find((el) => same(words(el), BUTTON)) ??
      candidates.find((el) => el.tagName !== 'A' && words(el).toLowerCase().includes('book'))
    let message = `There is no button yet. End the form with a button that has Kofi's words on it.`
    let passed = false
    if (button?.tagName === 'A')
      message =
        'Book my place is a link. A link goes to another page; a form is sent with a button.'
    else if (button && !form)
      message = 'There is no form yet for the button to send. Add the form in the first task.'
    else if (button && button.form !== form)
      message =
        'The button is outside the form, so pressing it sends nothing. Move it inside, after the last field.'
    else if (button && button.type !== 'submit')
      message =
        'This button is set to do nothing by itself. A button that sends its form has a different type, or no type at all.'
    else if (button && !same(words(button), BUTTON))
      message =
        "The button is there, but its words have changed. Keep Kofi's words as he wrote them."
    else if (button) passed = true
    const line = oldLine(page, BUTTON)
    return [
      detail('The form ends with a button that sends it', passed, message, html(button)),
      detail(
        'Book my place is not also a paragraph',
        !line,
        "Kofi's words for the button are still a paragraph on the page too. Remove the old paragraph.",
        line ? `Paragraph: ${clean(line.textContent)}` : 'No old line left'
      )
    ]
  }
}
