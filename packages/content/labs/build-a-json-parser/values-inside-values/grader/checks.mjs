import { runCases } from '../../checks-helpers.mjs'

const good = (name, key, setup) => ({ name, run: 'good', args: [key], setup })
const bad = (name, key, setup) => ({ name, run: 'bad', args: [key], setup })

export const checks = {
  arrays(t) {
    return runCases(t, 'parse()', [
      good('Arrays of plain values', 'arrays', "parse('[]'), parse('[7]'), parse('[1, \"two\", true, false, null]') and one with spaces"),
      good('Arrays inside arrays', 'nestedArrays', "parse('[[], [[]], [1, [2, [3]]]]') and a list of sizes and prices"),
      bad('Commas only between values', 'arrayCommas', "parse('[1,]'), parse('[,1]'), parse('[1,,2]'), parse('[1 2]') and parse('[[1] [2]]')"),
      bad('Arrays that do not close', 'arrayEnds', "parse('['), parse('[1, 2'), parse(']'), parse('[1}') and parse('[1, [2]')")
    ])
  },

  objects(t) {
    return runCases(t, 'parse()', [
      good('Objects', 'objects', "parse('{}'), parse('{\"code\": \"CT-300\"}'), an item with four keys, and an empty key"),
      good('Objects and arrays inside each other', 'mixed', 'a price list with items, and objects four levels deep'),
      good('A key that comes twice', 'twice', 'objects where the same key comes twice'),
      good('The key __proto__', 'proto', 'objects with the key __proto__'),
      bad('Keys are texts', 'keys', "parse('{1: 2}'), parse('{true: 1}'), parse('{[\"a\"]: 1}') and parse('{null: 1}')"),
      bad('Colons and commas', 'objectMarks', "parse('{\"a\" 1}'), parse('{\"a\":}'), parse('{\"a\": 1,}'), parse('{,\"a\": 1}') and four more"),
      bad('Objects that do not close', 'objectEnds', "parse('{'), parse('{\"a\": 1'), parse('{\"a\":') and parse('{\"a\"')")
    ])
  },

  whole(t) {
    return runCases(t, 'parse()', [
      good('A value alone', 'alone', "parse('5'), parse('\"card\"'), parse('true'), parse('false'), parse('null') and parse('-0.25')"),
      good('Space around the value', 'spaced', 'texts with space, tabs and line breaks before and after the value'),
      good('Thousands of levels deep', 'deep', '3000 arrays inside each other, 3000 objects inside each other, and both taking turns'),
      { name: '120 texts of the check', run: 'many', args: [81], setup: '120 texts made up by the check, each compared with the built-in reader' },
      bad('Nothing after the value', 'extra', "parse('1 2'), parse('[] []'), parse('{}}'), parse('[1]]'), parse('\"a\" \"b\"') and parse('null,')"),
      bad('A text with no value', 'empty', "parse(''), parse('   ') and parse('\\n\\t')"),
      bad('Deep brackets that never close', 'deepOpen', "parse('['.repeat(3000)) and 3000 objects that never close")
    ])
  }
}
