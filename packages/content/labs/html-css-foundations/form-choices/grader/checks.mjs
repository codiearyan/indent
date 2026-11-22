const FILE = 'classes.html'
const CLASSES = ['Wheel throwing', 'Handbuilding']
const QUESTION = 'Have you made pots before?'
const ANSWERS = ['This is my first time', 'I have made a few', 'I make pots often']
const NEWS = 'Send me news when the kiln is opened'
const NOTES = 'Anything Kofi should know?'

const clean = (text) => text.replace(/\s+/g, ' ').trim()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
const html = (el) => {
  if (!el) return 'not found'
  const open = clean(el.outerHTML).match(/^<[^>]*>/)[0]
  return el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' ? `${open}...` : open
}
const norm = (text) =>
  clean(text)
    .toLowerCase()
    .replace(/[:.?]+$/, '')
const same = (a, b) => norm(a) === norm(b)
const labelText = (field) => clean([...(field?.labels ?? [])].map((l) => l.textContent).join(' '))
const startsWith = (el, words) =>
  clean(el.textContent).toLowerCase().startsWith(words.toLowerCase())

/** A paragraph that still holds Kofi's raw line, with no field in it. */
const oldLine = (page, words) =>
  page
    .$$('p')
    .find((p) => startsWith(p, words) && !p.querySelector('input, select, textarea, label'))

/** Why a field's label is not right, or null. */
function labelProblem(page, field, words, what) {
  const text = labelText(field)
  if (text)
    return same(text, words)
      ? null
      : `The ${what} has a label, but its words have changed. Keep Kofi's words as he wrote them.`
  const loose = page.$$('label').find((l) => same(l.textContent, words))
  if (loose)
    return `The words for the ${what} are in a label, but the label is not tied to it. Point the label at its id, or put it inside the label.`
  if (norm(field.parentElement?.textContent ?? '').includes(norm(words)))
    return `The words for the ${what} sit next to it as plain text, which is not tied to it. Put them in a label.`
  return `The ${what} has no label tied to it. Give it a label with Kofi's words.`
}

const where = (field, form) =>
  !form
    ? 'There is no form on the page. The booking form from the last issue should still be there.'
    : field.form !== form
      ? 'is outside the form, so it would not be sent. Move it inside, before the button.'
      : null

