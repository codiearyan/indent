export function watchForm(form, { isTaken, onAdd }) {
  const error = form.querySelector('#form-error')

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const name = data.get('name').trim()

    let problem = ''
    if (!name) problem = 'Give the route a name.'
    else if (isTaken(name)) problem = `There is already a route called ${name}.`
    error.textContent = problem
    error.hidden = !problem
    if (problem) return

    onAdd({
      name,
      grade: data.get('grade'),
      colour: data.get('colour'),
      setter: data.get('setter').trim()
    })
    form.reset()
    form.elements.name.focus()
  })
}
