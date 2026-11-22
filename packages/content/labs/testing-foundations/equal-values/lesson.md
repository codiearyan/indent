# Equal values, equal objects

## What you will be able to do

The farm's prices are covered now, and Bridget has stopped checking every invoice by hand. The next code to protect is the packing code: the lists Wendell packs boxes from, and the slip that goes in every box. That code gives back lists and objects, not single numbers, and comparing those takes a little more care. By the end of this issue you will be able to:

- say what `toBe` really compares, and when it is the wrong tool
- compare whole lists and objects with `toEqual`
- compare decimals that are a hair off with `toBeCloseTo`
- check that code leaves a list alone, using `.not`

## The request from Wendell

Wendell packs the boxes and drives the van.

> **Wendell:** Two weeks ago every medium box went out without its salad, and last month the slips had no eggs on them, so I packed none. Both times the code still gave back a list and a slip, so nothing looked wrong. Can your tests check what is actually in them?

## What toBe compares

`toBe` asks one question: are these the very same value? For numbers, text, true or false, and `null`, that is what you want. `14` is `14`, and `'kale'` is `'kale'`.

Lists and objects are different. Each time code builds a list, JavaScript makes a new one, even when it holds the same items. Two lists with the same items are equal in what they hold, but they are not the very same list. So this test fails:

```js
test('the gate stall opens on Friday and Saturday', () => {
  expect(openDays()).toBe(['Friday', 'Saturday'])
})
```

```
AssertionError: expected [ 'Friday', 'Saturday' ] to be [ 'Friday', 'Saturday' ] // Object.is equality

Expected: [ 'Friday', 'Saturday' ]
Received: serializes to the same string
```

"Serializes to the same string" is Vitest's way of saying the two look identical, but they are two separate lists.

## Comparing what is inside

`toEqual` compares what is inside, item by item:

```js
expect(openDays()).toEqual(['Friday', 'Saturday'])
```

That passes. For a list, the items must match one for one, in the same order, so a missing item, an extra one or two swapped places all fail. For an object, every field must match, and if a field holds a list or another object, `toEqual` compares that too, all the way down:

```js
expect(stallSign()).toEqual({ open: true, days: ['Friday', 'Saturday'] })
```

Vitest's message for a failed `toBe` mentions `toStrictEqual`. That is a stricter cousin of `toEqual` that also cares about fields set to `undefined`; `toEqual` is all you need in this issue.

Compare the whole thing whenever you can. A test that only checks how long a list is, or only one field of an object, passes when everything else is wrong. That is exactly how the missing salad got through.

## Decimals that are a hair off

Computers store decimals in binary, and most decimals, like 0.1 or 0.7, cannot be stored exactly. The error is tiny, but `toBe` sees it:

```js
expect(1 - 0.7).toBe(0.3)
```

```
AssertionError: expected 0.30000000000000004 to be 0.3 // Object.is equality
```

The code is not wrong; the number is as close as binary can get. For money and weights, use `toBeCloseTo`:

```js
expect(1 - 0.7).toBeCloseTo(0.3)
```

By default it checks the first two decimal places, which for prices means to the penny. A price that is a whole penny out still fails.

## Checking that something did not happen

Put `.not` before any matcher to turn it around: `expect(x).not.toEqual(y)` passes when the two differ.

This matters for code that should leave its input alone. Say a function takes a list and gives back a changed copy. A careless version changes the list it was given and hands that same list back. Its answer looks right, so a test that only checks the answer passes. To catch it, check the list you started with too:

```js
const before = ['Friday', 'Saturday']
const after = addDay(before, 'Sunday')
expect(after).toEqual(['Friday', 'Saturday', 'Sunday'])
expect(before).toEqual(['Friday', 'Saturday'])
expect(after).not.toBe(before)
```

The last line is `toBe` doing its real job on a list: asking whether two names point at the very same list. Here it must not.

## Your work in this issue

Open `src/boxes.test.js`; the code it tests is in `src/boxes.js`. Each task has its own `describe` block. Read the function in `boxes.js` first, work out the answer by hand, then write the test and run `npx vitest run src/boxes.test.js`. As in the last issue, Check runs your tests on the working code and on versions with a mistake slipped in, so each test has to check the whole answer.
