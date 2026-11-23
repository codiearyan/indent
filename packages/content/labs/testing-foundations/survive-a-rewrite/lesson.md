# Tests that survive a rewrite

## What you will be able to do

Your van tests now pass in any order. The next problem goes the other way: tests that fail when nothing is wrong, and pass when something is. Both come from tests that check how the code is written instead of what it does. By the end of this issue you will be able to:

- tell a test of what code does from a test of how it does it
- check the result a function gives back, not which helpers it calls
- work out an expected value from the rule, not from the code
- change how code is written and keep every test green

## The request from Effie

> **Effie:** I tidied up `packing.js` last week. Every box came out exactly the same, and Lorcan's crate test still went red. So I put it back. And the week the scales added up wrong, his weight test stayed green. What are these tests for?

The code is in `src/packing.js`. `packingList` puts an order's items heaviest first, adds up their weight and picks a crate, using three helpers in `helpers`. Wendell packs from the list it gives back.

## What it does, and how it does it

Say the farm prints labels for its jam:

```js
export const helpers = {
  weight(grams) {
    return `${grams}g`
  }
}

export function jarLabel(jar) {
  return `${jar.flavour} jam, ${helpers.weight(jar.grams)}`
}
```

There are two ways to test it. One watches the helper, with a spy from the last issue:

```js
test('asks the weight helper for the weight', () => {
  const weight = vi.spyOn(helpers, 'weight')
  jarLabel({ flavour: 'Plum', grams: 340 })
  expect(weight).toHaveBeenCalledWith(340)
})
```

The other checks the label:

```js
test('prints the flavour and the weight', () => {
  expect(jarLabel({ flavour: 'Plum', grams: 340 })).toBe('Plum jam, 340g')
})
```

The label is what the farm cares about: it is what goes on the jar. The helper is one way of making it, a choice the code made today.

## A rewrite that changes nothing

Now someone tidies `jarLabel` so it no longer needs the helper:

```js
export function jarLabel(jar) {
  return `${jar.flavour} jam, ${jar.grams}g`
}
```

Every label comes out the same. The label test passes. The spy test fails:

```
 × src/labels.test.js > asks the weight helper for the weight 2ms
   → expected "weight" to be called with arguments: [ 340 ]

Number of calls: 0
```

`Number of calls: 0` says the helper was never asked. Nothing is wrong with the jars, but the test is red, and someone loses an hour finding that out, or puts the old code back.

It also works the other way round. Say a mistake prints `Plum jam, 340kg`, from a line after the helper. The spy test still passes, because the helper was asked about 340, as before. A test tied to how the code works breaks when it should not and stays green when it should not.

Stand-ins still have their place: for things outside your code, like the card company or chance, a call is what you can check. Inside your own code, check what comes out.

## An answer the code agrees with

A second way to tie a test to the code is to let the code work out the answer:

```js
test('prints the weight', () => {
  const jar = { flavour: 'Plum', grams: 340 }
  expect(jarLabel(jar)).toContain(helpers.weight(jar.grams))
})
```

If `helpers.weight` printed `340kg`, the label would say `340kg`, and so would the expected value. The test asks the code whether the code is right, and the code always agrees with itself. You met a short version of this in the first issue, a function compared with itself. Work the expected value out from the rule, on paper if you like, and write it in the test as it is: `'Plum jam, 340g'`.

## Check runs a rewrite

Check runs your tests on the working code, and on a rewrite of `packing.js` that packs every order exactly the same, written another way: no helpers, one loop. Your tests must pass on both. Then it runs them on versions with a mistake slipped in, where they must fail.

## Your work in this issue

Open `src/packing.test.js`; the code is in `src/packing.js`. Each task has its own `describe` block, and two of them hold a test of Lorcan's to replace. Run `npx vitest run src/packing.test.js` after each change, and press Check when they all pass.
