import { runCases } from '../../checks-helpers.mjs'

const place = (name, key, setup) => ({ name, run: 'place', args: [key], setup })
const said = (name, key, setup) => ({ name, run: 'said', args: [key], setup })
const ended = (name, key, setup) => ({ name, run: 'ended', args: [key], setup })
const wrong = (name, key, setup) => ({ name, run: 'wrong', args: [key], setup })

export const checks = {
  where(t) {
    return runCases(t, 'lineAndColumn()', [
      place('A missing comma on line 4', 'comma', 'an item over five lines, with no comma after the price'),
      place('A stray character on line 3', 'stray', "parse('[\\n  true,\\n  @\\n]')"),
      place('On the first line', 'first', "parse('[1 2]')"),
      place('At the start of a line', 'start', "parse('[1,\\n]')"),
      place('After a tab', 'tabs', "parse('{\\n\\t\"a\": 1,\\n\\t\"b\" 2\\n}')"),
      place('Lines that end in \\r\\n', 'crlf', "parse('[\\r\\n  1,\\r\\n  2\\r\\n  3\\r\\n]')"),
      place('A line break inside a text', 'breakInText', 'an item whose name runs into the next line'),
      place('After an accented letter', 'accent', "parse('{\"name\": \"Crème\", \"price\" 0.42}')"),
      place('Far down a long list', 'far', 'a list of 31 lines with two numbers and no comma on the last one')
    ])
  },

  expected(t) {
    return runCases(t, 'parse()', [
      said('Between two values in an array', 'array', "parse('[1 2]')"),
      said('After a key', 'colon', "parse('{\"a\" 1}')"),
      said('Between two pairs', 'pair', "parse('{\\n  \"a\": 1\\n  \"b\": 2\\n}')"),
      said('Where a key goes', 'key', "parse('{1: 2}')"),
      said('Where a value goes in an array', 'value', "parse('[1, ]')"),
      said('Where a value goes in an object', 'objectValue', "parse('{\"price\": }')"),
      said('After the whole value', 'end', "parse('[1] 2')"),
      said('A text where a comma goes', 'text', "parse('[\"a\" \"b\"]')"),
      said('A stray character', 'stray', "parse('[true, @]')"),
      said('A broken number', 'number', "parse('[1.x]')"),
      said('A broken escape', 'escape', "parse('[\"a\\\\x\"]')")
    ])
  },

  ended(t) {
    return runCases(t, 'parse()', [
      ended('An array cut short', 'array', "parse('[1, 2')"),
      ended('An item cut short after a colon', 'item', 'an item that stops after "price": on its second line'),
      ended('Cut short after a line break', 'spaces', "parse('[\\n  1,\\n')"),
      ended('A text that never closes', 'text', "parse('\"Envelope, C6')"),
      ended('A number cut short', 'minus', "parse('[-')"),
      ended('A number cut short after the dot', 'dot', "parse('[1.')"),
      ended('A number cut short after the e', 'exponent', "parse('[2e')"),
      ended('A word cut short', 'word', "parse('[tru')"),
      ended('A text cut short after a backslash', 'escape', "parse('\"ab\\\\')"),
      ended('A \\u escape cut short', 'hex', "parse('\"\\\\u00')"),
      wrong('Two values with no comma', 'array', "parse('[1 2]')"),
      wrong('A stray character', 'stray', "parse('[1, @]')"),
      wrong('A line break inside a text', 'breakInText', "parse('\"ab\\ncd\"')"),
      wrong('A minus before a letter', 'minus', "parse('[-x]')"),
      wrong('A word that goes wrong', 'word', "parse('[tru]')"),
      wrong('No colon after a key', 'colon', "parse('{\"a\" 1}')"),
      wrong('A letter past f in a \\u escape', 'hex', "parse('\"\\\\u00g0\"')")
    ])
  }
}
