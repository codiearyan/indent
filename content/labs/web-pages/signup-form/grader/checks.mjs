const FIELDS = [
  { name: 'name', label: 'Your name' },
  { name: 'email', label: 'Email' },
  { name: 'phone', label: 'Phone' },
  { name: 'people', label: 'How many people' },
  { name: 'newsletter', label: 'The newsletter checkbox' }
]

const clean = (text) => text.replace(/\s+/g, ' ').trim()
const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})
const html = (el) => (el ? clean(el.outerHTML) : 'not found')

/** The text of the label tied to a field: one around it or one pointing at its id. */
function labelText(field) {
  const labels = [...(field.labels ?? [])]
  return clean(labels.map((label) => label.textContent).join(' '))
}

const missingField = (name) =>
  detail(
    `The ${name} field is still on the page`,
    false,
    `There is no field with name="${name}" any more. Keep the name attributes as they were.`,
    'not found'
  )

export const checks = {
  async labels(t) {
    const page = await t.page()
    const details = FIELDS.map(({ name, label }) => {
      const field = page.$(`[name="${name}"]`)
      if (!field) return missingField(name)
      const text = labelText(field)
      return detail(
        `${label} has a label`,
        text.length > 0,
        'Text next to a field is not tied to it. A label element either wraps the field or points at its id.',
        `${html(field)}\nlabel text: ${text || 'none'}`
      )
    })
    const radios = page.$$('[name="event"]')
    const bare = radios.filter((radio) => !labelText(radio))
    details.push(
      detail(
        'Each event choice has its own label',
        radios.length >= 2 && bare.length === 0,
        'Every radio button needs a label of its own, so clicking the words picks it and a screen reader reads them.',
        radios.map((r) => `${html(r)}\nlabel text: ${labelText(r) || 'none'}`).join('\n')
      )
    )
    return details
  },

  async types(t) {
    const page = await t.page()
    const field = (name) => page.$(`[name="${name}"]`)
    const [name, email, phone, people] = ['name', 'email', 'phone', 'people'].map(field)
    if (!name || !email || !phone || !people) {
      return [missingField(['name', 'email', 'phone', 'people'].find((n) => !field(n)))]
    }
    const radios = page.$$('[name="event"]')
    return [
      detail(
        'Name is required',
        name.required,
        'The library cannot save a place without a name. Which attribute stops a form sending while a field is empty?',
        html(name)
      ),
      detail(
        'Email asks for an email address and is required',
        email.type === 'email' && email.required,
        'Look at the type of the email field. The right type checks the shape of the address and brings up the right keyboard on a phone.',
        html(email)
      ),
      detail(
        'Phone asks for a phone number and stays optional',
        phone.type === 'tel' && !phone.required,
        'The phone field has its own input type, which shows a number pad on a phone. It stays optional.',
        html(phone)
      ),
      detail(
        'People is a number from 1 to 6',
        people.type === 'number' && people.min === '1' && people.max === '6',
        'How many people is a whole number with a smallest and a largest value. Look at the attributes a number field can take.',
        html(people)
      ),
      detail(
        'Picking an event is required',
        radios.some((r) => r.required),
        'A radio group is required when one of its radio buttons carries the attribute that makes a field required.',
        radios.map(html).join('\n')
      )
    ]
  },

  async 'form-and-button'(t) {
    const page = await t.page()
    const names = ['name', 'email', 'phone', 'event', 'people', 'newsletter']
    const form = page.$('form')
    const outside = names.filter((n) => page.$$(`[name="${n}"]`).some((el) => el.form !== form))
    const radios = page.$$('[name="event"]')
    const fieldset = radios[0]?.closest('fieldset')
    const legend = fieldset?.querySelector('legend')
    const submit = form?.querySelector(
      'button:not([type]), button[type="submit"], input[type="submit"]'
    )
    const submitText = submit ? clean(submit.textContent || submit.value) : ''
    const fakes = page.$$('.button').filter((el) => !['BUTTON', 'INPUT'].includes(el.tagName))
    return [
      detail(
        'All the fields sit in one form',
        Boolean(form) && outside.length === 0,
        'Fields only send together when one form element wraps them.',
        form
          ? `Fields outside the form: ${outside.join(', ') || 'none'}`
          : 'No form element on the page'
      ),
      detail(
        'The event choices are grouped with a legend',
        Boolean(fieldset) &&
          radios.every((r) => r.closest('fieldset') === fieldset) &&
          clean(legend?.textContent ?? '').length > 0,
        'A screen reader should hear the question before the choices. Group the radio buttons and give the group a caption.',
        fieldset ? html(fieldset).slice(0, 400) : 'The radio buttons are not in a fieldset'
      ),
      detail(
        'The form sends with a real submit button',
        Boolean(submit) && submitText.length > 0 && fakes.length === 0,
        submit
          ? 'Something still only looks like a button. Remove the old one and keep the real one.'
          : 'The yellow "button" is a styled div. Nothing can reach it with Tab or press it with Enter. Use the element made for sending a form, inside the form.',
        submit
          ? `${html(submit)}\nLook-alike buttons left: ${fakes.length}`
          : fakes.map(html).join('\n')
      )
    ]
  }
}
