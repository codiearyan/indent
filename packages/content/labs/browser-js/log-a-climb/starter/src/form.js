// Tasks: Keep the page on submit, Explain bad input, Ready for the next route
//
// watchForm(form, { isTaken, onAdd }) handles the "Log a new route" form.
// isTaken(name) says whether a route with that name is already on the board.
// onAdd({ name, grade, colour, setter }) puts a new route on the board.
// Right now nothing listens to the form, so submitting it reloads the whole page.
export function watchForm(form, { isTaken, onAdd }) {}
