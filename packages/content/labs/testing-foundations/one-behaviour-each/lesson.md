# One rule in each test

## What you will be able to do

Your tests now catch wrong prices and missing salad. Effie, who looks after customers and the books, runs them every time she touches the code. This week she ran them and one failed, and the name of the failing test did not tell her what had gone wrong. In this issue you learn to write tests whose failures explain themselves. By the end of it you will be able to:

- group the tests for one function with `describe`
- name a test after the rule it checks
- keep each test to one rule, so a failure points at one cause
- build the example data for each test so only its own rule matters

## The request from Effie

> **Effie:** I changed how pauses work, and the terminal said "weeklyBox works" failed. That's all. Was it the pauses? The fortnightly boxes? The size changes? I spent an hour finding out it was pauses. When something breaks, I want the terminal to tell me which rule it was.

The code that decides who gets a box each week is in `src/weekly.js`. It has three rules: no box in a week the customer paused, fortnightly subscribers get a box in even weeks only, and a customer can change their box size for a single week.

## Why one big test hides the cause

Lorcan wrote one test that checks all three rules with four `expect` lines. When any rule breaks, that one test fails, and its name says only that `weeklyBox` does not work. Worse, a test stops at its first failing `expect`, so the lines after it never run, and a second broken rule stays hidden until you fix the first.

Compare a stall at the farm gate with three focused tests:

```js
describe('stallOpen', () => {
  test('is closed all day on Monday', () => {
    expect(stallOpen('Monday', 11)).toBe(false)
  })

  test('is open at 11 on a Tuesday', () => {
    expect(stallOpen('Tuesday', 11)).toBe(true)
  })

  test('is closed at 8 in the morning', () => {
    expect(stallOpen('Tuesday', 8)).toBe(false)
  })
})
```

Someone deletes the Monday rule by mistake. Vitest prints:

```
 × src/stall.test.js > stallOpen > is closed all day on Monday 2ms
   → expected true to be false // Object.is equality
 ✓ src/stall.test.js > stallOpen > is open at 11 on a Tuesday 0ms
 ✓ src/stall.test.js > stallOpen > is closed at 8 in the morning 0ms
```

You know what broke before you open a single file.

## Grouping with describe

`describe(name, function)` puts tests in a group. The group's name comes first in every line of output, so a group named after the function tells you where to look, and the test's name tells you which rule. Read together they make a sentence: "stallOpen is closed all day on Monday". The tests go inside the function you pass to `describe`, as in the example above. In the last two issues the blocks were written for you; from now on you write them.

## Names that say the rule

A good name says what should happen, in words someone else understands without reading the code: `'gives no box in a paused week'`, not `'test 2'` or `'pauses work'`. When it fails, the name reads as the rule that broke. If you cannot name a test without "and", it is probably checking two rules.

## Example data for one rule

Each test needs a subscriber to pass in. Make one plain subscriber where no rule is switched on, then make a copy with only the field you need changed:

```js
const visitor = { name: 'Ash', day: 'Tuesday', member: false, groupSize: 1 }

test('lets a member in free', () => {
  const member = { ...visitor, member: true }
  expect(ticketPrice(member)).toBe(0)
})
```

`{ ...visitor, member: true }` makes a new object with every field of `visitor`, then sets `member` to `true`. The original stays as it was, so every test starts from the same plain visitor.

This matters for what a test checks. If the subscriber in your pause test is also fortnightly, the answer can come out right because of the fortnight rule, even when pauses are broken. The test then passes when it should fail. With only the pause switched on, only the pause decides the answer.

## Your work in this issue

Open `src/weekly.test.js`; the code is in `src/weekly.js`, and the comment at its top shows what a subscription looks like. Make a `describe('weeklyBox', ...)` block and write one test per rule in it, each named for its rule. Then deal with Lorcan's test. Run `npx vitest run src/weekly.test.js` often and read the names. Check breaks each rule in turn and looks at which of your tests fail.