export const checks = {
  async class(t) {
    const page = await t.page(FILE)
    const form = page.$('form')
    const select = page.$('select[name="class"]') ?? page.$('select')
    const radios = page
      .$$('input[type="radio"]')
      .filter((r) => CLASSES.some((c) => same(labelText(r), c)))
    let message =
      'There is no menu for the class yet. A list to pick one thing from is the select element.'
    if (!select && radios.length)
      message =
        'The classes are radio buttons. This task asks for a menu, the select element, with one option per class.'
    else if (select && select.name !== 'class')
      message =
        'There is a menu, but its name is not the one in the task. The name is what the answer is sent under.'
    else if (select && where(select, form))
      message = form ? `The menu ${where(select, form)}` : where(select, form)
    const options = select
      ? [...select.options].filter((o) => o.value !== '' || clean(o.textContent) !== '')
      : []
    const real = options.filter((o) => o.getAttribute('value') !== '')
    const missing = CLASSES.filter((c) => !real.some((o) => same(o.textContent, c)))
    const extra = real.filter((o) => !CLASSES.some((c) => same(o.textContent, c)))
    let optionsMessage = 'Add the menu first.'
    if (select && missing.length && extra.length)
      optionsMessage =
        "The menu has an option whose words have changed, or one that is not a class. Keep one option for each class, in Kofi's words."
    else if (select && missing.length)
      optionsMessage = `The menu has no option for ${missing.join(' or ')}. Give it one option per class.`
    else if (select && extra.length)
      optionsMessage =
        'The menu has an option that is not one of the two classes. An option that only asks the visitor to pick needs an empty value.'
    const line = oldLine(page, 'Class:')
    return [
      detail(
        'There is a class menu in the form, named class',
        Boolean(select) && select.name === 'class' && !where(select, form),
        message,
        html(select)
      ),
      detail(
        'Its label is Class',
        Boolean(select) && !labelProblem(page, select, 'Class', 'menu'),
        select ? labelProblem(page, select, 'Class', 'menu') : 'Add the menu first.',
        select ? `label: ${labelText(select) || 'none'}` : 'No menu'
      ),
      detail(
        'It offers the two classes',
        Boolean(select) && missing.length === 0 && extra.length === 0,
        optionsMessage,
        select
          ? `Options: ${options.map((o) => clean(o.textContent)).join(', ') || 'none'}`
          : 'No menu'
      ),
      detail(
        'The old line is gone',
        !line,
        "Kofi's line about the class is still a paragraph in the form. Once the menu is there, remove it.",
        line ? `Paragraph: ${clean(line.textContent)}` : 'No old line left'
      )
    ]
  },

  async experience(t) {
    const page = await t.page(FILE)
    const form = page.$('form')
    const byName = page.$$('input[name="experience"]')
    const answerFields = page.$$('input').filter((i) => ANSWERS.some((a) => same(labelText(i), a)))
    const radios = [...new Set([...byName, ...answerFields])]
    const kinds = new Set(radios.map((r) => r.type))
    const names = new Set(radios.map((r) => r.name))
    let message =
      "There are no radio buttons for Kofi's question yet. Add one for each of his three answers."
    let groupOk = false
    if (radios.length && (kinds.size > 1 || !kinds.has('radio')))
      message =
        'These choices are not radio buttons. With checkboxes, more than one could be ticked; one answer out of a few is a set of radio buttons.'
    else if (names.size > 1)
      message =
        'The choices have different names, so a visitor can pick more than one. Radio buttons that belong together share one name.'
    else if (radios.length && !byName.length)
      message =
        'The choices do not have the name the task gives. The name is what the answer is sent under.'
    else if (radios.length && radios.length !== 3)
      message = `There are ${radios.length} choices, but Kofi gave three answers. Give each one a radio button.`
    else if (radios.length && radios.some((r) => where(r, form)))
      message = form
        ? `A choice ${where(
            radios.find((r) => where(r, form)),
            form
          )}`
        : where(null, form)
    else if (radios.length) groupOk = kinds.size === 1
    const labels = radios.map((r) => labelText(r))
    const found = ANSWERS.filter((a) => labels.some((l) => same(l, a)))
    const labelIssue = radios
      .map((r, i) =>
        labelProblem(page, r, ANSWERS.find((a) => same(labels[i], a)) ?? ANSWERS[i] ?? '', 'choice')
      )
      .find(Boolean)
    const values = radios.map((r) => r.value)
    const distinct = new Set(values).size === values.length && !values.includes('on')
    const fieldset = radios[0]?.closest('fieldset')
    const together = Boolean(fieldset) && radios.every((r) => r.closest('fieldset') === fieldset)
    const legend = fieldset?.querySelector(':scope > legend')
    let setMessage =
      'The three choices answer one question, so they are grouped in a fieldset, with the question as its legend.'
    if (fieldset && !together)
      setMessage = 'Some of the choices are outside the fieldset. All three go inside it.'
    else if (together && !legend)
      setMessage = [...fieldset.querySelectorAll('p')].some((p) => startsWith(p, QUESTION))
        ? 'The question is a paragraph inside the fieldset. A fieldset has its own element for its title.'
        : "The fieldset has no legend. Give it one with Kofi's question."
    else if (legend && fieldset.firstElementChild !== legend)
      setMessage = 'The legend must be the first thing inside the fieldset.'
    else if (legend && !same(legend.textContent, QUESTION))
      setMessage =
        "The fieldset has a legend, but its words have changed. Keep Kofi's question as he wrote it."
    const line = oldLine(page, `${QUESTION} ${ANSWERS[0]}`)
    return [
      detail(
        'Three radio buttons share the name experience',
        groupOk,
        message,
        radios.map(html).join('\n') || 'No choices found'
      ),
      detail(
        "Each choice has its own label, with Kofi's words",
        radios.length === 3 && found.length === 3 && !labelIssue,
        radios.length
          ? (labelIssue ??
              "Each of Kofi's three answers is the label of one choice. One is missing or used twice.")
          : 'Add the choices first.',
        radios.map((r, i) => `${html(r)} label: ${labels[i] || 'none'}`).join('\n') ||
          'No choices found'
      ),
      detail(
        'Each choice sends its own value',
        radios.length === 3 && distinct,
        radios.length
          ? 'Some choices send the same answer, so Kofi could not tell them apart. Give each radio button a value of its own.'
          : 'Add the choices first.',
        `Values: ${values.join(', ') || 'none'}`
      ),
      detail(
        "They sit in a fieldset, with Kofi's question as its legend",
        together &&
          Boolean(legend) &&
          fieldset.firstElementChild === legend &&
          same(legend.textContent, QUESTION),
        radios.length ? setMessage : 'Add the choices first.',
        fieldset
          ? `Legend: ${legend ? clean(legend.textContent) : 'none'}`
          : 'No fieldset around the choices'
      ),
      detail(
        'The old line is gone',
        !line,
        "Kofi's question and answers are still a paragraph in the form. Once the choices are there, remove it.",
        line ? `Paragraph: ${clean(line.textContent)}` : 'No old line left'
      )
    ]
  },

  async extras(t) {
    const page = await t.page(FILE)
    const form = page.$('form')
    const news = page.$('[name="news"]') ?? page.$$('input').find((i) => same(labelText(i), NEWS))
    const notes =
      page.$('[name="notes"]') ?? page.$$('input, textarea').find((i) => same(labelText(i), NOTES))
    let newsMessage = 'There is no checkbox for the news yet.'
    if (news && news.type !== 'checkbox')
      newsMessage = 'The news field is not a checkbox. A single yes or no is a checkbox.'
    else if (news && news.name !== 'news')
      newsMessage =
        'The checkbox does not have the name the task gives. The name is what the answer is sent under.'
    else if (news && where(news, form))
      newsMessage = form ? `The checkbox ${where(news, form)}` : where(news, form)
    else if (news) newsMessage = labelProblem(page, news, NEWS, 'checkbox')
    let notesMessage = "There is no box for Kofi's last question yet."
    if (notes && notes.tagName !== 'TEXTAREA')
      notesMessage =
        'The notes field is a one-line input. Notes can run to a few lines; there is an element made for longer text.'
    else if (notes && notes.name !== 'notes')
      notesMessage =
        'The notes box does not have the name the task gives. The name is what the answer is sent under.'
    else if (notes && where(notes, form))
      notesMessage = form ? `The notes box ${where(notes, form)}` : where(notes, form)
    else if (notes) notesMessage = labelProblem(page, notes, NOTES, 'notes box')
    const left = [NEWS, NOTES].map((w) => oldLine(page, w)).filter(Boolean)
    return [
      detail(
        'A news checkbox, with its label',
        Boolean(news) &&
          news.type === 'checkbox' &&
          news.name === 'news' &&
          !where(news, form) &&
          !labelProblem(page, news, NEWS, 'checkbox'),
        newsMessage,
        news ? `${html(news)} label: ${labelText(news) || 'none'}` : 'not found'
      ),
      detail(
        'A notes box for longer text, with its label',
        Boolean(notes) &&
          notes.tagName === 'TEXTAREA' &&
          notes.name === 'notes' &&
          !where(notes, form) &&
          !labelProblem(page, notes, NOTES, 'notes box'),
        notesMessage,
        notes ? `${html(notes)} label: ${labelText(notes) || 'none'}` : 'not found'
      ),
      detail(
        'The old lines are gone',
        left.length === 0,
        "Some of Kofi's lines are still paragraphs in the form. Once their fields are there, remove them.",
        left.length
          ? left.map((p) => `Paragraph: ${clean(p.textContent)}`).join('\n')
          : 'No old lines left'
      )
    ]
  },

  async required(t) {
    const page = await t.page(FILE)
    const form = page.$('form')
    const must = ['name', 'email', 'places'].map((name) => ({
      name,
      field: page.$(`input[name="${name}"]`)
    }))
    const radios = page.$$('input[type="radio"][name="experience"]')
    const news = page.$('[name="news"]')
    const notes = page.$('[name="notes"]')
    const gone = must.filter((m) => !m.field)
    const loose = must.filter((m) => m.field && !m.field.required)
    const optional = [news, notes].filter((el) => el?.required)

    let full = true
    let fullOutput = 'Not tried'
    if (form && !gone.length && radios.length) {
      must[0].field.value = 'Ada Brook'
      must[1].field.value = 'ada@example.com'
      must[2].field.value = '2'
      radios[0].checked = true
      const blocked = [...form.elements].filter((el) => el.willValidate && !el.checkValidity())
      full = blocked.length === 0
      fullOutput = full
        ? 'A booking with every required answer can be sent'
        : `Still blocked: ${blocked.map((el) => el.name || el.tagName.toLowerCase()).join(', ')}`
    }
    return [
      detail(
        'Name, email and places must be filled in',
        !gone.length && !loose.length,
        gone.length
          ? `The ${gone.map((m) => m.name).join(' and ')} field is not on the page any more. The fields from the last issue should still be there, with their names.`
          : `The form can still be sent without the ${loose.map((m) => m.name).join(', ')}. One attribute makes a field required.`,
        must
          .map(
            (m) =>
              `${m.name}: ${m.field ? (m.field.required ? 'required' : 'optional') : 'not found'}`
          )
          .join('\n')
      ),
      detail(
        'One of the experience choices must be picked',
        radios.length > 0 && radios.some((r) => r.required),
        radios.length
          ? "The form can be sent without an answer to Kofi's question. A group of radio buttons is required when one of them carries the attribute."
          : 'There are no experience choices to make required yet. Add them in the second task.',
        radios.length ? radios.map(html).join('\n') : 'No choices found'
      ),
      detail(
        'The news box and the notes stay optional',
        optional.length === 0,
        'Some fields that should stay optional are required. An attribute like required counts whenever it is there, whatever value it is given, so remove it.',
        [news, notes]
          .map(
            (el, i) =>
              `${['news', 'notes'][i]}: ${el ? (el.required ? 'required' : 'optional') : 'not found'}`
          )
          .join('\n')
      ),
      detail(
        'A full booking can be sent',
        full,
        'With a name, an email, 2 places and a choice picked, the browser still blocks the form. Look at what else was made required or limited.',
        fullOutput
      )
    ]
  }
}
