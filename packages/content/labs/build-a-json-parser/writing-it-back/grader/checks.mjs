import { runCases } from '../../checks-helpers.mjs'

const write = (name, key, setup) => ({ name, run: 'write', args: [key], setup })
const ROUND =
  'stringify() went round and round a value that holds itself until it ran out of room. Keep the arrays and objects you are inside of, and refuse a value that is already one of them.'
const cannot = (name, key, setup) => ({ name, run: 'cannot', args: [key], setup, stuck: ROUND })
const trip = (name, key, setup) => ({ name, run: 'trip', args: [key], setup })
const scan = { scan: ['src/json.js', 'src/prices.js'] }

export const checks = {
  write(t) {
    return runCases(t, 'stringify()', [
      write('Plain values, arrays and objects', 'plain', 'null, true, false, numbers, a text, arrays and objects, each written and read back'),
      write('Texts that need escapes', 'escapes', 'texts with a quote, a backslash, line breaks, tabs, characters below a space, accents and a slash'),
      write('Keys that need escapes', 'keys', 'objects whose keys hold a quote or a line break'),
      { name: '150 values of the check', run: 'many', args: [403], setup: '150 values made up by the check, each written and read back with the built-in reader' }
    ], scan)
  },

  cannot(t) {
    return runCases(t, 'stringify()', [
      cannot('undefined', 'top', 'stringify(undefined)'),
      cannot('A function', 'fn', 'stringify([1, () => 2])'),
      cannot('A key whose value is undefined', 'missing', "stringify({ code: 'CT-300', price: undefined })"),
      cannot('NaN', 'nan', "stringify({ items: [{ code: 'INK-BLK', price: NaN }] })"),
      cannot('Infinity', 'infinity', 'stringify([0, 1, -Infinity])'),
      cannot('An object that holds itself', 'self', 'paper.self = paper, then stringify(paper)'),
      cannot('An array that holds itself', 'list', 'list.push(list), then stringify(list)'),
      cannot('A value that holds itself further down', 'deep', 'order.items[0].order = order, then stringify(order)'),
      { name: 'The same item in several places', run: 'shared', setup: 'stringify({ first: paper, again: [paper, paper] })' },
      { name: 'A refusal leaves nothing behind', run: 'afterRefusal', setup: 'an object that holds itself, then an item that was inside it', stuck: ROUND }
    ], scan)
  },

  trip(t) {
    return runCases(t, 'importPrices()', [
      { name: 'Indented text', run: 'indent', args: [272], setup: 'values written with indents of 1 to 4, compared with the built-in writer' },
      trip('Three lists that read', 'lists', 'importPrices() with three price lists of the check'),
      trip('A list with a missing comma', 'broken', 'three lists, the middle one with no comma after a code'),
      trip('A list cut short', 'cut', 'two lists, the first cut short in the middle of an item'),
      trip('No lists at all', 'none', 'importPrices([])')
    ], scan)
  }
}
