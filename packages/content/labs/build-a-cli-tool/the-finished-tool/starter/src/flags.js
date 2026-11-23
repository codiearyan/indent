// Every flag the tool knows. `value` names what a flag takes, for the help; a flag without one is
// a switch. `short` is its one-letter form. `about` says what it does, for the help.
export const FLAGS = {
  paper: { value: 'name', about: 'only the orders on this paper' },
  limit: { value: 'count', short: 'n', about: 'at most this many orders' },
  by: { value: 'field', about: 'one count for each value of this field' },
  json: { about: 'one JSON value on each line, for programs' },
  help: { short: 'h', about: 'show this help' },
  version: { about: 'show the version of orders' }
}
