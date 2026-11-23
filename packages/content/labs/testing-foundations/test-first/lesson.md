# Writing the test first

## What you will be able to do

Every test you have written so far was for code that already existed. This last issue turns that round: a new rule arrives, and you write its test before its code. You get to see the test fail for the right reason, which is the one proof that it can catch the rule going missing. By the end of this issue you will be able to:

- write a test for a rule the code does not have yet
- read why a new test fails, and tell the right reason from a wrong one
- write just enough code to make it pass
- do it again when the rule changes

## The request from Bridget

> **Bridget:** I want to thank the people who stay with us. From next month, every tenth box a subscriber gets is free. And before you start, Effie says a free large box costs us too much, so that one should cost what a large box costs over a medium. Can you build it so we know it works from the first Friday?

The code is in `src/loyalty.js`. `boxPrice(size, boxNumber)` gives the price of a subscriber's box, where their first box is box 1. Today it ignores the box number and gives the price list's price.

## Red, then green

Writing the test first is a short loop:

1. **Red.** Write a test for the next small piece of the rule. Run it, and watch it fail.
2. **Green.** Write the least code that makes it pass. Run every test.
3. **Tidy.** With every test green, make the code clearer if it needs it, and run the tests again.

Then the next piece of the rule, and round again.

Say the farm adds a rule for gift boxes: a card goes in for 1 pound, free for members. The code does not know about cards yet:

```js
export function giftPrice(price, member) {
  return price
}
```

The tests come first:

```js
describe('giftPrice', () => {
  test('adds a pound for the card', () => {
    expect(giftPrice(19, false)).toBe(20)
  })

  test('the card is free for members', () => {
    expect(giftPrice(19, true)).toBe(19)
  })
})
```

## Why it must fail first

Run them before writing any code:

```
 × src/gift.test.js > giftPrice > adds a pound for the card 2ms
   → expected 19 to be 20 // Object.is equality
 ✓ src/gift.test.js > giftPrice > the card is free for members 0ms
```

The first test fails, and the line says exactly why: the code gave the plain price, 19, where the rule wants 20. That is the failure you expected, so the test can tell code with the rule from code without it. Once you write the rule and it turns green, you know your code made it pass.

The second test passes already, before there is any rule. It is still worth keeping, because it says what must not change. But it cannot show the rule exists: a test that passes before the code is written cannot fail when the code goes missing. Each new rule needs at least one test that is red first.

Write the code after the test, and a mistake in your understanding shows up as a test that will not turn green, not as a test copied from what the code happens to print.

## Failing for the wrong reason

Not every red is the right red. Say the test had a typo:

```
 × src/gift.test.js > giftPrice > adds a pound for the card 1ms
   → giftprice is not defined
```

This test fails, but not because of the rule: it never reached the code. Writing the rule would not turn it green. So read the line under every red test before you write any code. The right red names the value the rule should give and the value the code gives today.

## Just enough code

Once the test is red for the right reason, write the smallest change that turns it green:

```js
export function giftPrice(price, member) {
  return member ? price : price + 1
}
```

Nothing more than the tests ask for. When Bridget changes her mind, as she will, that change starts with a test too: write what the new rule wants, watch it fail on today's code, then change the code. The old tests stay, and tell you if the change broke what was already right.

Check runs your tests on code without the rule, where they must fail, and on code with it, where they must pass. Then it runs your code with boxes of its own, and your tests on your code.

## Your work in this issue

Open `src/loyalty.test.js` and `src/loyalty.js`. The tasks go test, code, test, code. After each test, run `npx vitest run src/loyalty.test.js` and read why it fails before you touch `loyalty.js`. Press Check after each task.
